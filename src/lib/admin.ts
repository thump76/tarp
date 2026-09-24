import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** The organiser the signed-in user manages. Redirects to /admin (which explains) if none. */
export async function currentOrganiser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");
  const { data } = await supabase.from("organiser_members").select("organiser_id, organisers(id, name, slug)").eq("user_id", user.id).limit(1).maybeSingle();
  if (!data) redirect("/admin");
  const org = (data as unknown as { organisers: { id: string; name: string; slug: string } }).organisers;
  return { supabase, org };
}
