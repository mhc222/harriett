import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedContext } from "@/lib/auth-context";
import { createUserClient } from "@/lib/db/server";
import { writeAudit } from "@/lib/audit";

const VendorSchema = z.object({
  type: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(160),
  contact: z.string().trim().max(160).optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().email().max(200).optional(),
  notes: z.string().trim().max(2000).optional(),
  preferred: z.boolean().default(false),
});

export async function GET() {
  const db = await createUserClient();
  const auth = await authenticatedContext(db);
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await db.from("vendors").select("*").order("preferred", { ascending: false }).order("name");
  if (error) return NextResponse.json({ error: "vendor directory could not be loaded" }, { status: 500 });
  return NextResponse.json({ vendors: data ?? [] });
}

export async function POST(request: Request) {
  const db = await createUserClient();
  const auth = await authenticatedContext(db);
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = VendorSchema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: "Please check the vendor details", issues: body.error.issues }, { status: 400 });

  const { data, error } = await db
    .from("vendors")
    .insert({
      office_id: auth.officeId,
      agent_id: auth.agentId,
      type: body.data.type,
      name: body.data.name,
      contact: body.data.contact || null,
      phone: body.data.phone || null,
      email: body.data.email || null,
      notes: body.data.notes || null,
      preferred: body.data.preferred,
    })
    .select("id")
    .single();
  if (error || !data) return NextResponse.json({ error: "The vendor could not be saved" }, { status: 500 });

  await writeAudit(db, {
    officeId: auth.officeId,
    actor: "user",
    actorId: auth.user.id,
    agentId: auth.agentId,
    action: "vendor.created",
    payload: { vendorId: data.id, type: body.data.type, preferred: body.data.preferred },
  });
  return NextResponse.json({ vendorId: data.id }, { status: 201 });
}
