import { ContactRound, Mail, Phone } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { createUserClient } from "@/lib/db/server";

export default async function ContactsPage() {
  const db = await createUserClient();
  const { data: contacts } = await db.from("contacts").select("id, name, kind, email, phone, notes").order("name");
  return (
    <div className="page-stack">
      <header className="page-heading"><div><p className="eyebrow">Relationships</p><h1>Contacts</h1><p className="page-intro">People connected to your prospects, properties, and transactions.</p></div></header>
      <section aria-labelledby="contacts-heading">
        <div className="section-heading"><div><p className="section-kicker">Directory</p><h2 id="contacts-heading">People</h2></div><span className="section-count">{contacts?.length ?? 0}</span></div>
        {contacts?.length ? <div className="record-list">{contacts.map((contact) => <article className="record-row" key={contact.id}>
          <span className="record-primary"><strong>{contact.name}</strong><span className="capitalize">{contact.kind.replaceAll("_", " ")}</span></span>
          <span className="record-secondary">{contact.phone && <span><Phone size={14} />{contact.phone}</span>}{contact.email && <span><Mail size={14} />{contact.email}</span>}</span>
        </article>)}</div> : <EmptyState icon={ContactRound} title="No contacts yet." detail="Contacts will appear as Harriett reads deals, email, and meeting notes." />}
      </section>
    </div>
  );
}
