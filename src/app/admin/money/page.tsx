import { createClient } from "@/lib/supabase/server";
import { Chip, Stat } from "@/components/ui";
import { fmtDate, fmtMoney, daysUntil } from "@/lib/format";
import { markPaid, release, remind } from "../actions";

export const dynamic = "force-dynamic";

type Row = {
  id: string; amount_pence: number; due_date: string; status: string; paid_at: string | null;
  requests: { id: string; state: string; events: { id: string; date: string; markets: { name: string } }; stallholders: { business_name: string; categories: { name: string } | null } };
  reminders: { sent_at: string }[];
};

export default async function Money() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select("id, amount_pence, due_date, status, paid_at, requests!inner(id, state, events(id, date, markets(name)), stallholders(business_name, categories(name))), reminders(sent_at)")
    .in("status", ["unpaid", "paid"])
    .order("due_date");
  const rows = (data ?? []) as unknown as Row[];
  const unpaid = rows.filter((r) => r.status === "unpaid");
  const overdue = unpaid.filter((r) => daysUntil(r.due_date) < 0);
  const monthStart = new Date(); monthStart.setDate(1);
  const paidThisMonth = rows.filter((r) => r.status === "paid" && r.paid_at && new Date(r.paid_at) >= monthStart);
  const sum = (xs: Row[]) => xs.reduce((s, r) => s + r.amount_pence, 0);

  // group unpaid by event
  const groups = new Map<string, { label: string; rows: Row[] }>();
  for (const r of unpaid) {
    const k = r.requests.events.id;
    if (!groups.has(k)) groups.set(k, { label: `${fmtDate(r.requests.events.date)}, ${r.requests.events.markets.name}`, rows: [] });
    groups.get(k)!.rows.push(r);
  }

  return (
    <>
      <h1 className="text-4xl font-bold">Unpaid pitches</h1>
      <p className="mt-1 text-muted">Reminders at 7 and 2 days before due arrive with the email integration. Until then, mark paid by hand and send reminders yourself.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Outstanding" value={fmtMoney(sum(unpaid))} sub={`${unpaid.length} pitches`} />
        <Stat label="Overdue" value={<span className={overdue.length ? "text-red" : ""}>{fmtMoney(sum(overdue))}</span>} sub={`${overdue.length} pitches`} />
        <Stat label="Paid this month" value={fmtMoney(sum(paidThisMonth))} sub={`${paidThisMonth.length} pitches`} />
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
              <th className="px-4 py-3 font-semibold">Stallholder</th>
              <th className="px-4 py-3 font-semibold">Due</th>
              <th className="px-4 py-3 text-right font-semibold">Amount</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {[...groups.values()].map((g) => (
              <Group key={g.label} g={g} />
            ))}
            {!unpaid.length && <tr><td colSpan={4} className="px-4 py-6 text-muted">Nothing outstanding.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Group({ g }: { g: { label: string; rows: Row[] } }) {
  return (
    <>
      <tr className="bg-cream"><td colSpan={4} className="px-4 py-2 text-xs font-semibold text-ink-strong">{g.label}</td></tr>
      {g.rows.map((r) => {
        const d = daysUntil(r.due_date);
        const over = d < 0;
        const last = r.reminders?.length ? r.reminders[r.reminders.length - 1].sent_at.slice(0, 10) : null;
        return (
          <tr key={r.id} className="border-t border-line">
            <td className="px-4 py-3">
              <div className="font-semibold text-ink-strong">{r.requests.stallholders.business_name}</div>
              <div className="text-xs text-muted">{r.requests.stallholders.categories?.name ?? "No category"}{last ? ` · reminded ${fmtDate(last)}` : ""}</div>
            </td>
            <td className="px-4 py-3">
              {over ? <Chip kind="due">Overdue {Math.abs(d)} day{Math.abs(d) === 1 ? "" : "s"}</Chip>
                : d === 0 ? <Chip kind="req">Due today</Chip>
                : <Chip kind="avail">Due {fmtDate(r.due_date)}</Chip>}
            </td>
            <td className="px-4 py-3 text-right tnum">{fmtMoney(r.amount_pence)}</td>
            <td className="px-4 py-3">
              <div className="flex justify-end gap-2">
                <form action={markPaid}><input type="hidden" name="id" value={r.id} /><button className="btn btn-ghost !py-1.5 text-xs">Mark paid</button></form>
                <form action={remind}><input type="hidden" name="id" value={r.id} /><button className="btn btn-ghost !py-1.5 text-xs">Send reminder</button></form>
                {over && <form action={release}><input type="hidden" name="id" value={r.requests.id} /><button className="btn btn-primary !py-1.5 text-xs">Release pitch</button></form>}
              </div>
            </td>
          </tr>
        );
      })}
    </>
  );
}
