import { NextResponse } from "next/server";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { authenticatedContext } from "@/lib/auth-context";
import { buildCmaPrep, renderCmaPrep } from "@/lib/cma";
import { createUserClient } from "@/lib/db/server";
import { BrightDataEnrichmentResultSchema } from "@/lib/integrations/bright-data";
import { PropertyValueEstimateSchema } from "@/lib/integrations/rentcast";

const IdSchema = z.string().uuid();

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = IdSchema.safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: "invalid research id" }, { status: 400 });

  const db = await createUserClient();
  const auth = await authenticatedContext(db);
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: existing } = await db
    .from("artifacts")
    .select("id")
    .eq("source_research_run_id", id.data)
    .eq("kind", "cma_draft")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return NextResponse.json({ artifactId: existing.id, existing: true });

  const { data: research, error } = await db
    .from("property_research_runs")
    .select("id, agent_id, property_id, result, source_observed_at")
    .eq("id", id.data)
    .single();
  if (error || !research) return NextResponse.json({ error: "research was not found" }, { status: 404 });

  const estimate = PropertyValueEstimateSchema.safeParse(research.result);
  if (!estimate.success) {
    return NextResponse.json({ error: "this research does not contain a valuation" }, { status: 409 });
  }

  const { data: portalResearch } = await db
    .from("property_research_runs")
    .select("result")
    .eq("property_id", research.property_id)
    .eq("provider", "brightdata")
    .eq("status", "completed")
    .contains("request", { sourceResearchId: research.id })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const portalResult = BrightDataEnrichmentResultSchema.safeParse(portalResearch?.result);
  const cma = buildCmaPrep(
    estimate.data,
    research.source_observed_at,
    portalResult.success ? portalResult.data.comparables : []
  );
  const { data: artifact, error: artifactError } = await db
    .from("artifacts")
    .insert({
      office_id: auth.officeId,
      agent_id: research.agent_id,
      property_id: research.property_id,
      source_research_run_id: research.id,
      kind: "cma_draft",
      title: `${cma.assignment.subjectAddress} CMA expert prep`,
      status: "draft",
      version: 1,
      plain_text: renderCmaPrep(cma),
      content: cma,
    })
    .select("id")
    .single();
  if (artifactError || !artifact) {
    return NextResponse.json({ error: "CMA draft could not be created" }, { status: 500 });
  }

  await writeAudit(db, {
    officeId: auth.officeId,
    actor: "user",
    actorId: auth.user.id,
    agentId: auth.agentId,
    action: "artifact.cma_draft_created",
    payload: {
      artifactId: artifact.id,
      researchId: research.id,
      propertyId: research.property_id,
      methodologyVersion: cma.methodologyVersion,
      confidenceScore: cma.confidence.score,
      includedCount: cma.counts.included,
    },
  });
  return NextResponse.json({ artifactId: artifact.id, existing: false }, { status: 201 });
}
