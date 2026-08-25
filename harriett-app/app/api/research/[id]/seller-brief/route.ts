import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedContext } from "@/lib/auth-context";
import { createUserClient } from "@/lib/db/server";
import { createSellerAppointmentBrief } from "@/lib/seller-brief";

const IdSchema = z.string().uuid();

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = IdSchema.safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: "invalid research id" }, { status: 400 });

  const db = await createUserClient();
  const auth = await authenticatedContext(db);
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const result = await createSellerAppointmentBrief({
      db,
      officeId: auth.officeId,
      agentId: auth.agentId,
      actor: "user",
      actorId: auth.user.id,
    }, id.data);
    return NextResponse.json(result, { status: result.existing ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "seller brief could not be created";
    const status = /not found/.test(message) ? 404 : /does not contain/.test(message) ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
