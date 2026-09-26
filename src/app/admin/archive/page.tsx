import Link from "next/link";
import { currentOrganiser } from "@/lib/admin";
import { Card, Chip } from "@/components/ui";
import { fmtDate, fmtMonth, fmtMoney, archiveCutoffIso } from "@/lib/format";
import type { Market, OrganiserEvent } from "@/lib/types";
import { restoreEvent, restoreMarket } from "../event/actions";

export const dynamic = "force-dynamic";

/** Past dates (ended more than 48 hours ago), plus anything deleted, with restore. */
export default async function Archive() {
  const { supabase, org } = await currentOrganiser();
  const [{ data: past }, { data: deletedEvents }, { data: deletedMarkets }] = await Promise.all([
    supabase.from("organiser_events").select("*").eq("organiser_id", org.id).is("deleted_at", null)
      .lt("ends_at", archiveCutoffIso()).order("date", { ascending: false }).returns<OrganiserEvent[]>(),
    supabase.from("organiser_events").select("*").eq("organiser_id", org.id).not("deleted_at", "is", null)
      .is("market_deleted_at", null).order("date", { ascending: false }).returns<OrganiserEvent[]>(),
    supabase.from("markets").select("*").eq("organiser_id", org.id).not("deleted_at", "is", null).order("name").returns<Market[]>(),
  ]);

  const byMonth = new Map<string, OrganiserEvent[]>();
  for (const ev of past ?? []) byMonth.set(ev.date.slice(0, 7), [...(byMonth.get(ev.date.slice(0, 7)) ?? []), ev]);

  return (
    <>
      <Link href="/admin" className="text-sm text-muted hover:underline">Calendar</Link>
      <h1 className="mt-2 text-4xl font-bold">Archive</h1>
      <p className="mt-1 text-muted">Dates move here 48 hours after they finish. Everything is kept, so you can still see who came and who paid.</p>

      <div className="mt-8 flex flex-col gap-8">
        {[...byMonth.entries()].map(([k, evs]) => (
          <section key={k}>
            <h2 className="mb-3 text-lg font-semibold">{fmtMonth(`${k}-01`)}</h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {evs.map((ev) => (
                <Link key={ev.id} href={`/admin/event/${ev.id}`} className="block rounded-2xl bg-card p-3.5 transition hover:shadow-sm">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="display text-lg font-semibold">{fmtDate(ev.date)}</span>
                    <span className="text-xs text-muted">{ev.market_name}</span>
                  </div>
                  {ev.theme && <div className="mt-0.5 text-sm text-muted">{ev.theme}</div>}
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted tnum">
                    <span><b className="font-semibold text-ink">{ev.approved}</b> of {ev.max_pitches} attended</span>
                    {ev.approved > 0 && (ev.paid < ev.approved
                      ? <Chip kind="due">{ev.approved - ev.paid} unpaid</Chip>
                      : <Chip kind="appr">All paid, {fmtMoney(ev.paid * ev.fee_pence)}</Chip>)}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
        {!past?.length && <Card>Nothing in the archive yet.</Card>}
      </div>

      {(deletedEvents?.length || deletedMarkets?.length) ? (
        <section className="mt-12">
          <h2 className="text-lg font-semibold">Deleted</h2>
          <p className="mt-1 text-sm text-muted">Deleting cancels unpaid invoices and hides the date from traders. Restore brings both back.</p>
          <div className="mt-4 flex flex-col gap-2">
            {deletedMarkets?.map((m) => (
              <Card key={m.id} className="flex flex-wrap items-center justify-between gap-3">
                <div><b className="font-semibold text-ink-strong">{m.name}</b> <span className="text-sm text-muted">location, and its future dates</span></div>
                <form action={restoreMarket}><input type="hidden" name="id" value={m.id} /><button className="btn btn-ghost !py-1.5 text-xs">Restore</button></form>
              </Card>
            ))}
            {deletedEvents?.map((ev) => (
              <Card key={ev.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <b className="font-semibold text-ink-strong">{fmtDate(ev.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</b>
                  <span className="text-sm text-muted"> {ev.market_name}{ev.theme ? `, ${ev.theme}` : ""} · {ev.approved} attending</span>
                </div>
                <form action={restoreEvent}><input type="hidden" name="id" value={ev.id} /><button className="btn btn-ghost !py-1.5 text-xs">Restore</button></form>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
