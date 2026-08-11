import { z } from "zod";

export const ChecklistOutputSchema = z.object({
  items: z.array(
    z.object({
      category: z.enum(["pre-listing", "listing-active", "under-contract", "closing"]),
      title: z.string().min(1),
      detail: z.string().nullable(),
      daysFromListing: z.number().int().nullable(),
      required: z.boolean(),
    })
  ),
});

export type ChecklistOutput = z.infer<typeof ChecklistOutputSchema>;
