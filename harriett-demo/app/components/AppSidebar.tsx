"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getUser, clearUser } from "../lib/auth";
import { NOTIFICATIONS, type AppNotification } from "../lib/demo-data";

const NAV = [
  { label: "Dashboard",       href: "/dashboard" },
  { label: "Calendar",        href: "/calendar" },
  { label: "Transaction",     href: "/demo" },
  { label: "Pre-Listing CMA", href: "/pre-listing" },
  { label: "Ask Harriett",    href: "/agent" },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [bellOpen, setBellOpen] = useState(false);
  const [notifs, setNotifs] = useState<AppNotification[]>(NOTIFICATIONS);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const u = getUser();
    if (u) { setUserName(u.name); setUserRole(u.role); }
  }, []);

  useEffect(() => {
    function out(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    }
    if (bellOpen) document.addEventListener("mousedown", out);
    return () => document.removeEventListener("mousedown", out);
  }, [bellOpen]);

  const unread = notifs.filter((n) => !n.read).length;

  function signOut() { clearUser(); router.push("/login"); }

  return (
    <div className="flex flex-col h-full border-r overflow-hidden flex-shrink-0"
      style={{ width: "280px", background: "#FAFAF8", borderColor: "var(--cream-border)" }}>

      {/* Wordmark */}
      <div className="px-4 py-4 flex-shrink-0">
        <span className="text-xl font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
          Harriett<span style={{ color: "var(--crimson)" }}>.</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-shrink-0 pb-2 border-b" style={{ borderColor: "var(--cream-border)" }}>
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              className="flex items-center px-4 py-2.5 text-sm transition-colors"
              style={{
                color: active ? "var(--crimson)" : "var(--ink)",
                fontWeight: active ? 600 : 400,
                background: active ? "var(--cream)" : "transparent",
                borderLeft: active ? "2px solid var(--crimson)" : "2px solid transparent",
              }}>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom user bar */}
      <div className="flex-shrink-0 border-t px-3 py-2.5 flex items-center gap-2"
        style={{ borderColor: "var(--cream-border)" }}>

        {/* Bell */}
        <div ref={bellRef} className="relative">
          <button onClick={() => setBellOpen((p) => !p)}
            className="p-1.5 rounded-md transition-colors relative"
            style={{ color: "var(--ink-light)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--ink)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--ink-light)")}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {unread > 0 && (
              <span className="absolute top-0 right-0 w-3.5 h-3.5 flex items-center justify-center text-[8px] font-bold rounded-full"
                style={{ background: "var(--crimson)", color: "white", transform: "translate(25%,-25%)" }}>
                {unread}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute left-0 bottom-full mb-2 w-80 rounded-xl border overflow-hidden shadow-xl z-50"
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
                {notifs.length === 0
                  ? <p className="text-xs text-center py-6" style={{ color: "var(--ink-mid)" }}>No notifications.</p>
                  : notifs.map((n) => (
                    <div key={n.id}
                      className="px-4 py-3 flex items-start gap-3 border-b last:border-0 cursor-pointer"
                      style={{ borderColor: "var(--cream-border)", background: n.read ? "transparent" : "#FEFCFB" }}
                      onClick={() => setNotifs((p) => p.map((x) => x.id === n.id ? { ...x, read: true } : x))}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold leading-snug" style={{ color: "var(--ink)" }}>{n.text}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-mid)" }}>{n.sub}</p>
                      </div>
                      {!n.read && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2" style={{ background: "var(--crimson)" }} />}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* User info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate leading-none" style={{ color: "var(--ink)" }}>{userName}</p>
          <p className="text-[10px] mt-0.5 capitalize" style={{ color: "var(--ink-light)" }}>{userRole}</p>
        </div>

        {/* Sign out */}
        <button onClick={signOut}
          className="flex-shrink-0 text-[11px] px-2 py-1 rounded border transition-colors"
          style={{ color: "var(--ink-light)", borderColor: "var(--cream-border)" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--ink)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--ink-light)")}>
          Out
        </button>
      </div>
    </div>
  );
}
