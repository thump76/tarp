"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentOrganiser } from "@/lib/admin";

function refresh() {
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
}

function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "location";
}

function read(formData: FormData) {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const name = get("name");
  if (!name) throw new Error("Give the location a name.");
  const pitches = Math.floor(Number(get("default_pitches") || 30));
  const fee = Math.round(parseFloat(get("default_fee_pounds") || "0") * 100);
  const due = Math.floor(Number(get("invoice_due_days_before") || 14));
  return {
    name,
    venue: get("venue") || name,
    address: get("address") || null,
    postcode: get("postcode").toUpperCase() || null,
    recurrence_note: get("recurrence_note") || null,
    default_pitches: pitches > 0 ? pitches : 30,
    default_fee_pence: fee >= 0 ? fee : 4000,
    invoice_due_days_before: due >= 0 ? due : 14,
  };
}

export async function createLocation(formData: FormData) {
  const { supabase, org } = await currentOrganiser();
  const row = read(formData);
  // slug from the name, with a numeric suffix if it is taken within this organiser
  const base = slugify(row.name);
  const { data: taken } = await supabase.from("markets").select("slug").eq("organiser_id", org.id).like("slug", `${base}%`);
  const used = new Set((taken ?? []).map((t) => t.slug));
  let slug = base; for (let i = 2; used.has(slug); i++) slug = `${base}-${i}`;
  const { data, error } = await supabase.from("markets").insert({ ...row, slug, organiser_id: org.id }).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "Could not save");
  refresh();
  redirect(`/admin/event/new?location=${data.id}`);
}

export async function updateLocation(formData: FormData) {
  const { supabase, org } = await currentOrganiser();
  const id = String(formData.get("id"));
  const { error } = await supabase.from("markets").update(read(formData)).eq("id", id).eq("organiser_id", org.id);
  if (error) throw new Error(error.message);
  refresh();
  redirect("/admin/locations");
}

/** Soft delete. Future dates go with it (unpaid invoices voided); past dates stay in the archive. Restorable. */
export async function deleteLocation(formData: FormData) {
  const { supabase } = await currentOrganiser();
  const { error } = await supabase.rpc("delete_market", { mk: String(formData.get("id")) });
  if (error) throw new Error(error.message);
  refresh();
  redirect("/admin/locations");
}
