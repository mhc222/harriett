import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  completeWorkflowTrace,
  failWorkflowTrace,
  startWorkflowTrace,
  withProviderSyncTrace,
  withSkillTrace,
} from "@/lib/execution-trace";

interface RecordedWrite {
  table: string;
  payload: Record<string, unknown>;
}

function createTraceDb(existingWorkflow?: { id: string; status: string }) {
  const inserts: RecordedWrite[] = [];
  const updates: RecordedWrite[] = [];
  let sequence = 0;

  const db = {
    from(table: string) {
      return {
        insert(payload: Record<string, unknown>) {
          inserts.push({ table, payload });
          const result = Promise.resolve({ data: null, error: null });
          return Object.assign(result, {
            select() {
              return {
                single: async () => ({
                  data: { id: `${table}-${++sequence}` },
                  error: null,
                }),
              };
            },
          });
        },
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () => ({ data: existingWorkflow ?? null, error: null }),
              };
            },
          };
        },
        update(payload: Record<string, unknown>) {
          updates.push({ table, payload });
          return {
            eq: async () => ({ data: null, error: null }),
          };
        },
      };
    },
  };

  return { db: db as unknown as SupabaseClient, inserts, updates };
}

describe("execution traces", () => {
  it("records a completed skill run with its output", async () => {
    const trace = createTraceDb();
    const result = await withSkillTrace(
      {
        db: trace.db,
        officeId: "office-1",
        agentId: "agent-1",
        aiRunId: "ai-run-1",
      },
      {
        name: "property_search",
        version: "1.0.0",
        risk: "internal_write",
        input: { city: "Tuscaloosa" },
      },
      async () => ({ listings: 3 })
    );

    expect(result).toEqual({ listings: 3 });
    expect(trace.inserts[0]).toMatchObject({
      table: "skill_runs",
      payload: {
        status: "running",
        skill_name: "property_search",
        ai_run_id: "ai-run-1",
      },
    });
    expect(trace.updates[0]).toMatchObject({
      table: "skill_runs",
      payload: { status: "completed", output: { listings: 3 } },
    });
  });

  it("records a failed skill run before rethrowing", async () => {
    const trace = createTraceDb();
    const failure = Object.assign(new Error("provider unavailable"), { code: "provider_down" });

    await expect(
      withSkillTrace(
        {
          db: trace.db,
          officeId: "office-1",
          agentId: "agent-1",
          aiRunId: "ai-run-1",
        },
        { name: "property_search", version: "1.0.0", risk: "internal_write", input: {} },
        async () => {
          throw failure;
        }
      )
    ).rejects.toBe(failure);

    expect(trace.updates[0]).toMatchObject({
      table: "skill_runs",
      payload: { status: "failed", error_code: "provider_down" },
    });
  });

  it("records provider synchronization counts", async () => {
    const trace = createTraceDb();
    const result = await withProviderSyncTrace(
      { db: trace.db, officeId: "office-1", provider: "rentcast" },
      async () => ({ received: 8, changed: 2 }),
      (value) => ({ receivedCount: value.received, changedCount: value.changed })
    );

    expect(result).toEqual({ received: 8, changed: 2 });
    expect(trace.updates[0]).toMatchObject({
      table: "provider_sync_runs",
      payload: {
        status: "completed",
        received_count: 8,
        changed_count: 2,
        conflict_count: 0,
      },
    });
  });

  it("records the workflow lifecycle and event stream", async () => {
    const trace = createTraceDb();
    const workflow = await startWorkflowTrace(trace.db, {
      officeId: "office-1",
      agentId: "agent-1",
      workflow: "agent_message_processing",
      version: "1.0.0",
      idempotencyKey: "agent-message:message-1",
      state: { inboundMessageId: "message-1" },
    });
    await completeWorkflowTrace(trace.db, "office-1", workflow.id, { outcome: "sent" });

    expect(workflow.replay).toBe(false);
    expect(trace.inserts.filter((write) => write.table === "workflow_runs")).toHaveLength(1);
    expect(
      trace.inserts
        .filter((write) => write.table === "workflow_events")
        .map((write) => write.payload.event)
    ).toEqual(["workflow.started", "workflow.completed"]);
    expect(trace.updates.at(-1)).toMatchObject({
      table: "workflow_runs",
      payload: { status: "completed", state: { outcome: "sent" } },
    });
  });

  it("records workflow failures with a bounded error message", async () => {
    const trace = createTraceDb();
    await failWorkflowTrace(trace.db, "office-1", "workflow-1", new Error("network failed"), {
      inboundMessageId: "message-1",
    });

    expect(trace.updates[0]).toMatchObject({
      table: "workflow_runs",
      payload: {
        status: "failed",
        state: {
          inboundMessageId: "message-1",
          errorCode: "Error",
          error: "network failed",
        },
      },
    });
    expect(trace.inserts[0]).toMatchObject({
      table: "workflow_events",
      payload: { event: "workflow.failed" },
    });
  });
});
