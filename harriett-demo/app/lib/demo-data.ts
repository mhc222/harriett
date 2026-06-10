export type DealStage = "listing-active" | "under-contract" | "closing" | "closed";

export interface Deal {
  id: string;
  address: string;
  city: string;
  agent: string;
  price: number;
  loanType: string;
  listingDate: string;
  closingDate: string;
  stage: DealStage;
  urgentFlags: string[];
  checklist: { completed: number; total: number };
  lastActivity: string;
  mlsNumber?: string;
  photosUploaded?: boolean;
  mlsEntered?: boolean;
  folderLabel?: "blue" | "white" | null;
  postcardSent?: boolean;
}

export interface ApprovalItem {
  id: string;
  dealId: string;
  address: string;
  toAgent: string;
  preview: string;
  draftedAt: string;
  urgentFlags: string[];
}

export interface ActivityItem {
  id: string;
  text: string;
  sub: string;
  timeAgo: string;
  type: "parse" | "checklist" | "marketing" | "flag" | "outreach" | "postcard" | "mls";
}

export interface PreListingItem {
  id: string;
  agent: string;
  address: string;
  appointmentDate: string;
  status: "cma-requested" | "cma-ready" | "appointment-set" | "materials-sent";
}

// ── DEALS ────────────────────────────────────────────────────────────────────

export const DEALS: Deal[] = [
  {
    id: "univ-1842",
    address: "1842 University Blvd",
    city: "Tuscaloosa, AL 35401",
    agent: "Sarah Kimball",
    price: 385000,
    loanType: "Conventional",
    listingDate: "May 10, 2026",
    closingDate: "Jul 20, 2026",
    stage: "listing-active",
    urgentFlags: [],
    checklist: { completed: 7, total: 14 },
    lastActivity: "1 day ago",
    mlsNumber: "PM-2026-0510",
    photosUploaded: true,
    mlsEntered: true,
    folderLabel: "blue",
    postcardSent: true,
  },
  {
    id: "mcf-3310",
    address: "3310 McFarland Blvd #14",
    city: "Tuscaloosa, AL 35405",
    agent: "Marcus Webb",
    price: 142500,
    loanType: "Cash",
    listingDate: "Apr 2, 2026",
    closingDate: "Jul 8, 2026",
    stage: "closing",
    urgentFlags: [],
    checklist: { completed: 11, total: 14 },
    lastActivity: "3 hours ago",
    mlsNumber: "PM-2026-0402",
    photosUploaded: true,
    mlsEntered: true,
    folderLabel: "white",
    postcardSent: false,
  },
  {
    id: "forest-914",
    address: "914 Forest Lake Dr",
    city: "Tuscaloosa, AL 35405",
    agent: "Sarah Kimball",
    price: 319000,
    loanType: "VA",
    listingDate: "Jun 1, 2026",
    closingDate: "Jul 30, 2026",
    stage: "listing-active",
    urgentFlags: [],
    checklist: { completed: 2, total: 14 },
    lastActivity: "4 hours ago",
    mlsNumber: "PM-2026-0601",
    photosUploaded: false,
    mlsEntered: false,
    folderLabel: null,
    postcardSent: false,
  },
];

// ── APPROVAL QUEUE ───────────────────────────────────────────────────────────

export const APPROVAL_QUEUE: ApprovalItem[] = [
  {
    id: "aq1",
    dealId: "deal-gordo",
    address: "604 2nd St NW, Gordo AL",
    toAgent: "Jerrod Hastings",
    preview: "Jerrod — contract is in. Closing is set for Jun 5. Lead paint inspection window opens today — buyer has 10 days. FHA amendatory clause is required; confirm with First Federal that it's been signed. I'll track the timeline from here.",
    draftedAt: "2026-06-08T09:14:00Z",
    urgentFlags: ["Lead paint 10-day window starts today", "FHA amendatory clause required"],
  },
];

// ── ACTIVITY ─────────────────────────────────────────────────────────────────

export const ACTIVITY: ActivityItem[] = [
  { id: "a6", text: "Photos uploaded — 914 Forest Lake Dr", sub: "Sarah Kimball · 18 photos received", timeAgo: "4 hrs ago", type: "mls" },
  { id: "a7", text: "MLS entry pending — 914 Forest Lake Dr", sub: "Alyssa notified, photos in queue", timeAgo: "4 hrs ago", type: "checklist" },
  { id: "a8", text: "Closing prep started — 3310 McFarland Blvd", sub: "Marcus Webb · Jul 8 closing", timeAgo: "1 day ago", type: "checklist" },
  { id: "a9", text: "Inspection deadline flagged", sub: "1842 University Blvd · Jun 20 contingency", timeAgo: "1 day ago", type: "flag" },
];

// ── PRE-LISTING ──────────────────────────────────────────────────────────────

export const PRE_LISTING: PreListingItem[] = [
  {
    id: "pl-001",
    agent: "Jerrod Hastings",
    address: "2200 Academy Dr, Tuscaloosa",
    appointmentDate: "Thu Jun 12",
    status: "cma-ready",
  },
  {
    id: "pl-002",
    agent: "Sarah Kimball",
    address: "814 Hargrove Rd E, Tuscaloosa",
    appointmentDate: "Mon Jun 16",
    status: "cma-requested",
  },
];

// ── VENDOR DIRECTORY ─────────────────────────────────────────────────────────

export type VendorCategory = "photographer" | "inspector" | "title" | "lender" | "appraiser" | "insurance" | "deed" | "other";

export interface Vendor {
  id: string;
  name: string;
  contact: string;
  phone: string;
  category: VendorCategory;
  agentId: string;
  harriettCanContact: boolean;
  lastUsed?: string;
}

export const VENDORS: Vendor[] = [
  { id: "v1", name: "Mark Sutton Photography", contact: "Mark Sutton", phone: "(205) 544-2917", category: "photographer", agentId: "jerrod", harriettCanContact: true, lastUsed: "May 2026" },
  { id: "v2", name: "Tier 1 Inspections", contact: "Dave Holt", phone: "(205) 339-8822", category: "inspector", agentId: "jerrod", harriettCanContact: true, lastUsed: "Apr 2026" },
  { id: "v3", name: "North River Title, Inc.", contact: "Brittany Newton", phone: "(205) 345-5310", category: "title", agentId: "jerrod", harriettCanContact: true, lastUsed: "Jun 2026" },
  { id: "v4", name: "First Federal Bank ISAOA", contact: "Loan Team", phone: "(205) 752-1900", category: "lender", agentId: "jerrod", harriettCanContact: false, lastUsed: "Jun 2026" },
  { id: "v5", name: "Randolph Appraisals, Inc.", contact: "Greg Randolph", phone: "(205) 391-4450", category: "appraiser", agentId: "jerrod", harriettCanContact: true, lastUsed: "Mar 2026" },
  { id: "v6", name: "Orion 180 Insurance", contact: "James Orr", phone: "(205) 248-3311", category: "insurance", agentId: "jerrod", harriettCanContact: false },
];

const VENDOR_LABELS: Record<VendorCategory, string> = {
  photographer: "Photographer",
  inspector: "Inspector",
  title: "Title",
  lender: "Lender",
  appraiser: "Appraiser",
  insurance: "Insurance",
  deed: "Deed Prep",
  other: "Other",
};

export { VENDOR_LABELS };

// ── CALENDAR EVENTS ──────────────────────────────────────────────────────────

export type CalendarEventType = "closing" | "appointment" | "inspection" | "deadline" | "listing";

export interface CalendarEvent {
  id: string;
  date: string; // "YYYY-MM-DD"
  title: string;
  type: CalendarEventType;
  address: string;
  agent: string;
  dealId?: string;
  note?: string;
}

export const CALENDAR_EVENTS: CalendarEvent[] = [
  // June 2026
  { id: "ce1", date: "2026-06-12", title: "Listing appointment", type: "appointment", address: "2200 Academy Dr, Tuscaloosa", agent: "Jerrod Hastings" },
  { id: "ce2", date: "2026-06-15", title: "Photos due", type: "deadline", address: "914 Forest Lake Dr", agent: "Sarah Kimball", dealId: "forest-914", note: "MLS entry blocked — Sarah sends photos to Alyssa" },
  { id: "ce3", date: "2026-06-16", title: "Listing appointment", type: "appointment", address: "814 Hargrove Rd E, Tuscaloosa", agent: "Sarah Kimball" },
  { id: "ce4", date: "2026-06-20", title: "Inspection contingency deadline", type: "inspection", address: "1842 University Blvd", agent: "Sarah Kimball", dealId: "univ-1842" },
  { id: "ce6", date: "2026-06-25", title: "Loan commitment deadline", type: "deadline", address: "1842 University Blvd", agent: "Sarah Kimball", dealId: "univ-1842" },
  // July 2026
  { id: "ce7", date: "2026-07-05", title: "Final walkthrough", type: "inspection", address: "3310 McFarland Blvd #14", agent: "Marcus Webb", dealId: "mcf-3310" },
  { id: "ce8", date: "2026-07-08", title: "Closing", type: "closing", address: "3310 McFarland Blvd #14", agent: "Marcus Webb", dealId: "mcf-3310", note: "Cash. North River Title / Brittany Newton." },
  { id: "ce9", date: "2026-07-18", title: "Final walkthrough", type: "inspection", address: "1842 University Blvd", agent: "Sarah Kimball", dealId: "univ-1842" },
  { id: "ce10", date: "2026-07-20", title: "Closing", type: "closing", address: "1842 University Blvd", agent: "Sarah Kimball", dealId: "univ-1842", note: "Conventional. $385,000." },
  { id: "ce11", date: "2026-07-28", title: "Final walkthrough", type: "inspection", address: "914 Forest Lake Dr", agent: "Sarah Kimball", dealId: "forest-914" },
  { id: "ce12", date: "2026-07-30", title: "Closing", type: "closing", address: "914 Forest Lake Dr", agent: "Sarah Kimball", dealId: "forest-914", note: "VA loan. $319,000." },
];

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  text: string;
  sub: string;
  timeAgo: string;
  type: "flag" | "action" | "info";
  read: boolean;
}

export const NOTIFICATIONS: AppNotification[] = [
  { id: "n4", text: "CMA ready for review", sub: "2200 Academy Dr — Jerrod's listing appointment Jun 12", timeAgo: "4 hrs ago", type: "info", read: false },
  { id: "n5", text: "Photos still missing", sub: "914 Forest Lake Dr — MLS entry blocked", timeAgo: "5 hrs ago", type: "flag", read: false },
  { id: "n6", text: "Inspection deadline approaching", sub: "1842 University Blvd — Jun 20 contingency", timeAgo: "1 day ago", type: "flag", read: true },
];

// ── TODOS ─────────────────────────────────────────────────────────────────────

export interface TodoItem {
  id: string;
  text: string;
  sub?: string;
  urgent: boolean;
  roleFor: "broker" | "agent" | "coordinator";
}

export const TODOS: TodoItem[] = [
  { id: "t2", text: "Review CMA before Jerrod's appointment", sub: "2200 Academy Dr — Thursday Jun 12", urgent: true, roleFor: "broker" },
  { id: "t7", text: "Review inspection contingency — 1842 University Blvd", sub: "Sarah Kimball · deadline Jun 20", urgent: false, roleFor: "broker" },
  { id: "t3", text: "Send photos to Alyssa — 914 Forest Lake Dr", sub: "MLS entry blocked until received", urgent: true, roleFor: "agent" },
  { id: "t4", text: "Confirm inspection booked — 1842 University Blvd", sub: "Contingency deadline Jun 20", urgent: false, roleFor: "agent" },
  { id: "t8", text: "Make blue folder label — 914 Forest Lake Dr", sub: "Add to physical file once MLS entered", urgent: false, roleFor: "coordinator" },
  { id: "t9", text: "Send Just Sold postcard — 3310 McFarland Blvd", sub: "Email confirmation to Marcus, cc Gail", urgent: false, roleFor: "coordinator" },
];

// ── COORDINATOR TASKS ────────────────────────────────────────────────────────

export interface CoordTask {
  id: string;
  dealId: string;
  address: string;
  agent: string;
  task: string;
  type: "photos" | "mls" | "folder" | "postcard" | "checklist" | "news";
  urgent: boolean;
}

export const COORD_TASKS: CoordTask[] = [
  { id: "ct2", dealId: "forest-914", address: "914 Forest Lake Dr", agent: "Sarah Kimball", task: "Receive and upload photos from Sarah", type: "photos", urgent: true },
  { id: "ct3", dealId: "forest-914", address: "914 Forest Lake Dr", agent: "Sarah Kimball", task: "Enter listing in MLS with photos — convert provisional to active", type: "mls", urgent: true },
  { id: "ct4", dealId: "forest-914", address: "914 Forest Lake Dr", agent: "Sarah Kimball", task: "Make blue folder label — add to physical file", type: "folder", urgent: false },
  { id: "ct5", dealId: "mcf-3310", address: "3310 McFarland Blvd #14", agent: "Marcus Webb", task: "Send Just Sold postcard — email confirmation to Marcus", type: "postcard", urgent: false },
  { id: "ct6", dealId: "mcf-3310", address: "3310 McFarland Blvd #14", agent: "Marcus Webb", task: "Load HUD/settlement statement into Instanet", type: "checklist", urgent: false },
];
