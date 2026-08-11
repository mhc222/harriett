import { DealFieldsSchema, type DealFields } from "@/lib/contracts/deal";
import { PARSE_SYSTEM } from "./prompts";
import { generateStructured } from "./generate";

export async function parseDealDocument(pdf: Uint8Array): Promise<DealFields> {
  return generateStructured({
    schema: DealFieldsSchema,
    system: PARSE_SYSTEM,
    content: [
      { type: "file", data: pdf, mediaType: "application/pdf" },
      { type: "text", text: "Extract the deal information from this document." },
    ],
  });
}
