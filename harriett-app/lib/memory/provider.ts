import type { SupabaseClient } from "@supabase/supabase-js";
import { embedText, embeddingModelId, vectorLiteral } from "@/lib/ai/embeddings";
import {
  MemoryRecordSchema,
  type MemoryRecord,
} from "@/lib/contracts/memory";

export interface MemorySearchResult {
  id: string;
  category: MemoryRecord["category"];
  content: string;
  confidence: number;
  sensitivity: MemoryRecord["sensitivity"];
  score: number | null;
}

export interface MemoryProvider {
  list(officeId: string, agentId: string): Promise<MemoryRecord[]>;
  search(officeId: string, agentId: string, query: string, limit?: number): Promise<MemorySearchResult[]>;
  save(record: MemoryRecord): Promise<MemoryRecord & { id: string }>;
  updateStatus(
    officeId: string,
    agentId: string,
    memoryId: string,
    status: MemoryRecord["status"],
    actorId?: string
  ): Promise<void>;
  replace(
    officeId: string,
    agentId: string,
    memoryId: string,
    content: string,
    actorId?: string
  ): Promise<MemoryRecord & { id: string }>;
}

interface MemoryRow {
  id: string;
  office_id: string;
  agent_id: string | null;
  scope: MemoryRecord["scope"];
  category: MemoryRecord["category"];
  content: string;
  provenance: MemoryRecord["provenance"];
  confidence: number;
  status: MemoryRecord["status"];
  sensitivity: MemoryRecord["sensitivity"];
}

function fromRow(row: MemoryRow): MemoryRecord & { id: string } {
  return MemoryRecordSchema.extend({ id: MemoryRecordSchema.shape.id.unwrap() }).parse({
    id: row.id,
    officeId: row.office_id,
    agentId: row.agent_id,
    scope: row.scope,
    category: row.category,
    content: row.content,
    provenance: row.provenance,
    confidence: row.confidence,
    status: row.status,
    sensitivity: row.sensitivity,
  });
}

export class SupabaseMemoryProvider implements MemoryProvider {
  constructor(private readonly db: SupabaseClient) {}

  async list(officeId: string, agentId: string): Promise<MemoryRecord[]> {
    const { data, error } = await this.db
      .from("memories")
      .select("id, office_id, agent_id, scope, category, content, provenance, confidence, status, sensitivity")
      .eq("office_id", officeId)
      .eq("agent_id", agentId)
      .neq("status", "superseded")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(`memory list failed: ${error.message}`);
    return (data ?? []).map((row) => fromRow(row as MemoryRow));
  }

  async search(
    officeId: string,
    agentId: string,
    query: string,
    limit = 5
  ): Promise<MemorySearchResult[]> {
    let embedding: number[] | null = null;
    try {
      embedding = await embedText(query);
    } catch {
      embedding = null;
    }

    if (embedding) {
      const { data, error } = await this.db.rpc("search_agent_memories", {
        query_embedding: vectorLiteral(embedding),
        requested_office_id: officeId,
        requested_agent_id: agentId,
        match_count: Math.min(limit, 10),
      });
      if (!error && data) return data as MemorySearchResult[];
    }

    const { data, error } = await this.db
      .from("memories")
      .select("id, category, content, confidence, sensitivity")
      .eq("office_id", officeId)
      .eq("agent_id", agentId)
      .eq("scope", "agent")
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(Math.min(limit, 10));
    if (error) throw new Error(`memory fallback search failed: ${error.message}`);
    return (data ?? []).map((row) => ({ ...row, score: null })) as MemorySearchResult[];
  }

  async save(record: MemoryRecord): Promise<MemoryRecord & { id: string }> {
    const parsed = MemoryRecordSchema.parse(record);
    let embedding: number[] | null = null;
    try {
      embedding = await embedText(parsed.content);
    } catch {
      embedding = null;
    }
    const { data, error } = await this.db
      .from("memories")
      .insert({
        office_id: parsed.officeId,
        agent_id: parsed.agentId,
        scope: parsed.scope,
        category: parsed.category,
        content: parsed.content,
        provenance: parsed.provenance,
        confidence: parsed.confidence,
        status: parsed.status,
        sensitivity: parsed.sensitivity,
        embedding: embedding ? vectorLiteral(embedding) : null,
        embedding_model: embedding ? embeddingModelId() : null,
      })
      .select("id, office_id, agent_id, scope, category, content, provenance, confidence, status, sensitivity")
      .single();
    if (error || !data) throw new Error(`memory save failed: ${error?.message}`);
    await this.db.from("memory_events").insert({
      office_id: parsed.officeId,
      agent_id: parsed.agentId,
      memory_id: data.id,
      event: parsed.status === "active" ? "activated" : "proposed",
      payload: { source: parsed.provenance.source },
    });
    return fromRow(data as MemoryRow);
  }

  async updateStatus(
    officeId: string,
    agentId: string,
    memoryId: string,
    status: MemoryRecord["status"],
    actorId?: string
  ): Promise<void> {
    const { error } = await this.db
      .from("memories")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", memoryId)
      .eq("office_id", officeId)
      .eq("agent_id", agentId);
    if (error) throw new Error(`memory status update failed: ${error.message}`);
    await this.db.from("memory_events").insert({
      office_id: officeId,
      agent_id: agentId,
      memory_id: memoryId,
      event: status === "active" ? "activated" : status === "rejected" ? "rejected" : "forgotten",
      actor_id: actorId ?? null,
    });
  }

  async replace(
    officeId: string,
    agentId: string,
    memoryId: string,
    content: string,
    actorId?: string
  ): Promise<MemoryRecord & { id: string }> {
    const { data: current, error } = await this.db
      .from("memories")
      .select("id, office_id, agent_id, scope, category, content, provenance, confidence, status, sensitivity")
      .eq("id", memoryId)
      .eq("office_id", officeId)
      .eq("agent_id", agentId)
      .single();
    if (error || !current) throw new Error("memory to replace was not found");
    const replacement = await this.save({
      ...fromRow(current as MemoryRow),
      id: undefined,
      content,
      status: "active",
      provenance: {
        source: "manual",
        sourceId: memoryId,
        explicit: true,
        observedAt: new Date().toISOString(),
      },
    });
    await this.db
      .from("memories")
      .update({ status: "superseded", superseded_by: replacement.id, updated_at: new Date().toISOString() })
      .eq("id", memoryId);
    await this.db.from("memory_events").insert({
      office_id: officeId,
      agent_id: agentId,
      memory_id: memoryId,
      event: "superseded",
      actor_id: actorId ?? null,
      payload: { replacementId: replacement.id },
    });
    return replacement;
  }
}

