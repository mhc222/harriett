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
      .select("id, direction, channel, body, created_at")
      .eq("office_id", auth.officeId)
      .eq("agent_id", auth.agentId)
      .in("channel", ["sms", "whatsapp", "pwa"])
      .order("created_at", { ascending: true })
      .limit(120),
  ]);

  const initialMessages: UIMessage[] = (rows ?? []).map((message) => ({
    id: message.id,
    role: message.direction === "inbound" ? "user" : "assistant",
    parts: [{ type: "text", text: message.body }],
    metadata: { createdAt: message.created_at, channel: message.channel },
  }));

  return (
    <HarriettChat
      agentId={auth.agentId}
      agentName={agent?.name?.split(" ")[0] ?? "there"}
      initialMessages={initialMessages}
    />
  );
}
