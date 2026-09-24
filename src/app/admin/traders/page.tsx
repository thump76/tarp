import Link from "next/link";
import { currentOrganiser } from "@/lib/admin";
import { Card } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import type { Category, Market, Stallholder } from "@/lib/types";
import { decideApplication } from "./actions";
import { TraderRow } from "./trader-row";

export const dynamic = "force-dynamic";

type Row = Stallholder & { stallholder_markets: { market_id: string }[] };

export default async function Traders({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { supabase, org } = await currentOrganiser();
  const [{ data: traders }, { data: markets }, { data: categories }] = await Promise.all([
    supabase.from("stallholders").select("*, stallholder_markets(market_id)").eq("organiser_id", org.id).order("business_name").returns<Row[]>(),
    supabase.from("markets").select("*").eq("organiser_id", org.id).order("name").returns<Market[]>(),
    supabase.from("categories").select("*").eq("organiser_id", org.id).order("sort").returns<Category[]>(),
  ]);
  const all = traders ?? [];
  const applications = all.filter((t) => t.status === "applied").sort((a, b) => (a.applied_at ?? "").localeCompare(b.applied_at ?? ""));
  const needle = (q ?? "").trim().toLowerCase();
  const approved = all.filter((t) => t.status === "approved" && (!needle || `${t.business_name} ${t.contact_name ?? ""} ${t.email}`.toLowerCase().includes(needle)));
  const catName = (id: string | null) => categories?.find((c) => c.id === id)?.name ?? "No category";

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Traders</h1>
          <p className="mt-1 text-muted">{all.filter((t) => t.status === "approved").length} approved. A tick puts a trader in that market&rsquo;s pool, ready to drag onto a date.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/traders/new" className="btn btn-ghost">Add a trader</Link>
          <Link href="/admin/traders/import" className="btn btn-primary">Import spreadsheet</Link>
        </div>
      </div>

      {applications.length > 0 && (
        <section className="mt-8">
          <h2 className="text-2xl font-semibold">New applications <span className="chip chip-req ml-2 align-middle">{applications.length}</span></h2>
          <div className="mt-4 flex flex-col gap-3">
            {applications.map((a) => (
              <Card key={a.id}>
                <form action={decideApplication} className="grid gap-3">
                  <input type="hidden" name="id" value={a.id} />
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="display text-xl font-semibold">{a.business_name}</span>
                    <span className="text-sm text-muted">applied {a.applied_at ? fmtDate(a.applied_at.slice(0, 10)) : ""}</span>
                  </div>
                  <div className="text-sm text-muted">
                    {catName(a.category_id)}{a.contact_name ? ` · ${a.contact_name}` : ""} · {a.email}{a.phone ? ` · ${a.phone}` : ""}
                  </div>
                  {a.description && <p className="max-w-prose text-sm">{a.description}</p>}
                  {(a.website || a.instagram) && (
                    <div className="flex flex-wrap gap-3 text-sm">
                      {a.website && <a href={a.website} target="_blank" rel="noreferrer" className="underline">{a.website.replace(/^https?:\/\//, "")}</a>}
                      {a.instagram && <a href={`https://instagram.com/${a.instagram.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="underline">{a.instagram}</a>}
                    </div>
                  )}
                  <fieldset>
                    <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">Approve for</legend>
                    <div className="flex flex-wrap gap-2">
                      {markets?.map((m) => (
                        <label key={m.id} className="inline-flex items-center gap-2 rounded-full border border-line bg-cream px-3 py-1.5 text-sm">
                          <input type="checkbox" name="markets" value={m.id} defaultChecked={a.requested_market_ids?.includes(m.id)} className="accent-[var(--ink-strong)]" />
                          {m.name}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div className="flex gap-2">
                    <button name="decision" value="approve" className="btn btn-primary">Approve and email</button>
                    <button name="decision" value="reject" className="btn btn-ghost">Not this time</button>
                  </div>
                </form>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-semibold">Approved traders</h2>
          <form className="flex gap-2">
            <input name="q" defaultValue={q} placeholder="Search" className="rounded-full border border-line bg-white/60 px-3 py-1.5 text-sm" />
          </form>
        </div>
        <div className="mt-4 overflow-x-auto rounded-2xl bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
                <th className="px-4 py-3 font-semibold">Trader</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                {markets?.map((m) => <th key={m.id} className="px-2 py-3 text-center font-semibold">{m.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {approved.map((t) => (
                <TraderRow key={t.id} trader={t} markets={markets ?? []} categories={categories ?? []} ticked={t.stallholder_markets.map((x) => x.market_id)} />
              ))}
              {!approved.length && <tr><td colSpan={2 + (markets?.length ?? 0)} className="px-4 py-6 text-muted">{needle ? "No traders match that search." : "No approved traders yet. Import your spreadsheet or approve an application."}</td></tr>}
            </tbody>
          </table>
        </div>
        {all.some((t) => t.status === "rejected") && (
          <p className="mt-3 text-sm text-muted">Not accepted: {all.filter((t) => t.status === "rejected").map((t) => t.business_name).join(", ")}</p>
        )}
      </section>
    </>
  );
}
