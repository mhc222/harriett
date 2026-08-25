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
import { withSkillTrace } from "@/lib/execution-trace";
import { createSellerAppointmentBrief } from "@/lib/seller-brief";
import { z } from "zod";

export function createPropertyTools(context: PropertyAccessContext & { aiRunId: string }) {
  const harriettContext = { ...context, actor: "harriett" as const };
  const tracked = <T>(name: string, input: unknown, execute: () => Promise<T>) =>
    withSkillTrace(
      context,
      { name, version: "1.0.0", risk: "internal_write", input },
      execute
    );

  return {
    searchProperties: tool({
      description:
        "Search public for-sale listing data. Use this for property discovery and preliminary research. Always repeat the returned verification notice.",
      inputSchema: PropertySearchInputSchema,
      execute: (input) => tracked(
        "property_search",
        input,
        () => searchProperties(harriettContext, input)
      ),
    }),
    estimatePropertyValue: tool({
      description:
        "Get a quick preliminary automated value estimate and candidate comparable properties. Use prepareCma instead when the agent asks for a CMA, comp analysis, pricing rationale, or list-price preparation. The result is saved in Harriett and includes a dashboardUrl.",
      inputSchema: PropertyValueInputSchema,
      execute: (input) => tracked(
        "property_value_estimate",
        input,
        () => estimatePropertyValue(harriettContext, input)
      ),
    }),
    prepareCma: tool({
      description:
        "Prepare a transparent agent-facing CMA analysis with one RentCast request. Use this for CMA, comps, pricing rationale, or list-price preparation. It ranks every candidate, records inclusion and exclusion reasons, calculates visible cross-checks, caps confidence for unverified public data, saves the research, and returns a dashboardUrl. Do not invent adjustments or call this a broker-reviewed CMA.",
      inputSchema: PropertyValueInputSchema,
      execute: (input) => tracked(
        "property_cma_prep",
        input,
        () => preparePropertyCma(harriettContext, input)
      ),
    }),
    createSellerBrief: tool({
      description:
        "Create and save a seller appointment brief from a completed property research run. Use this after prepareCma when the agent explicitly requests a seller brief. Pass the researchId returned by prepareCma.",
      inputSchema: z.object({ researchId: z.string().uuid() }),
      execute: (input) => tracked(
        "property_seller_brief",
        input,
        () => createSellerAppointmentBrief(harriettContext, input.researchId)
      ),
    }),
  };
}
