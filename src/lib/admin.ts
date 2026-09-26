import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Member } from "@/lib/types";

type Org = { id: string; name: string; slug: string };

/** The signed-in user's live membership, or null. Used by the Admin toggle and the organiser layout. */
export async function currentMembership() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, member: null, org: null };
  const { data } = await supabase.from("organiser_members").select("*, organisers(id, name, slug)")
    .eq("user_id", user.id).is("removed_at", null).limit(1).maybeSingle();
  if (!data) return { supabase, user, member: null, org: null };
  const row = data as unknown as Member & { organisers: Org };
  return { supabase, user, member: row as Member, org: row.organisers };
}

/** The organiser the signed-in user manages. Redirects to /admin (which explains) if none. */
export async function currentOrganiser() {
  const { supabase, user, member, org } = await currentMembership();
  if (!user) redirect("/login?next=/admin");
  if (!member || !org) redirect("/admin");
  return { supabase, org, member, user };
}
