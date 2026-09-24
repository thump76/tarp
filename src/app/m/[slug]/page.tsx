import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Shell, Card, PitchBar, Chip, AuthNav } from "@/components/ui";
import { fmtDate, fmtMonth, fmtMoney, fmtTime, todayIso } from "@/lib/format";
import type { Category, Market, PublicEvent, RequestState } from "@/lib/types";
import { RequestButton } from "./request-button";

export const dynamic = "force-dynamic";

export default async function MarketPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: market } = await supabase.from("markets").select("*").eq("slug", slug).maybeSingle<Market>();
  if (!market) notFound();

  const [{ data: events }, { data: { user } }, { data: categories }] = await Promise.all([
    supabase.from("public_events").select("*").eq("market_id", market.id).gte("date", todayIso()).order("date").returns<PublicEvent[]>(),
    supabase.auth.getUser(),
    supabase.from("categories").select("*").eq("organiser_id", market.organiser_id).order("sort").returns<Category[]>(),
  ]);

  // the signed-in stallholder's existing requests at this market, so buttons show state
  let mine: Record<string, RequestState> = {};
  let hasProfile = false;
  if (user) {
    const { data: sh } = await supabase.from("stallholders").select("id").eq("organiser_id", market.organiser_id).eq("user_id", user.id).maybeSingle();
    hasProfile = !!sh;
    if (sh) {
      const { data: reqs } = await supabase.from("requests").select("event_id, state").eq("stallholder_id", sh.id);
      mine = Object.fromEntries((reqs ?? []).map((r) => [r.event_id, r.state as RequestState]));
    }
  }

  const byMonth = new Map<string, PublicEvent[]>();
  for (const e of events ?? []) {
    const k = e.date.slice(0, 7);
    byMonth.set(k, [...(byMonth.get(k) ?? []), e]);
  }

  return (
    <Shell nav={<AuthNav signedIn={!!user} />}>
      <Link href="/" className="text-sm text-muted hover:underline">All markets</Link>
      <h1 className="mt-2 text-4xl font-bold">{market.name}</h1>
      <p className="mt-2 text-muted">{market.venue}{market.postcode ? `, ${market.postcode}` : ""}. {market.recurrence_note}.</p>

      {!user && (
        <Card className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <span>Want a pitch? Sign in with your email and request a date. The organiser approves and sends the invoice.</span>
          <Link href={`/login?next=/m/${slug}`} className="btn btn-primary">Sign in to request</Link>
        </Card>
      )}

      <div className="mt-8 flex flex-col gap-10">
        {[...byMonth.entries()].map(([k, list]) => (
          <section key={k}>
            <h2 className="mb-3 text-xl font-semibold">{fmtMonth(list[0].date)}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {list.map((e) => {
                const state = mine[e.id];
                const full = e.available <= 0;
                return (
                  <Card key={e.id} className="flex flex-col gap-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="display text-lg font-semibold">{fmtDate(e.date, { weekday: "long", day: "numeric", month: "long" })}</span>
                      <span className="text-sm text-muted">{fmtTime(e.start_time)} to {fmtTime(e.end_time)}</span>
                    </div>
                    <PitchBar approved={e.approved} requested={e.requested} max={e.max_pitches} />
                    <div className="flex items-center justify-between text-sm">
                      <span className={`tnum ${e.available <= 3 && !full ? "font-semibold text-red" : "text-muted"}`}>
                        {full ? "Full, waiting list only" : `${e.available} of ${e.max_pitches} pitches left`}
                      </span>
                      <span className="text-muted">{fmtMoney(e.fee_pence)} a pitch</span>
                    </div>
                    {e.note && <div className="text-sm text-muted">{e.note}</div>}
                    <div className="mt-1 flex items-center justify-between">
                      {state === "approved" && <Chip kind="appr">Approved</Chip>}
                      {state === "requested" && <Chip kind="req">Requested</Chip>}
                      {state === "declined" && <Chip kind="avail">Not this time</Chip>}
                      {state === "released" && <Chip kind="avail">Released</Chip>}
                      {!state && <span />}
                      {user && !state && (
                        <RequestButton eventId={e.id} slug={slug} full={full} hasProfile={hasProfile} categories={categories ?? []} label={fmtDate(e.date)} />
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
        {!events?.length && <Card>No upcoming dates published yet.</Card>}
      </div>
    </Shell>
  );
}
