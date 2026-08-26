import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { generateStructured } from "@/lib/ai/generate";
import {
  findPritchettMooreListing,
  PublicListingMetadataSchema,
  savePritchettMooreListing,
} from "@/lib/integrations/pritchett-moore";
import {
  createDeterministicRealEstateSocialDraft,
  finalizeRealEstateSocialDraft,
  REAL_ESTATE_SOCIAL_INSTRUCTIONS,
  REAL_ESTATE_SOCIAL_SKILL,
} from "@/lib/skills/real-estate-social";

export const SocialPostTypeSchema = z.enum([
  "new_listing",
  "under_contract",
  "just_sold",
  "open_house",
  "market_update",
  "custom",
]);

export const SocialShareModeSchema = z.enum(["link_preview", "listing_photo", "text_only"]);

const GeneratedSocialDraftSchema = z.object({
  title: z.string().trim().min(1).max(160),
  message: z.string().trim().min(1).max(3_000),
  factCheckNotes: z.array(z.string().trim().min(1).max(300)).max(8),
});

function publicTransactionFacts(deal: Record<string, unknown>): Record<string, unknown> {
  const parsed = z.record(z.string(), z.unknown()).safeParse(deal.parsed_fields);
  const publicParsedKeys = [
    "propertyType",
    "bedrooms",
    "bathrooms",
    "squareFeet",
    "yearBuilt",
    "subdivision",
    "lotSize",
    "mlsNumber",
    "publicRemarks",
    "listingAgentName",
    "testData",
  ];
  const publicParsed = parsed.success
    ? Object.fromEntries(publicParsedKeys.flatMap((key) => (
      parsed.data[key] == null ? [] : [[key, parsed.data[key]]]
    )))
    : {};
  const propertyRelation = Array.isArray(deal.properties) ? deal.properties[0] : deal.properties;
  const property = z.object({ facts: z.record(z.string(), z.unknown()).default({}) }).safeParse(propertyRelation);
  const publicListing = PublicListingMetadataSchema.safeParse(property.success ? property.data.facts.publicListing : null);
  return {
    id: deal.id,
    property_id: deal.property_id,
    address: deal.address,
    city: deal.city,
    state: deal.state,
    zip: deal.zip,
    status: deal.status,
    listPrice: deal.list_price,
    salePrice: deal.sale_price,
    listingDate: deal.listing_date,
    contractAcceptanceDate: deal.contract_acceptance_date,
    closingDate: deal.closing_date,
    property: publicParsed,
    publicListing: publicListing.success ? publicListing.data : null,
  };
}

export async function createFacebookDraft(input: {
  db: SupabaseClient;
  officeId: string;
  agentId: string;
  actor?: "user" | "harriett";
  actorUserId?: string;
  proposalSource?: "manual" | "whatsapp_request" | "deal_status_change";
  postType: z.infer<typeof SocialPostTypeSchema>;
  shareMode: z.infer<typeof SocialShareModeSchema>;
  dealId?: string;
  notes?: string;
}) {
  const postType = SocialPostTypeSchema.parse(input.postType);
  const shareMode = SocialShareModeSchema.parse(input.shareMode);
  const notes = z.string().trim().max(2_000).parse(input.notes ?? "");
  const [{ data: agent, error: agentError }, { data: writingProfile }] = await Promise.all([
    input.db.from("agents").select("name").eq("id", input.agentId).single(),
    input.db.from("writing_profiles").select("profile").eq("agent_id", input.agentId).eq("active", true).maybeSingle(),
  ]);
  if (agentError || !agent) throw new Error("agent profile was not found");

  let deal: Record<string, unknown> | null = null;
  if (input.dealId) {
    const dealId = z.string().uuid().parse(input.dealId);
    const { data, error } = await input.db
      .from("deals")
      .select("id,property_id,address,city,state,zip,status,list_price,sale_price,listing_date,contract_acceptance_date,closing_date,parsed_fields,properties(facts)")
      .eq("id", dealId)
      .eq("agent_id", input.agentId)
      .single();
    if (error || !data) throw new Error("transaction was not found for this agent");
    deal = publicTransactionFacts(data);
  }
  if (!deal && !["market_update", "custom"].includes(postType)) {
    throw new Error("choose a transaction for this post type");
  }
  let listingWasResolved = false;
  if (deal && !PublicListingMetadataSchema.safeParse(deal.publicListing).success) {
    const transactionProperty = z.record(z.string(), z.unknown()).safeParse(deal.property);
    const mlsNumber = transactionProperty.success && typeof transactionProperty.data.mlsNumber === "string"
      ? transactionProperty.data.mlsNumber
      : null;
    if (mlsNumber) {
      const resolved = await findPritchettMooreListing({ mlsNumber });
      if (resolved) {
        deal.publicListing = resolved;
        listingWasResolved = true;
        if (typeof deal.property_id === "string") {
          await savePritchettMooreListing({
            db: input.db,
            officeId: input.officeId,
            propertyId: deal.property_id,
            metadata: resolved,
          }).catch(() => undefined);
        }
      }
    }
  }
  if (!deal && shareMode !== "text_only") throw new Error("choose a transaction before using a listing link or photo");
  if (deal && shareMode === "text_only") throw new Error("choose the official listing link or listing photo for a property post");
  const publicListing = PublicListingMetadataSchema.safeParse(deal?.publicListing);
  if (deal && !publicListing.success) {
    throw new Error("this property does not have a verified Pritchett-Moore listing link yet");
  }
  if (shareMode === "listing_photo" && (!publicListing.success || !publicListing.data.primaryImageUrl)) {
    throw new Error("this property does not have a verified listing photo yet");
  }

  const listing = publicListing.success ? publicListing.data : null;
  const transactionProperty = z.record(z.string(), z.unknown()).safeParse(deal?.property);
  const listingAgentName = transactionProperty.success && typeof transactionProperty.data.listingAgentName === "string"
    ? transactionProperty.data.listingAgentName
    : null;
  const isTestData = transactionProperty.success && transactionProperty.data.testData === true;
  let generationMode: "ai" | "deterministic_fallback" = "ai";
  let generated: z.infer<typeof GeneratedSocialDraftSchema>;
  try {
    generated = await generateStructured({
      schema: GeneratedSocialDraftSchema,
      system: `${REAL_ESTATE_SOCIAL_INSTRUCTIONS}

Return a short fact-check list naming every material fact the agent should confirm before publishing.`,
      content: JSON.stringify({
        agentName: agent.name,
        postType,
        shareMode,
        agentNotes: notes || null,
        voiceProfile: writingProfile?.profile ?? null,
        transaction: deal,
      }),
      tier: "fast",
      maxOutputTokens: 2_000,
    });
  } catch (error) {
    generationMode = "deterministic_fallback";
    console.error("[social-draft] model generation failed, using verified-facts fallback", error);
    generated = createDeterministicRealEstateSocialDraft({
      postType,
      postingAgentName: agent.name,
      listingAgentName,
      agentNotes: notes,
      transaction: deal,
    });
  }
  const finalized = finalizeRealEstateSocialDraft({
    message: generated.message,
    shareMode,
    officialListingUrl: listing?.url ?? null,
    postingAgentName: agent.name,
    listingAgentName,
    isTestData,
  });
  const title = generated.title.replace(/\s*—\s*/g, " - ");

  const propertyId = typeof deal?.property_id === "string" ? deal.property_id : null;
  const dealId = typeof deal?.id === "string" ? deal.id : null;
  const { data: artifact, error: artifactError } = await input.db.from("artifacts").insert({
    office_id: input.officeId,
    agent_id: input.agentId,
    property_id: propertyId,
    deal_id: dealId,
    kind: "social_post",
    title,
    status: "draft",
    version: 1,
    plain_text: finalized.message,
    content: {
      provider: "facebook",
      post_type: postType,
      share_mode: shareMode,
      notes: notes || null,
      public_listing_url: listing?.url ?? null,
      primary_image_url: listing?.primaryImageUrl ?? null,
      fact_check_notes: generated.factCheckNotes,
      compliance_notes: finalized.complianceNotes,
      generation_mode: generationMode,
      proposal_source: input.proposalSource ?? "manual",
      social_skill: {
        name: REAL_ESTATE_SOCIAL_SKILL.name,
        version: REAL_ESTATE_SOCIAL_SKILL.version,
      },
      publish_status: "draft",
    },
  }).select("id").single();
  if (artifactError || !artifact) throw new Error(`social draft could not be saved: ${artifactError?.message}`);

  await writeAudit(input.db, {
    officeId: input.officeId,
    actor: input.actor ?? "user",
    actorId: input.actorUserId,
    agentId: input.agentId,
    dealId: dealId ?? undefined,
    action: "artifact.facebook_draft_created",
    payload: {
      artifactId: artifact.id,
      postType,
      shareMode,
      propertyId,
      publicListingUrl: listing?.url ?? null,
      listingWasResolved,
      imageIncluded: shareMode === "listing_photo",
      factCheckCount: generated.factCheckNotes.length,
      complianceCheckCount: finalized.complianceNotes.length,
      generationMode,
      proposalSource: input.proposalSource ?? "manual",
      socialSkillVersion: REAL_ESTATE_SOCIAL_SKILL.version,
    },
  });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "")
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000");
  return {
    artifactId: artifact.id,
    title,
    message: finalized.message,
    reviewUrl: `${appUrl}/social?draft=${artifact.id}`,
    primaryImageUrl: listing?.primaryImageUrl ?? null,
    publicListingUrl: listing?.url ?? null,
    generationMode,
  };
}
