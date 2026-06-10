"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUser, clearUser, type HarriettUser } from "../lib/auth";
import {
  DEALS, APPROVAL_QUEUE, ACTIVITY, PRE_LISTING, COORD_TASKS, VENDORS, VENDOR_LABELS,
  NOTIFICATIONS, TODOS,
  type Deal, type ApprovalItem, type CoordTask, type Vendor, type AppNotification,
  type TodoItem, type ActivityItem,
} from "../lib/demo-data";

// ─── NAV ────────────────────────────────────────────────────────────────────

function DashNav({ user, onSignOut }: { user: HarriettUser; onSignOut: () => void }) {
  const [bellOpen, setBellOpen] = useState(false);
  const [notifs, setNotifs] = useState<AppNotification[]>(NOTIFICATIONS);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function out(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    }
    if (bellOpen) document.addEventListener("mousedown", out);
    return () => document.removeEventListener("mousedown", out);
  }, [bellOpen]);

  const unread = notifs.filter((n) => !n.read).length;

  const roleColors = {
    broker:      { bg: "#FEF2F2", border: "#FECACA", text: "var(--crimson)" },
    agent:       { bg: "#F0F9FF", border: "#BAE6FD", text: "#0369A1" },
    coordinator: { bg: "#F0FDF4", border: "#BBF7D0", text: "#166534" },
  }[user.role];

  return (
    <header className="px-6 py-3.5 flex-shrink-0 border-b" style={{ background: "var(--ink)", borderColor: "#2C2820" }}>
      <div className="max-w-[1600px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-lg font-semibold tracking-tight" style={{ fontFamily: "var(--font-playfair)", color: "#F5F0E8" }}>
            Harriett<span style={{ color: "var(--crimson)" }}>.</span>
          </span>
          <nav className="hidden md:flex items-center gap-5">
            {[
              { label: "Dashboard",       href: "/dashboard" },
              { label: "Calendar",        href: "/calendar" },
              { label: "Transaction",     href: "/demo" },
              { label: "Pre-Listing CMA", href: "/pre-listing" },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="text-sm transition-colors"
                style={{ color: "#9C9189" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#D4CFC8")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#9C9189")}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div ref={bellRef} className="relative">
            <button onClick={() => setBellOpen((p) => !p)}
              className="relative p-1.5 rounded-lg transition-colors"
              style={{ color: "#9C9189" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#D4CFC8")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#9C9189")}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {unread > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 flex items-center justify-center text-[9px] font-bold rounded-full"
                  style={{ background: "var(--crimson)", color: "white", transform: "translate(30%,-30%)" }}>
                  {unread}
                </span>
              )}
            </button>

            {bellOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border overflow-hidden shadow-xl z-50"
                style={{ background: "var(--surface)", borderColor: "var(--cream-border)" }}>
                <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--cream-border)" }}>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ink)" }}>Notifications</p>
                  {unread > 0 && (
                    <button onClick={() => setNotifs((p) => p.map((n) => ({ ...n, read: true })))}
                      className="text-xs" style={{ color: "var(--crimson)" }}>
                      Mark all read
                    </button>
                  )}
                </div>
                <div style={{ maxHeight: "320px", overflowY: "auto" }}>
                  {notifs.map((n) => (
                    <div key={n.id}
                      className="px-4 py-3 flex items-start gap-3 border-b last:border-0 cursor-pointer"
                      style={{ borderColor: "var(--cream-border)", background: n.read ? "transparent" : "#FEFCFB" }}
                      onClick={() => setNotifs((p) => p.map((x) => x.id === n.id ? { ...x, read: true } : x))}
                    >
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{
                          background: n.type === "flag" ? "#FEF2F2" : n.type === "action" ? "#F0FDF4" : "var(--cream)",
                          border: `1px solid ${n.type === "flag" ? "#FECACA" : n.type === "action" ? "#BBF7D0" : "var(--cream-border)"}`,
                        }}>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                          style={{ color: n.type === "flag" ? "var(--crimson)" : n.type === "action" ? "#166534" : "var(--ink-mid)" }}>
                          {n.type === "flag"
                            ? <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            : n.type === "action"
                            ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            : <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />}
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold leading-snug" style={{ color: "var(--ink)" }}>{n.text}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-mid)" }}>{n.sub}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: "var(--ink-light)" }}>{n.timeAgo}</p>
                      </div>
                      {!n.read && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2" style={{ background: "var(--crimson)" }} />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: roleColors.bg, border: `1px solid ${roleColors.border}`, color: roleColors.text }}>
              {user.initials}
            </div>
            <div className="text-right">
              <p className="text-xs font-medium leading-none" style={{ color: "#D4CFC8" }}>{user.name}</p>
              <p className="text-[10px] mt-0.5 capitalize" style={{ color: "#6B6358" }}>{user.role}</p>
            </div>
          </div>
          <button onClick={onSignOut} className="text-xs px-2.5 py-1.5 rounded-md border transition-colors"
            style={{ color: "#6B6358", borderColor: "#3A342C" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#9C9189")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#6B6358")}
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

// ─── STAGE CONSTANTS ────────────────────────────────────────────────────────

const STAGE_LABELS: Record<Deal["stage"], string> = {
  "listing-active": "Active Listing",
  "under-contract": "Under Contract",
  closing: "Closing",
  closed: "Closed",
};

const STAGE_COLORS: Record<Deal["stage"], { bg: string; text: string; border: string }> = {
  "listing-active": { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
  "under-contract": { bg: "#FFFBEB", text: "#B45309", border: "#FDE68A" },
  closing:          { bg: "#F0FDF4", text: "#166534", border: "#BBF7D0" },
  closed:           { bg: "var(--cream)", text: "var(--ink-mid)", border: "var(--cream-border)" },
};

function shortDate(d: string) { return d.replace(/, \d{4}$/, ""); }

// ─── STAT TILES ─────────────────────────────────────────────────────────────

type TileVariant = "neutral" | "urgent" | "good";
interface StatTile { value: string; label: string; variant: TileVariant }

const TILE_STYLES: Record<TileVariant, { bg: string; border: string; value: string; label: string }> = {
  neutral: { bg: "var(--cream)",  border: "var(--cream-border)", value: "var(--ink)",     label: "var(--ink-mid)" },
  urgent:  { bg: "#FEF2F2",       border: "#FECACA",             value: "var(--crimson)", label: "var(--crimson)" },
  good:    { bg: "#F0FDF4",       border: "#BBF7D0",             value: "#166534",        label: "#166534" },
};

function StatTiles({ tiles }: { tiles: StatTile[] }) {
  return (
    <div className="flex gap-3 mb-6">
      {tiles.map((t) => {
        const s = TILE_STYLES[t.variant];
        return (
          <div key={t.label} className="rounded-xl border px-5 py-3"
            style={{ background: s.bg, borderColor: s.border, width: "160px", flexShrink: 0 }}>
            <p className="text-2xl font-bold leading-none" style={{ color: s.value }}>{t.value}</p>
            <p className="text-[11px] mt-1.5 font-medium" style={{ color: s.label }}>{t.label}</p>
          </div>
        );
      })}
    </div>
  );
}

// ─── DEAL TABLE ─────────────────────────────────────────────────────────────

function DealTable({ deals, showAgent }: { deals: Deal[]; showAgent?: boolean }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (deals.length === 0) {
    return (
      <div className="rounded-xl border p-8 text-center" style={{ background: "var(--surface)", borderColor: "var(--cream-border)" }}>
        <p className="text-sm font-medium mb-1" style={{ color: "var(--ink)" }}>No active deals.</p>
        <p className="text-xs mb-4" style={{ color: "var(--ink-mid)" }}>Upload a contract in the Transaction tool to get started.</p>
        <Link href="/demo"
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg transition-all active:scale-[0.98]"
          style={{ background: "var(--ink)", color: "var(--cream)" }}>
          Open Transaction tool
        </Link>
      </div>
    );
  }

  const cols = showAgent
    ? "grid-cols-[1fr_110px_110px_72px_24px]"
    : "grid-cols-[1fr_120px_80px_24px]";

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--cream-border)" }}>
      {/* Header */}
      <div className={`grid ${cols} px-4 py-2 border-b`}
        style={{ background: "#F0EDE6", borderColor: "var(--cream-border)" }}>
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--ink-light)" }}>Address</span>
        {showAgent && <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--ink-light)" }}>Agent</span>}
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--ink-light)" }}>Status</span>
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--ink-light)" }}>Closes</span>
        <span />
      </div>

      {/* Rows */}
      {deals.map((deal) => {
        const stage = STAGE_COLORS[deal.stage];
        const open = expandedId === deal.id;
        return (
          <div key={deal.id} className="border-b last:border-0" style={{ borderColor: "var(--cream-border)" }}>
            <button
              className={`w-full grid ${cols} px-4 py-3 text-left items-center transition-colors`}
              style={{ background: open ? "#FEFCFA" : "transparent" }}
              onMouseEnter={(e) => { if (!open) (e.currentTarget as HTMLButtonElement).style.background = "#FEFCFA"; }}
              onMouseLeave={(e) => { if (!open) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              onClick={() => setExpandedId(open ? null : deal.id)}
            >
              <span className="text-sm font-semibold truncate pr-2" style={{ color: "var(--ink)" }}>
                {deal.address}
                {deal.urgentFlags.length > 0 && (
                  <span className="ml-1.5 text-[10px] font-bold" style={{ color: "var(--crimson)" }}>⚠</span>
                )}
              </span>
              {showAgent && (
                <span className="text-xs truncate pr-2" style={{ color: "var(--ink-mid)" }}>{deal.agent}</span>
              )}
              <span className="flex-shrink-0">
                <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full border"
                  style={{ background: stage.bg, color: stage.text, borderColor: stage.border }}>
                  {STAGE_LABELS[deal.stage]}
                </span>
              </span>
              <span className="text-xs" style={{ color: "var(--ink-mid)" }}>
                {deal.stage === "listing-active" ? "—" : shortDate(deal.closingDate)}
              </span>
              <span className="text-[10px] text-center" style={{ color: "var(--ink-light)" }}>{open ? "▲" : "▼"}</span>
            </button>

            {open && (
              <div className="px-4 pb-4 pt-3" style={{ background: "#FEFCFA", borderTop: "1px dashed var(--cream-border)" }}>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mb-3">
                  <p className="text-xs" style={{ color: "var(--ink-mid)" }}>
                    <span className="font-semibold" style={{ color: "var(--ink)" }}>${deal.price.toLocaleString()}</span>
                    {" "}&middot; {deal.loanType}
                  </p>
                  <p className="text-xs" style={{ color: "var(--ink-mid)" }}>
                    Checklist: {deal.checklist.completed}/{deal.checklist.total}
                  </p>
                  {deal.closingDate && deal.stage !== "listing-active" && (
                    <p className="text-xs" style={{ color: "var(--ink-mid)" }}>
                      Closes {shortDate(deal.closingDate)}
                    </p>
                  )}
                  <p className="text-xs" style={{ color: "var(--ink-mid)" }}>{deal.city}</p>
                </div>
                {deal.urgentFlags.length > 0 && (
                  <div className="space-y-1 mb-3">
                    {deal.urgentFlags.map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg"
                        style={{ background: "#FEF2F2", color: "var(--crimson)" }}>
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                        <span className="font-medium">{f}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Link href="/demo"
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all active:scale-[0.98]"
                    style={{ background: "var(--ink)", color: "var(--cream)" }}>
                    Open deal
                  </Link>
                  <Link href="/demo"
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-all"
                    style={{ borderColor: "var(--cream-border)", color: "var(--ink-mid)" }}>
                    Checklist
                  </Link>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── LEFT RAIL ───────────────────────────────────────────────────────────────

interface NavItem { key: string; label: string; sub?: string; pulse?: boolean }
interface CtaItem { label: string; href: string; primary: boolean }

function LeftRail({ items, ctas, active, onSelect, middle }: {
  items: NavItem[];
  ctas: CtaItem[];
  active: string;
  onSelect: (key: string) => void;
  middle?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-full overflow-y-auto border-r"
      style={{ background: "#FAFAF8", borderColor: "var(--cream-border)" }}>
      <nav className="pt-4 pb-2">
        {items.map((item) => {
          const isActive = item.key === active;
          return (
            <button key={item.key}
              onClick={() => onSelect(item.key)}
              className="w-full text-left px-4 py-2.5 transition-colors relative"
              style={{
                background: isActive ? "var(--cream)" : "transparent",
                borderLeft: isActive ? "2px solid var(--crimson)" : "2px solid transparent",
              }}>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold leading-none"
                  style={{ color: isActive ? "var(--crimson)" : "var(--ink)" }}>
                  {item.label}
                </span>
                {item.pulse && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "var(--crimson)" }} />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "var(--crimson)" }} />
                  </span>
                )}
              </div>
              {item.sub && (
                <p className="text-[10px] mt-0.5 leading-none" style={{ color: isActive ? "var(--crimson)" : "var(--ink-light)" }}>
                  {item.sub}
                </p>
              )}
            </button>
          );
        })}
      </nav>

      {middle}

      {ctas.length > 0 && (
        <div className="mt-auto p-3 border-t space-y-2" style={{ borderColor: "var(--cream-border)" }}>
          {ctas.map((cta) => (
            <Link key={cta.label} href={cta.href}
              className="block text-center text-xs font-semibold px-3 py-2 rounded-lg transition-all active:scale-[0.98]"
              style={cta.primary
                ? { background: "var(--ink)", color: "var(--cream)" }
                : { border: "1px solid var(--cream-border)", color: "var(--ink-mid)", background: "transparent" }
              }>
              {cta.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── APPROVAL CARD ───────────────────────────────────────────────────────────

function ApprovalCard({ item, onApprove }: { item: ApprovalItem; onApprove: (id: string) => void }) {
  const [approving, setApproving] = useState(false);
  const [done, setDone] = useState(false);

  function approve() {
    setApproving(true);
    setTimeout(() => { setApproving(false); setDone(true); onApprove(item.id); }, 900);
  }

  if (done) return null;

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--cream-border)" }}>
      <div className="px-4 py-3 border-b flex items-start justify-between gap-3" style={{ borderColor: "var(--cream-border)" }}>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--ink-light)" }}>
            Draft to {item.toAgent}
          </p>
          <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{item.address}</p>
        </div>
        <span className="text-[10px]" style={{ color: "var(--ink-light)" }}>
          {new Date(item.draftedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      {item.urgentFlags.length > 0 && (
        <div className="px-4 py-2 border-b space-y-1" style={{ borderColor: "var(--cream-border)", background: "#FEF2F2" }}>
          {item.urgentFlags.map((f, i) => (
            <p key={i} className="text-[11px] font-medium" style={{ color: "var(--crimson)" }}>&bull; {f}</p>
          ))}
        </div>
      )}
      <div className="px-4 py-3 border-b" style={{ borderColor: "var(--cream-border)" }}>
        <p className="text-sm leading-relaxed line-clamp-3" style={{ color: "var(--ink-mid)" }}>
          &ldquo;{item.preview}&rdquo;
        </p>
      </div>
      <div className="px-4 py-3 flex items-center gap-2">
        <button onClick={approve} disabled={approving}
          className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-150 active:scale-[0.98] disabled:opacity-60"
          style={{ background: "var(--ink)", color: "var(--cream)" }}>
          {approving ? "Sending..." : "Approve & Send"}
        </button>
        <Link href="/demo" className="px-4 py-2 rounded-lg text-sm font-medium border transition-all"
          style={{ borderColor: "var(--cream-border)", color: "var(--ink-mid)" }}>
          Edit
        </Link>
      </div>
    </div>
  );
}

// ─── COORD TASK CARD ─────────────────────────────────────────────────────────

const TASK_ICONS: Record<CoordTask["type"], React.ReactNode> = {
  photos:    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"/><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"/></svg>,
  mls:       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"/></svg>,
  folder:    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"/></svg>,
  postcard:  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.981l7.5-4.039a2.25 2.25 0 012.134 0l7.5 4.039a2.25 2.25 0 011.183 1.98V19.5z"/></svg>,
  checklist: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  news:      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z"/></svg>,
};

function CoordTaskCard({ task, onDone }: { task: CoordTask; onDone: (id: string) => void }) {
  const [done, setDone] = useState(false);
  if (done) return null;
  return (
    <div className="flex gap-3 items-start p-3.5 rounded-xl border transition-all"
      style={{ background: task.urgent ? "#FEFCFB" : "var(--surface)", borderColor: task.urgent ? "#FECACA" : "var(--cream-border)" }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: task.urgent ? "#FEF2F2" : "var(--cream)", color: task.urgent ? "var(--crimson)" : "var(--ink-mid)", border: `1px solid ${task.urgent ? "#FECACA" : "var(--cream-border)"}` }}>
        {TASK_ICONS[task.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium leading-snug" style={{ color: "var(--ink)" }}>{task.task}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--ink-mid)" }}>{task.address} &middot; {task.agent}</p>
          </div>
          {task.urgent && <span className="flex-shrink-0 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded" style={{ background: "#FEF2F2", color: "var(--crimson)" }}>Urgent</span>}
        </div>
      </div>
      <button onClick={() => { setDone(true); onDone(task.id); }}
        className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-1.5 transition-all"
        style={{ borderColor: "#C8BFB4" }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.borderColor = "var(--ink)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.borderColor = "#C8BFB4")}
      />
    </div>
  );
}

// ─── VENDOR ROW ──────────────────────────────────────────────────────────────

const VENDOR_ICONS: Record<string, React.ReactNode> = {
  photographer: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"/><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"/></svg>,
  inspector:    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>,
  title:        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>,
  lender:       <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z"/></svg>,
  appraiser:    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/></svg>,
  insurance:    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg>,
  deed:         <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"/></svg>,
  other:        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg>,
};

function VendorRow({ vendor }: { vendor: Vendor }) {
  const [drafting, setDrafting] = useState(false);
  const [drafted, setDrafted] = useState(false);
  function draftOutreach() { setDrafting(true); setTimeout(() => { setDrafting(false); setDrafted(true); }, 1200); }
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b last:border-0" style={{ borderColor: "var(--cream-border)" }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--cream)", border: "1px solid var(--cream-border)", color: "var(--ink-mid)" }}>
        {VENDOR_ICONS[vendor.category] ?? VENDOR_ICONS.other}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight" style={{ color: "var(--ink)" }}>{vendor.name}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--ink-mid)" }}>
          {VENDOR_LABELS[vendor.category]} &middot; {vendor.contact} &middot; {vendor.phone}
        </p>
        {vendor.lastUsed && <p className="text-[10px] mt-0.5" style={{ color: "var(--ink-light)" }}>Last used {vendor.lastUsed}</p>}
      </div>
      {vendor.harriettCanContact && (
        <button onClick={draftOutreach} disabled={drafting || drafted}
          className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all active:scale-[0.98] disabled:opacity-60"
          style={drafted
            ? { background: "#F0FDF4", borderColor: "#BBF7D0", color: "#166534" }
            : { borderColor: "var(--cream-border)", color: "var(--ink-mid)", background: "transparent" }
          }>
          {drafting ? "Drafting..." : drafted ? "Draft ready" : "Harriett outreach"}
        </button>
      )}
    </div>
  );
}

// ─── ACTIVITY FEED ───────────────────────────────────────────────────────────

function ActivityFeed({ items, limit }: { items: ActivityItem[]; limit?: number }) {
  const visible = limit ? items.slice(0, limit) : items;
  return (
    <div className="rounded-xl border overflow-hidden divide-y" style={{ background: "var(--surface)", borderColor: "var(--cream-border)" }}>
      {visible.map((a) => {
        const accent = a.type === "flag" ? "var(--crimson)" : (a.type === "mls" || a.type === "postcard") ? "#15803d" : "var(--ink-mid)";
        return (
          <div key={a.id} className="flex items-start" style={{ borderLeft: `3px solid ${accent}` }}>
            <div className="px-3 py-3 flex items-start gap-3 flex-1 min-w-0">
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: a.type === "flag" ? "#FEF2F2" : "var(--cream)", border: `1px solid ${a.type === "flag" ? "#FECACA" : "var(--cream-border)"}` }}>
                <svg className="w-2.5 h-2.5" style={{ color: a.type === "flag" ? "var(--crimson)" : "var(--ink-mid)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {a.type === "flag"
                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    : <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold leading-snug" style={{ color: "var(--ink)" }}>{a.text}</p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-mid)" }}>{a.sub}</p>
              </div>
              <p className="text-[10px] flex-shrink-0 mt-0.5" style={{ color: "var(--ink-light)" }}>{a.timeAgo}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── TODO LIST (sidebar) ─────────────────────────────────────────────────────

function SidebarTodos({ role }: { role: "broker" | "agent" | "coordinator" }) {
  const [todos, setTodos] = useState<TodoItem[]>(TODOS.filter((t) => t.roleFor === role));
  if (todos.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ink)" }}>My To-Dos</p>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: "#FEF2F2", color: "var(--crimson)", border: "1px solid #FECACA" }}>
          {todos.length}
        </span>
      </div>
      <div className="rounded-xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--cream-border)" }}>
        {todos.map((t) => (
          <div key={t.id} className="flex items-start gap-2.5 px-3 py-2.5 border-b last:border-0"
            style={{ borderColor: "var(--cream-border)" }}>
            <button
              onClick={() => setTodos((p) => p.filter((x) => x.id !== t.id))}
              className="w-3.5 h-3.5 rounded border-2 flex-shrink-0 mt-0.5 transition-all"
              style={{ borderColor: t.urgent ? "var(--crimson)" : "#C8BFB4" }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold leading-snug" style={{ color: "var(--ink)" }}>{t.text}</p>
              {t.sub && <p className="text-[10px] mt-0.5" style={{ color: "var(--ink-mid)" }}>{t.sub}</p>}
            </div>
            {t.urgent && (
              <span className="flex-shrink-0 text-[9px] font-bold px-1 py-0.5 rounded"
                style={{ background: "#FEF2F2", color: "var(--crimson)" }}>!</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PRE-LISTING LIST ────────────────────────────────────────────────────────

function PreListingList({ items, showAgent }: { items: typeof PRE_LISTING; showAgent?: boolean }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border p-6 text-center" style={{ background: "var(--surface)", borderColor: "var(--cream-border)" }}>
        <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>No upcoming appointments.</p>
        <p className="text-xs mt-1" style={{ color: "var(--ink-mid)" }}>Build a CMA to get started.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between p-4 rounded-xl border"
          style={{ background: "var(--surface)", borderColor: "var(--cream-border)" }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{item.address}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--ink-mid)" }}>
              {showAgent && `${item.agent} · `}Appt {item.appointmentDate}
            </p>
          </div>
          <Link href="/pre-listing"
            className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all"
            style={{ borderColor: "var(--cream-border)", color: "var(--ink-mid)" }}>
            {item.status === "cma-ready" ? "View CMA" : "Build CMA"}
          </Link>
        </div>
      ))}
    </div>
  );
}

// ─── SECTION HEADING ────────────────────────────────────────────────────────

function SectionHeading({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--ink)" }}>{title}</h2>
      {count != null && (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{ background: count > 0 ? "#FEF2F2" : "var(--cream)", color: count > 0 ? "var(--crimson)" : "var(--ink-light)", border: `1px solid ${count > 0 ? "#FECACA" : "var(--cream-border)"}` }}>
          {count}
        </span>
      )}
    </div>
  );
}

// ─── URGENCY PANEL ───────────────────────────────────────────────────────────

interface UrgencyItem { id: string; text: string; sub?: string; address?: string }
interface UpcomingItem { key: string; date: string; text: string }

function UrgencySection({
  label, count, variant, children,
}: {
  label: string; count: number; variant: "overdue" | "today" | "upcoming" | "harriett"; children: React.ReactNode;
}) {
  const styles = {
    overdue:  { bg: "#FEF2F2", border: "#FECACA", label: "var(--crimson)", prefix: "⚠ " },
    today:    { bg: "#FFFBEB", border: "#FDE68A", label: "#B45309",        prefix: "" },
    upcoming: { bg: "var(--cream)", border: "var(--cream-border)", label: "var(--ink-mid)", prefix: "" },
    harriett: { bg: "var(--cream)", border: "var(--cream-border)", label: "var(--ink-mid)", prefix: "" },
  }[variant];

  if (count === 0 && variant !== "harriett") return null;

  return (
    <div className="border-b px-4 py-3.5" style={{ borderColor: styles.border, background: variant === "overdue" || variant === "today" ? styles.bg : "transparent" }}>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5"
        style={{ color: styles.label }}>
        {styles.prefix}{label}{count > 0 ? ` · ${count}` : ""}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function UrgencyPanel({
  overdue, dueToday, upcoming, harriettDid, ctas,
}: {
  overdue: UrgencyItem[];
  dueToday: UrgencyItem[];
  upcoming: UpcomingItem[];
  harriettDid: ActivityItem[];
  ctas: CtaItem[];
}) {
  return (
    <div className="flex flex-col h-full overflow-y-auto border-r"
      style={{ background: "#FAFAF8", borderColor: "var(--cream-border)" }}>

      <UrgencySection label="Overdue" count={overdue.length} variant="overdue">
        {overdue.map((item) => (
          <div key={item.id} className="rounded-lg border px-3 py-2.5"
            style={{ background: "white", borderColor: "#FECACA" }}>
            <p className="text-xs font-semibold leading-snug" style={{ color: "var(--ink)" }}>{item.text}</p>
            {item.sub && <p className="text-[10px] mt-0.5" style={{ color: "var(--crimson)" }}>{item.sub}</p>}
          </div>
        ))}
      </UrgencySection>

      <UrgencySection label="Due Today" count={dueToday.length} variant="today">
        {dueToday.map((item) => (
          <div key={item.id} className="rounded-lg border px-3 py-2.5"
            style={{ background: "white", borderColor: "#FDE68A" }}>
            <p className="text-xs font-semibold leading-snug" style={{ color: "var(--ink)" }}>{item.text}</p>
            {item.sub && <p className="text-[10px] mt-0.5" style={{ color: "#B45309" }}>{item.sub}</p>}
          </div>
        ))}
      </UrgencySection>

      <UrgencySection label="Upcoming" count={upcoming.length} variant="upcoming">
        {upcoming.map((item) => (
          <div key={item.key} className="flex items-baseline gap-2 px-1 py-0.5">
            <span className="text-[10px] font-bold flex-shrink-0" style={{ color: "var(--ink)", minWidth: "36px" }}>{item.date}</span>
            <span className="text-[11px] leading-snug" style={{ color: "var(--ink-mid)" }}>{item.text}</span>
          </div>
        ))}
      </UrgencySection>

      <UrgencySection label="Harriett did · today" count={harriettDid.length} variant="harriett">
        {harriettDid.map((a) => {
          const accent = a.type === "flag" ? "var(--crimson)" : a.type === "mls" || a.type === "postcard" ? "#15803d" : "var(--ink-mid)";
          return (
            <div key={a.id} className="flex items-start gap-2 py-0.5"
              style={{ borderLeft: `2px solid ${accent}`, paddingLeft: "7px" }}>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold leading-snug" style={{ color: "var(--ink)" }}>{a.text}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--ink-light)" }}>{a.timeAgo}</p>
              </div>
            </div>
          );
        })}
      </UrgencySection>

      {ctas.length > 0 && (
        <div className="mt-auto p-3 border-t space-y-2" style={{ borderColor: "var(--cream-border)" }}>
          {ctas.map((cta) => (
            <Link key={cta.label} href={cta.href}
              className="block text-center text-xs font-semibold px-3 py-2 rounded-lg transition-all active:scale-[0.98]"
              style={cta.primary
                ? { background: "var(--ink)", color: "var(--cream)" }
                : { border: "1px solid var(--cream-border)", color: "var(--ink-mid)", background: "transparent" }
              }>
              {cta.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── DEADLINE CHIPS ──────────────────────────────────────────────────────────

function DeadlineChips({ deals }: { deals: Deal[] }) {
  const closing30 = deals.filter((d) => d.stage === "closing" || d.stage === "under-contract").length;
  const flagged    = deals.filter((d) => d.urgentFlags.length > 0).length;
  if (closing30 === 0 && flagged === 0) return null;
  return (
    <div className="flex gap-2 mb-4">
      {closing30 > 0 && (
        <span className="text-xs border rounded-full px-3 py-1 font-medium"
          style={{ background: "#F0FDF4", borderColor: "#BBF7D0", color: "#166534" }}>
          Closing soon · {closing30}
        </span>
      )}
      {flagged > 0 && (
        <span className="text-xs border rounded-full px-3 py-1 font-medium"
          style={{ background: "#FEF2F2", borderColor: "#FECACA", color: "var(--crimson)" }}>
          Flagged · {flagged}
        </span>
      )}
    </div>
  );
}

// ─── RIGHT PANEL TABS ────────────────────────────────────────────────────────

function RightTabs({ tabs, active, onSelect }: {
  tabs: { key: string; label: string; count?: number }[];
  active: string;
  onSelect: (k: string) => void;
}) {
  return (
    <div className="flex gap-1 mb-5 border-b pb-3" style={{ borderColor: "var(--cream-border)" }}>
      {tabs.map((t) => (
        <button key={t.key} onClick={() => onSelect(t.key)}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
          style={t.key === active
            ? { background: "var(--ink)", color: "var(--cream)" }
            : { background: "transparent", color: "var(--ink-mid)" }
          }>
          {t.label}{t.count != null ? ` (${t.count})` : ""}
        </button>
      ))}
    </div>
  );
}

// ─── AGENT VIEW ──────────────────────────────────────────────────────────────

function AgentView({ user }: { user: HarriettUser }) {
  const [tab, setTab] = useState("deals");
  const agentDeals = DEALS.filter((d) => d.stage !== "closed");
  const myPreListing = PRE_LISTING.filter((p) => p.agent === user.name);

  const overdue: UrgencyItem[]  = TODOS.filter((t) => t.roleFor === "agent" && t.urgent).map((t) => ({ id: t.id, text: t.text, sub: t.sub }));
  const dueToday: UrgencyItem[] = TODOS.filter((t) => t.roleFor === "agent" && !t.urgent).map((t) => ({ id: t.id, text: t.text, sub: t.sub }));
  const upcoming: UpcomingItem[] = agentDeals
    .filter((d) => d.stage !== "listing-active")
    .map((d) => ({ key: d.id, date: shortDate(d.closingDate), text: `Closing · ${d.address}` }));

  const ctas: CtaItem[] = [
    { label: "+ I have a listing", href: "/demo",        primary: true },
    { label: "Build a CMA",        href: "/pre-listing", primary: false },
  ];

  const tabs = [
    { key: "deals",       label: "Deals",       count: agentDeals.length },
    { key: "pre-listing", label: "Pre-Listing",  count: myPreListing.length },
    { key: "activity",    label: "Activity" },
    { key: "vendors",     label: "Vendors" },
  ];

  return (
    <div className="h-full" style={{ display: "grid", gridTemplateColumns: "280px 1fr" }}>
      <UrgencyPanel overdue={overdue} dueToday={dueToday} upcoming={upcoming} harriettDid={ACTIVITY.slice(0, 3)} ctas={ctas} />

      <div className="overflow-y-auto p-6">
        <div className="max-w-3xl">
          <div className="mb-5">
            <h1 className="text-xl font-semibold" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
              Good morning, {user.name.split(" ")[0]}.
            </h1>
            <p className="text-xs mt-1" style={{ color: "var(--ink-mid)" }}>
              {agentDeals.length} active {agentDeals.length === 1 ? "deal" : "deals"} &middot; Harriett is watching your inbox.
            </p>
          </div>

          <RightTabs tabs={tabs} active={tab} onSelect={setTab} />

          {tab === "deals" && (
            <>
              <DeadlineChips deals={agentDeals} />
              <DealTable deals={agentDeals} />
            </>
          )}
          {tab === "pre-listing" && <PreListingList items={myPreListing} />}
          {tab === "activity" && <ActivityFeed items={ACTIVITY} />}
          {tab === "vendors" && (
            <>
              <div className="rounded-xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--cream-border)" }}>
                {VENDORS.filter((v) => v.agentId === "jerrod").map((v) => <VendorRow key={v.id} vendor={v} />)}
              </div>
              <p className="text-[11px] mt-2 px-1" style={{ color: "var(--ink-light)" }}>Vendor data is private to your account.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── BROKER VIEW ─────────────────────────────────────────────────────────────

function BrokerView() {
  const [tab, setTab] = useState("deals");
  const [queue, setQueue] = useState(APPROVAL_QUEUE);
  const activeDeals = DEALS.filter((d) => d.stage !== "closed");
  function dismiss(id: string) { setQueue((prev) => prev.filter((a) => a.id !== id)); }

  const overdue: UrgencyItem[]  = queue.map((q) => ({ id: q.id, text: `Approve message · ${q.address}`, sub: q.urgentFlags[0] }));
  const dueToday: UrgencyItem[] = TODOS.filter((t) => t.roleFor === "broker" && t.urgent).map((t) => ({ id: t.id, text: t.text, sub: t.sub }));
  const upcoming: UpcomingItem[] = activeDeals
    .filter((d) => d.stage !== "listing-active")
    .map((d) => ({ key: d.id, date: shortDate(d.closingDate), text: `Closing · ${d.address} · ${d.agent}` }));

  const ctas: CtaItem[] = [{ label: "+ Listing", href: "/demo", primary: true }];

  const tabs = [
    { key: "deals",    label: "All Deals",      count: activeDeals.length },
    { key: "approval", label: "Approval Queue",  count: queue.length },
    { key: "pipeline", label: "Pre-Listing",     count: PRE_LISTING.length },
    { key: "activity", label: "Activity" },
  ];

  return (
    <div className="h-full" style={{ display: "grid", gridTemplateColumns: "280px 1fr" }}>
      <UrgencyPanel overdue={overdue} dueToday={dueToday} upcoming={upcoming} harriettDid={ACTIVITY.slice(0, 3)} ctas={ctas} />

      <div className="overflow-y-auto p-6">
        <div className="max-w-3xl">
          <div className="mb-5">
            <h1 className="text-xl font-semibold" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
              Good morning, Wilson.
            </h1>
            <p className="text-xs mt-1" style={{ color: "var(--ink-mid)" }}>
              {activeDeals.length} active deals &middot; {queue.length} pending approval
            </p>
          </div>

          <RightTabs tabs={tabs} active={tab} onSelect={setTab} />

          {tab === "deals" && (
            <>
              <DeadlineChips deals={activeDeals} />
              <DealTable deals={activeDeals} showAgent />
            </>
          )}
          {tab === "approval" && (
            queue.length === 0
              ? <div className="rounded-xl border p-8 text-center" style={{ background: "var(--surface)", borderColor: "var(--cream-border)" }}>
                  <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>All clear.</p>
                  <p className="text-xs mt-1" style={{ color: "var(--ink-light)" }}>No messages waiting for approval.</p>
                </div>
              : <div className="space-y-3">{queue.map((item) => <ApprovalCard key={item.id} item={item} onApprove={dismiss} />)}</div>
          )}
          {tab === "pipeline" && <PreListingList items={PRE_LISTING} showAgent />}
          {tab === "activity" && <ActivityFeed items={ACTIVITY} />}
        </div>
      </div>
    </div>
  );
}

// ─── COORDINATOR VIEW ────────────────────────────────────────────────────────

function CoordinatorView({ user }: { user: HarriettUser }) {
  const [tab, setTab] = useState("tasks");
  const [tasks, setTasks] = useState(COORD_TASKS);
  const activeDeals = DEALS.filter((d) => d.stage !== "closed");
  function completeTask(id: string) { setTasks((prev) => prev.filter((t) => t.id !== id)); }

  const urgentTasks = tasks.filter((t) => t.urgent);
  const normalTasks = tasks.filter((t) => !t.urgent);

  const overdue: UrgencyItem[]  = urgentTasks.map((t) => ({ id: t.id, text: t.task, sub: t.address }));
  const dueToday: UrgencyItem[] = normalTasks.map((t) => ({ id: t.id, text: t.task, sub: t.address }));
  const upcoming: UpcomingItem[] = [
    ...activeDeals.filter((d) => !d.mlsEntered).map((d) => ({ key: `mls-${d.id}`, date: "MLS", text: `Entry pending · ${d.address}` })),
    ...activeDeals.filter((d) => !d.postcardSent).map((d) => ({ key: `pc-${d.id}`, date: "Post", text: `Postcard pending · ${d.address}` })),
  ];

  const tabs = [
    { key: "tasks",    label: "Tasks",        count: tasks.length },
    { key: "files",    label: "Active Files", count: activeDeals.length },
    { key: "activity", label: "Activity" },
  ];

  return (
    <div className="h-full" style={{ display: "grid", gridTemplateColumns: "280px 1fr" }}>
      <UrgencyPanel overdue={overdue} dueToday={dueToday} upcoming={upcoming} harriettDid={ACTIVITY.slice(0, 3)} ctas={[]} />

      <div className="overflow-y-auto p-6">
        <div className="max-w-3xl">
          <div className="mb-5">
            <h1 className="text-xl font-semibold" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
              Good morning, {user.name.split(" ")[0]}.
            </h1>
            <p className="text-xs mt-1" style={{ color: "var(--ink-mid)" }}>
              {tasks.length} open tasks &middot; {urgentTasks.length} urgent
            </p>
          </div>

          <RightTabs tabs={tabs} active={tab} onSelect={setTab} />

          {tab === "tasks" && (
            <>
              {urgentTasks.length > 0 && (
                <>
                  <SectionHeading title="Needs Attention Now" count={urgentTasks.length} />
                  <div className="space-y-2 mb-5">
                    {urgentTasks.map((t) => <CoordTaskCard key={t.id} task={t} onDone={completeTask} />)}
                  </div>
                </>
              )}
              {normalTasks.length > 0 && (
                <>
                  <SectionHeading title="This Week" count={normalTasks.length} />
                  <div className="space-y-2">
                    {normalTasks.map((t) => <CoordTaskCard key={t.id} task={t} onDone={completeTask} />)}
                  </div>
                </>
              )}
              {tasks.length === 0 && (
                <div className="rounded-xl border p-10 text-center" style={{ background: "var(--surface)", borderColor: "var(--cream-border)" }}>
                  <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>All tasks complete.</p>
                  <p className="text-xs mt-1" style={{ color: "var(--ink-light)" }}>Nice work, {user.name.split(" ")[0]}.</p>
                </div>
              )}
            </>
          )}
          {tab === "files" && (
            <div className="space-y-2">
              {activeDeals.map((deal) => (
                <div key={deal.id} className="flex items-center justify-between p-4 rounded-xl border"
                  style={{ background: "var(--surface)", borderColor: "var(--cream-border)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-4 rounded-sm flex-shrink-0"
                      style={{ background: deal.folderLabel === "white" ? "#F8FAFC" : deal.folderLabel === "blue" ? "#3B82F6" : "#E8E2D6", border: `1px solid ${deal.folderLabel === "blue" ? "#2563EB" : "var(--cream-border)"}` }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{deal.address}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--ink-mid)" }}>{deal.agent}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium" style={{ color: deal.mlsEntered ? "#166534" : "var(--crimson)" }}>{deal.mlsEntered ? "MLS live" : "MLS pending"}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--ink-light)" }}>{deal.postcardSent ? "Postcard sent" : "Postcard pending"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === "activity" && <ActivityFeed items={ACTIVITY} />}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUserState] = useState<HarriettUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push("/login"); return; }
    setUserState(u);
    setLoading(false);
  }, [router]);

  function signOut() { clearUser(); router.push("/login"); }

  if (loading || !user) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: "var(--cream)" }}>
        <p className="text-sm" style={{ color: "var(--ink-mid)" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "var(--cream)" }}>
      <DashNav user={user} onSignOut={signOut} />
      <main className="flex-1 min-h-0 overflow-hidden">
        {user.role === "broker"      && <BrokerView />}
        {user.role === "agent"       && <AgentView user={user} />}
        {user.role === "coordinator" && <CoordinatorView user={user} />}
      </main>
    </div>
  );
}
