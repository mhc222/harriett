// Invite an office member: creates the agents row, the auth user, and the JWT
// claims (office_id, agent_id, role) that every RLS policy reads.
//
//   node scripts/invite.mjs "Wilson Moore" wilson@pritchett-moore.com broker
//
// Reads .env.local. Local dev only for now; production invites should send a
// magic link instead of setting a password (see PASSWORD note below).
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const [name, email, role] = process.argv.slice(2);
if (!name || !email || !["broker", "agent", "coordinator"].includes(role)) {
  console.error('usage: node scripts/invite.mjs "Full Name" email@domain role(broker|agent|coordinator)');
  process.exit(1);
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: office, error: officeError } = await db.from("offices").select("id").single();
if (officeError) throw officeError;

// Find-or-create the agents row by email.
let { data: agent } = await db.from("agents").select("id").eq("email", email).maybeSingle();
if (!agent) {
  const { data, error } = await db
    .from("agents")
    .insert({ office_id: office.id, name, email, role })
    .select("id")
    .single();
  if (error) throw error;
  agent = data;
}

// PASSWORD note: local-dev convenience. The production invite flow sends a
// magic link (inviteUserByEmail) and never sets a password.
const claims = { office_id: office.id, agent_id: agent.id, role };
const { data: created, error: userError } = await db.auth.admin.createUser({
  email,
  password: process.env.INVITE_PASSWORD ?? "harriett-local-dev",
  email_confirm: true,
  app_metadata: claims,
});
if (userError) throw userError;

const { error: linkError } = await db.from("agents").update({ user_id: created.user.id }).eq("id", agent.id);
if (linkError) throw linkError;

await db.from("audit_log").insert({
  office_id: office.id,
  actor: "system",
  agent_id: agent.id,
  action: "agent.invited",
  payload: { email, role },
});

console.log(JSON.stringify({ userId: created.user.id, agentId: agent.id, claims }, null, 2));
