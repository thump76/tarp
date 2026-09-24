import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Shell, Card, Chip, AuthNav } from "@/components/ui";
import { fmtDate, fmtMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

type Row = {
  id: string; state: string; created_at: string;
  events: { date: string; markets: { name: string; slug: string } };
  invoices: { amount_pence: number; due_date: string; status: string; payment_url: string | null } | null;
};

export default async function Me() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase
    .from("requests")
    .select("id, state, created_at, events(date, markets(name, slug)), invoices(amount_pence, due_date, status, payment_url)")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as Row[];

  return (
    <Shell nav={<AuthNav signedIn={!!user} />}>
      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl font-bold">My requests</h1>
        <form action="/logout" method="post"><button className="text-sm text-muted hover:underline">Sign out ({user?.email})</button></form>
      </div>
      <div className="mt-6 flex flex-col gap-3">
        {rows.map((r) => (
          <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="display text-lg font-semibold">{fmtDate(r.events.date, { weekday: "long", day: "numeric", month: "long" })}</div>
              <Link href={`/m/${r.events.markets.slug}`} className="text-sm text-muted hover:underline">{r.events.markets.name}</Link>
            </div>
            <div className="flex items-center gap-3 text-sm">
              {r.state === "requested" && <Chip kind="req">Requested</Chip>}
              {r.state === "approved" && <Chip kind="appr">Approved</Chip>}
              {r.state === "declined" && <Chip kind="avail">Not this time</Chip>}
              {r.state === "released" && <Chip kind="avail">Released</Chip>}
              {r.invoices && r.invoices.status === "unpaid" && (
                <span className="tnum">{fmtMoney(r.invoices.amount_pence)} due {fmtDate(r.invoices.due_date)}
                  {r.invoices.payment_url && <a href={r.invoices.payment_url} className="btn btn-primary ml-3">Pay</a>}
                </span>
              )}
              {r.invoices && r.invoices.status === "paid" && <Chip kind="appr">Paid</Chip>}
            </div>
          </Card>
        ))}
        {!rows.length && <Card>You have not requested a pitch yet. <Link href="/" className="underline">Pick a market</Link>.</Card>}
      </div>
    </Shell>
  );
}
