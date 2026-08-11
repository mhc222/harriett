import { createUserClient } from "@/lib/db/server";

export const dynamic = "force-dynamic";

interface DealRow {
  id: string;
  address: string;
  city: string | null;
  status: string;
  closing_date: string | null;
  contract_acceptance_date: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  pre_listing: "Pre-listing",
  listing_active: "Active",
  under_contract: "Under contract",
  closing: "Closing",
  closed: "Closed",
  cancelled: "Cancelled",
};

export default async function Dashboard() {
  const db = await createUserClient();

  const [{ data: deals }, { data: events }] = await Promise.all([
    db
      .from("deals")
      .select("id, address, city, status, closing_date, contract_acceptance_date")
      .not("status", "in", "(closed,cancelled)")
      .order("created_at", { ascending: false }),
    db
      .from("calendar_events")
      .select("id, title, date, type, address")
      .gte("date", new Date().toISOString().slice(0, 10))
      .order("date")
      .limit(8),
  ]);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <header className="mb-10 flex items-baseline justify-between border-b border-cream-border pb-4">
        <h1 className="font-display text-3xl">Harriett</h1>
        <span className="text-sm text-ink-mid">Pritchett-Moore Real Estate</span>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-light">
          Coming up
        </h2>
        {events && events.length > 0 ? (
          <ul className="divide-y divide-cream-border rounded-lg border border-cream-border bg-surface">
            {events.map((e) => (
              <li key={e.id} className="flex items-baseline gap-4 px-4 py-3">
                <span className="w-24 shrink-0 text-sm tabular-nums text-ink-mid">{e.date}</span>
                <span className="text-sm">{e.title}</span>
                <span className="ml-auto truncate text-sm text-ink-light">{e.address}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-mid">
            Nothing on the calendar yet. Once a deal comes in, the dates land here.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-light">
          Active deals
        </h2>
        {deals && deals.length > 0 ? (
          <ul className="space-y-3">
            {(deals as DealRow[]).map((d) => (
              <li key={d.id} className="rounded-lg border border-cream-border bg-surface px-5 py-4">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-lg">
                    {d.address}
                    {d.city ? `, ${d.city}` : ""}
                  </span>
                  <span className="rounded-full bg-cream px-3 py-1 text-xs text-ink-mid">
                    {STATUS_LABELS[d.status] ?? d.status}
                  </span>
                </div>
                <div className="mt-1 text-sm text-ink-mid">
                  {d.contract_acceptance_date && <span>Accepted {d.contract_acceptance_date}. </span>}
                  {d.closing_date && <span>Closing {d.closing_date}.</span>}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-mid">
            No active deals yet. Send me a contract and I&apos;ll take it from there.
          </p>
        )}
      </section>
    </main>
  );
}
