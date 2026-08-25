import { Mail, Phone, Star, UsersRound } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { VendorForm } from "@/components/vendor-form";
import { createUserClient } from "@/lib/db/server";

export default async function VendorsPage() {
  const db = await createUserClient();
  const { data: vendors } = await db
    .from("vendors")
    .select("id, type, name, contact, phone, email, notes, preferred")
    .order("preferred", { ascending: false })
    .order("name");

  return (
    <div className="page-stack">
      <header className="page-heading">
        <div><p className="eyebrow">Agent relationships</p><h1>Vendors</h1><p className="page-intro">The people you trust for inspections, photography, title work, repairs, and closing support.</p></div>
        <VendorForm />
      </header>
      <section aria-labelledby="vendor-directory-heading">
        <div className="section-heading"><div><p className="section-kicker">Private to you</p><h2 id="vendor-directory-heading">Vendor directory</h2></div><span className="section-count">{vendors?.length ?? 0}</span></div>
        {vendors?.length ? (
          <div className="record-list">
            {vendors.map((vendor) => (
              <article className="record-row" key={vendor.id}>
                <span className="record-primary"><strong>{vendor.name}</strong><span>{vendor.type}{vendor.contact ? `, ${vendor.contact}` : ""}</span></span>
                <span className="record-secondary">{vendor.phone && <span><Phone size={14} />{vendor.phone}</span>}{vendor.email && <span><Mail size={14} />{vendor.email}</span>}</span>
                {vendor.preferred && <span className="status-label preferred"><Star size={12} />Preferred</span>}
              </article>
            ))}
          </div>
        ) : <EmptyState icon={UsersRound} title="No vendors saved yet." detail="Add the first person Harriett should remember for your work." />}
      </section>
    </div>
  );
}
