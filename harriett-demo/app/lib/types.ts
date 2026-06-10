export interface DealFields {
  address: string;
  city: string;
  state: string;
  zip: string;
  county: string | null;
  listPrice: number;
  salePrice: number | null;
  sellers: string[];
  buyers: string[];
  listingAgent: string;
  brokerage: string;
  buyerAgent: string | null;
  buyerBrokerage: string | null;
  listingDate: string;
  closingDate: string;
  propertyType: string;
  bedBath: string | null;
  sqft: number | null;
  yearBuilt: number | null;
  mlsNumber: string | null;
  parcelId: string | null;
  subdivision: string | null;
  loanType: string | null;
  earnestMoney: number | null;
  sellerConcessions: number | null;
  appurtenances: string[];
  flags: {
    leadPaintDisclosure: boolean;
    recadRequired: boolean;
    buyerBeware: boolean;
    relocationCompany: boolean;
    fhaLoan: boolean;
    loanTypeChanged: boolean;
  };
}

export interface ChecklistItem {
  category: "pre-listing" | "listing-active" | "under-contract" | "closing";
  title: string;
  detail: string;
  daysFromListing?: number;
  required: boolean;
}

export interface MarketingOutput {
  mlsRemarks: string;
  socialPost: string;
  presentationPoints: Array<{ heading: string; body: string }>;
}

export interface OutreachOutput {
  agentMessage: string;
  urgentFlags: string[];
}

export interface CmaComp {
  address: string;
  city: string;
  salePrice: number;
  sqft: number;
  beds: number;
  baths: number;
  saleDate: string;
  yearBuilt: number | null;
  notes: string;
}

export interface CmaInput {
  subjectAddress: string;
  subjectCity: string;
  subjectSqft: number;
  subjectBeds: number;
  subjectBaths: number;
  subjectYearBuilt: number | null;
  subjectNotes: string;
  sellerNames: string[];
  agentName: string;
  comps: CmaComp[];
}

export interface CmaAnalysis {
  executiveSummary: string;
  subjectHighlights: string[];
  compNotes: Array<{ address: string; adjustmentNote: string; pricePerSqft: number }>;
  pricingRange: { low: number; mid: number; high: number; recommended: number };
  pricingRationale: string;
  marketConditions: string;
  daysOnMarketEstimate: string;
  strengths: string[];
  considerations: string[];
}

export interface DemoMessage {
  id: string;
  deal_address: string;
  agent_name: string;
  message_text: string;
  status: "pending" | "approved";
  created_at: string;
  approved_at: string | null;
}
