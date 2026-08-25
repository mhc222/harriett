export type TransactionStage =
  | "relationship"
  | "pre_listing"
  | "listing_active"
  | "offer"
  | "under_contract"
  | "pre_closing"
  | "closed";

export type DocumentRequirementLevel =
  | "required_when_applicable"
  | "conditional"
  | "supporting"
  | "internal"
  | "third_party";

export type MissingDocumentSeverity = "block" | "flag" | "inform";

export type ApplicabilityKey =
  | "individual_brokerage_services"
  | "seller_listing"
  | "buyer_offer_submission"
  | "written_offer_or_contract"
  | "single_family_offer_or_counteroffer"
  | "pre_1978_residential"
  | "fha_financing"
  | "dual_agency"
  | "designated_single_agency"
  | "consumer_mortgage_closing"
  | "closed_transaction"
  | "pm_listing"
  | "pm_transaction";

export interface TransactionDocumentRule {
  key: string;
  title: string;
  aliases: string[];
  family:
    | "brokerage_disclosure"
    | "brokerage_agreement"
    | "transaction_contract"
    | "contract_addendum"
    | "property_disclosure"
    | "financial_estimate"
    | "settlement"
    | "property_record"
    | "internal_workflow";
  coarseDocumentType:
    | "listing_agreement"
    | "purchase_agreement"
    | "net_sheet"
    | "disclosure"
    | "settlement"
    | "other";
  stages: TransactionStage[];
  requirementLevel: DocumentRequirementLevel;
  missingSeverity: MissingDocumentSeverity;
  applicability: ApplicabilityKey;
  appliesWhen: string;
  expectedFields: string[];
  executionChecks: string[];
  authoritySourceIds: string[];
  humanReviewNotes: string[];
}

export interface TransactionPacketFacts {
  stage: TransactionStage;
  individualConsumer: boolean | null;
  propertyManagement: boolean | null;
  sellerRepresentation: boolean | null;
  buyerRepresentation: boolean | null;
  submittingOffer: boolean | null;
  writtenOfferOrContract: boolean | null;
  offerOrCounteroffer: boolean | null;
  singleFamilyResidential: boolean | null;
  residential: boolean | null;
  yearBuilt: number | null;
  financingType: "cash" | "conventional" | "fha" | "va" | "usda" | "other" | "unknown";
  consumerMortgage: boolean | null;
  dualAgency: boolean | null;
  designatedSingleAgency: boolean | null;
  pmListing: boolean | null;
  pmTransaction: boolean | null;
  closed: boolean | null;
}

export type ApplicabilityResult = "applies" | "not_applicable" | "needs_facts";

export interface PacketRequirementAssessment {
  documentKey: string;
  title: string;
  applicability: ApplicabilityResult;
  requirementLevel: DocumentRequirementLevel;
  missingSeverity: MissingDocumentSeverity;
  present: boolean;
  reason: string;
}

export const TRANSACTION_DOCUMENT_RULES: TransactionDocumentRule[] = [
  {
    key: "al_recad_brokerage_services_disclosure",
    title: "Alabama Real Estate Brokerage Services Disclosure",
    aliases: ["RECAD", "state RECAD", "brokerage services disclosure"],
    family: "brokerage_disclosure",
    coarseDocumentType: "disclosure",
    stages: ["relationship", "pre_listing", "offer"],
    requirementLevel: "required_when_applicable",
    missingSeverity: "block",
    applicability: "individual_brokerage_services",
    appliesWhen: "An Alabama licensee provides brokerage services to an individual consumer, subject to the statutory exceptions.",
    expectedFields: ["licensee name", "licensee signature", "licensee date", "consumer name", "consumer acknowledgement or refusal notation"],
    executionChecks: ["provided before brokerage services", "current form version", "licensee signed and dated", "consumer signature or refusal notation"],
    authoritySourceIds: ["alabama-code-34-27-82-recad", "alabama-admin-code-790-x-3-13"],
    humanReviewNotes: ["Business and governmental entity exceptions require review.", "Property-management work follows different RECAD treatment."],
  },
  {
    key: "pm_agency_brokerage_office_policy",
    title: "Pritchett-Moore Agency and Brokerage Office Policy",
    aliases: ["office policy", "agency disclosure office policy", "PMRE office policy"],
    family: "brokerage_disclosure",
    coarseDocumentType: "disclosure",
    stages: ["relationship", "pre_listing", "offer"],
    requirementLevel: "required_when_applicable",
    missingSeverity: "block",
    applicability: "individual_brokerage_services",
    appliesWhen: "The brokerage provides services to an individual consumer and the office policy must accompany the RECAD disclosure.",
    expectedFields: ["brokerage services offered", "compensation explanation", "consumer acknowledgement", "date"],
    executionChecks: ["provided with RECAD before brokerage services", "current broker-approved version", "acknowledgement or refusal notation"],
    authoritySourceIds: ["alabama-admin-code-790-x-3-14", "arec-statutory-changes-2025-2026"],
    humanReviewNotes: ["The qualifying broker controls the current approved policy."],
  },
  {
    key: "pm_exclusive_right_to_sell_listing_agreement",
    title: "Exclusive Right to Sell Property Listing Agreement",
    aliases: ["listing agreement", "exclusive listing", "PMRE listing form"],
    family: "brokerage_agreement",
    coarseDocumentType: "listing_agreement",
    stages: ["pre_listing", "listing_active"],
    requirementLevel: "required_when_applicable",
    missingSeverity: "block",
    applicability: "seller_listing",
    appliesWhen: "Pritchett-Moore lists property on behalf of a seller for compensation.",
    expectedFields: ["seller names", "brokerage", "listing agent", "property", "term", "list price", "compensation", "included and excluded items", "seller signatures", "brokerage signature"],
    executionChecks: ["signed before listing", "all seller signatures", "agent or brokerage signature", "effective and expiration dates", "no unapproved automatic extension", "all handwritten changes initialed and dated"],
    authoritySourceIds: ["alabama-code-34-27-82-recad", "pm-transaction-packet-map"],
    humanReviewNotes: ["Ownership, authority to sell, equitable-title selections, and compensation terms need exact document evidence."],
  },
  {
    key: "pm_exclusive_buyer_agency_agreement",
    title: "Exclusive Buyer Agency Agreement",
    aliases: ["buyer agency agreement", "buyer brokerage agreement", "buyer representation agreement"],
    family: "brokerage_agreement",
    coarseDocumentType: "other",
    stages: ["relationship", "offer"],
    requirementLevel: "required_when_applicable",
    missingSeverity: "block",
    applicability: "buyer_offer_submission",
    appliesWhen: "Pritchett-Moore submits an offer on behalf of a buyer for compensation.",
    expectedFields: ["buyer names", "brokerage", "agent", "term", "scope", "services", "compensation", "buyer signatures", "agent signature"],
    executionChecks: ["signed before offer submission", "term is complete", "compensation is complete", "all required signatures and dates"],
    authoritySourceIds: ["alabama-code-34-27-82-recad", "arec-statutory-changes-2025-2026"],
    humanReviewNotes: ["Do not infer representation from an agent name printed on a purchase agreement."],
  },
  {
    key: "al_general_financed_purchase_agreement",
    title: "General or Financed Purchase Agreement",
    aliases: ["purchase agreement", "sales contract", "offer to purchase", "contract"],
    family: "transaction_contract",
    coarseDocumentType: "purchase_agreement",
    stages: ["offer", "under_contract", "pre_closing", "closed"],
    requirementLevel: "required_when_applicable",
    missingSeverity: "block",
    applicability: "written_offer_or_contract",
    appliesWhen: "A written offer is being made or the property is treated as under contract.",
    expectedFields: ["buyers", "sellers", "property", "purchase price", "earnest money", "financing", "closing date", "cost allocation", "inspection election", "agency disclosure", "additional provisions", "acceptance date"],
    executionChecks: ["all pages present", "selected and unselected boxes distinguished", "required blanks completed", "changes initialed and dated", "buyer signatures", "seller signatures", "acceptance date", "addenda incorporated"],
    authoritySourceIds: ["pm-transaction-packet-map"],
    humanReviewNotes: ["The signed contract controls transaction deadlines and obligations.", "Printed boilerplate does not prove that an optional election applies."],
  },
  {
    key: "al_estimated_closing_statement",
    title: "Estimated Closing Statement",
    aliases: ["net sheet", "buyer cost estimate", "seller closing estimate", "estimated net sheet"],
    family: "financial_estimate",
    coarseDocumentType: "net_sheet",
    stages: ["offer", "under_contract"],
    requirementLevel: "required_when_applicable",
    missingSeverity: "block",
    applicability: "single_family_offer_or_counteroffer",
    appliesWhen: "A licensee prepares or presents each written offer or counteroffer in a single-family residential sale.",
    expectedFields: ["party", "property", "offer amount", "estimated cost items", "estimated amounts", "prepared date", "dated acknowledgement"],
    executionChecks: ["one statement for the applicable party on each offer or counteroffer", "best estimates of closing costs", "dated recipient signature", "copy retained"],
    authoritySourceIds: ["alabama-admin-code-790-x-3-04"],
    humanReviewNotes: ["This is an Estimated Closing Statement even if the office calls it a net sheet.", "A lender estimate does not replace the licensee's statement."],
  },
  {
    key: "federal_lead_based_paint_disclosure",
    title: "Lead-Based Paint Disclosure",
    aliases: ["lead disclosure", "lead paint form", "LBP disclosure"],
    family: "property_disclosure",
    coarseDocumentType: "disclosure",
    stages: ["pre_listing", "offer", "under_contract"],
    requirementLevel: "conditional",
    missingSeverity: "block",
    applicability: "pre_1978_residential",
    appliesWhen: "Most residential housing built before 1978, subject to federal exemptions.",
    expectedFields: ["property", "seller knowledge election", "records election", "buyer acknowledgement", "agent acknowledgement", "signatures", "dates"],
    executionChecks: ["seller disclosure completed before buyer is obligated", "available reports supplied", "buyer acknowledgement", "agent acknowledgement", "lead warning statement", "10-day opportunity or written change"],
    authoritySourceIds: ["epa-lead-disclosure-rule"],
    humanReviewNotes: ["Property age alone does not prove that the disclosure was delivered or executed."],
  },
  {
    key: "federal_lead_hazard_pamphlet",
    title: "Protect Your Family From Lead in Your Home Pamphlet",
    aliases: ["lead pamphlet", "EPA lead booklet", "Protect Your Family"],
    family: "property_disclosure",
    coarseDocumentType: "disclosure",
    stages: ["offer", "under_contract"],
    requirementLevel: "conditional",
    missingSeverity: "flag",
    applicability: "pre_1978_residential",
    appliesWhen: "The federal lead disclosure rule applies to the residential transaction.",
    expectedFields: ["current approved pamphlet"],
    executionChecks: ["delivery acknowledged in the lead disclosure or transaction record"],
    authoritySourceIds: ["epa-lead-disclosure-rule"],
    humanReviewNotes: ["Presence of pamphlet pages in a PDF does not prove delivery to the buyer."],
  },
  {
    key: "hud_fha_amendatory_clause_and_certification",
    title: "FHA Amendatory Clause and Real Estate Certification",
    aliases: ["FHA amendatory clause", "FHA clause", "real estate certification"],
    family: "contract_addendum",
    coarseDocumentType: "other",
    stages: ["offer", "under_contract", "pre_closing"],
    requirementLevel: "conditional",
    missingSeverity: "block",
    applicability: "fha_financing",
    appliesWhen: "FHA financing is used and no HUD exception applies.",
    expectedFields: ["borrowers", "sellers", "property", "sales price", "contract date", "amendatory language", "certification", "signatures", "dates"],
    executionChecks: ["correct sales price", "borrower signature", "seller signature", "required agent or broker signature", "timing consistent with FHA requirements", "recheck after material price or financing changes"],
    authoritySourceIds: ["hud-fha-sales-contract-guidance"],
    humanReviewNotes: ["HUD exceptions exist.", "A loan-type change to FHA requires immediate lender and broker review rather than an automatic legal conclusion."],
  },
  {
    key: "al_dual_agency_agreement",
    title: "Dual Agency Agreement",
    aliases: ["dual agency consent", "limited consensual dual agency"],
    family: "brokerage_agreement",
    coarseDocumentType: "disclosure",
    stages: ["offer", "under_contract"],
    requirementLevel: "conditional",
    missingSeverity: "block",
    applicability: "dual_agency",
    appliesWhen: "The same licensee or permitted brokerage relationship will act as a dual agent for buyer and seller.",
    expectedFields: ["buyers", "sellers", "property", "agent", "brokerage", "informed consent", "signatures", "dates"],
    executionChecks: ["written informed consent", "all represented parties signed", "completed before dual agency services"],
    authoritySourceIds: ["alabama-admin-code-790-x-3-14", "alabama-code-34-27-82-recad"],
    humanReviewNotes: ["Do not infer dual agency solely because both agents share a brokerage."],
  },
  {
    key: "al_designated_single_agency_agreement",
    title: "Designated Single Agency Agreement",
    aliases: ["designated agency", "single agent designation"],
    family: "brokerage_agreement",
    coarseDocumentType: "disclosure",
    stages: ["offer", "under_contract"],
    requirementLevel: "conditional",
    missingSeverity: "block",
    applicability: "designated_single_agency",
    appliesWhen: "Different licensees under the same qualifying broker represent opposing parties as designated single agents.",
    expectedFields: ["company", "qualifying broker", "seller agent", "buyer agent", "clients", "property", "designations", "signatures", "dates"],
    executionChecks: ["qualifying broker designation", "both agents identified", "clients identified", "completed before the conflicting representation proceeds"],
    authoritySourceIds: ["alabama-admin-code-790-x-3-14", "arec-statutory-changes-2025-2026"],
    humanReviewNotes: ["Broker confirmation is required for the exact office relationship."],
  },
  {
    key: "pm_office_exclusive_listing_addendum",
    title: "Pritchett-Moore Office Exclusive Listing Agreement Addendum",
    aliases: ["office exclusive addendum", "listing addendum"],
    family: "contract_addendum",
    coarseDocumentType: "other",
    stages: ["pre_listing", "listing_active"],
    requirementLevel: "conditional",
    missingSeverity: "flag",
    applicability: "pm_listing",
    appliesWhen: "The listing arrangement or office policy calls for the PMRE office-exclusive addendum.",
    expectedFields: ["seller", "property", "listing agreement reference", "changed terms", "seller signatures", "agent signature", "dates"],
    executionChecks: ["broker-approved current version", "consistent with listing agreement", "all required signatures and dates"],
    authoritySourceIds: ["pm-transaction-packet-map"],
    humanReviewNotes: ["Broker policy determines when this addendum is required."],
  },
  {
    key: "seller_property_information_sheet",
    title: "Seller Property Information Sheet",
    aliases: ["seller information sheet", "property information sheet", "seller property disclosure"],
    family: "property_disclosure",
    coarseDocumentType: "disclosure",
    stages: ["pre_listing", "listing_active", "offer"],
    requirementLevel: "supporting",
    missingSeverity: "flag",
    applicability: "pm_listing",
    appliesWhen: "The office listing packet or contract requires seller-provided property information.",
    expectedFields: ["property features", "utilities", "systems", "known conditions", "included and excluded items", "seller responses", "seller signatures", "date"],
    executionChecks: ["all pages present", "seller completed", "no unanswered material fields hidden by OCR", "signature and date"],
    authoritySourceIds: ["pm-transaction-packet-map"],
    humanReviewNotes: ["Do not label this universally required by Alabama law without a specific authority source."],
  },
  {
    key: "consumer_mortgage_closing_disclosure",
    title: "Closing Disclosure",
    aliases: ["CD", "TRID closing disclosure"],
    family: "settlement",
    coarseDocumentType: "settlement",
    stages: ["pre_closing", "closed"],
    requirementLevel: "third_party",
    missingSeverity: "block",
    applicability: "consumer_mortgage_closing",
    appliesWhen: "Most covered consumer mortgage loans, subject to TRID exceptions.",
    expectedFields: ["borrowers", "sellers", "property", "loan terms", "closing date", "disbursement date", "sale price", "cash to close", "seller proceeds", "closing costs", "credits", "settlement agent"],
    executionChecks: ["correct transaction", "latest version", "received at least three business days before consummation when required", "material changes reviewed", "final copy retained"],
    authoritySourceIds: ["cfpb-closing-disclosure"],
    humanReviewNotes: ["The lender or closing agent produces this form.", "Not every cash, HELOC, reverse mortgage, or special loan transaction uses a Closing Disclosure."],
  },
  {
    key: "settlement_statement_or_alta",
    title: "Settlement Statement or ALTA Combined Settlement Statement",
    aliases: ["ALTA", "settlement statement", "HUD", "closing statement"],
    family: "settlement",
    coarseDocumentType: "settlement",
    stages: ["pre_closing", "closed"],
    requirementLevel: "third_party",
    missingSeverity: "flag",
    applicability: "closed_transaction",
    appliesWhen: "The title or settlement workflow produces the final accounting for the closing.",
    expectedFields: ["property", "buyers", "sellers", "closing date", "sale price", "debits", "credits", "commissions", "payoffs", "cash to or from parties", "settlement agent"],
    executionChecks: ["final version", "figures reconcile", "transaction identity matches", "copy retained in closed file"],
    authoritySourceIds: ["pm-transaction-packet-map"],
    humanReviewNotes: ["Names such as HUD, ALTA, and settlement statement are not interchangeable in every transaction."],
  },
  {
    key: "mls_property_record",
    title: "MLS Property Record",
    aliases: ["MLS sheet", "MLS printout", "listing sheet"],
    family: "property_record",
    coarseDocumentType: "other",
    stages: ["listing_active", "offer", "under_contract", "closed"],
    requirementLevel: "supporting",
    missingSeverity: "inform",
    applicability: "pm_listing",
    appliesWhen: "Pritchett-Moore lists the property or needs a historical MLS snapshot.",
    expectedFields: ["MLS number", "status", "property", "list price", "list date", "agent", "brokerage", "public remarks", "features"],
    executionChecks: ["captured date", "status at capture", "not treated as contract authority", "conflicts compared against signed documents"],
    authoritySourceIds: ["pm-transaction-packet-map"],
    humanReviewNotes: ["The signed agreement controls when MLS data conflicts with contract terms."],
  },
  {
    key: "pm_listing_pending_closed_checklists",
    title: "PMRE Listing, Pending, and Closed File Checklists",
    aliases: ["listing checklist", "pending checklist", "closed checklist", "coordinator checklist"],
    family: "internal_workflow",
    coarseDocumentType: "other",
    stages: ["pre_listing", "listing_active", "under_contract", "closed"],
    requirementLevel: "internal",
    missingSeverity: "flag",
    applicability: "pm_transaction",
    appliesWhen: "A Pritchett-Moore transaction enters the corresponding lifecycle stage.",
    expectedFields: ["task", "completion date", "owner", "missing item notes", "broker review indicators"],
    executionChecks: ["correct lifecycle checklist", "tasks generated from current digital workflow", "legacy person and system names reviewed", "completion evidence retained"],
    authoritySourceIds: ["pm-transaction-packet-map"],
    humanReviewNotes: ["Legacy references such as paper folders, Excel, Instanet, named staff, and postcards are observations, not permanent product requirements."],
  },
];

function triState(value: boolean | null): ApplicabilityResult {
  return value === null ? "needs_facts" : value ? "applies" : "not_applicable";
}

export function evaluateApplicability(
  key: ApplicabilityKey,
  facts: TransactionPacketFacts
): ApplicabilityResult {
  switch (key) {
    case "individual_brokerage_services":
      if (facts.individualConsumer === null || facts.propertyManagement === null) return "needs_facts";
      return facts.individualConsumer && !facts.propertyManagement ? "applies" : "not_applicable";
    case "seller_listing":
      return triState(facts.sellerRepresentation);
    case "buyer_offer_submission":
      if (facts.buyerRepresentation === null || facts.submittingOffer === null) return "needs_facts";
      return facts.buyerRepresentation && facts.submittingOffer ? "applies" : "not_applicable";
    case "written_offer_or_contract":
      return triState(facts.writtenOfferOrContract);
    case "single_family_offer_or_counteroffer":
      if (facts.singleFamilyResidential === null || facts.offerOrCounteroffer === null) return "needs_facts";
      return facts.singleFamilyResidential && facts.offerOrCounteroffer ? "applies" : "not_applicable";
    case "pre_1978_residential":
      if (facts.residential === null || facts.yearBuilt === null) return "needs_facts";
      return facts.residential && facts.yearBuilt < 1978 ? "applies" : "not_applicable";
    case "fha_financing":
      return facts.financingType === "unknown"
        ? "needs_facts"
        : facts.financingType === "fha" ? "applies" : "not_applicable";
    case "dual_agency":
      return triState(facts.dualAgency);
    case "designated_single_agency":
      return triState(facts.designatedSingleAgency);
    case "consumer_mortgage_closing":
      return triState(facts.consumerMortgage);
    case "closed_transaction":
      return triState(facts.closed);
    case "pm_listing":
      return triState(facts.pmListing);
    case "pm_transaction":
      return triState(facts.pmTransaction);
  }
}

export function assessTransactionPacket(
  facts: TransactionPacketFacts,
  presentDocumentKeys: Iterable<string>
): PacketRequirementAssessment[] {
  const present = new Set(presentDocumentKeys);
  return TRANSACTION_DOCUMENT_RULES.map((rule) => {
    const applicability = evaluateApplicability(rule.applicability, facts);
    const found = present.has(rule.key);
    const reason = applicability === "applies"
      ? rule.appliesWhen
      : applicability === "not_applicable"
        ? `The known transaction facts do not satisfy: ${rule.appliesWhen}`
        : `More transaction facts are required to decide: ${rule.appliesWhen}`;
    return {
      documentKey: rule.key,
      title: rule.title,
      applicability,
      requirementLevel: rule.requirementLevel,
      missingSeverity: rule.missingSeverity,
      present: found,
      reason,
    };
  });
}

export function packetRulesForPrompt(): string {
  return TRANSACTION_DOCUMENT_RULES.map((rule) =>
    `- ${rule.title} [${rule.requirementLevel}]: ${rule.appliesWhen} Missing action: ${rule.missingSeverity}.`
  ).join("\n");
}
