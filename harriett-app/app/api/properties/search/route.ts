import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createUserClient } from "@/lib/db/server";
import {
  PropertySearchInputSchema,
  RentCastError,
  type PropertySearchInput,
} from "@/lib/integrations/rentcast";
import { searchProperties } from "@/lib/properties";

function errorResponse(error: unknown): NextResponse {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "invalid search", issues: error.issues }, { status: 400 });
  }
  if (error instanceof RentCastError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  console.error("[properties/search] request failed", error);
  return NextResponse.json({ error: "property search failed" }, { status: 500 });
}

function inputFromSearchParams(params: URLSearchParams): PropertySearchInput {
  const propertyTypes = params.getAll("propertyType");
  return {
    address: params.get("address") ?? undefined,
    city: params.get("city") ?? undefined,
    state: params.get("state") ?? undefined,
    zipCode: params.get("zipCode") ?? undefined,
    radius: params.get("radius") ?? undefined,
    propertyTypes: propertyTypes.length > 0 ? propertyTypes : undefined,
    minPrice: params.get("minPrice") ?? undefined,
    maxPrice: params.get("maxPrice") ?? undefined,
    minBedrooms: params.get("minBedrooms") ?? undefined,
    maxBedrooms: params.get("maxBedrooms") ?? undefined,
    minBathrooms: params.get("minBathrooms") ?? undefined,
    maxBathrooms: params.get("maxBathrooms") ?? undefined,
    status: params.get("status") ?? undefined,
    maxResults: params.get("maxResults") ?? undefined,
    offset: params.get("offset") ?? undefined,
  } as PropertySearchInput;
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
    const input = PropertySearchInputSchema.parse(inputFromSearchParams(request.nextUrl.searchParams));
    const result = await searchProperties(
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
    return errorResponse(error);
  }
}
