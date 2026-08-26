import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedContext } from "@/lib/auth-context";
import { createUserClient } from "@/lib/db/server";
import {
  createFacebookDraft,
  SocialPostTypeSchema,
  SocialShareModeSchema,
} from "@/lib/social-drafts";

const DraftInputSchema = z.object({
  postType: SocialPostTypeSchema,
  shareMode: SocialShareModeSchema,
  dealId: z.string().uuid().optional(),
  notes: z.string().trim().max(2_000).optional(),
});

export async function POST(request: Request) {
  const wantsJson = request.headers.get("accept")?.includes("application/json") ?? false;
  const form = await request.formData();
  const parsed = DraftInputSchema.safeParse({
    postType: form.get("postType"),
    shareMode: form.get("shareMode"),
    dealId: typeof form.get("dealId") === "string" && form.get("dealId") !== "" ? form.get("dealId") : undefined,
    notes: typeof form.get("notes") === "string" ? form.get("notes") : undefined,
  });
  if (!parsed.success) {
    if (wantsJson) return NextResponse.json({ error: "Choose a valid post type, presentation, and transaction." }, { status: 400 });
    return NextResponse.redirect(new URL("/social?error=invalid_draft_request", request.url), 303);
  }
  const db = await createUserClient();
  const auth = await authenticatedContext(db);
  if (!auth) {
    if (wantsJson) return NextResponse.json({ error: "Your session expired. Sign in and try again." }, { status: 401 });
    return NextResponse.redirect(new URL("/login?next=%2Fsocial", request.url), 303);
  }
  try {
    const draft = await createFacebookDraft({
      db,
      officeId: auth.officeId,
      agentId: auth.agentId,
      actorUserId: auth.user.id,
      ...parsed.data,
    });
    if (wantsJson) return NextResponse.json({ ok: true, artifactId: draft.artifactId });
    return NextResponse.redirect(new URL(`/social?draft=${draft.artifactId}&created=1`, request.url), 303);
  } catch (error) {
    const message = error instanceof Error ? error.message : "draft_failed";
    if (wantsJson) return NextResponse.json({ error: message.slice(0, 160) }, { status: 500 });
    return NextResponse.redirect(new URL(`/social?error=${encodeURIComponent(message.slice(0, 160))}`, request.url), 303);
  }
}
