import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { authenticatedContext } from "@/lib/auth-context";
import { createUserClient } from "@/lib/db/server";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: LayoutProps<"/">) {
  const db = await createUserClient();
  const auth = await authenticatedContext(db);
  if (!auth) redirect("/login");

  const { data: agent } = await db
    .from("agents")
    .select("name, role, offices(name)")
    .eq("id", auth.agentId)
    .single();
  const office = Array.isArray(agent?.offices) ? agent.offices[0] : agent?.offices;

  return (
    <AppShell
      agentName={agent?.name ?? "Harriett user"}
      officeName={office?.name ?? "Pritchett-Moore Real Estate"}
      role={(agent?.role as "broker" | "agent" | "coordinator") ?? auth.role}
    >
      {children}
    </AppShell>
  );
}
