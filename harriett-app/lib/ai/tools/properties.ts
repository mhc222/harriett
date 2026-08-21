import { tool } from "ai";
import {
  PropertySearchInputSchema,
  PropertyValueInputSchema,
} from "@/lib/integrations/rentcast";
import {
  estimatePropertyValue,
  searchProperties,
  type PropertyAccessContext,
} from "@/lib/properties";

export function createPropertyTools(context: PropertyAccessContext) {
  const harriettContext = { ...context, actor: "harriett" as const };

  return {
    searchProperties: tool({
      description:
        "Search public for-sale listing data. Use this for property discovery and preliminary research. Always repeat the returned verification notice.",
      inputSchema: PropertySearchInputSchema,
      execute: (input) => searchProperties(harriettContext, input),
    }),
    estimatePropertyValue: tool({
      description:
        "Get a preliminary automated value estimate and comparable listings for a property. This is not an appraisal or a broker-approved CMA.",
      inputSchema: PropertyValueInputSchema,
      execute: (input) => estimatePropertyValue(harriettContext, input),
    }),
  };
}
