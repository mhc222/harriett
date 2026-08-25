import { tasks } from "@trigger.dev/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { authenticatedContext } from "@/lib/auth-context";
import { createUserClient } from "@/lib/db/server";
import { startBrightDataCandidateSnapshot } from "@/lib/integrations/bright-data";
import { PropertyValueEstimateSchema } from "@/lib/integrations/rentcast";
import type { enrichPropertyResearch } from "@/trigger/enrich-property-research";

const IdSchema = z.string().uuid();

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = IdSchema.safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: "invalid research id" }, { status: 400 });

  const db = await createUserClient();
  const auth = await authenticatedContext(db);
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: existing } = await db
    .from("property_research_runs")
    .select("id, status")
    .eq("provider", "brightdata")
    .contains("request", { sourceResearchId: id.data })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing && ["running", "completed"].includes(existing.status)) {
    return NextResponse.json({ researchId: existing.id, status: existing.status, existing: true });
  }

  const { data: research, error } = await db
    .from("property_research_runs")
    .select("id, agent_id, property_id, result, properties(zip, state)")
    .eq("id", id.data)
    .single();
  if (error || !research) return NextResponse.json({ error: "research was not found" }, { status: 404 });
  const estimate = PropertyValueEstimateSchema.safeParse(research.result);
  if (!estimate.success) {
    return NextResponse.json({ error: "this research does not contain a valuation" }, { status: 409 });
  }
  const property = Array.isArray(research.properties) ? research.properties[0] : research.properties;
  const zipCode = property?.zip ?? estimate.data.subjectProperty.zipCode;
  const state = property?.state ?? estimate.data.subjectProperty.state;
  if (!zipCode || !state) {
    return NextResponse.json({ error: "a ZIP code and state are required for portal enrichment" }, { status: 409 });
  }

  const snapshotId = await startBrightDataCandidateSnapshot({
    zipCode,
    state,
    bedrooms: estimate.data.subjectProperty.bedrooms,
    squareFootage: estimate.data.subjectProperty.squareFootage,
    recordsLimit: 50,
  });
  const { data: enrichment, error: insertError } = await db
    .from("property_research_runs")
    .insert({
      office_id: auth.officeId,
      agent_id: research.agent_id,
      property_id: research.property_id,
      research_type: "cma_prep",
      provider: "brightdata",
      status: "running",
      request: {
        sourceResearchId: research.id,
        snapshotId,
        zipCode,
        state,
        recordsLimit: 50,
      },
      result: {},
      summary: "Bright Data portal enrichment is processing.",
      notice: "Portal-observed beta data. This is not MLS data and all material facts require MLS verification.",
      confidence_flags: ["portal_observed", "mls_verification_required"],
    })
    .select("id")
    .single();
  if (insertError || !enrichment) {
    return NextResponse.json({ error: "portal enrichment could not be saved" }, { status: 500 });
  }

  try {
    const run = await tasks.trigger<typeof enrichPropertyResearch>("enrich-property-research", {
      brightDataResearchId: enrichment.id,
      sourceResearchId: research.id,
      snapshotId,
    });
    await writeAudit(db, {
      officeId: auth.officeId,
      actor: "user",
      actorId: auth.user.id,
      agentId: auth.agentId,
      action: "property.bright_data_enrichment_started",
      payload: {
        researchId: enrichment.id,
        sourceResearchId: research.id,
        propertyId: research.property_id,
        snapshotId,
        triggerRunId: run.id,
      },
    });
  } catch {
    await db.from("property_research_runs").update({ status: "failed" }).eq("id", enrichment.id);
    return NextResponse.json({ error: "portal enrichment could not be queued" }, { status: 503 });
  }

  return NextResponse.json({ researchId: enrichment.id, status: "running", existing: false }, { status: 202 });
}
