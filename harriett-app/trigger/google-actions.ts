import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { getConnectedGoogleAccessTokenById } from "@/lib/connections/google";
import {
  GoogleActionNameSchema,
  GoogleCalendarCreatePayloadSchema,
  GoogleCalendarDeletePayloadSchema,
  GoogleCalendarEditPayloadSchema,
  GoogleContactCreatePayloadSchema,
  GoogleContactDeletePayloadSchema,
  GoogleContactEditPayloadSchema,
  GoogleEmailActionPayloadSchema,
  parseGoogleActionPayload,
} from "@/lib/google-actions";
import {
  createGoogleCalendarEvent,
  createGoogleContact,
  createGoogleEmailDraft,
  deleteGoogleCalendarEvent,
  deleteGoogleContact,
  sendGoogleEmail,
  updateGoogleCalendarEvent,
  updateGoogleContact,
} from "@/lib/integrations/google";
import { createServiceClient } from "@/lib/db/server";

const ActionIdSchema = z.object({ actionRequestId: z.string().uuid() });

function compactPerson(person: Awaited<ReturnType<typeof createGoogleContact>>) {
  return {
    resourceName: person.resourceName,
    name: person.names[0]?.displayName ?? null,
    email: person.emailAddresses[0]?.value ?? null,
    phone: person.phoneNumbers[0]?.value ?? null,
  };
}

export const executeGoogleAction = schemaTask({
  id: "execute-google-action",
  schema: ActionIdSchema,
  retry: { maxAttempts: 1 },
  queue: { name: "google-workspace-actions", concurrencyLimit: 1 },
  run: async ({ actionRequestId }) => {
    const db = createServiceClient();
    const { data: action, error: actionError } = await db
      .from("action_requests")
      .select("id, office_id, agent_id, skill_name, exact_payload, status")
      .eq("id", actionRequestId)
      .single();
    if (actionError || !action) throw new Error(`Google action was not found: ${actionError?.message ?? "missing"}`);
    if (action.status === "completed") return { alreadyCompleted: true };
    if (action.status !== "approved") throw new Error(`Google action is ${action.status}, not approved`);

    const actionName = GoogleActionNameSchema.parse(action.skill_name);
    parseGoogleActionPayload(actionName, action.exact_payload);
    const startedAt = new Date().toISOString();
    const { data: claimed, error: claimError } = await db
      .from("action_requests")
      .update({ status: "running", execution_started_at: startedAt, execution_error: null, updated_at: startedAt })
      .eq("id", action.id)
      .eq("status", "approved")
      .select("id")
      .maybeSingle();
    if (claimError || !claimed) throw new Error(`Google action could not be claimed: ${claimError?.message ?? "already claimed"}`);

    try {
      const { data: connection, error: connectionError } = await db
        .from("connections")
        .select("id")
        .eq("office_id", action.office_id)
        .eq("agent_id", action.agent_id)
        .eq("provider", "google")
        .eq("status", "connected")
        .single();
      if (connectionError || !connection) throw new Error(`connected Google account not found: ${connectionError?.message ?? "missing"}`);
      const accessToken = await getConnectedGoogleAccessTokenById(db, connection.id);

      let output: Record<string, unknown>;
      switch (actionName) {
        case "email_draft": {
          const payload = GoogleEmailActionPayloadSchema.parse(action.exact_payload);
          const result = await createGoogleEmailDraft({ accessToken, email: payload });
          output = { draftId: result.id, messageId: result.message.id, threadId: result.message.threadId ?? null };
          break;
        }
        case "email_send": {
          const payload = GoogleEmailActionPayloadSchema.parse(action.exact_payload);
          const result = await sendGoogleEmail({ accessToken, email: payload });
          output = { messageId: result.id, threadId: result.threadId ?? null };
          break;
        }
        case "calendar_create": {
          const payload = GoogleCalendarCreatePayloadSchema.parse(action.exact_payload);
          const result = await createGoogleCalendarEvent({ accessToken, calendarId: payload.calendarId, event: payload.event });
          output = { eventId: result.id, summary: result.summary, sourceUrl: result.htmlLink ?? null };
          break;
        }
        case "calendar_edit": {
          const payload = GoogleCalendarEditPayloadSchema.parse(action.exact_payload);
          const result = await updateGoogleCalendarEvent({ accessToken, calendarId: payload.calendarId, eventId: payload.eventId, patch: payload.patch });
          output = { eventId: result.id, summary: result.summary, sourceUrl: result.htmlLink ?? null };
          break;
        }
        case "calendar_delete": {
          const payload = GoogleCalendarDeletePayloadSchema.parse(action.exact_payload);
          output = await deleteGoogleCalendarEvent({ accessToken, calendarId: payload.calendarId, eventId: payload.eventId });
          break;
        }
        case "contact_create": {
          const payload = GoogleContactCreatePayloadSchema.parse(action.exact_payload);
          output = compactPerson(await createGoogleContact({ accessToken, contact: payload.contact }));
          break;
        }
        case "contact_edit": {
          const payload = GoogleContactEditPayloadSchema.parse(action.exact_payload);
          output = compactPerson(await updateGoogleContact({ accessToken, resourceName: payload.resourceName, patch: payload.patch }));
          break;
        }
        case "contact_delete": {
          const payload = GoogleContactDeletePayloadSchema.parse(action.exact_payload);
          output = await deleteGoogleContact({ accessToken, resourceName: payload.resourceName });
          break;
        }
      }

      const completedAt = new Date().toISOString();
      const { error: completionError } = await db
        .from("action_requests")
        .update({ status: "completed", execution_output: output, executed_at: completedAt, updated_at: completedAt })
        .eq("id", action.id)
        .eq("status", "running");
      if (completionError) throw new Error(`Google action completion could not be saved: ${completionError.message}`);
      await writeAudit(db, {
        officeId: action.office_id,
        actor: "system",
        agentId: action.agent_id,
        action: "google.action_completed",
        payload: { actionRequestId: action.id, action: actionName, output },
      });
      return output;
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 2_000) : "unknown Google action failure";
      const failedAt = new Date().toISOString();
      await db
        .from("action_requests")
        .update({ status: "failed", execution_error: message, executed_at: failedAt, updated_at: failedAt })
        .eq("id", action.id)
        .eq("status", "running");
      await writeAudit(db, {
        officeId: action.office_id,
        actor: "system",
        agentId: action.agent_id,
        action: "google.action_failed",
        payload: { actionRequestId: action.id, action: actionName, error: message },
      });
      throw error;
    }
  },
});
