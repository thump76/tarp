import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Shell, Card, PitchBar, Chip, AuthNav } from "@/components/ui";
import { fmtDate, fmtMonth, fmtMoney, fmtTime, todayIso } from "@/lib/format";
import type { Market, PublicEvent, RequestState } from "@/lib/types";
import { RequestButton } from "./request-button";

export const dynamic = "force-dynamic";

/** Where the signed-in visitor stands with this market's organiser. */
type Standing = "guest" | "none" | "applied" | "rejected" | "approved-other" | "approved";

export default async function MarketPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: market } = await supabase.from("markets").select("*").eq("slug", slug).is("deleted_at", null).maybeSingle<Market>();
  if (!market) notFound();

  const [{ data: events }, { data: { user } }, { data: organiser }] = await Promise.all([
    supabase.from("public_events").select("*").eq("market_id", market.id).gte("date", todayIso()).order("date").returns<PublicEvent[]>(),
    supabase.auth.getUser(),
    supabase.from("organisers").select("name, slug").eq("id", market.organiser_id).single(),
  ]);
  const applyHref = `/apply/${organiser?.slug}`;

  let standing: Standing = user ? "none" : "guest";
  let mine: Record<string, RequestState> = {};
  if (user) {
    const { data: sh } = await supabase.from("stallholders").select("id, status, stallholder_markets(market_id)")
      .eq("organiser_id", market.organiser_id).eq("user_id", user.id).maybeSingle();
    if (sh) {
      const ticked = (sh.stallholder_markets as { market_id: string }[]).some((x) => x.market_id === market.id);
      standing = sh.status === "applied" ? "applied" : sh.status === "rejected" ? "rejected" : ticked ? "approved" : "approved-other";
      const { data: reqs } = await supabase.from("requests").select("event_id, state, notified_at").eq("stallholder_id", sh.id);
      // draft invitations are invisible to the trader until the organiser sends them
      mine = Object.fromEntries((reqs ?? []).filter((r) => r.state !== "invited" || r.notified_at).map((r) => [r.event_id, r.state as RequestState]));
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

      <StandingBanner standing={standing} applyHref={applyHref} slug={slug} organiser={organiser?.name ?? "the organiser"} />

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
                      <span className="display text-lg font-semibold">{fmtDate(e.date, { weekday: "long", day: "numeric", month: "long" })}{e.theme ? <span className="font-sans text-sm font-medium text-muted">, {e.theme}</span> : null}</span>
                      <span className="text-sm text-muted">{fmtTime(e.start_time)} to {fmtTime(e.end_time)}</span>
                    </div>
                    <PitchBar approved={e.approved} requested={e.requested + e.invited} max={e.max_pitches} />
                    <div className="flex items-center justify-between text-sm">
                      <span className={`tnum ${e.available <= 3 && !full ? "font-semibold text-red" : "text-muted"}`}>
                        {full ? "Full" : `${e.available} of ${e.max_pitches} pitches left`}
                      </span>
                      <span className="text-muted">{fmtMoney(e.fee_pence)} a pitch</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      {state === "approved" && <Chip kind="appr">You are attending</Chip>}
                      {state === "invited" && <Link href="/me" className="chip chip-req">Invited, reply in My requests</Link>}
                      {state === "requested" && <Chip kind="req">Requested</Chip>}
                      {(state === "declined" || state === "withdrawn" || state === "released") && <Chip kind="avail">Not attending</Chip>}
                      {!state && <span />}
                      {standing === "approved" && !state && (
                        <RequestButton eventId={e.id} slug={slug} full={full} label={fmtDate(e.date)} />
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

function StandingBanner({ standing, applyHref, slug, organiser }: { standing: Standing; applyHref: string; slug: string; organiser: string }) {
  if (standing === "approved") return null;
  const box = "mt-6 flex flex-wrap items-center justify-between gap-3";
  if (standing === "guest") {
    return (
      <Card className={box}>
        <span>Want a pitch? New traders apply once to {organiser}. Approved traders sign in to request dates.</span>
        <span className="flex gap-2">
          <Link href={applyHref} className="btn btn-primary">Apply to trade</Link>
          <Link href={`/login?next=/m/${slug}`} className="btn btn-ghost">Sign in</Link>
        </span>
      </Card>
    );
  }
  if (standing === "none") {
    return (
      <Card className={box}>
        <span>You have not applied to trade with {organiser} yet.</span>
        <Link href={applyHref} className="btn btn-primary">Apply to trade</Link>
      </Card>
    );
  }
  if (standing === "applied") return <Card className="mt-6">Your application is with {organiser}. You will get an email when it has been reviewed.</Card>;
  if (standing === "rejected") return <Card className="mt-6">{organiser} is not able to offer you a place at the moment.</Card>;
  return <Card className="mt-6">You are approved with {organiser}, but not for this market. Ask the organiser if you would like to trade here too.</Card>;
}
