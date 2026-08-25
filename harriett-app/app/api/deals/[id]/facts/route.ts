import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedContext } from "@/lib/auth-context";
import { createUserClient } from "@/lib/db/server";
import {
  ReviewFieldKeySchema,
  coerceReviewCorrection,
} from "@/lib/transaction-review";

const IdSchema = z.string().uuid();
const CorrectionSchema = z.object({
  fieldName: ReviewFieldKeySchema,
  value: z.string(),
  reason: z.string().trim().min(3).max(500),
  supersedesEvidenceId: z.string().uuid().nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const dealId = IdSchema.safeParse((await params).id);
  if (!dealId.success) return NextResponse.json({ error: "invalid deal id" }, { status: 400 });

  const db = await createUserClient();
  const auth = await authenticatedContext(db);
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = CorrectionSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0]?.message ?? "invalid correction" }, { status: 400 });
  }

  let correctedValue: unknown;
  try {
    correctedValue = coerceReviewCorrection(body.data.fieldName, body.data.value);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "invalid value" }, { status: 400 });
  }

  const { data: evidenceId, error } = await db.rpc("correct_deal_fact", {
    requested_deal_id: dealId.data,
    requested_field_name: body.data.fieldName,
    corrected_value: correctedValue,
    correction_note: body.data.reason,
    superseded_evidence_id: body.data.supersedesEvidenceId ?? null,
  });
  if (error || !evidenceId) {
    return NextResponse.json({ error: error?.message ?? "correction could not be saved" }, { status: 403 });
  }

  return NextResponse.json({ evidenceId, value: correctedValue });
}
