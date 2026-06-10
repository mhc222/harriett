import { task, logger } from "@trigger.dev/sdk/v3";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface InboundSmsPayload {
  ghlLocationId: string;
  ghlContactId: string;
  phone: string;
  body: string;
  ghlMessageId: string;
  receivedAt: string;
}

export const processInboundSms = task({
  id: "process-inbound-sms",
  maxDuration: 120,

  run: async (payload: InboundSmsPayload) => {
    const { phone, body: msgBody, ghlContactId, receivedAt } = payload;
    logger.info("Inbound SMS", { phone, preview: msgBody.slice(0, 60) });

    // 1. Identify agent by phone number
    const { data: agent, error: agentErr } = await supabase
      .from("agents")
      .select("id, name, role, office_id, outreach_mode")
      .eq("phone", phone)
      .single();

    if (agentErr || !agent) {
      logger.warn("Unknown sender — no agent found for phone", { phone });
      return { skipped: true, reason: "unknown_sender" };
    }

    logger.info("Agent identified", { name: agent.name, role: agent.role });

    // 2. Load recent deal context for this agent
    const { data: deals } = await supabase
      .from("deals")
      .select("id, address, status, closing_date, parsed_fields")
      .eq("agent_id", agent.id)
      .in("status", ["listing_active", "under_contract", "closing"])
      .order("created_at", { ascending: false })
      .limit(5);

    // 3. Retrieve relevant agent memory (nearest-neighbor search)
    // TODO: embed msgBody via OpenAI/Anthropic and do vector search
    // For now, pull most recent memory chunks
    const { data: memories } = await supabase
      .from("agent_memory")
      .select("content, source")
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false })
      .limit(10);

    // 4. Build context for Claude
    const dealContext = deals?.length
      ? deals.map((d) => `- ${d.address} (${d.status}${d.closing_date ? `, closes ${d.closing_date}` : ""})`).join("\n")
      : "No active deals found.";

    const memoryContext = memories?.length
      ? memories.map((m) => `[${m.source}] ${m.content}`).join("\n")
      : "No prior context.";

    const systemPrompt = `You are Harriett, the AI transaction assistant for Pritchett-Moore Real Estate in Tuscaloosa, Alabama.
You are responding to an inbound text from ${agent.name} (${agent.role}).

Active deals for this agent:
${dealContext}

Relevant memory:
${memoryContext}

Rules:
- Be concise. This is SMS — 2-3 sentences max.
- Never give legal or pricing advice directly. Flag for broker review.
- Alabama buyer-beware rules apply (buyers arrange and pay for inspections).
- If the message involves fiduciary duty, substantive client advice, or outbound to clients — flag for broker approval rather than auto-sending.
- If it's a simple acknowledgment, status update, or scheduling — you can auto-respond if the agent's outreach_mode is "auto_ack".

Agent outreach mode: ${agent.outreach_mode}`;

    // 5. Generate response
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `Agent message: "${msgBody}"\n\nDraft a response. Also output a JSON block at the end: {"intent": "<intent>", "needs_broker_review": <true|false>, "urgent_flags": []}`,
        },
      ],
      system: systemPrompt,
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "";

    // Parse out JSON intent block
    let intent = "general";
    let needsBrokerReview = true;
    let urgentFlags: string[] = [];
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*"intent"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        intent = parsed.intent ?? intent;
        needsBrokerReview = parsed.needs_broker_review ?? needsBrokerReview;
        urgentFlags = parsed.urgent_flags ?? urgentFlags;
      }
    } catch { /* ignore */ }

    const draftText = rawText.replace(/\{[\s\S]*"intent"[\s\S]*\}/, "").trim();

    logger.info("Response drafted", { intent, needsBrokerReview, preview: draftText.slice(0, 80) });

    // 6. Store inbound message + audit
    const { data: savedMsg } = await supabase
      .from("messages")
      .insert({
        office_id: agent.office_id,
        agent_id: agent.id,
        direction: "inbound",
        channel: "sms",
        body: msgBody,
        status: "approved",
        harriett_action: intent,
      })
      .select("id")
      .single();

    // 7. Store outbound draft
    const outboundStatus = needsBrokerReview ? "pending_review" : "approved";

    const { data: outboundMsg } = await supabase
      .from("messages")
      .insert({
        office_id: agent.office_id,
        agent_id: agent.id,
        direction: "outbound",
        channel: "sms",
        body: draftText,
        status: outboundStatus,
        harriett_action: intent,
      })
      .select("id")
      .single();

    // 8. Audit log
    await supabase.from("harriett_audit").insert({
      office_id: agent.office_id,
      agent_id: agent.id,
      action: "process_inbound_sms",
      payload: {
        inbound_message_id: savedMsg?.id,
        outbound_message_id: outboundMsg?.id,
        intent,
        needs_broker_review: needsBrokerReview,
        urgent_flags: urgentFlags,
      },
    });

    // 9. Auto-send if mode allows and broker review not needed
    if (!needsBrokerReview && agent.outreach_mode === "auto_ack") {
      // TODO: call GHL API to send SMS
      // await sendGhlSms({ contactId: ghlContactId, body: draftText });
      logger.info("Auto-send enabled but GHL send not yet wired", { outboundMsgId: outboundMsg?.id });
    }

    return {
      agentName: agent.name,
      intent,
      needsBrokerReview,
      urgentFlags,
      outboundMsgId: outboundMsg?.id,
      status: outboundStatus,
    };
  },
});
