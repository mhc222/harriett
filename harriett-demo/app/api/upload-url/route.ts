import { NextResponse } from "next/server";
import { getSupabaseServer } from "../../lib/supabase";

export async function POST() {
  try {
    const sb = getSupabaseServer();
    const path = `uploads/${Date.now()}-contract.pdf`;
    const { data, error } = await sb.storage
      .from("pdf-uploads")
      .createSignedUploadUrl(path);

    if (error || !data) {
      throw new Error(error?.message ?? "Could not create upload URL");
    }

    return NextResponse.json({ signedUrl: data.signedUrl, path });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload URL failed" },
      { status: 500 }
    );
  }
}
