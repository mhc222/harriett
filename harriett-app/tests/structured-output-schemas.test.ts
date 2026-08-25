import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ChecklistOutputSchema } from "@/lib/contracts/checklist";
import { DealExtractionSchema } from "@/lib/contracts/deal";
import { DocumentPacketReviewSchema } from "@/lib/contracts/document-review";

type JsonSchema = {
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  allOf?: JsonSchema[];
  $defs?: Record<string, JsonSchema>;
};

function expectStrictObjects(schema: JsonSchema): void {
  if (schema.properties) {
    expect(new Set(schema.required ?? [])).toEqual(new Set(Object.keys(schema.properties)));
    Object.values(schema.properties).forEach(expectStrictObjects);
  }
  if (schema.items) expectStrictObjects(schema.items);
  schema.anyOf?.forEach(expectStrictObjects);
  schema.oneOf?.forEach(expectStrictObjects);
  schema.allOf?.forEach(expectStrictObjects);
  Object.values(schema.$defs ?? {}).forEach(expectStrictObjects);
}

describe("strict model response schemas", () => {
  it.each([
    ["deal extraction", DealExtractionSchema],
    ["document review", DocumentPacketReviewSchema],
    ["checklist", ChecklistOutputSchema],
  ])("requires every property in %s JSON schema", (_name, schema) => {
    expectStrictObjects(z.toJSONSchema(schema) as JsonSchema);
  });
});
