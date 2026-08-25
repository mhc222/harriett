import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedContext } from "@/lib/auth-context";
import { createUserClient } from "@/lib/db/server";
import { PropertyValueEstimateSchema } from "@/lib/integrations/rentcast";
import { writeAudit } from "@/lib/audit";

const IdSchema = z.string().uuid();

function currency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

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
    .eq("kind", "seller_brief")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return NextResponse.json({ artifactId: existing.id, existing: true });

  const { data: research, error } = await db
    .from("property_research_runs")
    .select("id, agent_id, property_id, result, notice, properties(formatted_address, city, state, property_type, bedrooms, bathrooms, square_feet, year_built)")
    .eq("id", id.data)
    .single();
  if (error || !research) return NextResponse.json({ error: "research was not found" }, { status: 404 });

  const estimate = PropertyValueEstimateSchema.safeParse(research.result);
  if (!estimate.success) {
    return NextResponse.json({ error: "this research does not contain a valuation" }, { status: 409 });
  }
  const property = Array.isArray(research.properties) ? research.properties[0] : research.properties;
  const address = property?.formatted_address ?? estimate.data.subjectProperty.formattedAddress;
  const strongestComps = [...estimate.data.comparables]
    .sort((a, b) => (b.correlation ?? 0) - (a.correlation ?? 0))
    .slice(0, 3)
    .map((comp) => ({
      address: comp.formattedAddress,
      price: comp.price,
      distance: comp.distance ?? null,
      correlation: comp.correlation ?? null,
    }));
  const plainText = [
    `Seller appointment brief: ${address}`,
    "",
    `Preliminary public-data range: ${currency(estimate.data.priceRangeLow)} to ${currency(estimate.data.priceRangeHigh)}.`,
    `Automated estimate: ${currency(estimate.data.price)}.`,
    `Property: ${property?.bedrooms ?? "Unknown"} beds, ${property?.bathrooms ?? "Unknown"} baths, ${property?.square_feet ?? "Unknown"} square feet, built ${property?.year_built ?? "unknown"}.`,
    "",
    "Appointment focus",
    "Confirm condition, improvements, seller timing, motivation, and any features missing from public records.",
    "Review the strongest public-data comps, then verify status and sold details in MLS before discussing a final pricing strategy.",
    "",
    research.notice ?? "This is preliminary agent-facing research, not an appraisal or broker-approved CMA.",
  ].join("\n");

  const { data: artifact, error: artifactError } = await db
    .from("artifacts")
    .insert({
      office_id: auth.officeId,
      agent_id: research.agent_id,
      property_id: research.property_id,
      source_research_run_id: research.id,
      kind: "seller_brief",
      title: `${address} seller appointment brief`,
      plain_text: plainText,
      content: {
        valuation: {
          estimate: estimate.data.price,
          low: estimate.data.priceRangeLow,
          high: estimate.data.priceRangeHigh,
        },
        strongestComps,
        checklist: [
          "Confirm condition and recent improvements",
          "Confirm seller timing and motivation",
          "Verify comp status and sold details in MLS",
          "Prepare agent-reviewed pricing strategy",
        ],
      },
    })
    .select("id")
    .single();
  if (artifactError || !artifact) {
    return NextResponse.json({ error: "seller brief could not be created" }, { status: 500 });
  }

  await writeAudit(db, {
    officeId: auth.officeId,
    actor: "user",
    actorId: auth.user.id,
    agentId: auth.agentId,
    action: "artifact.seller_brief_created",
    payload: { artifactId: artifact.id, researchId: research.id, propertyId: research.property_id },
  });
  return NextResponse.json({ artifactId: artifact.id, existing: false }, { status: 201 });
}
