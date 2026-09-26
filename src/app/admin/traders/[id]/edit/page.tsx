import Link from "next/link";
import { notFound } from "next/navigation";
import { currentOrganiser } from "@/lib/admin";
import { Card } from "@/components/ui";
import { Field, field } from "@/components/form";
import { DangerZone } from "@/components/danger-zone";
import { fmtDate, todayIso } from "@/lib/format";
import type { Category, Market, Stallholder } from "@/lib/types";
import { deleteTrader, updateTrader } from "../../actions";

export const dynamic = "force-dynamic";

type Row = Stallholder & { stallholder_markets: { market_id: string }[] };

export default async function EditTrader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, org } = await currentOrganiser();
  const [{ data: t }, { data: markets }, { data: categories }] = await Promise.all([
    supabase.from("stallholders").select("*, stallholder_markets(market_id)").eq("id", id).eq("organiser_id", org.id).is("deleted_at", null).maybeSingle<Row>(),
    supabase.from("markets").select("*").eq("organiser_id", org.id).is("deleted_at", null).order("name").returns<Market[]>(),
    supabase.from("categories").select("*").eq("organiser_id", org.id).order("sort").returns<Category[]>(),
  ]);
  if (!t) notFound();
  const [{ count: upcoming }, { data: history }] = await Promise.all([
    supabase.from("requests").select("id, events!inner(date)", { count: "exact", head: true }).eq("stallholder_id", id).eq("state", "approved").gte("events.date", todayIso()),
    supabase.from("requests").select("events!inner(date, markets(name)), invoices(status)").eq("stallholder_id", id).eq("state", "approved").lt("events.date", todayIso()),
  ]);
  type Past = { events: { date: string; markets: { name: string } }; invoices: { status: string } | null };
  const recent = ((history ?? []) as unknown as Past[]).sort((a, b) => b.events.date.localeCompare(a.events.date)).slice(0, 6);
  const ticked = new Set(t.stallholder_markets.map((x) => x.market_id));

  return (
    <>
      <Link href="/admin/traders" className="text-sm text-muted hover:underline">Traders</Link>
      <h1 className="mt-2 text-4xl font-bold">{t.business_name}</h1>
      <p className="mt-1 text-sm text-muted">{t.user_id ? "Has signed in" : "Not signed in yet"}{t.applied_at ? ` · applied ${fmtDate(t.applied_at.slice(0, 10))}` : ""}</p>

      <Card className="mt-6 max-w-2xl">
        <form action={updateTrader} className="grid gap-5">
          <input type="hidden" name="id" value={t.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business name"><input name="business_name" required defaultValue={t.business_name} className={field} /></Field>
            <Field label="Contact name"><input name="contact_name" defaultValue={t.contact_name ?? ""} className={field} /></Field>
            <Field label="Email" hint="They sign in with this."><input name="email" type="email" required defaultValue={t.email} className={field} /></Field>
            <Field label="Phone"><input name="phone" type="tel" defaultValue={t.phone ?? ""} className={field} /></Field>
          </div>
          <Field label="Category">
            <select name="category_id" defaultValue={t.category_id ?? ""} className={field}>
              <option value="">No category</option>
              {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="What they sell"><textarea name="description" rows={2} defaultValue={t.description ?? ""} className={field} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Website"><input name="website" type="url" defaultValue={t.website ?? ""} className={field} placeholder="https://" /></Field>
            <Field label="Instagram"><input name="instagram" defaultValue={t.instagram ?? ""} className={field} placeholder="@handle" /></Field>
          </div>
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold">Locations they can trade at</legend>
            <div className="flex flex-wrap gap-2">
              {markets?.map((m) => (
                <label key={m.id} className="inline-flex items-center gap-2 rounded-full border border-line bg-cream px-3 py-1.5 text-sm">
                  <input type="checkbox" name="markets" value={m.id} defaultChecked={ticked.has(m.id)} className="accent-[var(--ink-strong)]" />{m.name}
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Organiser notes" hint="Private. Traders never see this."><textarea name="notes" rows={2} defaultValue={t.notes ?? ""} className={field} /></Field>
          <div className="flex gap-2">
            <button className="btn btn-primary">Save changes</button>
            <Link href="/admin/traders" className="btn btn-ghost">Cancel</Link>
          </div>
        </form>
      </Card>

      {recent.length > 0 && (
        <Card className="mt-6 max-w-2xl">
          <h2 className="text-base font-semibold">Recent attendance</h2>
          <ul className="mt-2 grid gap-1 text-sm">
            {recent.map((h, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>{fmtDate(h.events.date, { day: "numeric", month: "short", year: "numeric" })}, {h.events.markets.name}</span>
                <span className="text-muted">{h.invoices?.status === "paid" ? "Paid" : h.invoices?.status === "unpaid" ? "Unpaid" : ""}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <DangerZone
        title="Delete this trader"
        summary={`They leave every pool and cannot request dates.${upcoming ? ` ${upcoming} confirmed pitch${upcoming === 1 ? "" : "es"} on upcoming dates will be released and unpaid invoices cancelled.` : ""} Past attendance and payments are kept. Nobody is emailed. Restorable from Deleted traders.`}
        action={deleteTrader} id={t.id} button="Delete trader" />
    </>
  );
}
