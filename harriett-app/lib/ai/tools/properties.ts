import { tool } from "ai";
import {
  PropertySearchInputSchema,
  PropertyValueInputSchema,
} from "@/lib/integrations/rentcast";
import {
  estimatePropertyValue,
  preparePropertyCma,
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
        "Get a quick preliminary automated value estimate and candidate comparable properties. Use prepareCma instead when the agent asks for a CMA, comp analysis, pricing rationale, or list-price preparation. The result is saved in Harriett and includes a dashboardUrl.",
      inputSchema: PropertyValueInputSchema,
      execute: (input) => estimatePropertyValue(harriettContext, input),
    }),
    prepareCma: tool({
      description:
        "Prepare a transparent agent-facing CMA analysis with one RentCast request. Use this for CMA, comps, pricing rationale, or list-price preparation. It ranks every candidate, records inclusion and exclusion reasons, calculates visible cross-checks, caps confidence for unverified public data, saves the research, and returns a dashboardUrl. Do not invent adjustments or call this a broker-reviewed CMA.",
      inputSchema: PropertyValueInputSchema,
      execute: (input) => preparePropertyCma(harriettContext, input),
    }),
  };
}
