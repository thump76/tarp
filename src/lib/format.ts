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
