import Link from "next/link";
import { currentOrganiser } from "@/lib/admin";
import { Card } from "@/components/ui";
import { addTrader } from "../actions";

const field = "w-full rounded-xl border border-line bg-white/60 px-3 py-2 text-base";

export default async function NewTrader() {
  const { supabase, org } = await currentOrganiser();
  const [{ data: markets }, { data: categories }] = await Promise.all([
    supabase.from("markets").select("id, name").eq("organiser_id", org.id).is("deleted_at", null).order("name"),
    supabase.from("categories").select("id, name").eq("organiser_id", org.id).order("sort"),
  ]);
  return (
    <>
      <Link href="/admin/traders" className="text-sm text-muted hover:underline">Traders</Link>
      <h1 className="mt-2 text-4xl font-bold">Add a trader</h1>
      <p className="mt-2 text-muted">For someone you already work with. They skip the application and go straight into the pools you tick.</p>
      <Card className="mt-6 max-w-2xl">
        <form action={addTrader} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <input name="business_name" required placeholder="Business name" className={field} />
            <input name="contact_name" placeholder="Contact name" className={field} />
            <input name="email" type="email" required placeholder="Email" className={field} />
            <input name="phone" type="tel" placeholder="Phone" className={field} />
          </div>
          <select name="category_id" defaultValue="" className={field}>
            <option value="">Category</option>
            {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex flex-wrap gap-2">
            {markets?.map((m) => (
              <label key={m.id} className="inline-flex items-center gap-2 rounded-full border border-line bg-cream px-3 py-1.5 text-sm">
                <input type="checkbox" name="markets" value={m.id} className="accent-[var(--ink-strong)]" />{m.name}
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notify" className="accent-[var(--ink-strong)]" />Email them a sign-in link now</label>
          <div><button className="btn btn-primary">Add trader</button></div>
        </form>
      </Card>
    </>
  );
}
