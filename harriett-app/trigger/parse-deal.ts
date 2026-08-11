import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";
import { createServiceClient } from "@/lib/db/server";
import { writeAudit } from "@/lib/audit";
import { parseDealDocument } from "@/lib/ai/parse";
import { generateStructured } from "@/lib/ai/generate";
import { CHECKLIST_SYSTEM } from "@/lib/ai/prompts";
import { ChecklistOutputSchema } from "@/lib/contracts/checklist";
import {
  buildCalendarEvents,
  buildChecklistRows,
  checklistPrompt,
} from "@/lib/deal-events";

// The parse pipeline: document -> DealFields -> deal row -> calendar events
// -> checklist. Durable task; each step retries as a unit via Trigger.dev.
// Service-role writes only, every step audited.
export const parseDeal = schemaTask({
  id: "parse-deal",
  schema: z.object({ documentId: z.string().uuid() }),
  run: async ({ documentId }) => {
    const db = createServiceClient();

    const { data: doc, error: docError } = await db
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();
    if (docError || !doc) throw new Error(`document ${documentId} not found: ${docError?.message}`);

    const ids = { officeId: doc.office_id as string, agentId: doc.agent_id as string };

    await writeAudit(db, {
      officeId: ids.officeId,
      actor: "harriett",
      agentId: ids.agentId,
      action: "parse.started",
      payload: { documentId, filename: doc.filename },
    });

    try {
      const { data: blob, error: dlError } = await db.storage
        .from("documents")
        .download(doc.storage_path);
      if (dlError || !blob) throw new Error(`download failed: ${dlError?.message}`);
      const pdf = new Uint8Array(await blob.arrayBuffer());

      const fields = await parseDealDocument(pdf);

      const { data: deal, error: dealError } = await db
        .from("deals")
        .insert({
          office_id: ids.officeId,
          agent_id: ids.agentId,
          address: fields.address,
          city: fields.city,
          state: fields.state,
          zip: fields.zip,
          county: fields.county,
          status: fields.contractAcceptanceDate ? "under_contract" : "listing_active",
          list_price: fields.listPrice,
          sale_price: fields.salePrice,
          listing_date: fields.listingDate,
          contract_acceptance_date: fields.contractAcceptanceDate,
          closing_date: fields.closingDate,
          parsed_fields: fields,
          source: doc.source === "upload" ? "manual" : doc.source,
        })
        .select("id")
        .single();
      if (dealError || !deal) throw new Error(`deal insert failed: ${dealError?.message}`);
      const dealId = deal.id as string;

      await db.from("documents").update({ deal_id: dealId, parse_status: "parsed" }).eq("id", documentId);
      await writeAudit(db, {
        officeId: ids.officeId,
        actor: "harriett",
        agentId: ids.agentId,
        dealId,
        action: "deal.created",
        payload: { address: fields.address, flags: fields.flags },
      });

      const events = buildCalendarEvents(fields, { ...ids, dealId });
      if (events.length > 0) {
        const { error } = await db.from("calendar_events").insert(events);
        if (error) throw new Error(`calendar insert failed: ${error.message}`);
        await writeAudit(db, {
          officeId: ids.officeId,
          actor: "harriett",
          agentId: ids.agentId,
          dealId,
          action: "calendar.written",
          payload: { count: events.length, dates: events.map((e) => e.date) },
        });
      }

      const checklist = await generateStructured({
        schema: ChecklistOutputSchema,
        system: CHECKLIST_SYSTEM,
        content: checklistPrompt(fields),
        maxOutputTokens: 8192,
      });
      const rows = buildChecklistRows(checklist, fields, { ...ids, dealId });
      if (rows.length > 0) {
        const { error } = await db.from("checklist_items").insert(rows);
        if (error) throw new Error(`checklist insert failed: ${error.message}`);
      }
      await writeAudit(db, {
        officeId: ids.officeId,
        actor: "harriett",
        agentId: ids.agentId,
        dealId,
        action: "checklist.generated",
        payload: { count: rows.length },
      });

      return { dealId, address: fields.address, checklistItems: rows.length, calendarEvents: events.length };
    } catch (err) {
      await db.from("documents").update({ parse_status: "failed" }).eq("id", documentId);
      await writeAudit(db, {
        officeId: ids.officeId,
        actor: "harriett",
        agentId: ids.agentId,
        action: "parse.failed",
        payload: { documentId, error: String(err) },
      });
      throw err;
    }
  },
});
