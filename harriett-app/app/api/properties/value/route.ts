import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createUserClient } from "@/lib/db/server";
import {
  PropertyValueInputSchema,
  RentCastError,
  type PropertyValueInput,
} from "@/lib/integrations/rentcast";
import { estimatePropertyValue } from "@/lib/properties";

function inputFromSearchParams(params: URLSearchParams): PropertyValueInput {
  return {
    address: params.get("address") ?? "",
    propertyType: params.get("propertyType") ?? undefined,
    bedrooms: params.get("bedrooms") ?? undefined,
    bathrooms: params.get("bathrooms") ?? undefined,
    squareFootage: params.get("squareFootage") ?? undefined,
    maxRadius: params.get("maxRadius") ?? undefined,
    daysOld: params.get("daysOld") ?? undefined,
    compCount: params.get("compCount") ?? undefined,
  } as PropertyValueInput;
}

export async function GET(request: NextRequest) {
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
    const input = PropertyValueInputSchema.parse(inputFromSearchParams(request.nextUrl.searchParams));
    const result = await estimatePropertyValue(
      {
        db,
        officeId: meta.office_id,
        agentId: meta.agent_id,
        actor: "user",
        actorId: user.id,
      },
      input
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid property value request", issues: error.issues }, { status: 400 });
    }
    if (error instanceof RentCastError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[properties/value] request failed", error);
    return NextResponse.json({ error: "property value request failed" }, { status: 500 });
  }
}
