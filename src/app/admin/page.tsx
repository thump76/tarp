import Link from "next/link";
import { currentOrganiser } from "@/lib/admin";
import { Card, PitchBar, Chip, Stat } from "@/components/ui";
import { fmtDate, fmtMonth, fmtMoney, daysUntil, monthKeys, endOfMonthIso, archiveCutoffIso, isPast } from "@/lib/format";
import type { EventMix, OrganiserEvent } from "@/lib/types";
import { MixPanel } from "./mix-panel";

export const dynamic = "force-dynamic";

const MONTHS = 6;

export default async function AdminCalendar({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e: selectedId } = await searchParams;
  const { supabase, org } = await currentOrganiser();
  const months = monthKeys(MONTHS);

  const [{ data: events }, { count: waiting }, { data: unpaid }, { count: archived }] = await Promise.all([
    // this month and the next five; finished dates stay (greyed) for 48 hours, then move to the archive
    supabase.from("organiser_events").select("*").eq("organiser_id", org.id).is("deleted_at", null)
      .gte("ends_at", archiveCutoffIso()).lte("date", endOfMonthIso(MONTHS)).order("date").returns<OrganiserEvent[]>(),
    supabase.from("requests").select("id", { count: "exact", head: true }).eq("state", "requested"),
    supabase.from("invoices").select("amount_pence, due_date, request_id, requests!inner(event_id)").eq("status", "unpaid"),
    supabase.from("organiser_events").select("id", { count: "exact", head: true }).eq("organiser_id", org.id).is("deleted_at", null).lt("ends_at", archiveCutoffIso()),
  ]);

  const list = events ?? [];
  const upcoming = list.filter((x) => !isPast(x.ends_at));
  const selected = list.find((x) => x.id === selectedId) ?? upcoming[0];
  const { data: mix } = selected
    ? await supabase.from("event_mix").select("*").eq("event_id", selected.id).order("sort").returns<EventMix[]>()
    : { data: [] as EventMix[] };
  const { data: categories } = await supabase.from("categories").select("id, name, cap, colour, sort").eq("organiser_id", org.id).order("sort");

  const unpaidByEvent = new Map<string, number>();
  let dueSoonPence = 0, dueSoonCount = 0;
  for (const i of unpaid ?? []) {
    const eid = (i as unknown as { requests: { event_id: string } }).requests.event_id;
    unpaidByEvent.set(eid, (unpaidByEvent.get(eid) ?? 0) + 1);
    if (daysUntil(i.due_date) <= 7) { dueSoonPence += i.amount_pence; dueSoonCount++; }
  }

  const byMonth = new Map<string, OrganiserEvent[]>(months.map((k) => [k, []]));
  for (const ev of list) byMonth.get(ev.date.slice(0, 7))?.push(ev);
  const next = upcoming[0];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Next six months</h1>
          <p className="mt-1 text-muted">{upcoming.length} market days. Tap a date to build its line-up.</p>
        </div>
        <Link href="/admin/event/new" className="btn btn-primary">Create event date</Link>
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
            <h2 className="mb-3 text-lg font-semibold">{fmtMonth(`${k}-01`)}</h2>
            <div className="flex flex-col gap-3">
              {evs.map((ev) => {
                const unpaidN = unpaidByEvent.get(ev.id) ?? 0;
                const sel = ev.id === selected?.id;
                const past = isPast(ev.ends_at);
                return (
                  <Link key={ev.id} href={`/admin/event/${ev.id}`}
                    className={`block rounded-2xl bg-card p-3.5 transition hover:shadow-sm ${sel ? "outline-2 outline-ink-strong" : ""} ${past ? "is-past" : ""}`}>
                    <div className="display text-lg font-semibold">{fmtDate(ev.date)}</div>
                    <div className="mt-0.5 text-sm font-semibold text-ink-strong">{ev.market_name}</div>
                    {ev.theme && <div className="text-sm text-muted">{ev.theme}</div>}
                    <div className="mt-2"><PitchBar approved={ev.approved} requested={ev.requested + ev.invited} max={ev.max_pitches} /></div>
                    <div className="mt-2 flex justify-between text-xs text-muted tnum">
                      <span><b className="font-semibold text-ink">{ev.approved}</b> of {ev.max_pitches} attending{ev.requested ? <>, <b className="font-semibold text-ink">{ev.requested}</b> requested</> : null}</span>
                      {past ? <span>Finished</span> : <span className={ev.max_pitches - ev.approved - ev.invited - ev.requested <= 3 ? "font-semibold text-red" : ""}>{ev.max_pitches - ev.approved - ev.invited - ev.requested} left</span>}
                    </div>
                    {unpaidN > 0 && <div className="mt-2 text-xs"><Chip kind="due">{unpaidN} unpaid</Chip></div>}
                  </Link>
                );
              })}
              {!evs.length && (
                <div className="rounded-2xl border border-dashed border-line p-3.5 text-sm text-muted">
                  No dates. <Link href={`/admin/event/new?month=${k}`} className="underline">Add one</Link>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>

      {!list.length && <Card className="mt-6">No dates in the next six months yet. Start with Create event date.</Card>}

      <div className="mt-10 flex flex-wrap gap-4">
        <Link href="/admin/archive" className="link-secondary">Archive{archived ? ` (${archived} past dates)` : ""}</Link>
      </div>
    </>
  );
}
