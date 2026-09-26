import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Shell } from "@/components/ui";
import type { Category, Market } from "@/lib/types";
import { ApplyForm } from "./form";

export default async function Apply({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const supabase = await createClient();
  const { data: organiser } = await supabase.from("organisers").select("id, name, slug").eq("slug", org).maybeSingle();
  if (!organiser) notFound();
  const [{ data: markets }, { data: categories }] = await Promise.all([
    supabase.from("markets").select("*").eq("organiser_id", organiser.id).is("deleted_at", null).order("name").returns<Market[]>(),
    supabase.from("categories").select("*").eq("organiser_id", organiser.id).order("sort").returns<Category[]>(),
  ]);

  return (
    <Shell nav={<Link href="/login" className="btn btn-ghost text-sm">Already approved? Sign in</Link>}>
      <div className="max-w-2xl">
        <h1 className="text-4xl font-bold">Trade with {organiser.name}</h1>
        <p className="mt-3 text-muted">
          Tell us about your business. The organiser reviews every application to keep a good mix of stalls
          and avoid two people selling the same thing. Once approved, you will get an email listing the markets
          you can book, and you can request dates from then on.
        </p>
        <ApplyForm org={organiser.slug} markets={markets ?? []} categories={categories ?? []} />
      </div>
    </Shell>
  );
}
