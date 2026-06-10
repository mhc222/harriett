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

export const DEALS: Deal[] = [];

// ── APPROVAL QUEUE ───────────────────────────────────────────────────────────

export const APPROVAL_QUEUE: ApprovalItem[] = [];

// ── ACTIVITY ─────────────────────────────────────────────────────────────────

export const ACTIVITY: ActivityItem[] = [];

// ── PRE-LISTING ──────────────────────────────────────────────────────────────

export const PRE_LISTING: PreListingItem[] = [];

// ── VENDOR DIRECTORY ─────────────────────────────────────────────────────────

export type VendorCategory = "photographer" | "inspector" | "title" | "lender" | "appraiser" | "insurance" | "deed" | "other";

export interface Vendor {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email?: string;
  category: VendorCategory;
  agentId: string;
  harriettCanContact: boolean;
  lastUsed?: string;
  freeDates?: string[];
}

export const VENDORS: Vendor[] = [
  { id: "v1", name: "Mark Sutton Photography", contact: "Mark Sutton", phone: "(205) 544-2917", email: "mark@suttonphotographyhoover.com", category: "photographer", agentId: "jerrod", harriettCanContact: true, lastUsed: "May 2026", freeDates: ["Fri Jun 13", "Mon Jun 16", "Wed Jun 18"] },
  { id: "v2", name: "Tier 1 Inspections", contact: "Dave Holt", phone: "(205) 339-8822", email: "dave@tier1inspections.com", category: "inspector", agentId: "jerrod", harriettCanContact: true, lastUsed: "Apr 2026", freeDates: ["Tue Jun 17", "Thu Jun 19", "Fri Jun 20"] },
  { id: "v3", name: "North River Title, Inc.", contact: "Brittany Newton", phone: "(205) 345-5310", email: "brittany@northrivertitle.com", category: "title", agentId: "jerrod", harriettCanContact: true, lastUsed: "Jun 2026", freeDates: ["Mon Jun 16", "Tue Jun 17"] },
  { id: "v4", name: "First Federal Bank ISAOA", contact: "Loan Team", phone: "(205) 752-1900", category: "lender", agentId: "jerrod", harriettCanContact: false, lastUsed: "Jun 2026" },
  { id: "v5", name: "Randolph Appraisals, Inc.", contact: "Greg Randolph", phone: "(205) 391-4450", email: "greg@randolphappraisals.com", category: "appraiser", agentId: "jerrod", harriettCanContact: true, lastUsed: "Mar 2026", freeDates: ["Wed Jun 18", "Thu Jun 19", "Mon Jun 23"] },
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

export const CALENDAR_EVENTS: CalendarEvent[] = [];

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  text: string;
  sub: string;
  timeAgo: string;
  type: "flag" | "action" | "info";
  read: boolean;
}

export const NOTIFICATIONS: AppNotification[] = [];

// ── TODOS ─────────────────────────────────────────────────────────────────────

export interface TodoItem {
  id: string;
  text: string;
  sub?: string;
  urgent: boolean;
  roleFor: "broker" | "agent" | "coordinator";
}

export const TODOS: TodoItem[] = [];

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

export const COORD_TASKS: CoordTask[] = [];
