export type TimingJurisdiction = "US" | "AL" | "PM";
export type TimingSourceType =
  | "federal_law"
  | "state_law"
  | "office_policy"
  | "contract_default"
  | "demo_example";

export type TimingAnchor =
  | "listing_date"
  | "contract_acceptance_date"
  | "closing_date"
  | "loan_application_date"
  | "loan_type_change_date"
  | "mls_active_date"
  | "commission_ready_at";

export interface TransactionTimingRule {
  id: string;
  jurisdiction: TimingJurisdiction;
  sourceType: TimingSourceType;
  title: string;
  trigger: string;
  anchor: TimingAnchor;
  offsetDays: number | null;
  offsetBusinessDays: number | null;
  dueTimingText: string;
  appliesWhen: string;
  contractOverrides: boolean;
  requiresHumanReview: boolean;
  authoritySourceId: string | null;
}

export const TRANSACTION_TIMING_RULES: TransactionTimingRule[] = [
  {
    id: "pm-listing-folder-complete-immediate",
    jurisdiction: "PM",
    sourceType: "office_policy",
    title: "Verify listing folder complete",
    trigger: "New listing packet received",
    anchor: "listing_date",
    offsetDays: 0,
    offsetBusinessDays: null,
    dueTimingText: "Same day or as soon as possible",
    appliesWhen: "All Pritchett-Moore listings",
    contractOverrides: false,
    requiresHumanReview: false,
    authoritySourceId: "demo-derived-transaction-rules",
  },
  {
    id: "pm-listing-master-list-next-monday",
    jurisdiction: "PM",
    sourceType: "office_policy",
    title: "Excel Master Listings update",
    trigger: "Listing active",
    anchor: "listing_date",
    offsetDays: null,
    offsetBusinessDays: null,
    dueTimingText: "Next Monday report",
    appliesWhen: "Current Pritchett-Moore office workflow",
    contractOverrides: false,
    requiresHumanReview: false,
    authoritySourceId: "demo-derived-transaction-rules",
  },
  {
    id: "pm-pending-mls-active-to-pending",
    jurisdiction: "PM",
    sourceType: "office_policy",
    title: "MLS Active to Pending task",
    trigger: "Contract accepted",
    anchor: "contract_acceptance_date",
    offsetDays: 0,
    offsetBusinessDays: null,
    dueTimingText: "Same day",
    appliesWhen: "Pritchett-Moore listing",
    contractOverrides: false,
    requiresHumanReview: false,
    authoritySourceId: "demo-derived-transaction-rules",
  },
  {
    id: "pm-pending-final-contract-instanet",
    jurisdiction: "PM",
    sourceType: "office_policy",
    title: "Final contract into Instanet",
    trigger: "Contract accepted",
    anchor: "contract_acceptance_date",
    offsetDays: 0,
    offsetBusinessDays: null,
    dueTimingText: "Same day",
    appliesWhen: "All sales",
    contractOverrides: false,
    requiresHumanReview: false,
    authoritySourceId: "demo-derived-transaction-rules",
  },
  {
    id: "pm-pending-earnest-money-deposit-check",
    jurisdiction: "PM",
    sourceType: "office_policy",
    title: "Earnest money deposit confirmation with Chanda",
    trigger: "Contract accepted and agent approves",
    anchor: "contract_acceptance_date",
    offsetDays: null,
    offsetBusinessDays: null,
    dueTimingText: "Use the signed contract and current trust-fund rule. If no due date is verified, flag it for human review.",
    appliesWhen: "Pritchett-Moore-held earnest money",
    contractOverrides: true,
    requiresHumanReview: true,
    authoritySourceId: "demo-derived-transaction-rules",
  },
  {
    id: "us-lead-paint-window",
    jurisdiction: "US",
    sourceType: "federal_law",
    title: "Lead-based paint inspection window",
    trigger: "Contract accepted",
    anchor: "contract_acceptance_date",
    offsetDays: 10,
    offsetBusinessDays: null,
    dueTimingText: "10 calendar days unless waived in writing",
    appliesWhen: "Pre-1978 property or lead-paint language present",
    contractOverrides: true,
    requiresHumanReview: true,
    authoritySourceId: null,
  },
  {
    id: "contract-inspection-contingency-fallback",
    jurisdiction: "AL",
    sourceType: "contract_default",
    title: "Inspection contingency reminder",
    trigger: "Contract accepted",
    anchor: "contract_acceptance_date",
    offsetDays: null,
    offsetBusinessDays: null,
    dueTimingText: "No fallback deadline. Extract the signed contract term; if it is missing or unreadable, flag it for human review.",
    appliesWhen: "Buyer inspection contingency and no exact contract deadline was extracted",
    contractOverrides: true,
    requiresHumanReview: true,
    authoritySourceId: "demo-derived-transaction-rules",
  },
  {
    id: "contract-appraisal-loan-commitment-fallback",
    jurisdiction: "AL",
    sourceType: "contract_default",
    title: "Appraisal and loan commitment reminder",
    trigger: "Contract accepted",
    anchor: "contract_acceptance_date",
    offsetDays: null,
    offsetBusinessDays: null,
    dueTimingText: "No fallback deadline. Use the signed contract and lender evidence; if neither verifies a date, flag it for human review.",
    appliesWhen: "Financed transaction and no exact lender deadline was extracted",
    contractOverrides: true,
    requiresHumanReview: true,
    authoritySourceId: "demo-derived-transaction-rules",
  },
  {
    id: "us-trid-closing-disclosure",
    jurisdiction: "US",
    sourceType: "federal_law",
    title: "Closing Disclosure check",
    trigger: "Closing date scheduled",
    anchor: "closing_date",
    offsetDays: null,
    offsetBusinessDays: -3,
    dueTimingText: "At least 3 business days before closing",
    appliesWhen: "Most residential mortgage transactions under TRID",
    contractOverrides: false,
    requiresHumanReview: true,
    authoritySourceId: "demo-derived-transaction-rules",
  },
  {
    id: "pm-closing-final-walkthrough",
    jurisdiction: "PM",
    sourceType: "office_policy",
    title: "Final walkthrough reminder",
    trigger: "Closing date scheduled",
    anchor: "closing_date",
    offsetDays: -2,
    offsetBusinessDays: null,
    dueTimingText: "1 to 2 days before closing",
    appliesWhen: "Buyer side or listing-side visibility",
    contractOverrides: true,
    requiresHumanReview: false,
    authoritySourceId: "demo-derived-transaction-rules",
  },
  {
    id: "pm-closing-mls-pending-to-sold",
    jurisdiction: "PM",
    sourceType: "office_policy",
    title: "MLS Pending to Sold task",
    trigger: "Closing or disbursement",
    anchor: "closing_date",
    offsetDays: 0,
    offsetBusinessDays: null,
    dueTimingText: "Same day",
    appliesWhen: "Pritchett-Moore listing",
    contractOverrides: false,
    requiresHumanReview: false,
    authoritySourceId: "demo-derived-transaction-rules",
  },
  {
    id: "pm-closing-hud-instanet",
    jurisdiction: "PM",
    sourceType: "office_policy",
    title: "HUD or settlement statement into Instanet",
    trigger: "Closing or disbursement",
    anchor: "closing_date",
    offsetDays: 0,
    offsetBusinessDays: null,
    dueTimingText: "Same day",
    appliesWhen: "All closed files",
    contractOverrides: false,
    requiresHumanReview: false,
    authoritySourceId: "demo-derived-transaction-rules",
  },
  {
    id: "pm-closing-just-sold",
    jurisdiction: "PM",
    sourceType: "office_policy",
    title: "Just Sold postcard and confirmation",
    trigger: "Closing or disbursement",
    anchor: "closing_date",
    offsetDays: 3,
    offsetBusinessDays: null,
    dueTimingText: "Within a few days",
    appliesWhen: "Pritchett-Moore listing",
    contractOverrides: false,
    requiresHumanReview: false,
    authoritySourceId: "demo-derived-transaction-rules",
  },
  {
    id: "pm-loan-type-change-fha-clause",
    jurisdiction: "PM",
    sourceType: "office_policy",
    title: "FHA clause review after financing change",
    trigger: "Loan type changes to FHA",
    anchor: "loan_type_change_date",
    offsetDays: 0,
    offsetBusinessDays: null,
    dueTimingText: "Immediate lender and broker review after the loan-type change",
    appliesWhen: "Mid-transaction loan change to FHA",
    contractOverrides: false,
    requiresHumanReview: true,
    authoritySourceId: "demo-derived-transaction-rules",
  },
];

export function formatTimingRulesForPrompt(): string {
  return TRANSACTION_TIMING_RULES.map((rule) => {
    const offset =
      rule.offsetBusinessDays !== null
        ? `${rule.offsetBusinessDays} business days`
        : rule.offsetDays !== null
          ? `${rule.offsetDays} calendar days`
          : rule.dueTimingText;
    return `- ${rule.title}: anchor ${rule.anchor}, offset ${offset}, applies when ${rule.appliesWhen}.`;
  }).join("\n");
}
