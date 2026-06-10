import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { type, content, subject } = await req.json();

  if (type === "whatsapp") {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const to = process.env.DEMO_PHONE_NUMBER;

    if (!accountSid || !authToken || !to) {
      return NextResponse.json({ error: "Twilio not configured" }, { status: 500 });
    }

    const params = new URLSearchParams({
      From: "whatsapp:+14155238886",
      To: `whatsapp:${to}`,
      Body: content.slice(0, 1500),
    });

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        },
        body: params.toString(),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[send/whatsapp]", err);
      return NextResponse.json({ error: "WhatsApp send failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  if (type === "email") {
    const token = process.env.POSTMARK_SERVER_TOKEN;
    const to = process.env.DEMO_EMAIL;

    if (!token || !to) {
      return NextResponse.json({ error: "Email not configured" }, { status: 500 });
    }

    const safeContent = content.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const res = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": token,
      },
      body: JSON.stringify({
        From: "harriett@meetharriett.xyz",
        To: to,
        Subject: subject ?? "From Harriett",
        TextBody: content,
        HtmlBody: `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#F5F0E8;">
          <p style="font-size:20px;font-weight:600;margin:0 0 4px;color:#1C1814;">Harriett<span style="color:#B91C1C;">.</span></p>
          <p style="font-size:12px;color:#9C9189;margin:0 0 24px;">Pritchett-Moore Real Estate</p>
          <div style="background:#fff;border:1px solid #E8E2D8;border-radius:12px;padding:20px 24px;">
            <pre style="font-family:Georgia,serif;white-space:pre-wrap;font-size:14px;line-height:1.7;color:#1C1814;margin:0;">${safeContent}</pre>
          </div>
        </div>`,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[send/email]", err);
      return NextResponse.json({ error: "Email send failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
