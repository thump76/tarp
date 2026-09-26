export function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-GB", opts);
}

export function fmtMonth(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export function fmtMoney(pence: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: pence % 100 === 0 ? 0 : 2 }).format(pence / 100);
}

export function fmtTime(t: string) {
  return t.slice(0, 5).replace(/^0/, "").replace(":00", "");
}

export function daysUntil(iso: string) {
  const ms = new Date(iso + "T12:00:00").getTime() - Date.now();
  return Math.ceil(ms / 86400000);
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function addMonthsIso(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

/** "YYYY-MM" keys for this month and the next n-1, so a calendar always shows n months whatever the day. */
export function monthKeys(n: number) {
  const d = new Date(); d.setDate(1);
  return Array.from({ length: n }, (_, i) => {
    const m = new Date(d.getFullYear(), d.getMonth() + i, 1);
    return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
  });
}

/** Last day of the month n-1 months from now, as YYYY-MM-DD. */
export function endOfMonthIso(n: number) {
  const d = new Date(); const m = new Date(d.getFullYear(), d.getMonth() + n, 0);
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}-${String(m.getDate()).padStart(2, "0")}`;
}

/** The moment 48 hours ago, ISO. Events that ended before this belong in the archive. */
export function archiveCutoffIso() {
  return new Date(Date.now() - 48 * 3600 * 1000).toISOString();
}

export function isPast(endsAt: string) {
  return new Date(endsAt).getTime() < Date.now();
}

/** Value for a native datetime-local input, in the browser's local wall time. */
export function toLocalInput(date: string, time: string) {
  return `${date}T${time.slice(0, 5)}`;
}
