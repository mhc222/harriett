import { z } from "zod";

export const REAL_ESTATE_SOCIAL_SKILL = {
  name: "create_real_estate_social_media",
  version: "1.1.0",
  description: "Create review-ready real estate social copy from verified listing and transaction facts.",
  brokerageLegalName: "Pritchett-Moore Real Estate, LLC",
  researchedAt: "2026-08-26",
  sources: [
    "https://arec.alabama.gov/docs/basic-of-advertising-presentation100325.pdf",
    "https://arec.alabama.gov/docs/brieflynotes/law-requirement-for-social-media-advertising-jun2019.pdf",
    "https://www.nar.realtor/about-nar/governing-documents/code-of-ethics/2026-code-of-ethics-standards-of-practice",
    "https://www.nar.realtor/about-nar/governing-documents/code-of-ethics/code-comprehension-article-12-display-of-competitors-listings-on-social-media-websites",
    "https://archives.hud.gov/news/2024/FHEO_Guidance_on_Advertising_through_Digital_Platforms.pdf",
  ],
} as const;

export const REAL_ESTATE_SOCIAL_INSTRUCTIONS = `You are using Harriett's real estate social media creation skill.

Evidence and accuracy:
- Use only verified facts supplied in the request. The transaction record and official brokerage listing page control.
- Match the actual status precisely. Never say sold before a verified closing. Never invent urgency, demand, price changes, market statistics, amenities, school assignments, or neighborhood claims.
- Use the official Pritchett-Moore URL as the destination for a property post. Use only the verified primary image saved from that official listing page.

Advertising and authority:
- Every property advertisement must visibly identify Pritchett-Moore Real Estate, LLC.
- Do not imply that the posting agent is the listing agent when another agent owns the listing. Name the actual listing agent in the attribution.
- Do not expose client names, contact details, private contract terms, or transaction documents.

Fair Housing:
- Describe the property, not the kind of person who should live there.
- Do not express or imply preferences based on race, color, religion, national origin, sex, familial status, or disability.
- Do not use demographic proxies or subjective claims such as perfect for families, family-friendly neighborhood, safe neighborhood, good schools, Christian neighborhood, or ideal for young professionals.
- State verified accessibility features factually when relevant. Do not claim compliance with an accessibility standard unless it is verified.

Copy quality:
- Lead with one concrete, useful reason to care about this property or update.
- Prefer a few decision-useful facts over a long feature list.
- Use short, readable paragraphs and one natural next action.
- Use the agent's established voice when supplied. Otherwise write in plain, warm, professional West Alabama language.
- Use one to three relevant emojis to create visual rhythm. Keep them restrained and do not put one on every line.
- End with three to five relevant Facebook hashtags. Prefer the location, property type, brokerage, and topic. Never use unrelated trending tags.
- Do not use hype, guarantees, pressure tactics, or generic filler.

Nothing is published by this skill. The exact copy, link or image, attribution, and destination Page must remain visible for agent review before the existing approval workflow can publish it.`;

const DeterministicDraftInputSchema = z.object({
  postType: z.enum(["new_listing", "under_contract", "just_sold", "open_house", "market_update", "custom"]),
  postingAgentName: z.string().trim().min(1),
  listingAgentName: z.string().trim().min(1).nullable(),
  agentNotes: z.string().trim().max(2_000),
  transaction: z.record(z.string(), z.unknown()).nullable(),
});

function verifiedNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function hashtagPart(value: string): string {
  return value.replace(/[^a-z0-9]/gi, "");
}

export function createDeterministicRealEstateSocialDraft(
  rawInput: z.input<typeof DeterministicDraftInputSchema>,
): { title: string; message: string; factCheckNotes: string[] } {
  const input = DeterministicDraftInputSchema.parse(rawInput);
  const transaction = input.transaction;
  if (!transaction) {
    const message = input.agentNotes ||
      `Have a West Alabama real estate question? ${input.postingAgentName} with ${REAL_ESTATE_SOCIAL_SKILL.brokerageLegalName} is here to help. Send a message to start a conversation. 🏡`;
    return {
      title: "Facebook post draft",
      message: `${message}\n\n#WestAlabamaRealEstate #PritchettMoore #AlabamaRealEstate`,
      factCheckNotes: ["Confirm any facts supplied in the agent's direction before publishing."],
    };
  }

  const propertyResult = z.record(z.string(), z.unknown()).safeParse(transaction.property);
  const property = propertyResult.success ? propertyResult.data : {};
  const city = typeof transaction.city === "string" ? transaction.city.trim() : "West Alabama";
  const state = typeof transaction.state === "string" ? transaction.state.trim() : "AL";
  const address = typeof transaction.address === "string" ? transaction.address.trim() : "this property";
  const place = [city, state].filter(Boolean).join(", ");
  const status = typeof transaction.status === "string" ? transaction.status.toLowerCase() : "";
  const soldIsVerified = ["closed", "sold", "completed"].includes(status);
  const headingByType = {
    new_listing: "New listing",
    under_contract: "Under contract",
    just_sold: soldIsVerified ? "Just sold" : "Property update",
    open_house: "Property spotlight",
    market_update: "Market update",
    custom: "Property update",
  } as const;
  const heading = headingByType[input.postType];
  const facts: string[] = [];
  const bedrooms = verifiedNumber(property.bedrooms);
  const bathrooms = verifiedNumber(property.bathrooms);
  const squareFeet = verifiedNumber(property.squareFeet);
  const listPrice = verifiedNumber(transaction.listPrice);
  const salePrice = verifiedNumber(transaction.salePrice);
  if (bedrooms !== null) facts.push(`${bedrooms} bedroom${bedrooms === 1 ? "" : "s"}`);
  if (bathrooms !== null) facts.push(`${bathrooms} bathroom${bathrooms === 1 ? "" : "s"}`);
  if (squareFeet !== null) facts.push(`${Math.round(squareFeet).toLocaleString("en-US")} sq. ft.`);
  const relevantPrice = soldIsVerified && salePrice !== null ? salePrice : listPrice;
  if (relevantPrice !== null) facts.push(`$${Math.round(relevantPrice).toLocaleString("en-US")}`);

  const attribution = input.listingAgentName
    ? `Listed by ${input.listingAgentName} with ${REAL_ESTATE_SOCIAL_SKILL.brokerageLegalName}.`
    : REAL_ESTATE_SOCIAL_SKILL.brokerageLegalName;
  const cityTag = hashtagPart(city) || "WestAlabama";
  const topicTag = input.postType === "under_contract"
    ? "UnderContract"
    : input.postType === "just_sold" && soldIsVerified
      ? "JustSold"
      : "RealEstate";
  const details = facts.length ? ` Verified details include ${facts.join(", ")}.` : "";
  const message = `${heading} in ${place} 🏡\n\n${address}.${details}\n\nView the official listing for complete property details and showing information. 🔑\n\n${attribution}\n\n#${cityTag}RealEstate #PritchettMoore #AlabamaRealEstate #${topicTag}`;
  const factCheckNotes = ["Confirm the current property status before publishing."];
  if (relevantPrice !== null) factCheckNotes.push("Confirm the displayed price against the official listing.");
  if (input.postType === "just_sold" && !soldIsVerified) {
    factCheckNotes.push("The transaction is not verified as closed, so the fallback draft does not say sold.");
  }
  if (input.postType === "open_house") {
    factCheckNotes.push("No open house date or time was added because none was verified in the transaction record.");
  }
  return { title: `${heading}: ${address}`, message, factCheckNotes };
}

const FinalizeSocialDraftInputSchema = z.object({
  message: z.string().trim().min(1).max(3_000),
  shareMode: z.enum(["link_preview", "listing_photo", "text_only"]),
  officialListingUrl: z.string().url().nullable(),
  postingAgentName: z.string().trim().min(1),
  listingAgentName: z.string().trim().min(1).nullable(),
  isTestData: z.boolean(),
});

const prohibitedHousingLanguage = [
  /\bperfect for (?:a )?famil(?:y|ies)\b/i,
  /\bfamily[- ]friendly (?:area|community|neighbou?rhood)\b/i,
  /\bsafe neighbou?rhood\b/i,
  /\bgood schools?\b/i,
  /\bchristian neighbou?rhood\b/i,
  /\bideal for (?:young professionals?|seniors?|retirees?|singles?|families)\b/i,
  /\bno (?:children|kids)\b/i,
  /\badults only\b/i,
];

function occurrences(value: string, needle: string): number {
  if (!needle) return 0;
  return value.split(needle).length - 1;
}

export function finalizeRealEstateSocialDraft(rawInput: z.input<typeof FinalizeSocialDraftInputSchema>): {
  message: string;
  complianceNotes: string[];
} {
  const input = FinalizeSocialDraftInputSchema.parse(rawInput);
  const prohibited = prohibitedHousingLanguage.find((pattern) => pattern.test(input.message));
  if (prohibited) {
    throw new Error("the draft contains housing language that requires Fair Housing review");
  }

  let message = input.message.trim().replace(/\s*—\s*/g, " - ");
  const notes = [
    "Draft uses the licensed brokerage name.",
    "Draft passed Harriett's focused Fair Housing language screen.",
  ];
  const listingAgentName = input.listingAgentName;
  const isAnotherAgent = listingAgentName
    && listingAgentName.localeCompare(input.postingAgentName, undefined, { sensitivity: "base" }) !== 0;
  const attribution = isAnotherAgent
    ? `Listed by ${listingAgentName} with ${REAL_ESTATE_SOCIAL_SKILL.brokerageLegalName}.`
    : REAL_ESTATE_SOCIAL_SKILL.brokerageLegalName;

  if (!message.toLowerCase().includes(REAL_ESTATE_SOCIAL_SKILL.brokerageLegalName.toLowerCase())) {
    message = `${message}\n\n${attribution}`;
  } else if (isAnotherAgent && !message.toLowerCase().includes(listingAgentName.toLowerCase())) {
    message = `${message}\n\nListed by ${listingAgentName}.`;
  }
  if (isAnotherAgent) notes.push(`Listing attribution identifies ${listingAgentName}.`);

  if (input.shareMode === "listing_photo") {
    if (!input.officialListingUrl) throw new Error("photo posts require the official listing URL");
    if (occurrences(message, input.officialListingUrl) === 0) {
      message = `${message}\n\n${input.officialListingUrl}`;
    }
    if (occurrences(message, input.officialListingUrl) > 1) {
      throw new Error("the official listing URL appears more than once in the draft");
    }
    notes.push("Photo post includes the official listing URL exactly once.");
  }
  if (input.shareMode === "link_preview" && input.officialListingUrl && message.includes(input.officialListingUrl)) {
    message = message.replace(input.officialListingUrl, "").replace(/\n{3,}/g, "\n\n").trim();
    notes.push("Raw URL removed because Facebook will attach the official link preview.");
  }
  if (input.isTestData) {
    notes.push("This is a test transaction. Verify the live listing status and attribution before approval.");
  }

  return { message, complianceNotes: notes };
}
