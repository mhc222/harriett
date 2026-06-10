export type UserRole = "broker" | "agent" | "coordinator";

export interface HarriettUser {
  id: string;
  name: string;
  role: UserRole;
  title: string;
  initials: string;
}

export const DEMO_ACCOUNTS: HarriettUser[] = [
  { id: "wilson", name: "Wilson Moore", role: "broker", title: "President / Broker", initials: "WM" },
  { id: "jerrod", name: "Jerrod Hastings", role: "agent", title: "Agent", initials: "JH" },
  { id: "alyssa", name: "Alyssa Tanner", role: "coordinator", title: "Real Estate Coordinator", initials: "AT" },
];

const KEY = "harriett_user";

export function getUser(): HarriettUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setUser(user: HarriettUser) {
  localStorage.setItem(KEY, JSON.stringify(user));
}

export function clearUser() {
  localStorage.removeItem(KEY);
}
