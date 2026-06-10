import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/app/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { dealAddress, agentName, messageText } = await req.json();

    if (!dealAddress || !agentName || !messageText) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("demo_messages")
      .insert({
        deal_address: dealAddress,
        agent_name: agentName,
        message_text: messageText,
        status: "approved",
        approved_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (e) {
    console.error("Approve error:", e);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
