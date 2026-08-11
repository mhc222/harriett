// Pure string date math. No local timezones anywhere: an ISO date in, an ISO
// date out, computed in UTC so results never shift across DST or midnight.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function assertIsoDate(value: string): void {
  if (!ISO_DATE.test(value)) throw new Error(`invalid ISO date: ${value}`);
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    throw new Error(`invalid calendar date: ${value}`);
  }
}

export function addDays(isoDate: string, days: number): string {
  assertIsoDate(isoDate);
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// Federal lead-based paint assessment period: 10 calendar days from contract
// acceptance unless the parties agree otherwise (42 USC 4852d). Anchored on
// contract acceptance date. Never on listing or closing dates.
export function leadPaintWindowEnd(contractAcceptanceDate: string): string {
  return addDays(contractAcceptanceDate, 10);
}

// Reminder dates ahead of an event (7/3/1 pattern), oldest first.
// Dates in the past relative to `today` are dropped when provided.
export function reminderDates(
  eventDate: string,
  offsets: number[] = [7, 3, 1],
  today?: string
): string[] {
  const dates = offsets
    .slice()
    .sort((a, b) => b - a)
    .map((o) => addDays(eventDate, -o));
  return today ? dates.filter((d) => d >= today) : dates;
}
