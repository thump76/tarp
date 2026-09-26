import Link from "next/link";
import { currentOrganiser } from "@/lib/admin";
import { Card } from "@/components/ui";
import { fmtDate, fmtMoney, todayIso } from "@/lib/format";
import type { Market, OrganiserEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Locations() {
  const { supabase, org } = await currentOrganiser();
  const [{ data: markets }, { data: upcoming }, { data: pools }] = await Promise.all([
    supabase.from("markets").select("*").eq("organiser_id", org.id).is("deleted_at", null).order("name").returns<Market[]>(),
    supabase.from("organiser_events").select("id, market_id, date, theme").eq("organiser_id", org.id).is("deleted_at", null)
      .gte("date", todayIso()).order("date").returns<Pick<OrganiserEvent, "id" | "market_id" | "date" | "theme">[]>(),
    supabase.from("stallholder_markets").select("market_id, stallholders!inner(deleted_at, status)").eq("stallholders.status", "approved").is("stallholders.deleted_at", null),
  ]);
  const nextFor = (id: string) => upcoming?.filter((e) => e.market_id === id) ?? [];
  const poolFor = (id: string) => pools?.filter((p) => p.market_id === id).length ?? 0;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Locations</h1>
          <p className="mt-1 text-muted">A location is a venue with its own dates, pool of traders and public page.</p>
        </div>
        <Link href="/admin/locations/new" className="btn btn-primary">Add a location</Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {markets?.map((m) => {
          const dates = nextFor(m.id);
          return (
            <Card key={m.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="display text-xl font-semibold">{m.name}</div>
                  <div className="mt-0.5 text-sm text-muted">{m.venue}{m.postcode ? `, ${m.postcode}` : ""}{m.recurrence_note ? ` · ${m.recurrence_note}` : ""}</div>
                </div>
                <Link href={`/admin/locations/${m.id}/edit`} className="btn btn-ghost !py-1.5 text-xs">Edit</Link>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted tnum">
                <span><b className="font-semibold text-ink">{dates.length}</b> upcoming date{dates.length === 1 ? "" : "s"}</span>
                <span><b className="font-semibold text-ink">{poolFor(m.id)}</b> in the pool</span>
                <span>{m.default_pitches} pitches at {fmtMoney(m.default_fee_pence)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {dates.slice(0, 3).map((d) => (
                  <Link key={d.id} href={`/admin/event/${d.id}`} className="rounded-full border border-line px-3 py-1 hover:bg-cream">{fmtDate(d.date)}{d.theme ? ` · ${d.theme}` : ""}</Link>
                ))}
                {dates.length > 3 && <span className="text-muted">+{dates.length - 3} more</span>}
                <Link href={`/admin/event/new?location=${m.id}`} className="rounded-full bg-ink-strong px-3 py-1 text-cream">+ Add a date</Link>
              </div>
            </Card>
          );
        })}
        {!markets?.length && <Card>No locations yet. Add the first one, then create dates for it.</Card>}
      </div>

      <div className="mt-10">
        <Link href="/admin/archive" className="link-secondary">Deleted locations are in the archive</Link>
      </div>
    </>
  );
}
