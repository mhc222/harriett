import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authenticatedContext } from "@/lib/auth-context";
import { createUserClient } from "@/lib/db/server";
import { GooglePlacesError, suggestAddresses } from "@/lib/integrations/google-places";

const querySchema = z.object({
  q: z.string().trim().min(3).max(120),
  sessionToken: z.uuid(),
});

export async function GET(request: NextRequest) {
  const db = await createUserClient();
  if (!(await authenticatedContext(db))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const input = querySchema.safeParse({
    q: request.nextUrl.searchParams.get("q"),
    sessionToken: request.nextUrl.searchParams.get("sessionToken"),
  });
  if (!input.success) {
    return NextResponse.json({ error: "invalid address search" }, { status: 400 });
  }
  try {
    return NextResponse.json({ suggestions: await suggestAddresses(input.data.q, input.data.sessionToken) });
  } catch (error) {
    if (error instanceof GooglePlacesError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[addresses/suggest] request failed", error);
    return NextResponse.json({ error: "address suggestions failed" }, { status: 500 });
  }
}
