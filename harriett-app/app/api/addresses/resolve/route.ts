import { NextResponse } from "next/server";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { authenticatedContext } from "@/lib/auth-context";
import { createUserClient } from "@/lib/db/server";
import { GooglePlacesError, resolveAddress } from "@/lib/integrations/google-places";

const inputSchema = z.object({
  placeId: z.string().min(3).max(300),
  sessionToken: z.uuid(),
});

export async function POST(request: Request) {
  const db = await createUserClient();
  const auth = await authenticatedContext(db);
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return NextResponse.json({ error: "invalid address selection" }, { status: 400 });
  }
  try {
    const address = await resolveAddress(input.data.placeId, input.data.sessionToken);
    await writeAudit(db, {
      officeId: auth.officeId,
      actor: "user",
      actorId: auth.user.id,
      agentId: auth.agentId,
      action: "property.address_selected",
      payload: { provider: "google_places", place_id: input.data.placeId, address },
    });
    return NextResponse.json({ address });
  } catch (error) {
    if (error instanceof GooglePlacesError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[addresses/resolve] request failed", error);
    return NextResponse.json({ error: "address selection failed" }, { status: 500 });
  }
}
