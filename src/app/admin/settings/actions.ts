"use server";

import { revalidatePath } from "next/cache";
import { currentOrganiser } from "@/lib/admin";
import { sendEmail, siteUrl } from "@/lib/email";

function refresh() {
  revalidatePath("/admin/settings");
  revalidatePath("/admin", "layout");
}

/** Any admin can add another admin. They get a sign-in link; the row attaches to them on first sign-in. */
export async function inviteAdmin(formData: FormData) {
  const { supabase, org, user } = await currentOrganiser();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim() || null;
  if (!email.includes("@")) throw new Error("Enter an email address.");
  const { error } = await supabase.from("organiser_members").insert({ organiser_id: org.id, email, name, role: "admin", invited_by: user.id });
  if (error) throw new Error(error.code === "23505" ? "That email is already on the team." : error.message);
  await sendEmail({
    to: email,
    subject: `You're an admin for ${org.name} on Tarp`,
    text: `Hello${name ? ` ${name}` : ""},\n\n${user.email} has made you an admin for ${org.name} on Tarp, the booking and calendar app for the markets.\n\nSign in with this email address and you will see the organiser view:\n${siteUrl("/login?next=/admin")}\n\nNo password needed; we email you a sign-in link each time.`,
  });
  refresh();
}

/** Owners can remove anyone but the last owner; admins can remove other admins. */
export async function removeAdmin(formData: FormData) {
  const { supabase, org, member } = await currentOrganiser();
  const id = String(formData.get("id"));
  const { data: target } = await supabase.from("organiser_members").select("id, role, user_id").eq("id", id).eq("organiser_id", org.id).maybeSingle();
  if (!target) return;
  if (target.role === "owner" && member.role !== "owner") throw new Error("Only an owner can remove an owner.");
  if (target.role === "owner") {
    const { count } = await supabase.from("organiser_members").select("id", { count: "exact", head: true }).eq("organiser_id", org.id).eq("role", "owner").is("removed_at", null);
    if ((count ?? 0) <= 1) throw new Error("There must be at least one owner.");
  }
  const { error } = await supabase.from("organiser_members").update({ removed_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function savePayments(formData: FormData) {
  const { supabase, org } = await currentOrganiser();
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const sort = get("bank_sort_code").replace(/\D/g, "");
  const acct = get("bank_account_number").replace(/\D/g, "");
  if (sort && sort.length !== 6) throw new Error("A sort code is six digits.");
  if (acct && acct.length !== 8) throw new Error("An account number is eight digits.");
  const { error } = await supabase.from("organiser_settings").upsert({
    organiser_id: org.id,
    bank_account_name: get("bank_account_name") || null,
    bank_sort_code: sort ? `${sort.slice(0, 2)}-${sort.slice(2, 4)}-${sort.slice(4)}` : null,
    bank_account_number: acct || null,
    reference_prefix: (get("reference_prefix").toUpperCase().replace(/[^A-Z0-9]/g, "") || "TARP").slice(0, 8),
    payment_note: get("payment_note") || null,
    reply_to: get("reply_to").toLowerCase() || null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  refresh();
}
