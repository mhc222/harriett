import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";
import { createServiceClient } from "@/lib/db/server";
import { PostgresUuidSchema } from "@/lib/contracts/scalars";
import { processMemoryTurn } from "@/lib/memory/process-turn";

export const processAgentMemory = schemaTask({
  id: "process-agent-memory",
  schema: z.object({
    officeId: PostgresUuidSchema,
    agentId: PostgresUuidSchema,
    messageId: z.string().uuid(),
    aiRunId: z.string().uuid().optional(),
    channel: z.enum(["sms", "whatsapp", "pwa"]),
    agentMessage: z.string().min(1).max(20_000),
    assistantResponse: z.string().min(1).max(20_000),
  }),
  run: async (input) => processMemoryTurn(createServiceClient(), input),
});
