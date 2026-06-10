"use client";

import { useEffect, useState } from "react";
import type { ChecklistItem, DealFields, MarketingOutput, OutreachOutput } from "../lib/types";
import { getUser } from "../lib/auth";

// ─── SIDEBAR ────────────────────────────────────────────────────────────────

function SidebarLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--ink-light)" }}>
      {children}
    </p>
  );
}

function SidebarField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--ink-light)" }}>
        {label}
      </p>
      <p className="text-sm font-medium leading-snug" style={{ color: value ? "var(--ink)" : "var(--ink-light)" }}>
        {value || "—"}
      </p>
    </div>
  );
}

interface FlagProps { severity: "high" | "medium" | "low"; children: React.ReactNode }
function Flag({ severity, children }: FlagProps) {
  const styles = {
    high: { bg: "#FEF2F2", border: "#FECACA", text: "#9B1C1C" },
    medium: { bg: "#FFFBEB", border: "#FDE68A", text: "#92400E" },
    low: { bg: "#F5F0E8", border: "var(--cream-border)", text: "var(--ink-mid)" },
  }[severity];
  return (
    <div
      className="flex items-start gap-2 text-xs border rounded-lg px-2.5 py-2"
      style={{ background: styles.bg, borderColor: styles.border, color: styles.text }}
    >
      <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
      <span className="font-medium">{children}</span>
    </div>
  );
}

function DealSidebar({ deal }: { deal: DealFields }) {
  const price = deal.salePrice ?? deal.listPrice;

  const flags = [
    deal.flags.leadPaintDisclosure && { severity: "high" as const, text: "Lead paint — 10-day inspection window" },
    deal.flags.fhaLoan && { severity: "medium" as const, text: "FHA amendatory clause required" },
    deal.flags.loanTypeChanged && { severity: "medium" as const, text: "Loan type changed mid-transaction" },
    deal.flags.recadRequired && { severity: "low" as const, text: "RECAD disclosure required" },
    deal.flags.buyerBeware && { severity: "low" as const, text: "Alabama buyer-beware" },
  ].filter(Boolean) as { severity: "high" | "medium" | "low"; text: string }[];

  return (
    <div className="w-full md:w-[268px] flex-shrink-0">
      <div className="rounded-xl overflow-hidden border" style={{ background: "var(--surface)", borderColor: "var(--cream-border)" }}>
        {/* Address */}
        <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: "var(--cream-border)" }}>
          <p className="font-semibold text-base leading-snug" style={{ color: "var(--ink)" }}>{deal.address}</p>
          <p className="text-sm mt-0.5" style={{ color: "var(--ink-mid)" }}>
            {deal.city}, {deal.state} {deal.zip}
          </p>
          {deal.county && <p className="text-xs mt-0.5" style={{ color: "var(--ink-light)" }}>{deal.county} County</p>}
        </div>

        {/* Price + close */}
        <div className="px-5 py-4 border-b grid grid-cols-2 gap-4" style={{ borderColor: "var(--cream-border)" }}>
          <div>
            <SidebarLabel>Price</SidebarLabel>
            <p className="text-xl font-bold leading-none" style={{ color: "var(--ink)" }}>
              ${price.toLocaleString()}
            </p>
          </div>
          <div>
            <SidebarLabel>Closes</SidebarLabel>
            <p className="text-sm font-semibold leading-tight" style={{ color: "var(--ink)" }}>{deal.closingDate}</p>
          </div>
          {deal.loanType && (
            <div className="col-span-2">
              <SidebarLabel>Loan</SidebarLabel>
              <p className="text-sm" style={{ color: "var(--ink-mid)" }}>{deal.loanType}</p>
            </div>
          )}
        </div>

        {/* Compliance flags */}
        {flags.length > 0 && (
          <div className="px-5 py-4 border-b space-y-2" style={{ borderColor: "var(--cream-border)" }}>
            <SidebarLabel>Compliance</SidebarLabel>
            {flags.map((f, i) => <Flag key={i} severity={f.severity}>{f.text}</Flag>)}
          </div>
        )}

        {/* Parties */}
        <div className="px-5 py-4 border-b space-y-3.5" style={{ borderColor: "var(--cream-border)" }}>
          <SidebarLabel>Parties</SidebarLabel>
          <SidebarField label="Seller(s)" value={deal.sellers.join(", ")} />
          <SidebarField label="Buyer(s)" value={deal.buyers.join(", ")} />
          <SidebarField label="Listing agent" value={`${deal.listingAgent}, ${deal.brokerage}`} />
          {deal.buyerAgent && (
            <SidebarField
              label="Buyer agent"
              value={`${deal.buyerAgent}${deal.buyerBrokerage ? `, ${deal.buyerBrokerage}` : ""}`}
            />
          )}
        </div>

        {/* Financials */}
        {(deal.earnestMoney != null || deal.sellerConcessions != null || (deal.appurtenances?.length ?? 0) > 0) && (
          <div className="px-5 py-4 space-y-3.5">
            <SidebarLabel>Financials</SidebarLabel>
            {deal.earnestMoney != null && (
              <SidebarField label="Earnest money" value={`$${deal.earnestMoney.toLocaleString()}`} />
            )}
            {deal.sellerConcessions != null && (
              <SidebarField label="Seller concessions" value={`$${deal.sellerConcessions.toLocaleString()}`} />
            )}
            {(deal.appurtenances?.length ?? 0) > 0 && (
              <SidebarField
                label="Included appliances"
                value={deal.appurtenances.map((a) => a.charAt(0).toUpperCase() + a.slice(1)).join(", ")}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SKELETON ───────────────────────────────────────────────────────────────

function Skeleton({ w, delay = 0 }: { w?: string; delay?: number }) {
  return (
    <div
      className="animate-pulse rounded"
      style={{
        height: "0.9rem",
        width: w ?? "100%",
        background: "#E8E2D6",
        animationDelay: `${delay}ms`,
      }}
    />
  );
}

function ChecklistSkeleton() {
  return (
    <div className="p-6 space-y-7">
      {[4, 3, 5, 3].map((count, gi) => (
        <div key={gi}>
          <Skeleton w="5rem" delay={gi * 80} />
          <div className="mt-3 space-y-2">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="flex gap-3 items-start p-3 rounded-lg border" style={{ borderColor: "var(--cream-border)" }}>
                <div className="w-4 h-4 rounded flex-shrink-0 mt-0.5 animate-pulse" style={{ background: "#E8E2D6", animationDelay: `${gi * 80 + i * 40}ms` }} />
                <div className="flex-1 space-y-1.5">
                  <Skeleton w="75%" delay={gi * 80 + i * 40 + 20} />
                  <Skeleton delay={gi * 80 + i * 40 + 40} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MarketingSkeleton() {
  return (
    <div className="p-6 space-y-5">
      <div className="flex gap-1 p-1 rounded-lg border" style={{ borderColor: "var(--cream-border)", background: "#F0EBE3" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex-1 h-8 rounded-md animate-pulse" style={{ background: "#E8E2D6", animationDelay: `${i * 60}ms` }} />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} w={`${82 + (i % 4) * 5}%`} delay={i * 35} />
        ))}
      </div>
    </div>
  );
}

function OutreachSkeleton() {
  return (
    <div className="p-6 space-y-5">
      <div className="rounded-xl p-4 border space-y-2" style={{ background: "#FEF9F0", borderColor: "#FDE68A" }}>
        <Skeleton w="8rem" />
        <Skeleton delay={40} />
        <Skeleton w="80%" delay={80} />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} w={`${78 + (i % 5) * 5}%`} delay={i * 35} />)}
      </div>
      <div className="rounded-xl p-4 border flex items-center justify-between" style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}>
        <Skeleton w="12rem" />
        <div className="w-28 h-9 rounded-lg animate-pulse" style={{ background: "#E8E2D6" }} />
      </div>
    </div>
  );
}

// ─── CHECKLIST ──────────────────────────────────────────────────────────────

const CAT_LABEL: Record<ChecklistItem["category"], string> = {
  "pre-listing": "Pre-Listing",
  "listing-active": "Active Listing",
  "under-contract": "Under Contract",
  closing: "Closing",
};

const CAT_COLOR: Record<ChecklistItem["category"], string> = {
  "pre-listing": "#6D28D9",
  "listing-active": "#1D4ED8",
  "under-contract": "#B45309",
  closing: "#166534",
};

const CAT_PILL: Record<ChecklistItem["category"], { bg: string; border: string; text: string }> = {
  "pre-listing": { bg: "#F5F3FF", border: "#DDD6FE", text: "#6D28D9" },
  "listing-active": { bg: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8" },
  "under-contract": { bg: "#FFFBEB", border: "#FDE68A", text: "#B45309" },
  closing: { bg: "#FEF2F2", border: "#FECACA", text: "#9B1C1C" },
};

function ChecklistContent({ items }: { items: ChecklistItem[] }) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const byCategory = items.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
    acc[item.category] = acc[item.category] ?? [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const order: ChecklistItem["category"][] = ["pre-listing", "listing-active", "under-contract", "closing"];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-5">
        <p className="text-sm" style={{ color: "var(--ink-mid)" }}>
          <span className="font-semibold" style={{ color: "var(--ink)" }}>{checked.size}</span> of{" "}
          <span className="font-semibold" style={{ color: "var(--ink)" }}>{items.length}</span> completed
        </p>
      </div>

      <div className="space-y-7">
        {order.map((cat) => {
          const catItems = byCategory[cat];
          if (!catItems?.length) return null;
          return (
            <div key={cat}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: CAT_COLOR[cat] }}>
                {CAT_LABEL[cat]}
              </p>
              <div className="space-y-1.5">
                {catItems.map((item) => {
                  const idx = items.indexOf(item);
                  const done = checked.has(idx);
                  return (
                    <div
                      key={idx}
                      className="flex gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-150"
                      style={{
                        background: done ? "#F5F0E8" : "var(--surface)",
                        borderColor: done ? "var(--cream-border)" : "var(--cream-border)",
                        opacity: done ? 0.55 : 1,
                      }}
                      onMouseEnter={(e) => { if (!done) (e.currentTarget as HTMLDivElement).style.borderColor = "#9C9189"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--cream-border)"; }}
                      onClick={() =>
                        setChecked((prev) => {
                          const next = new Set(prev);
                          next.has(idx) ? next.delete(idx) : next.add(idx);
                          return next;
                        })
                      }
                    >
                      <div
                        className="mt-0.5 flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors"
                        style={{
                          background: done ? "var(--crimson)" : "transparent",
                          borderColor: done ? "var(--crimson)" : "#C8BFB4",
                        }}
                      >
                        {done && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center flex-wrap gap-1.5 mb-0.5">
                          <p
                            className="text-sm font-medium leading-snug"
                            style={{
                              textDecoration: done ? "line-through" : "none",
                              color: done ? "var(--ink-light)" : "var(--ink)",
                            }}
                          >
                            {item.title}
                          </p>
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border leading-none"
                            style={{
                              background: CAT_PILL[item.category].bg,
                              borderColor: CAT_PILL[item.category].border,
                              color: CAT_PILL[item.category].text,
                              opacity: done ? 0.6 : 1,
                            }}
                          >
                            {CAT_LABEL[item.category]}
                          </span>
                          {item.required && (
                            <span className="text-[10px] font-semibold" style={{ color: "var(--crimson)" }}>Required</span>
                          )}
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: "var(--ink-mid)" }}>
                          {item.detail}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs mt-8 pb-2" style={{ color: "var(--ink-light)" }}>
        Review all items with the listing agent before acting.
      </p>
    </div>
  );
}

// ─── MARKETING ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md font-medium transition-colors"
      style={
        copied
          ? { background: "#DCFCE7", color: "#166534" }
          : { color: "var(--ink-light)" }
      }
      onMouseEnter={(e) => { if (!copied) { (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)"; (e.currentTarget as HTMLButtonElement).style.background = "#F0EBE3"; } }}
      onMouseLeave={(e) => { if (!copied) { (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-light)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; } }}
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

function MarketingContent({ output: initial }: { output: MarketingOutput }) {
  const [output, setOutput] = useState(initial);
  const [activeTab, setActiveTab] = useState<"mls" | "social" | "presentation">("mls");

  const tabs = [
    { id: "mls" as const, label: "MLS Remarks" },
    { id: "social" as const, label: "Facebook Post" },
    { id: "presentation" as const, label: "Presentation" },
  ];

  const textareaStyle = {
    border: "1px solid var(--cream-border)",
    borderRadius: "0.75rem",
    padding: "1rem",
    fontSize: "0.875rem",
    color: "var(--ink)",
    background: "var(--surface)",
    width: "100%",
    resize: "none" as const,
    lineHeight: "1.625",
    outline: "none",
    fontFamily: "var(--font-geist-sans)",
  };

  return (
    <div className="p-6">
      <div className="flex gap-1 p-1 rounded-lg border mb-6" style={{ background: "#F0EBE3", borderColor: "var(--cream-border)" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className="flex-1 text-sm py-1.5 px-3 rounded-md font-medium transition-colors"
            style={
              activeTab === t.id
                ? { background: "var(--surface)", color: "var(--ink)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "1px solid var(--cream-border)" }
                : { color: "var(--ink-mid)", border: "1px solid transparent" }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "mls" && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-light)" }}>
                MLS Remarks
              </span>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={
                  output.mlsRemarks.length > 800
                    ? { background: "#FEF2F2", color: "var(--crimson)", border: "1px solid #FECACA" }
                    : { background: "#F0FDF4", color: "#166534", border: "1px solid #BBF7D0" }
                }
              >
                {output.mlsRemarks.length} / 800 chars
              </span>
            </div>
            <CopyButton text={output.mlsRemarks} />
          </div>
          <textarea
            rows={9}
            style={textareaStyle}
            value={output.mlsRemarks}
            onChange={(e) => setOutput({ ...output, mlsRemarks: e.target.value })}
            onFocus={(e) => (e.target.style.borderColor = "#9C9189")}
            onBlur={(e) => (e.target.style.borderColor = "var(--cream-border)")}
          />
        </div>
      )}

      {activeTab === "social" && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-light)" }}>
              Facebook Post
            </span>
            <CopyButton text={output.socialPost} />
          </div>
          <textarea
            rows={9}
            style={textareaStyle}
            value={output.socialPost}
            onChange={(e) => setOutput({ ...output, socialPost: e.target.value })}
            onFocus={(e) => (e.target.style.borderColor = "#9C9189")}
            onBlur={(e) => (e.target.style.borderColor = "var(--cream-border)")}
          />
        </div>
      )}

      {activeTab === "presentation" && (
        <div className="space-y-3">
          {output.presentationPoints.map((pt, i) => (
            <div key={i} className="border rounded-xl p-4" style={{ borderColor: "var(--cream-border)", background: "var(--surface)" }}>
              <p className="font-semibold text-sm mb-1" style={{ color: "var(--ink)" }}>{pt.heading}</p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--ink-mid)" }}>{pt.body}</p>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs mt-6" style={{ color: "var(--ink-light)" }}>Review all content before use.</p>
    </div>
  );
}

// ─── OUTREACH ───────────────────────────────────────────────────────────────

function OutreachContent({ output: initial, deal }: { output: OutreachOutput; deal: DealFields }) {
  const [output, setOutput] = useState(initial);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [approvedAt, setApprovedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setApproving(true);
    setError(null);
    try {
      const res = await fetch("/api/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealAddress: `${deal.address}, ${deal.city} ${deal.state}`,
          agentName: deal.listingAgent,
          messageText: output.agentMessage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setApproved(true);
      setApprovedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setApproving(false);
    }
  }

  const textareaStyle = {
    border: "1px solid var(--cream-border)",
    borderRadius: "0.75rem",
    padding: "1rem",
    fontSize: "0.875rem",
    color: "var(--ink)",
    background: approved ? "#F5F0E8" : "var(--surface)",
    width: "100%",
    resize: "none" as const,
    lineHeight: "1.625",
    outline: "none",
    fontFamily: "var(--font-geist-sans)",
  };

  return (
    <div className="p-6 space-y-5">
      {(output.urgentFlags?.length ?? 0) > 0 && (
        <div className="rounded-xl p-4 border" style={{ background: "#FEF2F2", borderColor: "#FECACA" }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--crimson)" }}>
            Action required
          </p>
          <ul className="space-y-1">
            {output.urgentFlags!.map((flag, i) => (
              <li key={i} className="text-sm flex gap-2" style={{ color: "#9B1C1C" }}>
                <span className="flex-shrink-0 mt-0.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9.303 3.376c.866 1.5-.217 3.374-1.948 3.374H4.645c-1.73 0-2.813-1.874-1.948-3.374l5.304-9.126c.866-1.5 3.032-1.5 3.898 0L20.303 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </span>
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-light)" }}>
            Draft to {deal.listingAgent}
          </p>
          {!approved && <CopyButton text={output.agentMessage} />}
        </div>
        <textarea
          rows={8}
          style={textareaStyle}
          value={output.agentMessage}
          onChange={(e) => setOutput({ ...output, agentMessage: e.target.value })}
          onFocus={(e) => (e.target.style.borderColor = "#9C9189")}
          onBlur={(e) => (e.target.style.borderColor = "var(--cream-border)")}
          disabled={approved}
        />
      </div>

      {!approved ? (
        <div className="rounded-xl p-4 border" style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold" style={{ color: "#92400E" }}>Broker approval required</p>
              <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "#B45309" }}>
                <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Wilson Moore must approve before this reaches {deal.listingAgent}.
              </p>
            </div>
            <button
              onClick={approve}
              disabled={approving}
              className="flex-shrink-0 px-4 py-2 text-sm font-semibold rounded-lg transition-colors active:scale-[0.98] disabled:opacity-60"
              style={{ background: "var(--crimson)", color: "white" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#7F1D1D"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--crimson)"; }}
            >
              {approving ? "Sending..." : "Approve & Send"}
            </button>
          </div>
          {error && <p className="text-xs mt-2" style={{ color: "var(--crimson)" }}>{error}</p>}
        </div>
      ) : (
        <div className="rounded-xl p-4 border flex items-center gap-3" style={{ background: "#F0FDF4", borderColor: "#BBF7D0" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#166534" }}>
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "#166534" }}>
              Sent to {deal.listingAgent} at {approvedAt}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#15803D" }}>Harriett logged this action for audit.</p>
          </div>
        </div>
      )}

      <p className="text-xs" style={{ color: "var(--ink-light)" }}>All outreach reviewed before sending.</p>
    </div>
  );
}

// ─── MAIN ───────────────────────────────────────────────────────────────────

type TabId = "checklist" | "marketing" | "outreach";
const TABS: { id: TabId; label: string }[] = [
  { id: "checklist", label: "Transaction Checklist" },
  { id: "marketing", label: "Marketing" },
  { id: "outreach", label: "Agent Outreach" },
];

interface AsyncState<T> { loading: boolean; data: T | null; error: string | null }

export default function HarriettOutput({
  deal,
  onDealChange,
  onChecklistReady,
}: {
  deal: DealFields;
  onDealChange: (d: DealFields) => void;
  onChecklistReady?: () => void;
}) {
  const isBroker = getUser()?.role === "broker";
  const visibleTabs = TABS.filter((t) => t.id !== "outreach" || isBroker);

  const [activeTab, setActiveTab] = useState<TabId>("checklist");
  const [checklist, setChecklist] = useState<AsyncState<ChecklistItem[]>>({ loading: true, data: null, error: null });
  const [marketing, setMarketing] = useState<AsyncState<MarketingOutput>>({ loading: true, data: null, error: null });
  const [outreach, setOutreach] = useState<AsyncState<OutreachOutput>>({ loading: true, data: null, error: null });

  useEffect(() => {
    async function fetchChecklist() {
      try {
        const res = await fetch("/api/checklist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(deal) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setChecklist({ loading: false, data: data.items, error: null });
      } catch (e) {
        setChecklist({ loading: false, data: null, error: e instanceof Error ? e.message : "Failed" });
      } finally {
        onChecklistReady?.();
      }
    }
    async function fetchMarketing() {
      try {
        const res = await fetch("/api/marketing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(deal) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setMarketing({ loading: false, data, error: null });
      } catch (e) { setMarketing({ loading: false, data: null, error: e instanceof Error ? e.message : "Failed" }); }
    }
    async function fetchOutreach() {
      if (!isBroker) return;
      try {
        const res = await fetch("/api/outreach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(deal) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setOutreach({ loading: false, data, error: null });
      } catch (e) { setOutreach({ loading: false, data: null, error: e instanceof Error ? e.message : "Failed" }); }
    }

    fetchChecklist();
    fetchMarketing();
    fetchOutreach();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getTabState = (id: TabId): "loading" | "error" | "ready" | "empty" => {
    const state = id === "checklist" ? checklist : id === "marketing" ? marketing : outreach;
    if (state.loading) return "loading";
    if (state.error) return "error";
    if (state.data) return "ready";
    return "empty";
  };

  return (
    <div className="flex-1 flex flex-col">
      <div
        className="flex-1 max-w-[1400px] mx-auto w-full flex flex-col md:flex-row gap-5 px-4 md:px-6 py-6"
        style={{ alignItems: "flex-start" }}
      >
        <DealSidebar deal={deal} />

        <div className="flex-1 min-w-0">
          <div className="rounded-xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--cream-border)" }}>
            {/* Tab bar */}
            <div className="flex border-b" style={{ borderColor: "var(--cream-border)" }}>
              {visibleTabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className="flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2"
                  style={{
                    color: activeTab === t.id ? "var(--ink)" : "var(--ink-mid)",
                    borderBottomColor: activeTab === t.id ? "var(--crimson)" : "transparent",
                  }}
                  onMouseEnter={(e) => { if (activeTab !== t.id) (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)"; }}
                  onMouseLeave={(e) => { if (activeTab !== t.id) (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-mid)"; }}
                >
                  {t.label}
                  {(() => {
                    const state = getTabState(t.id);
                    if (state === "loading") {
                      return (
                        <span
                          className="w-1.5 h-1.5 rounded-full animate-pulse"
                          style={{ background: "var(--crimson)" }}
                        />
                      );
                    }
                    if (state === "error") {
                      return (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "#B45309" }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                      );
                    }
                    if (state === "ready") {
                      return (
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: "var(--crimson)" }}
                        />
                      );
                    }
                    return null;
                  })()}
                </button>
              ))}
            </div>

            {/* Content */}
            {activeTab === "checklist" && (
              checklist.loading ? <ChecklistSkeleton /> :
              checklist.error ? <div className="p-6 text-sm" style={{ color: "var(--crimson)" }}>{checklist.error}</div> :
              <ChecklistContent items={checklist.data!} />
            )}
            {activeTab === "marketing" && (
              marketing.loading ? <MarketingSkeleton /> :
              marketing.error ? <div className="p-6 text-sm" style={{ color: "var(--crimson)" }}>{marketing.error}</div> :
              <MarketingContent output={marketing.data!} />
            )}
            {activeTab === "outreach" && (
              outreach.loading ? <OutreachSkeleton /> :
              outreach.error ? <div className="p-6 text-sm" style={{ color: "var(--crimson)" }}>{outreach.error}</div> :
              <OutreachContent output={outreach.data!} deal={deal} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
