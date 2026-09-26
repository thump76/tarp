import Link from "next/link";
import { currentOrganiser } from "@/lib/admin";
import { ImportForm } from "./form";

export default async function Import() {
  const { supabase, org } = await currentOrganiser();
  const [{ data: markets }, { data: categories }] = await Promise.all([
    supabase.from("markets").select("name").eq("organiser_id", org.id).is("deleted_at", null).order("name"),
    supabase.from("categories").select("name").eq("organiser_id", org.id).order("sort"),
  ]);
  return (
    <>
      <Link href="/admin/traders" className="text-sm text-muted hover:underline">Traders</Link>
      <h1 className="mt-2 text-4xl font-bold">Import your traders</h1>
      <div className="mt-3 max-w-prose text-muted">
        <p>Paste from your spreadsheet or upload a CSV. One row per trader, with these columns:</p>
        <p className="mt-2 font-mono text-sm text-ink">business_name, contact_name, email, phone, category, markets</p>
        <p className="mt-2 text-sm">
          Only business name and email are required. <b className="text-ink">category</b> should be one of: {(categories ?? []).map((c) => c.name).join(", ")}.
          {" "}<b className="text-ink">markets</b> is a list separated by semicolons from: {(markets ?? []).map((m) => m.name).join("; ")}.
          {" "}<a href="/tarp-traders-template.csv" className="underline">Download a template</a>.
        </p>
      </div>
      <ImportForm />
    </>
  );
}
