import { NextRequest, NextResponse } from "next/server";
import { listMemories } from "@/app/lib/mem0";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") ?? "jerrod-hastings";
  const data = await listMemories(userId);
  return NextResponse.json(data);
}
