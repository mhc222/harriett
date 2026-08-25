import type { SupabaseClient } from "@supabase/supabase-js";
import type { DealFields } from "@/lib/contracts/deal";
import { normalizePropertyAddress } from "@/lib/property-research";

interface DealCrmContext {
  db: SupabaseClient;
  officeId: string;
  agentId: string;
}

export async function upsertContractProperty(
  context: DealCrmContext,
  fields: DealFields
): Promise<string> {
  const formattedAddress = [fields.address, fields.city, fields.state, fields.zip]
    .filter(Boolean)
    .join(", ");
  const normalizedAddress = normalizePropertyAddress(formattedAddress);
  const { data: existing, error: lookupError } = await context.db
    .from("properties")
    .select("id, facts")
    .eq("office_id", context.officeId)
    .eq("normalized_address", normalizedAddress)
    .maybeSingle();
  if (lookupError) throw new Error(`contract property lookup failed: ${lookupError.message}`);
  const extractedFacts = Object.fromEntries(Object.entries({
    bedBath: fields.bedBath,
    mlsNumber: fields.mlsNumber,
    parcelId: fields.parcelId,
    subdivision: fields.subdivision,
    appurtenances: fields.appurtenances,
  }).filter(([, value]) => value !== null && value !== undefined && value !== ""));
  if (existing) {
    const updates = Object.fromEntries(Object.entries({
      address_line_1: fields.address,
      city: fields.city,
      state: fields.state,
      zip: fields.zip,
      county: fields.county,
      property_type: fields.propertyType,
      square_feet: fields.sqft,
      year_built: fields.yearBuilt,
    }).filter(([, value]) => value !== null && value !== undefined && value !== ""));
    const { error } = await context.db
      .from("properties")
      .update({
        ...updates,
        facts: { ...(existing.facts ?? {}), ...extractedFacts },
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("office_id", context.officeId);
    if (error) throw new Error(`contract property update failed: ${error.message}`);
    return existing.id;
  }
  const { data, error } = await context.db
    .from("properties")
    .insert({
      office_id: context.officeId,
      created_by: context.agentId,
      normalized_address: normalizedAddress,
      formatted_address: formattedAddress,
      address_line_1: fields.address,
      city: fields.city,
      state: fields.state,
      zip: fields.zip,
      county: fields.county,
      property_type: fields.propertyType,
      square_feet: fields.sqft,
      year_built: fields.yearBuilt,
      facts: extractedFacts,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`contract property upsert failed: ${error?.message}`);
  return data.id;
}

export async function syncContractContacts(
  context: DealCrmContext,
  dealId: string,
  fields: DealFields
): Promise<number> {
  const candidates = [
    ...fields.sellers.map((name) => ({ name, role: "seller" as const, company: null, email: null, phone: null })),
    ...fields.buyers.map((name) => ({ name, role: "buyer" as const, company: null, email: null, phone: null })),
    ...fields.transactionContacts,
  ];
  const unique = new Map<string, (typeof candidates)[number]>();
  for (const candidate of candidates) {
    unique.set(`${candidate.role}:${candidate.name.trim().toLowerCase()}`, candidate);
  }

  let linked = 0;
  for (const contact of unique.values()) {
    const { data: matches, error: lookupError } = await context.db
      .from("contacts")
      .select("id, email, phone, notes")
      .eq("office_id", context.officeId)
      .eq("agent_id", context.agentId)
      .eq("kind", contact.role)
      .ilike("name", contact.name.trim())
      .limit(1);
    if (lookupError) throw new Error(`contract contact lookup failed: ${lookupError.message}`);
    let contactId = matches?.[0]?.id as string | undefined;
    if (contactId) {
      const match = matches[0];
      const { error } = await context.db
        .from("contacts")
        .update({
          email: match.email ?? contact.email,
          phone: match.phone ?? contact.phone,
          notes: match.notes ?? (contact.company ? `Company: ${contact.company}` : null),
        })
        .eq("id", contactId)
        .eq("office_id", context.officeId);
      if (error) throw new Error(`contract contact update failed: ${error.message}`);
    }
    if (!contactId) {
      const { data, error } = await context.db
        .from("contacts")
        .insert({
          office_id: context.officeId,
          agent_id: context.agentId,
          name: contact.name.trim(),
          kind: contact.role,
          email: contact.email,
          phone: contact.phone,
          notes: contact.company ? `Company: ${contact.company}` : null,
        })
        .select("id")
        .single();
      if (error || !data) throw new Error(`contract contact creation failed: ${error?.message}`);
      contactId = data.id;
    }
    const { error } = await context.db.from("deal_contacts").upsert({
      deal_id: dealId,
      contact_id: contactId,
      role_on_deal: contact.role,
    }, { onConflict: "deal_id,contact_id" });
    if (error) throw new Error(`contract contact link failed: ${error.message}`);
    linked += 1;
  }
  return linked;
}

export async function writeContractEvidence(
  context: DealCrmContext,
  dealId: string,
  documentId: string,
  fields: DealFields
): Promise<number> {
  const explicit = fields.fieldEvidence.map((item) => ({
    fieldName: item.fieldName,
    value: item.value,
    confidence: item.confidence,
    pageNumber: item.pageNumber,
    excerpt: item.quote,
  }));
  const terms = fields.contractTerms
    .filter((term) => term.pageNumber && term.quote)
    .map((term) => ({
      fieldName: `contract_term.${term.category}.${term.label}`,
      value: term.value,
      confidence: term.confidence,
      pageNumber: term.pageNumber!,
      excerpt: term.quote!,
    }));
  const rows = [...explicit, ...terms];
  if (!rows.length) return 0;
  const { error } = await context.db.from("deal_field_evidence").insert(rows.map((item) => ({
    office_id: context.officeId,
    deal_id: dealId,
    document_id: documentId,
    field_name: item.fieldName,
    value: item.value,
    confidence: item.confidence,
    page_number: item.pageNumber,
    excerpt: item.excerpt,
  })));
  if (error) throw new Error(`contract evidence write failed: ${error.message}`);
  return rows.length;
}
