import type { UIMessage } from "ai";
import { HarriettChat } from "@/components/harriett-chat";
import { authenticatedContext } from "@/lib/auth-context";
import { createUserClient } from "@/lib/db/server";

export const metadata = { title: "Chat with Harriett" };

export default async function ChatPage() {
  const db = await createUserClient();
  const auth = await authenticatedContext(db);
  if (!auth) return null;

  const [{ data: agent }, { data: rows }] = await Promise.all([
    db.from("agents").select("name").eq("id", auth.agentId).single(),
    db.from("messages")
      .select("id, direction, body, created_at")
      .eq("agent_id", auth.agentId)
      .eq("channel", "pwa")
      .order("created_at", { ascending: true })
      .limit(80),
  ]);

  const initialMessages: UIMessage[] = (rows ?? []).map((message) => ({
    id: message.id,
    role: message.direction === "inbound" ? "user" : "assistant",
    parts: [{ type: "text", text: message.body }],
    metadata: { createdAt: message.created_at },
  }));

  return (
    <HarriettChat
      agentName={agent?.name?.split(" ")[0] ?? "there"}
      initialMessages={initialMessages}
    />
  );
}

