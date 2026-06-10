import { NextRequest, NextResponse } from "next/server";
import { generateICS, icsToBase64 } from "@/app/lib/ical";

export const maxDuration = 30;

export interface InviteRequest {
  to: string;           // recipient email
  toName?: string;
  eventType: string;    // "Closing", "Inspection", "Photo Shoot", etc.
  address: string;
  date: string;         // YYYY-MM-DD
  endDate?: string;     // YYYY-MM-DD
  description?: string;
  location?: string;
}

async function sendInviteEmail(req: InviteRequest) {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  if (!token) {
    console.warn("[calendar] POSTMARK_SERVER_TOKEN not set — skipping");
    return;
  }

  const uid = `${req.address.replace(/\s+/g, "-")}-${req.eventType}-${req.date}`.toLowerCase();
  const summary = `${req.eventType} — ${req.address}`;
  const description =
    req.description ??
    `${req.eventType} for ${req.address} on ${req.date}. Coordinated by Harriett, your AI transaction assistant.`;

  const ics = generateICS({
    uid,
    summary,
    description,
    location: req.location ?? req.address,
    startDate: req.date,
    endDate: req.endDate,
    allDay: true,
    organizer: "harriett@meetharriett.xyz",
    attendees: [req.to],
  });

  const body = [
    `Hi${req.toName ? ` ${req.toName.split(" ")[0]}` : ""},`,
    "",
    `I've added the ${req.eventType.toLowerCase()} for ${req.address} to your calendar: ${req.date}.`,
    "",
    "The calendar invite is attached. Open it to add to Outlook, Apple Calendar, or Google Calendar.",
    "",
    "Harriett",
  ].join("\n");

  const res = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": token,
    },
    body: JSON.stringify({
      From: "harriett@meetharriett.xyz",
      To: req.to,
      Subject: `Calendar: ${summary}`,
      TextBody: body,
      Attachments: [
        {
          Name: `${req.eventType.toLowerCase().replace(/\s+/g, "-")}.ics`,
          Content: icsToBase64(ics),
          ContentType: "text/calendar; method=REQUEST",
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[calendar] Postmark failed ${res.status}:`, err);
    throw new Error(`Email send failed: ${res.status}`);
  }

  console.log(`[calendar] invite sent to ${req.to} for ${summary}`);
}

export async function POST(req: NextRequest) {
  let body: InviteRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.to || !body.address || !body.date || !body.eventType) {
    return NextResponse.json(
      { error: "Required: to, address, date, eventType" },
      { status: 400 }
    );
  }

  try {
    await sendInviteEmail(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
