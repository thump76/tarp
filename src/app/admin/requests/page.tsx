import { createClient } from "@/lib/supabase/server";
import { Card, Chip } from "@/components/ui";
import { fmtDate, fmtMoney } from "@/lib/format";
import { approve, decline } from "../actions";

export const dynamic = "force-dynamic";

type Row = {
  id: string; created_at: string; message: string | null;
  events: { id: string; date: string; fee_pence: number; max_pitches: number; markets: { name: string } };
  stallholders: { id: string; business_name: string; contact_name: string | null; email: string; category_id: string | null; categories: { name: string; cap: number | null } | null };
};

export default async function Requests() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("requests")
    .select("id, created_at, message, events(id, date, fee_pence, max_pitches, markets(name)), stallholders(id, business_name, contact_name, email, category_id, categories(name, cap))")
    .eq("state", "requested")
    .order("created_at");
  const rows = (data ?? []) as unknown as Row[];

  // mix counts for every event that has a pending request, for the mix check
  const eventIds = [...new Set(rows.map((r) => r.events.id))];
  const { data: mix } = eventIds.length
    ? await supabase.from("event_mix").select("event_id, category_id, approved").in("event_id", eventIds)
    : { data: [] };
  const approvedFor = (eventId: string, catId: string | null) => mix?.find((m) => m.event_id === eventId && m.category_id === catId)?.approved ?? 0;
  const { data: pe } = eventIds.length ? await supabase.from("public_events").select("id, available").in("id", eventIds) : { data: [] };
  const availableFor = (eventId: string) => pe?.find((p) => p.id === eventId)?.available ?? 0;

  // count how many other pending requests this stallholder has, so the organiser can batch
  const perStallholder = new Map<string, number>();
  rows.forEach((r) => perStallholder.set(r.stallholders.id, (perStallholder.get(r.stallholders.id) ?? 0) + 1));

  return (
    <>
      <h1 className="text-4xl font-bold">Requests</h1>
      <p className="mt-1 text-muted">{rows.length} waiting. Approving creates the invoice straight away.</p>

      <div className="mt-6 flex flex-col gap-3">
        {rows.map((r) => {
          const cat = r.stallholders.categories;
          const n = approvedFor(r.events.id, r.stallholders.category_id);
          const full = cat?.cap != null && n >= cat.cap;
          const left = availableFor(r.events.id);
          const others = (perStallholder.get(r.stallholders.id) ?? 1) - 1;
          return (
            <Card key={r.id} className="grid gap-3 md:grid-cols-[1fr_auto]">
              <div className="grid gap-2">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="display text-xl font-semibold">{r.stallholders.business_name}</span>
                  <span className="text-sm text-muted">{cat?.name ?? "No category"}{r.stallholders.contact_name ? ` · ${r.stallholders.contact_name}` : ""} · {r.stallholders.email}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <b className="font-semibold text-ink-strong">{fmtDate(r.events.date, { weekday: "long", day: "numeric", month: "long" })}</b>
                  <span className="text-muted">{r.events.markets.name}</span>
                  <Chip kind="avail">{left} left</Chip>
                  <span className="text-muted">Asked {fmtDate(r.created_at.slice(0, 10))}</span>
                  {others > 0 && <span className="text-muted">+{others} other date{others > 1 ? "s" : ""} requested</span>}
                </div>
                {r.message && <p className="text-sm italic text-muted">“{r.message}”</p>}
                <div className={`flex items-start gap-2 rounded-xl px-3 py-2 text-sm ${full ? "bg-amber-bg" : "bg-green-bg"}`}>
                  <i className={`mt-1.5 h-2.5 w-2.5 flex-none rounded-full ${full ? "bg-amber" : "bg-green"}`} />
                  <span>
                    <b className="font-semibold">Mix check.</b>{" "}
                    {cat ? <>{n} of {cat.cap ?? "no cap"} {cat.name.toLowerCase()} pitches taken on this date.{full && " This category is full. You can still approve."}</> : "No category set, so the mix check cannot help."}
                  </span>
                </div>
              </div>
              <div className="flex flex-row gap-2 md:flex-col md:items-end">
                <form action={approve}><input type="hidden" name="id" value={r.id} /><button className="btn btn-primary">Approve and invoice {fmtMoney(r.events.fee_pence)}</button></form>
                <form action={decline}><input type="hidden" name="id" value={r.id} /><button className="btn btn-ghost">Decline</button></form>
              </div>
            </Card>
          );
        })}
        {!rows.length && <Card>All caught up. No requests waiting.</Card>}
      </div>
    </>
  );
}
