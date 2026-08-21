import { NextResponse } from "next/server";
import { z } from "zod";
import { createUserClient } from "@/lib/db/server";
import { RentCastError } from "@/lib/integrations/rentcast";
import { lookupProperty } from "@/lib/properties";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const db = await createUserClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const meta = user.app_metadata as { office_id?: string; agent_id?: string };
  if (!meta.office_id || !meta.agent_id) {
    return NextResponse.json({ error: "account not linked to an office" }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const listingId = z.string().trim().min(1).max(300).parse(id);
    const result = await lookupProperty(
      {
        db,
        officeId: meta.office_id,
        agentId: meta.agent_id,
        actor: "user",
        actorId: user.id,
      },
      listingId
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid listing id" }, { status: 400 });
    }
    if (error instanceof RentCastError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[properties/lookup] request failed", error);
    return NextResponse.json({ error: "property lookup failed" }, { status: 500 });
  }
}
