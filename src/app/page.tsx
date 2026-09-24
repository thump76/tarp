import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Shell, Card, AuthNav } from "@/components/ui";
import { fmtDate, todayIso } from "@/lib/format";
import type { Market, PublicEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const [{ data: markets }, { data: events }, { data: { user } }] = await Promise.all([
    supabase.from("markets").select("*").order("name"),
    supabase.from("public_events").select("*").gte("date", todayIso()).order("date"),
    supabase.auth.getUser(),
  ]);
  const { data: organisers } = await supabase.from("organisers").select("name, slug").order("name");

  const nextFor = (id: string) => (events as PublicEvent[] | null)?.find((e) => e.market_id === id);

  return (
    <Shell nav={<AuthNav signedIn={!!user} />}>
      <h1 className="text-4xl font-bold">Markets</h1>
      <p className="mt-2 max-w-prose text-muted">Upcoming dates and pitch availability. New traders apply once to the organiser; approved traders sign in to request dates.</p>
      {!user && organisers?.map((o) => (
        <Card key={o.slug} className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <span>Want to trade with <b className="font-semibold text-ink-strong">{o.name}</b>?</span>
          <Link href={`/apply/${o.slug}`} className="btn btn-primary">Apply to trade</Link>
        </Card>
      ))}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {(markets as Market[] | null)?.map((m) => {
          const n = nextFor(m.id);
          return (
            <Link key={m.id} href={`/m/${m.slug}`} className="block rounded-2xl bg-card p-5 transition hover:shadow-sm focus-visible:outline-2 focus-visible:outline-ink">
              <div className="display text-xl font-semibold">{m.name}</div>
              <div className="mt-1 text-sm text-muted">{m.recurrence_note}</div>
              {n ? (
                <div className="mt-4 flex items-baseline justify-between text-sm">
                  <span>Next: <b className="font-semibold text-ink-strong">{fmtDate(n.date)}</b></span>
                  <span className={`tnum ${n.available <= 3 ? "font-semibold text-red" : "text-muted"}`}>{n.available} of {n.max_pitches} left</span>
                </div>
              ) : (
                <div className="mt-4 text-sm text-muted">No upcoming dates</div>
              )}
            </Link>
          );
        })}
        {!markets?.length && <Card>No markets yet. Run the seed and check your Supabase keys.</Card>}
      </div>
    </Shell>
  );
}
