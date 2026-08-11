// Ported from harriett-demo. DTEND math now uses lib/dates (UTC-safe).
import { addDays } from "./dates";

export interface CalEvent {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD (inclusive end, bumped +1 for DTEND)
  organizer?: string; // email
  attendees?: string[];
}

function toIcsDate(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

function fold(line: string): string {
  // RFC 5545: lines over 75 octets must be folded
  const out: string[] = [];
  while (line.length > 75) {
    out.push(line.slice(0, 75));
    line = " " + line.slice(75);
  }
  out.push(line);
  return out.join("\r\n");
}

export function generateICS(event: CalEvent): string {
  const start = toIcsDate(event.startDate);
  // DTEND for all-day events is exclusive per RFC 5545: inclusive end + 1 day
  const end = toIcsDate(addDays(event.endDate ?? event.startDate, 1));

  const now = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Harriett//Harriett AI//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${event.uid}@harriett`,
    `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    fold(`SUMMARY:${event.summary}`),
  ];

  if (event.description)
    lines.push(fold(`DESCRIPTION:${event.description.replace(/\n/g, "\\n")}`));
  if (event.location) lines.push(fold(`LOCATION:${event.location}`));
  if (event.organizer) lines.push(`ORGANIZER:mailto:${event.organizer}`);

  for (const a of event.attendees ?? []) {
    lines.push(`ATTENDEE;RSVP=TRUE:mailto:${a}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

export function icsToBase64(ics: string): string {
  return Buffer.from(ics, "utf-8").toString("base64");
}
