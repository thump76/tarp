import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Member } from "@/lib/types";
import { PLANS, type PlanId } from "@/lib/plans";

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

export type Billing = {
  organiser_id: string; plan: PlanId; stripe_customer_id: string | null; status: string | null;
  current_period_end: string | null; trial_end: string | null; cancel_at_period_end: boolean;
};

/**
 * The organiser's plan. No billing row means an organiser set up by hand before self-serve
 * sign-up (The Producers Markets): treated as Business and never billed.
 */
export async function currentPlan(supabase: Awaited<ReturnType<typeof createClient>>, orgId: string) {
  const { data } = await supabase.from("organiser_billing").select("*").eq("organiser_id", orgId).maybeSingle<Billing>();
  const plan = PLANS[data?.plan ?? "business"];
  const lapsed = !!data && !["trialing", "active"].includes(data.status ?? "");
  return { billing: data, plan, comped: !data, lapsed };
}

/** Throws a friendly error when a plan limit would be passed. */
export function assertWithin(limit: number | null, used: number, what: string) {
  if (limit !== null && used >= limit) {
    throw new Error(`Your plan includes ${limit} ${what}. Upgrade to Business under Settings, Billing to add more.`);
  }
}
