import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, PitchBar, Chip, Stat } from "@/components/ui";
import { fmtDate, fmtMonth, fmtMoney, todayIso, addMonthsIso, daysUntil } from "@/lib/format";
import type { EventMix, PublicEvent } from "@/lib/types";
import { MixPanel } from "./mix-panel";

export const dynamic = "force-dynamic";

export default async function AdminCalendar({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e: selectedId } = await searchParams;
  const supabase = await createClient();
  const from = todayIso(), to = addMonthsIso(3);

  const [{ data: events }, { count: waiting }, { data: unpaid }] = await Promise.all([
    supabase.from("public_events").select("*").gte("date", from).lte("date", to).order("date").returns<PublicEvent[]>(),
    supabase.from("requests").select("id", { count: "exact", head: true }).eq("state", "requested"),
    supabase.from("invoices").select("amount_pence, due_date, request_id, requests!inner(event_id)").eq("status", "unpaid"),
  ]);

  const list = events ?? [];
  const selected = list.find((x) => x.id === selectedId) ?? list[0];
  const { data: mix } = selected
    ? await supabase.from("event_mix").select("*").eq("event_id", selected.id).order("sort").returns<EventMix[]>()
    : { data: [] as EventMix[] };
  const { data: categories } = await supabase.from("categories").select("id, name, cap, colour, sort").order("sort");

  const unpaidByEvent = new Map<string, number>();
  let dueSoonPence = 0, dueSoonCount = 0;
  for (const i of unpaid ?? []) {
    const eid = (i as unknown as { requests: { event_id: string } }).requests.event_id;
    unpaidByEvent.set(eid, (unpaidByEvent.get(eid) ?? 0) + 1);
    if (daysUntil(i.due_date) <= 7) { dueSoonPence += i.amount_pence; dueSoonCount++; }
  }

  const byMonth = new Map<string, PublicEvent[]>();
  for (const ev of list) byMonth.set(ev.date.slice(0, 7), [...(byMonth.get(ev.date.slice(0, 7)) ?? []), ev]);
  const next = list[0];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Next three months</h1>
          <p className="mt-1 text-muted">{list.length} market days</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Next market" value={next ? fmtDate(next.date) : "None"} sub={next ? `${next.market_name}, ${daysUntil(next.date)} days` : undefined} />
        <Stat label="Requests waiting" value={waiting ?? 0} sub={<Link href="/admin/requests" className="underline">review</Link>} />
        <Stat label="Unpaid, due this week" value={fmtMoney(dueSoonPence)} sub={`${dueSoonCount} pitches`} />
      </div>

      {selected && <MixPanel event={selected} mix={mix ?? []} categories={categories ?? []} />}

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {[...byMonth.entries()].map(([k, evs]) => (
          <section key={k}>
            <h2 className="mb-3 text-lg font-semibold">{fmtMonth(evs[0].date)}</h2>
            <div className="flex flex-col gap-3">
              {evs.map((ev) => {
                const unpaidN = unpaidByEvent.get(ev.id) ?? 0;
                const sel = ev.id === selected?.id;
                return (
                  <Link key={ev.id} href={`/admin?e=${ev.id}`} scroll={false}
                    className={`block rounded-2xl bg-card p-3.5 transition hover:shadow-sm ${sel ? "outline-2 outline-ink-strong" : ""}`}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="display text-lg font-semibold">{fmtDate(ev.date)}</span>
                      <span className="text-xs text-muted">{ev.market_name}</span>
                    </div>
                    <div className="mt-2"><PitchBar approved={ev.approved} requested={ev.requested} max={ev.max_pitches} /></div>
                    <div className="mt-2 flex justify-between text-xs text-muted tnum">
                      <span><b className="font-semibold text-ink">{ev.approved}</b> of {ev.max_pitches} approved{ev.requested ? <>, <b className="font-semibold text-ink">{ev.requested}</b> requested</> : null}</span>
                      <span className={ev.available <= 3 ? "font-semibold text-red" : ""}>{ev.available} left</span>
                    </div>
                    {(unpaidN > 0 || ev.note) && (
                      <div className="mt-2 flex justify-between text-xs">
                        {unpaidN > 0 ? <Chip kind="due">{unpaidN} unpaid</Chip> : <span />}
                        {ev.note && <span className="text-muted">{ev.note}</span>}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      {!list.length && <Card className="mt-6">No published events in the next three months.</Card>}
    </>
  );
}
