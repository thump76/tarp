import Link from "next/link";
import { notFound } from "next/navigation";
import { currentOrganiser } from "@/lib/admin";
import { fmtDate, fmtMoney } from "@/lib/format";
import type { Category, PublicEvent, RequestState } from "@/lib/types";
import { Board, type BoardTrader } from "./board";

export const dynamic = "force-dynamic";

export default async function EventBoard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, org } = await currentOrganiser();
  const { data: ev } = await supabase.from("public_events").select("*").eq("id", id).maybeSingle<PublicEvent>();
  if (!ev || ev.organiser_id !== org.id) notFound();

  const [{ data: pool }, { data: onDate }, { data: history }, { data: categories }, { data: siblings }] = await Promise.all([
    // everyone ticked for this market and approved
    supabase.from("stallholder_markets")
      .select("stallholders!inner(id, business_name, contact_name, status, category_id)")
      .eq("market_id", ev.market_id).eq("stallholders.status", "approved"),
    // everyone with a row on this date, whatever state
    supabase.from("requests")
      .select("id, state, source, notified_at, message, stallholders(id, business_name, contact_name, category_id), invoices(status)")
      .eq("event_id", id),
    // past attendance at this market, for "last came" and sorting regulars first
    supabase.from("requests")
      .select("stallholder_id, events!inner(date, market_id)")
      .eq("state", "approved").eq("events.market_id", ev.market_id).lt("events.date", ev.date),
    supabase.from("categories").select("*").eq("organiser_id", org.id).order("sort").returns<Category[]>(),
    supabase.from("public_events").select("id, date").eq("market_id", ev.market_id).order("date"),
  ]);

  const lastCame = new Map<string, string>();
  for (const h of (history ?? []) as unknown as { stallholder_id: string; events: { date: string } }[]) {
    if ((lastCame.get(h.stallholder_id) ?? "") < h.events.date) lastCame.set(h.stallholder_id, h.events.date);
  }

  type Sh = { id: string; business_name: string; contact_name: string | null; category_id: string | null };
  const traders = new Map<string, BoardTrader>();
  const add = (s: Sh, state: RequestState | null, extra: Partial<BoardTrader> = {}) =>
    traders.set(s.id, {
      id: s.id, name: s.business_name, contact: s.contact_name, categoryId: s.category_id,
      state, lastCame: lastCame.get(s.id) ?? null, draft: false, unpaid: false, message: null, ...extra,
    });

  for (const p of (pool ?? []) as unknown as { stallholders: Sh }[]) add(p.stallholders, null);
  for (const r of (onDate ?? []) as unknown as { state: RequestState; notified_at: string | null; message: string | null; stallholders: Sh; invoices: { status: string } | null }[]) {
    add(r.stallholders, r.state, {
      draft: r.state === "invited" && !r.notified_at,
      unpaid: r.state === "approved" && r.invoices?.status === "unpaid",
      message: r.message,
    });
  }

  const list = siblings ?? [];
  const idx = list.findIndex((s) => s.id === id);
  const prev = idx > 0 ? list[idx - 1] : null;
  const next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link href="/admin" className="text-muted hover:underline">Calendar</Link>
        <div className="flex gap-2">
          {prev && <Link href={`/admin/event/${prev.id}`} className="btn btn-ghost !py-1.5">← {fmtDate(prev.date)}</Link>}
          {next && <Link href={`/admin/event/${next.id}`} className="btn btn-ghost !py-1.5">{fmtDate(next.date)} →</Link>}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl font-bold">{fmtDate(ev.date, { weekday: "long", day: "numeric", month: "long" })}</h1>
          <p className="mt-1 text-muted">{ev.market_name} · {ev.max_pitches} pitches · {fmtMoney(ev.fee_pence)} each{ev.note ? ` · ${ev.note}` : ""}</p>
        </div>
      </div>
      <Board
        eventId={id}
        maxPitches={ev.max_pitches}
        categories={categories ?? []}
        initial={[...traders.values()]}
        prevLabel={prev ? fmtDate(prev.date) : null}
      />
    </>
  );
}
