import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Shell, Card, Chip, AuthNav } from "@/components/ui";
import { fmtDate, fmtMoney, todayIso } from "@/lib/format";
import { answerInvite } from "./actions";

export const dynamic = "force-dynamic";

type Profile = {
  id: string; status: string; business_name: string;
  organisers: { name: string; slug: string };
  stallholder_markets: { markets: { name: string; slug: string; recurrence_note: string | null } }[];
};
type Row = {
  id: string; state: string; notified_at: string | null;
  events: { date: string; markets: { name: string; slug: string } };
  invoices: { amount_pence: number; due_date: string; status: string; payment_url: string | null } | null;
};

export default async function Me() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profiles }, { data: reqs }] = await Promise.all([
    supabase.from("stallholders")
      .select("id, status, business_name, organisers(name, slug), stallholder_markets(markets(name, slug, recurrence_note))")
      .eq("user_id", user!.id),
    supabase.from("requests")
      .select("id, state, notified_at, events!inner(date, markets(name, slug)), invoices(amount_pence, due_date, status, payment_url)")
      .gte("events.date", todayIso()),
  ]);
  const me = (profiles ?? []) as unknown as Profile[];
  // draft invitations (not yet sent by the organiser) stay hidden
  const rows = ((reqs ?? []) as unknown as Row[])
    .filter((r) => r.state !== "invited" || r.notified_at)
    .sort((a, b) => a.events.date.localeCompare(b.events.date));
  const invites = rows.filter((r) => r.state === "invited");
  const booked = rows.filter((r) => r.state !== "invited");

  return (
    <Shell nav={<AuthNav signedIn={!!user} />}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-3xl font-bold">My markets</h1>
        <form action="/logout" method="post"><button className="text-sm text-muted hover:underline">Sign out ({user?.email})</button></form>
      </div>

      {!me.length && (
        <Card className="mt-6">
          <p>There is no trader profile for {user?.email} yet.</p>
          <p className="mt-2 text-sm text-muted">If you have applied with a different email, sign in with that one. Otherwise, pick a market and apply.</p>
          <Link href="/" className="btn btn-primary mt-4">See the markets</Link>
        </Card>
      )}

      {me.map((p) => (
        <Card key={p.id} className="mt-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="display text-xl font-semibold">{p.business_name}</span>
            <span className="text-sm text-muted">with {p.organisers.name}</span>
          </div>
          {p.status === "applied" && <p className="mt-2">Your application is being reviewed. You will get an email when it has been.</p>}
          {p.status === "rejected" && <p className="mt-2">The organiser is not able to offer you a place at the moment.</p>}
          {p.status === "approved" && (
            <div className="mt-3 flex flex-wrap gap-2">
              {p.stallholder_markets.map((sm) => (
                <Link key={sm.markets.slug} href={`/m/${sm.markets.slug}`} className="rounded-xl border border-line bg-cream px-3 py-2 text-sm hover:bg-cream-deep">
                  <b className="font-semibold text-ink-strong">{sm.markets.name}</b> <span className="text-muted">· {sm.markets.recurrence_note}</span>
                </Link>
              ))}
              {!p.stallholder_markets.length && <span className="text-sm text-muted">Approved, but no markets set yet. The organiser will add them.</span>}
            </div>
          )}
        </Card>
      ))}

      {invites.length > 0 && (
        <section className="mt-10">
          <h2 className="text-2xl font-semibold">Invitations</h2>
          <p className="mt-1 text-sm text-muted">The organiser would like you at these markets. Saying yes confirms your pitch and sends the invoice.</p>
          <div className="mt-4 flex flex-col gap-3">
            {invites.map((r) => (
              <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="display text-lg font-semibold">{fmtDate(r.events.date, { weekday: "long", day: "numeric", month: "long" })}</div>
                  <div className="text-sm text-muted">{r.events.markets.name}</div>
                </div>
                <form action={answerInvite} className="flex gap-2">
                  <input type="hidden" name="id" value={r.id} />
                  <button name="answer" value="yes" className="btn btn-primary">Yes, I will be there</button>
                  <button name="answer" value="no" className="btn btn-ghost">Can&rsquo;t make it</button>
                </form>
              </Card>
            ))}
          </div>
        </section>
      )}

      {booked.length > 0 && (
        <section className="mt-10">
          <h2 className="text-2xl font-semibold">Coming up</h2>
          <div className="mt-4 flex flex-col gap-3">
            {booked.map((r) => (
              <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="display text-lg font-semibold">{fmtDate(r.events.date, { weekday: "long", day: "numeric", month: "long" })}</div>
                  <Link href={`/m/${r.events.markets.slug}`} className="text-sm text-muted hover:underline">{r.events.markets.name}</Link>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {r.state === "requested" && <Chip kind="req">Requested</Chip>}
                  {r.state === "approved" && <Chip kind="appr">Attending</Chip>}
                  {(r.state === "declined" || r.state === "withdrawn" || r.state === "released") && <Chip kind="avail">Not attending</Chip>}
                  {r.invoices?.status === "unpaid" && r.state === "approved" && (
                    <span className="tnum">{fmtMoney(r.invoices.amount_pence)} due {fmtDate(r.invoices.due_date)}
                      {r.invoices.payment_url && <a href={r.invoices.payment_url} className="btn btn-primary ml-3">Pay</a>}
                    </span>
                  )}
                  {r.invoices?.status === "paid" && <Chip kind="appr">Paid</Chip>}
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </Shell>
  );
}
