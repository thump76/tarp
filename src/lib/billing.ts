import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, siteUrl } from "@/lib/email";
import { PLANS, isPlanId, planFromLookupKey, type PlanId } from "@/lib/plans";

const iso = (secs: number | null | undefined) => (secs ? new Date(secs * 1000).toISOString() : null);

function planOf(sub: Stripe.Subscription, fallback?: string | null): PlanId {
  const fromPrice = planFromLookupKey(sub.items.data[0]?.price.lookup_key);
  if (fromPrice) return fromPrice;
  return isPlanId(fallback) ? fallback : "starter";
}

/**
 * Turns a completed Checkout Session into an organiser with an owner. Safe to call more than once
 * and from two places at the same time (webhook and thank-you page): the database function locks
 * on the session id. Returns null if the session is not a completed subscription checkout.
 */
export async function provisionFromCheckout(sessionId: string) {
  const session = await stripe().checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
  if (session.mode !== "subscription" || session.status !== "complete") return null;

  const sub = session.subscription as Stripe.Subscription | null;
  const email = (session.customer_details?.email ?? session.customer_email ?? "").toLowerCase();
  if (!sub || !email) return null;
  const meta = session.metadata ?? {};
  const plan = planOf(sub, meta.plan);
  const customer = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

  const db = createAdminClient();
  const { data, error } = await db.rpc("provision_organiser", {
    p_session: session.id,
    p_email: email,
    p_name: meta.name ?? "",
    p_org_name: meta.org_name || "My market",
    p_plan: plan,
    p_customer: customer,
    p_subscription: sub.id,
    p_status: sub.status,
    p_period_end: iso(sub.items.data[0]?.current_period_end),
    p_trial_end: iso(sub.trial_end),
  }).single<{ org: string | null; created: boolean }>();
  if (error) throw new Error(`provision_organiser: ${error.message}`);
  if (!data?.org) return null;

  if (data.created) {
    const trial = sub.trial_end ? `\n\nYour free trial runs until ${new Date(sub.trial_end * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}. We'll email you before the first payment is taken.` : "";
    await sendEmail({
      to: email,
      subject: "Welcome to Tarp",
      text: `Hello${meta.name ? ` ${meta.name}` : ""},\n\nThanks for signing up to Tarp ${PLANS[plan].name}. ${meta.org_name} is set up and ready.${trial}\n\nSign in any time with this email address, no password needed:\n${siteUrl("/login?next=/admin")}\n\nA good first step is adding your location, then importing the traders you already work with.\n\nAny questions, just reply to this email.\n\nPhilip\nTarp`,
    });
  }
  return { org: data.org, email, created: data.created, sessionCreated: session.created };
}

/** Keeps organiser_billing in step with Stripe after upgrades, downgrades, failed payments and cancellations. */
export async function syncSubscription(sub: Stripe.Subscription) {
  const db = createAdminClient();
  const { data: row } = await db.from("organiser_billing").select("plan").eq("stripe_subscription_id", sub.id).maybeSingle();
  if (!row) return; // not provisioned yet; checkout.session.completed will create it with the latest state
  const { error } = await db.from("organiser_billing").update({
    plan: planOf(sub, row.plan),
    status: sub.status,
    current_period_end: iso(sub.items.data[0]?.current_period_end),
    trial_end: iso(sub.trial_end),
    cancel_at_period_end: sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  }).eq("stripe_subscription_id", sub.id);
  if (error) throw new Error(`sync billing: ${error.message}`);
}
