import Link from "next/link";
import { currentOrganiser } from "@/lib/admin";
import { Card } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import type { Category, Stallholder } from "@/lib/types";
import { restoreTrader } from "../actions";

export const dynamic = "force-dynamic";

export default async function DeletedTraders() {
  const { supabase, org } = await currentOrganiser();
  const [{ data: traders }, { data: categories }] = await Promise.all([
    supabase.from("stallholders").select("*").eq("organiser_id", org.id).not("deleted_at", "is", null).order("deleted_at", { ascending: false }).returns<Stallholder[]>(),
    supabase.from("categories").select("*").eq("organiser_id", org.id).returns<Category[]>(),
  ]);
  const catName = (id: string | null) => categories?.find((c) => c.id === id)?.name ?? "No category";

  return (
    <>
      <Link href="/admin/traders" className="text-sm text-muted hover:underline">Traders</Link>
      <h1 className="mt-2 text-4xl font-bold">Deleted traders</h1>
      <p className="mt-1 text-muted">Out of every pool and unable to request dates. Their history is kept. Restore puts them back where they were.</p>
      <div className="mt-6 flex flex-col gap-2">
        {traders?.map((t) => (
          <Card key={t.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-ink-strong">{t.business_name}</div>
              <div className="text-xs text-muted">{catName(t.category_id)} · {t.email} · deleted {t.deleted_at ? fmtDate(t.deleted_at.slice(0, 10)) : ""}</div>
            </div>
            <form action={restoreTrader}><input type="hidden" name="id" value={t.id} /><button className="btn btn-ghost !py-1.5 text-xs">Restore</button></form>
          </Card>
        ))}
        {!traders?.length && <Card>No deleted traders.</Card>}
      </div>
    </>
  );
}
