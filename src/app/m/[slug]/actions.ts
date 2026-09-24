"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * A signed-in stallholder requests a pitch on an event.
 * First request with a given organiser creates their stallholder record from the form.
 */
export async function requestPitch(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const eventId = String(formData.get("event_id"));
  const slug = String(formData.get("slug"));
  if (!user) redirect(`/login?next=/m/${slug}`);

  const { data: ev } = await supabase.from("public_events").select("organiser_id, available").eq("id", eventId).single();
  if (!ev) return { error: "That date is no longer available." };

  // find or create the stallholder record for this organiser
  let { data: sh } = await supabase.from("stallholders").select("id").eq("organiser_id", ev.organiser_id).eq("user_id", user.id).maybeSingle();
  if (!sh) {
    const business = String(formData.get("business_name") ?? "").trim();
    const contact = String(formData.get("contact_name") ?? "").trim();
    const category = String(formData.get("category_id") ?? "") || null;
    if (!business) return { error: "Tell us your business name so the organiser knows who is asking." };
    const ins = await supabase.from("stallholders")
      .insert({ organiser_id: ev.organiser_id, user_id: user.id, email: user.email!, business_name: business, contact_name: contact || null, category_id: category })
      .select("id").single();
    if (ins.error) return { error: ins.error.message };
    sh = ins.data;
  }

  const { error } = await supabase.from("requests").insert({ event_id: eventId, stallholder_id: sh.id, message: String(formData.get("message") ?? "") || null });
  if (error) return { error: error.code === "23505" ? "You have already requested this date." : error.message };

  revalidatePath(`/m/${slug}`);
  revalidatePath("/me");
  return { ok: true };
}
