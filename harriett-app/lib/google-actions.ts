import { z } from "zod";
import {
  GoogleCalendarEventInputSchema,
  GoogleCalendarEventPatchSchema,
  GoogleContactInputSchema,
  GoogleContactPatchSchema,
  GoogleEmailInputSchema,
} from "@/lib/integrations/google";

export const GoogleActionNameSchema = z.enum([
  "calendar_create",
  "calendar_edit",
  "calendar_delete",
  "contact_create",
  "contact_edit",
  "contact_delete",
  "email_draft",
  "email_send",
]);

export type GoogleActionName = z.infer<typeof GoogleActionNameSchema>;

export const GoogleEmailActionPayloadSchema = GoogleEmailInputSchema;

export const GoogleCalendarCreatePayloadSchema = z.object({
  calendarId: z.string().min(1).default("primary"),
  event: GoogleCalendarEventInputSchema,
});
export const GoogleCalendarEditPayloadSchema = z.object({
  calendarId: z.string().min(1).default("primary"),
  eventId: z.string().min(1).max(1_024),
  patch: GoogleCalendarEventPatchSchema,
});

export const GoogleCalendarDeletePayloadSchema = z.object({
  calendarId: z.string().min(1).default("primary"),
  eventId: z.string().min(1).max(1_024),
});

export const GoogleContactCreatePayloadSchema = z.object({
  contact: GoogleContactInputSchema,
});

export const GoogleContactEditPayloadSchema = z.object({
  resourceName: z.string().regex(/^people\/[A-Za-z0-9_-]+$/),
  patch: GoogleContactPatchSchema,
});

export const GoogleContactDeletePayloadSchema = z.object({
  resourceName: z.string().regex(/^people\/[A-Za-z0-9_-]+$/),
});

export const GoogleActionPayloadSchema = z.union([
  GoogleEmailActionPayloadSchema,
  GoogleCalendarCreatePayloadSchema,
  GoogleCalendarEditPayloadSchema,
  GoogleCalendarDeletePayloadSchema,
  GoogleContactCreatePayloadSchema,
  GoogleContactEditPayloadSchema,
  GoogleContactDeletePayloadSchema,
]);

export function parseGoogleActionPayload(action: GoogleActionName, payload: unknown) {
  switch (action) {
    case "email_draft":
    case "email_send":
      return GoogleEmailActionPayloadSchema.parse(payload);
    case "calendar_create":
      return GoogleCalendarCreatePayloadSchema.parse(payload);
    case "calendar_edit":
      return GoogleCalendarEditPayloadSchema.parse(payload);
    case "calendar_delete":
      return GoogleCalendarDeletePayloadSchema.parse(payload);
    case "contact_create":
      return GoogleContactCreatePayloadSchema.parse(payload);
    case "contact_edit":
      return GoogleContactEditPayloadSchema.parse(payload);
    case "contact_delete":
      return GoogleContactDeletePayloadSchema.parse(payload);
  }
}

export const ProposeGoogleActionInputSchema = z.object({
  action: GoogleActionNameSchema,
  summary: z.string().min(1).max(500),
  recipientKind: z.enum(["internal", "agent", "vendor", "consumer"]).default("internal"),
  payload: GoogleActionPayloadSchema,
}).superRefine((value, context) => {
  try {
    parseGoogleActionPayload(value.action, value.payload);
  } catch (error) {
    context.addIssue({
      code: "custom",
      path: ["payload"],
      message: error instanceof Error ? error.message : "payload does not match the requested Google action",
    });
  }
});
