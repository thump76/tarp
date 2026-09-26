"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentOrganiser } from "@/lib/admin";
import { sendEmail, siteUrl } from "@/lib/email";

function refresh() {
  revalidatePath("/admin/traders");
  revalidatePath("/admin", "layout");
}

export async function decideApplication(formData: FormData) {
  const { supabase, org } = await currentOrganiser();
  const id = String(formData.get("id"));
  const approve = formData.get("decision") === "approve";
  const marketIds = formData.getAll("markets").map(String);
  if (approve && !marketIds.length) throw new Error("Tick at least one market before approving.");
  const { error } = await supabase.rpc("decide_application", { sh: id, approve, market_ids: marketIds });
  if (error) throw new Error(error.message);

  const { data: sh } = await supabase.from("stallholders").select("email, business_name").eq("id", id).single();
  if (sh && approve) {
    const { data: markets } = await supabase.from("markets").select("name, slug, recurrence_note").in("id", marketIds).order("name");
    const list = (markets ?? []).map((m) => `  ${m.name} (${m.recurrence_note}): ${siteUrl(`/m/${m.slug}`)}`).join("\n");
    await sendEmail({
      to: sh.email,
      subject: `You're approved to trade with ${org.name}`,
      text: `Good news: ${sh.business_name} is approved to trade with ${org.name} at:\n\n${list}\n\nSign in with this email address to request dates. The organiser may also invite you to dates directly; you will get an email when they do.\n\n${siteUrl("/login?next=/me")}`,
    });
  } else if (sh) {
    await sendEmail({
      to: sh.email,
      subject: `Your application to ${org.name}`,
      text: `Thank you for applying to trade with ${org.name}. We are not able to offer ${sh.business_name} a place at the moment, usually because we already have enough stalls selling similar things. We will keep your details in case that changes.`,
    });
  }
  refresh();
}

export async function toggleMarket(stallholderId: string, marketId: string, on: boolean) {
  const { supabase } = await currentOrganiser();
  const { error } = on
    ? await supabase.from("stallholder_markets").upsert({ stallholder_id: stallholderId, market_id: marketId })
    : await supabase.from("stallholder_markets").delete().eq("stallholder_id", stallholderId).eq("market_id", marketId);
  if (error) throw new Error(error.message);
  refresh();
}

export async function setCategory(stallholderId: string, categoryId: string) {
  const { supabase } = await currentOrganiser();
  const { error } = await supabase.from("stallholders").update({ category_id: categoryId || null }).eq("id", stallholderId);
  if (error) throw new Error(error.message);
  refresh();
}

export type NewTrader = { business_name: string; contact_name?: string; email: string; phone?: string; category?: string; markets?: string[] };

/**
 * Add traders the organiser already works with. They skip the application and go straight into
 * the pools of the markets given. Category and markets are matched by name, case-insensitively.
 */
export async function importTraders(rows: NewTrader[], notify: boolean): Promise<{ added: number; skipped: string[] }> {
  const { supabase, org } = await currentOrganiser();
  const [{ data: cats }, { data: mkts }, { data: existing }] = await Promise.all([
    supabase.from("categories").select("id, name").eq("organiser_id", org.id),
    supabase.from("markets").select("id, name, slug").eq("organiser_id", org.id).is("deleted_at", null),
    supabase.from("stallholders").select("email").eq("organiser_id", org.id),
  ]);
  const norm = (s: string) => s.trim().toLowerCase();
  const catId = (name?: string) => cats?.find((c) => name && norm(c.name) === norm(name))?.id ?? null;
  const mktId = (name: string) => mkts?.find((m) => norm(m.name) === norm(name) || m.slug === norm(name))?.id;
  const have = new Set((existing ?? []).map((e) => norm(e.email)));

  let added = 0;
  const skipped: string[] = [];
  for (const r of rows) {
    const email = norm(r.email ?? "");
    if (!r.business_name?.trim() || !email.includes("@")) { skipped.push(`${r.business_name || "(no name)"}: missing name or email`); continue; }
    if (have.has(email)) { skipped.push(`${r.business_name}: already on your list`); continue; }
    const { data: sh, error } = await supabase.from("stallholders").insert({
      organiser_id: org.id, business_name: r.business_name.trim(), contact_name: r.contact_name?.trim() || null,
      email, phone: r.phone?.trim() || null, category_id: catId(r.category), status: "approved", approved_at: new Date().toISOString(),
    }).select("id").single();
    if (error || !sh) { skipped.push(`${r.business_name}: ${error?.message}`); continue; }
    const ids = (r.markets ?? []).map(mktId).filter((x): x is string => !!x);
    if (ids.length) await supabase.from("stallholder_markets").insert(ids.map((m) => ({ stallholder_id: sh.id, market_id: m })));
    have.add(email);
    added++;
    if (notify) {
      await sendEmail({
        to: email,
        subject: `${org.name} is using Tarp for bookings`,
        text: `Hello${r.contact_name ? ` ${r.contact_name.trim()}` : ""},\n\n${org.name} now handles market bookings through Tarp. You are already set up as ${r.business_name.trim()}, so there is nothing to apply for.\n\nSign in with this email address to see your markets, answer invitations and request dates:\n${siteUrl("/login?next=/me")}\n\nNo password needed; we email you a sign-in link each time.`,
      });
    }
  }
  refresh();
  return { added, skipped };
}

export async function addTrader(formData: FormData) {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const { supabase } = await currentOrganiser();
  const { data: mkts } = await supabase.from("markets").select("id, name").in("id", formData.getAll("markets").map(String));
  const { data: cat } = await supabase.from("categories").select("name").eq("id", get("category_id")).maybeSingle();
  const res = await importTraders([{
    business_name: get("business_name"), contact_name: get("contact_name"), email: get("email"), phone: get("phone"),
    category: cat?.name, markets: (mkts ?? []).map((m) => m.name),
  }], formData.get("notify") === "on");
  if (!res.added) throw new Error(res.skipped[0] ?? "Could not add that trader.");
  redirect("/admin/traders");
}

/** Edit an approved trader's details. Email changes are allowed; the trader signs in with the new one. */
export async function updateTrader(formData: FormData) {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const { supabase, org } = await currentOrganiser();
  const id = get("id");
  const email = get("email").toLowerCase();
  if (!get("business_name") || !email.includes("@")) throw new Error("Business name and a valid email are required.");
  const { error } = await supabase.from("stallholders").update({
    business_name: get("business_name"), contact_name: get("contact_name") || null, email,
    phone: get("phone") || null, category_id: get("category_id") || null,
    description: get("description") || null, website: get("website") || null,
    instagram: get("instagram").replace(/^@/, "") || null, notes: get("notes") || null,
  }).eq("id", id).eq("organiser_id", org.id);
  if (error) throw new Error(error.code === "23505" ? "Another trader already uses that email." : error.message);
  const ticked = new Set(formData.getAll("markets").map(String));
  const { data: cur } = await supabase.from("stallholder_markets").select("market_id").eq("stallholder_id", id);
  const have = new Set((cur ?? []).map((c) => c.market_id));
  const add = [...ticked].filter((m) => !have.has(m)).map((m) => ({ stallholder_id: id, market_id: m }));
  const drop = [...have].filter((m) => !ticked.has(m));
  if (add.length) await supabase.from("stallholder_markets").insert(add);
  if (drop.length) await supabase.from("stallholder_markets").delete().eq("stallholder_id", id).in("market_id", drop);
  refresh();
  redirect("/admin/traders");
}

/**
 * Soft delete: the trader leaves every pool and list and cannot request dates, but their history
 * (past attendance, invoices) is kept. Confirmed pitches on upcoming dates are released and their
 * unpaid invoices voided. Restorable from Deleted traders.
 */
export async function deleteTrader(formData: FormData) {
  const { supabase, org } = await currentOrganiser();
  const id = String(formData.get("id"));
  const today = new Date().toISOString().slice(0, 10);
  const { data: live } = await supabase.from("requests").select("event_id, events!inner(date)")
    .eq("stallholder_id", id).in("state", ["approved", "invited", "requested"]).gte("events.date", today);
  for (const r of live ?? []) {
    const { error } = await supabase.rpc("place_trader", { ev: r.event_id, sh: id, to_state: "pool" });
    if (error) throw new Error(error.message);
  }
  const { error } = await supabase.from("stallholders").update({ deleted_at: new Date().toISOString() }).eq("id", id).eq("organiser_id", org.id);
  if (error) throw new Error(error.message);
  refresh();
  redirect("/admin/traders");
}

export async function restoreTrader(formData: FormData) {
  const { supabase, org } = await currentOrganiser();
  const { error } = await supabase.from("stallholders").update({ deleted_at: null }).eq("id", String(formData.get("id"))).eq("organiser_id", org.id);
  if (error) throw new Error(error.message);
  refresh();
  revalidatePath("/admin/traders/deleted");
}
