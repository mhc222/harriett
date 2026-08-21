import { z } from "zod";

export const ChecklistDueDateAnchorSchema = z.enum([
  "listing_date",
  "contract_acceptance_date",
  "closing_date",
  "loan_application_date",
  "loan_type_change_date",
  "mls_active_date",
  "commission_ready_at",
]);

export const ChecklistOutputSchema = z.object({
  items: z.array(
    z.object({
      category: z.enum(["pre-listing", "listing-active", "under-contract", "closing"]),
      title: z.string().min(1),
      detail: z.string().nullable(),
      dueDateAnchor: ChecklistDueDateAnchorSchema.nullable().optional(),
      dueDateOffsetDays: z.number().int().nullable().optional(),
      dueDateOffsetBusinessDays: z.number().int().nullable().optional(),
      daysFromListing: z.number().int().nullable(),
      required: z.boolean(),
    })
  ),
});

export type ChecklistOutput = z.infer<typeof ChecklistOutputSchema>;
