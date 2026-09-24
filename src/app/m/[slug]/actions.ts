"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** An approved trader requests a pitch on a date at a market they are set up for. */
export async function requestPitch(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const eventId = String(formData.get("event_id"));
  const slug = String(formData.get("slug"));
  if (!user) redirect(`/login?next=/m/${slug}`);

  const { data: ev } = await supabase.from("public_events").select("organiser_id").eq("id", eventId).single();
  if (!ev) return { error: "That date is no longer available." };

  const { data: sh } = await supabase.from("stallholders").select("id, status")
    .eq("organiser_id", ev.organiser_id).eq("user_id", user.id).maybeSingle();
  if (!sh || sh.status !== "approved") return { error: "You need to be approved by the organiser before you can request dates." };

  const { error } = await supabase.from("requests").insert({
    event_id: eventId, stallholder_id: sh.id, message: String(formData.get("message") ?? "") || null,
  });
  if (error) {
    if (error.code === "23505") return { error: "You are already on this date." };
    if (error.code === "42501") return { error: "You are not set up for this market yet. Ask the organiser to add it to your profile." };
    return { error: error.message };
  }

  revalidatePath(`/m/${slug}`);
  revalidatePath("/me");
  return { ok: true };
}
