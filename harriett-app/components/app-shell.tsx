"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  BookOpenText,
  BriefcaseBusiness,
  CheckCheck,
  CircleUserRound,
  ContactRound,
  ClipboardList,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  Mic,
  PenLine,
  PlugZap,
  Search,
  Share2,
  UsersRound,
  X,
} from "lucide-react";
import { createBrowser } from "@/lib/db/browser";

type Role = "broker" | "agent" | "coordinator";

interface AppShellProps {
  children: React.ReactNode;
  agentName: string;
  officeName: string;
  role: Role;
}

const primaryNavigation = [
  { label: "Today", href: "/", icon: Home },
  { label: "Chat", href: "/chat", icon: MessageCircle },
  { label: "Work", href: "/work", icon: ClipboardList },
  { label: "Meetings", href: "/meetings", icon: Mic },
  { label: "Pipeline", href: "/pipeline", icon: BriefcaseBusiness },
  { label: "Contacts", href: "/contacts", icon: ContactRound },
  { label: "Research", href: "/research", icon: Search },
  { label: "Approvals", href: "/approvals", icon: CheckCheck },
  { label: "Activity", href: "/activity", icon: Activity },
];

const systemNavigation = [
  { label: "Vendors", href: "/vendors", icon: UsersRound },
  { label: "Knowledge", href: "/knowledge", icon: BookOpenText },
  { label: "Writing", href: "/writing", icon: PenLine },
  { label: "Social", href: "/social", icon: Share2 },
  { label: "Connections", href: "/connections", icon: PlugZap },
];

function activePath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function Portrait({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <span
      className={`harriett-portrait ${size === "sm" ? "h-9 w-9" : "h-12 w-12"}`}
      aria-hidden="true"
    >
      <Image
        src="/harriett-logo.png"
        alt=""
        width={128}
        height={128}
        className="harriett-portrait-image"
        priority
      />
    </span>
  );
}

function NavigationLink({
  item,
  pathname,
  onNavigate,
}: {
  item: (typeof primaryNavigation)[number];
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = activePath(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`nav-link ${active ? "nav-link-active" : ""}`}
    >
      <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
      <span>{item.label}</span>
    </Link>
  );
}

export function AppShell({ children, agentName, officeName, role }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function signOut() {
    await createBrowser().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <a className="skip-link" href="#main-content">Skip to main content</a>

      <aside className="app-sidebar hidden lg:flex">
        <Link href="/" className="brand-lockup" aria-label="Harriett home">
          <Portrait />
          <span>
            <span className="brand-wordmark">Harriett<span className="text-crimson">.</span></span>
            <span className="brand-office">{officeName}</span>
          </span>
        </Link>

        <nav className="flex flex-col gap-1" aria-label="Primary navigation">
          {primaryNavigation.map((item) => (
            <NavigationLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>

        <div className="sidebar-rule" />
        <nav className="flex flex-col gap-1" aria-label="Workspace navigation">
          {systemNavigation.map((item) => (
            <NavigationLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>

        <div className="mt-auto border-t border-line pt-4">
          <div className="flex items-center gap-3 px-2">
            <CircleUserRound size={20} className="text-ink-soft" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{agentName}</p>
              <p className="capitalize text-xs text-ink-soft">{role}</p>
            </div>
            <button className="icon-button" type="button" onClick={signOut} aria-label="Sign out">
              <LogOut size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="mobile-header lg:hidden">
          <Link href="/" className="flex items-center gap-2" aria-label="Harriett home">
            <Portrait size="sm" />
            <span className="brand-wordmark text-[1.35rem]">Harriett<span className="text-crimson">.</span></span>
          </Link>
          <button
            type="button"
            className="icon-button"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </header>

        {menuOpen && (
          <div className="mobile-menu lg:hidden">
            <nav className="grid gap-1" aria-label="Mobile navigation">
              {[...primaryNavigation, ...systemNavigation].map((item) => (
                <NavigationLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onNavigate={() => setMenuOpen(false)}
                />
              ))}
            </nav>
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-sm font-semibold">{agentName}</p>
              <p className="text-xs capitalize text-ink-soft">{role} at {officeName}</p>
              <button type="button" className="text-button mt-3" onClick={signOut}>Sign out</button>
            </div>
          </div>
        )}

        <main id="main-content" className="workspace-main">{children}</main>

        <nav className="mobile-tabbar lg:hidden" aria-label="Quick navigation">
          {[
            primaryNavigation[0],
            primaryNavigation[1],
            primaryNavigation[2],
          ].map((item) => {
            const Icon = item.icon;
            const active = activePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`mobile-tab ${active ? "mobile-tab-active" : ""}`}
              >
                <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button type="button" className="mobile-tab" onClick={() => setMenuOpen(true)}>
            <Menu size={20} strokeWidth={1.8} aria-hidden="true" />
            <span>More</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
