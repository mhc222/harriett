import { Building2, ContactRound, Mail, MapPin, Phone } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { createUserClient } from "@/lib/db/server";

type DealContactRow = {
  contact_id: string;
  role_on_deal: string | null;
  deals: { address: string | null } | { address: string | null }[] | null;
};

function companyFromNotes(notes: string | null): string | null {
  const match = notes?.match(/(?:^|\n)Company:\s*(.+?)(?:\n|$)/i);
  return match?.[1]?.trim() || null;
}

export default async function ContactsPage() {
  const db = await createUserClient();
  const [{ data: contacts }, { data: dealContactRows }] = await Promise.all([
    db.from("contacts").select("id, name, kind, email, phone, notes").order("name"),
    db.from("deal_contacts").select("contact_id, role_on_deal, deals(address)"),
  ]);
  const relationships = new Map<string, Array<{ role: string | null; address: string | null }>>();
  for (const row of (dealContactRows ?? []) as DealContactRow[]) {
    const deal = Array.isArray(row.deals) ? row.deals[0] : row.deals;
    const existing = relationships.get(row.contact_id) ?? [];
    existing.push({ role: row.role_on_deal, address: deal?.address ?? null });
    relationships.set(row.contact_id, existing);
  }

  return (
    <div className="page-stack">
      <header className="page-heading"><div><p className="eyebrow">Relationships</p><h1>Contacts</h1><p className="page-intro">People connected to your prospects, properties, and transactions.</p></div></header>
      <section aria-labelledby="contacts-heading">
        <div className="section-heading"><div><p className="section-kicker">Directory</p><h2 id="contacts-heading">People</h2></div><span className="section-count">{contacts?.length ?? 0}</span></div>
        {contacts?.length ? <div className="record-list">{contacts.map((contact) => {
          const company = companyFromNotes(contact.notes);
          const contactRelationships = relationships.get(contact.id) ?? [];
          const addresses = [...new Set(contactRelationships.flatMap((item) => item.address ? [item.address] : []))];
          return <article className="record-row" key={contact.id}>
            <span className="record-primary">
              <strong>{contact.name}</strong>
              <span className="capitalize">{contact.kind.replaceAll("_", " ")}{company ? ` at ${company}` : ""}</span>
              {addresses.slice(0, 2).map((address) => <span key={address}><MapPin size={13} />{address}</span>)}
            </span>
            <span className="record-secondary">
              {company && <span><Building2 size={14} />{company}</span>}
              <span><Phone size={14} />{contact.phone || "Phone not in source"}</span>
              <span><Mail size={14} />{contact.email || "Email not in source"}</span>
            </span>
          </article>;
        })}</div> : <EmptyState icon={ContactRound} title="No contacts yet." detail="Contacts will appear as Harriett reads deals, email, and meeting notes." />}
      </section>
    </div>
  );
}
