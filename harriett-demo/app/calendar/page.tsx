"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getUser } from "../lib/auth";
import { CALENDAR_EVENTS, type CalendarEvent } from "../lib/demo-data";
import AppSidebar from "../components/AppSidebar";

const DEMO_TODAY = new Date().toISOString().split("T")[0];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const EVENT_STYLES: Record<CalendarEvent["type"], { bg: string; text: string; border: string; dot: string; leftBorder: string }> = {
  closing:     { bg: "#FEF2F2", text: "#9B1C1C", border: "#FECACA", dot: "#9B1C1C", leftBorder: "#9B1C1C" },
  inspection:  { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A", dot: "#92400E", leftBorder: "#92400E" },
  appointment: { bg: "#F5F0E8", text: "#1C1814", border: "#E8E2D8", dot: "#1C1814", leftBorder: "#1C1814" },
  deadline:    { bg: "#FFF0EB", text: "#C2410C", border: "#FDBA74", dot: "#C2410C", leftBorder: "#C2410C" },
  listing:     { bg: "#F0FDF4", text: "#166534", border: "#BBF7D0", dot: "#166534", leftBorder: "#166534" },
};

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getEventsForDate(dateStr: string) {
  return CALENDAR_EVENTS.filter((e) => e.date === dateStr);
}

function formatDateLabel(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function formatShort(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── CALENDAR PAGE ─────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState({ year: 2026, month: 5 }); // June 2026
  const [selectedDate, setSelectedDate] = useState<string>(DEMO_TODAY);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [msConnected, setMsConnected] = useState(false);
  const [msConnecting, setMsConnecting] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push("/login"); return; }
    setAuthed(true);
    setLoading(false);
  }, [router]);

  function sendReminder(e: CalendarEvent) {
    setSent((p) => new Set([...p, e.id]));
    setToast(`Harriett sent a reminder to ${e.agent} for "${e.title}" on ${formatShort(e.date)}`);
    setTimeout(() => setToast(null), 2500);
  }

  const { year, month } = viewMonth;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const upcoming = CALENDAR_EVENTS
    .filter((e) => e.date >= DEMO_TODAY)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 7);

  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthHasEvents = CALENDAR_EVENTS.some((e) => e.date.startsWith(monthPrefix));

  const selectedEvents = getEventsForDate(selectedDate);

  function navMonth(dir: 1 | -1) {
    setViewMonth(({ year, month }) => {
      let m = month + dir;
      let y = year;
      if (m < 0) { y--; m = 11; }
      if (m > 11) { y++; m = 0; }
      return { year: y, month: m };
    });
  }

  if (loading || !authed) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: "var(--cream)" }}>
        <p className="text-sm" style={{ color: "var(--ink-mid)" }}>Loading...</p>
      </div>
    );
  }

  const numWeeks = Math.ceil(cells.length / 7);

  function connectMs() {
    setMsConnecting(true);
    setTimeout(() => { setMsConnecting(false); setMsConnected(true); }, 1400);
  }

  return (
    <div className="min-h-[100dvh] flex" style={{ background: "var(--cream)" }}>
      <AppSidebar />

      <main className="flex-1 min-h-0 overflow-hidden flex flex-col px-6 py-4">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-semibold" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>Calendar</h1>
              <p className="text-xs mt-0.5" style={{ color: "var(--ink-mid)" }}>Deal milestones, inspections, and appointments</p>
            </div>
            {/* Inline legend */}
            <div className="hidden lg:flex items-center gap-3 ml-2">
              {(Object.entries(EVENT_STYLES) as [CalendarEvent["type"], (typeof EVENT_STYLES)[CalendarEvent["type"]]][]).map(([type, s]) => (
                <div key={type} className="flex items-center gap-1">
                  <div className="w-2 h-3 rounded-sm flex-shrink-0" style={{ background: s.bg, borderLeft: `2px solid ${s.leftBorder}` }} />
                  <span className="text-[10px] capitalize" style={{ color: "var(--ink-light)" }}>{type}</span>
                </div>
              ))}
            </div>
          </div>
          <Link href="/demo"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
            style={{ background: "var(--ink)", color: "var(--cream)" }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            I have a listing
          </Link>
        </div>

        {/* Content — fills remaining height */}
        <div className="flex-1 min-h-0 grid gap-5" style={{ gridTemplateColumns: "1fr 300px" }}>

          {/* Calendar card */}
          <div className="rounded-xl border overflow-hidden flex flex-col"
            style={{ background: "var(--surface)", borderColor: "var(--cream-border)" }}>
            {/* Month nav */}
            <div className="px-5 py-3 border-b flex items-center justify-between flex-shrink-0"
              style={{ borderColor: "var(--cream-border)" }}>
              <button onClick={() => navMonth(-1)} className="p-1.5 rounded-lg border transition-all"
                style={{ borderColor: "var(--cream-border)", color: "var(--ink-mid)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--cream)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <h2 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{MONTH_NAMES[month]} {year}</h2>
              <button onClick={() => navMonth(1)} className="p-1.5 rounded-lg border transition-all"
                style={{ borderColor: "var(--cream-border)", color: "var(--ink-mid)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--cream)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b flex-shrink-0" style={{ borderColor: "var(--cream-border)" }}>
              {DAY_NAMES.map((d) => (
                <div key={d} className="py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--ink-light)" }}>{d}</div>
              ))}
            </div>

            {/* Day cells — fills remaining height */}
            <div className="flex-1 min-h-0" style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gridTemplateRows: `repeat(${numWeeks}, 1fr)`,
            }}>
              {cells.map((day, idx) => {
                if (day === null) {
                  const isLastCol = idx % 7 === 6;
                  return (
                    <div key={`e-${idx}`} className={`border-b ${isLastCol ? "" : "border-r"}`}
                      style={{ borderColor: "var(--cream-border)", background: "var(--cream)", opacity: 0.5 }} />
                  );
                }
                const dateStr = toDateStr(year, month, day);
                const events = getEventsForDate(dateStr);
                const isToday = dateStr === DEMO_TODAY;
                const isSelected = dateStr === selectedDate;
                const isLastCol = idx % 7 === 6;

                return (
                  <div key={dateStr} onClick={() => setSelectedDate(dateStr)}
                    className={`p-1.5 border-b cursor-pointer transition-colors overflow-hidden ${isLastCol ? "" : "border-r"}`}
                    style={{ borderColor: "var(--cream-border)", background: isSelected ? "var(--ink)" : "var(--surface)" }}
                    onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "var(--cream)"; }}
                    onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "var(--surface)"; }}
                  >
                    <div className="mb-1">
                      <span className="text-[11px] font-semibold w-5 h-5 inline-flex items-center justify-center rounded-full"
                        style={isToday || isSelected
                          ? { background: "var(--crimson)", color: "white" }
                          : { color: "var(--ink)" }}>
                        {day}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {events.slice(0, 2).map((e) => {
                        const s = EVENT_STYLES[e.type];
                        return (
                          <div key={e.id} className="text-[9px] leading-tight px-1 py-0.5 rounded font-medium truncate"
                            style={{ background: isSelected ? "rgba(255,255,255,0.12)" : s.bg, color: isSelected ? "var(--cream)" : s.text, borderLeft: `2px solid ${s.leftBorder}` }}>
                            {e.title}
                          </div>
                        );
                      })}
                      {events.length > 2 && (
                        <div className="text-[9px] px-1 font-medium" style={{ color: "var(--ink-light)" }}>
                          +{events.length - 2}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {!monthHasEvents && (
              <div className="py-8 text-center border-t flex-shrink-0" style={{ borderColor: "var(--cream-border)" }}>
                <p className="text-sm" style={{ color: "var(--ink-light)" }}>No events this month.</p>
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="overflow-y-auto space-y-4">

            {/* Microsoft 365 sync */}
            <div className="rounded-xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: msConnected ? "#BBF7D0" : "var(--cream-border)" }}>
              <div className="px-4 py-3 flex items-center gap-3">
                {/* Microsoft logo squares */}
                <div className="w-8 h-8 rounded-md flex-shrink-0 grid grid-cols-2 gap-0.5 p-1.5"
                  style={{ background: "#F3F2F1" }}>
                  <div style={{ background: "#F25022", borderRadius: "1px" }} />
                  <div style={{ background: "#7FBA00", borderRadius: "1px" }} />
                  <div style={{ background: "#00A4EF", borderRadius: "1px" }} />
                  <div style={{ background: "#FFB900", borderRadius: "1px" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold" style={{ color: "var(--ink)" }}>Microsoft 365 Calendar</p>
                  <p className="text-[10px]" style={{ color: msConnected ? "#166534" : "var(--ink-light)" }}>
                    {msConnected ? "✓ Syncing — deal deadlines auto-added to Outlook" : "Not connected"}
                  </p>
                </div>
                {!msConnected && (
                  <button onClick={connectMs} disabled={msConnecting}
                    className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all active:scale-[0.98] disabled:opacity-60"
                    style={{ background: "var(--ink)", color: "var(--cream)" }}>
                    {msConnecting ? "Connecting..." : "Connect"}
                  </button>
                )}
              </div>
              {!msConnected && (
                <div className="px-4 pb-3 -mt-1">
                  <p className="text-[10px]" style={{ color: "var(--ink-light)" }}>
                    Harriett will add deal closings, inspections, and deadlines directly to your Outlook calendar.
                  </p>
                </div>
              )}
            </div>

            {/* Selected day */}
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--ink)" }}>{formatDateLabel(selectedDate)}</p>
              {selectedEvents.length > 0 ? (
                <div className="space-y-2">
                  {selectedEvents.map((e) => {
                    const s = EVENT_STYLES[e.type];
                    const wasSent = sent.has(e.id);
                    return (
                      <div key={e.id} className="rounded-xl border overflow-hidden"
                        style={{ background: "var(--surface)", borderColor: "var(--cream-border)", borderLeft: `3px solid ${s.leftBorder}` }}>
                        <div className="px-3 py-2.5 border-b" style={{ borderColor: "var(--cream-border)" }}>
                          <span className="inline-block text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full mb-1"
                            style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
                            {e.type}
                          </span>
                          <p className="text-xs font-semibold" style={{ color: "var(--ink)" }}>{e.title}</p>
                          <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-mid)" }}>{e.address}</p>
                          {e.note && <p className="text-[10px] mt-1 italic" style={{ color: "var(--ink-mid)" }}>{e.note}</p>}
                        </div>
                        <div className="px-3 py-2 flex items-center gap-3">
                          <button onClick={() => sendReminder(e)} disabled={wasSent}
                            className="text-xs font-medium transition-colors disabled:opacity-50"
                            style={{ color: wasSent ? "#166534" : "var(--crimson)" }}>
                            {wasSent ? "✓ Sent" : "Send reminder →"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border px-4 py-4 text-center"
                  style={{ background: "var(--surface)", borderColor: "var(--cream-border)" }}>
                  <p className="text-xs" style={{ color: "var(--ink-mid)" }}>No events this day.</p>
                </div>
              )}
            </div>

            {/* Upcoming */}
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--ink)" }}>Upcoming</p>
              <div className="rounded-xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--cream-border)" }}>
                {upcoming.map((e, i) => {
                  const s = EVENT_STYLES[e.type];
                  const wasSent = sent.has(e.id);
                  const parts = e.date.split("-").map(Number);
                  const dayNum = parts[2];
                  const monthAbbr = new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString("en-US", { month: "short" });
                  return (
                    <div key={e.id}
                      className={`px-3 py-2.5 flex items-start gap-3 cursor-pointer ${i < upcoming.length - 1 ? "border-b" : ""}`}
                      style={{ borderColor: "var(--cream-border)" }}
                      onClick={() => { setViewMonth({ year: parts[0], month: parts[1] - 1 }); setSelectedDate(e.date); }}
                    >
                      <div className="flex-shrink-0 w-9 text-center">
                        <p className="text-[9px] font-semibold uppercase" style={{ color: "var(--ink-light)" }}>{monthAbbr}</p>
                        <p className="text-base font-bold leading-none" style={{ color: "var(--ink)" }}>{dayNum}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold leading-snug truncate" style={{ color: "var(--ink)" }}>{e.title}</p>
                        <p className="text-[10px] truncate mt-0.5" style={{ color: "var(--ink-mid)" }}>{e.address}</p>
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded mt-1 inline-block"
                          style={{ background: s.bg, color: s.text, borderLeft: `2px solid ${s.leftBorder}` }}>
                          {e.agent.split(" ")[0]}
                        </span>
                      </div>
                      <button onClick={(ev) => { ev.stopPropagation(); sendReminder(e); }} disabled={wasSent}
                        className="flex-shrink-0 text-xs font-medium mt-0.5 transition-colors disabled:opacity-40"
                        style={{ color: wasSent ? "#166534" : "var(--crimson)" }}>
                        {wasSent ? "✓" : "Remind"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 max-w-sm px-4 py-3 rounded-xl shadow-lg border z-50"
          style={{ background: "var(--ink)", borderColor: "#2C2820", color: "#F5F0E8" }}>
          <p className="text-xs font-medium">{toast}</p>
        </div>
      )}
    </div>
  );
}
