import { z } from "zod";

// PostgreSQL accepts UUID-shaped identifiers without requiring RFC version bits.
// PM's seeded office and agent identifiers intentionally use that valid shape.
export const PostgresUuidSchema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  "Invalid UUID"
);
