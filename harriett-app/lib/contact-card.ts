import { readFile } from "node:fs/promises";
import path from "node:path";

const CONTACT_PHOTO_PATH = path.join(
  process.cwd(),
  "public",
  "contact",
  "harriett-contact.jpg"
);

function escapeVCardText(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,");
}

function foldVCardLine(line: string): string {
  if (line.length <= 75) return line;
  const folded = [line.slice(0, 75)];
  let offset = 75;
  while (offset < line.length) {
    folded.push(` ${line.slice(offset, offset + 74)}`);
    offset += 74;
  }
  return folded.join("\r\n");
}

function configuredAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercelHost) return `https://${vercelHost.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  throw new Error("NEXT_PUBLIC_APP_URL is required to publish Harriett's contact card");
}

export function harriettContactCardUrl(): string {
  return `${configuredAppUrl()}/api/media/harriett-contact`;
}

export function buildHarriettVCard(input: {
  phone: string;
  website: string;
  photo: Buffer;
}): string {
  if (!/^\+[1-9]\d{7,14}$/.test(input.phone)) {
    throw new Error("TWILIO_FROM_NUMBER must be a valid E.164 number for Harriett's contact card");
  }

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "N:Harriett;;;;",
    "FN:Harriett",
    `ORG:${escapeVCardText("Pritchett-Moore Real Estate, LLC")}`,
    "TITLE:AI Transaction Assistant",
    `TEL;TYPE=CELL:${input.phone}`,
    "EMAIL;TYPE=WORK:relocation@pritchett-moore.com",
    `URL:${input.website}`,
    "NOTE:Transaction assistance for Pritchett-Moore agents and staff.",
    `PHOTO;ENCODING=b;TYPE=JPEG:${input.photo.toString("base64")}`,
    "END:VCARD",
  ];

  return `${lines.map(foldVCardLine).join("\r\n")}\r\n`;
}

export async function loadHarriettContactCard(): Promise<string> {
  const phone = process.env.TWILIO_FROM_NUMBER?.trim();
  if (!phone) throw new Error("TWILIO_FROM_NUMBER is required for Harriett's contact card");
  const photo = await readFile(CONTACT_PHOTO_PATH);
  return buildHarriettVCard({ phone, website: configuredAppUrl(), photo });
}
