"use server";

import { redirect } from "next/navigation";
import { stripe } from "@/lib/stripe";
import { siteUrl } from "@/lib/email";
import { PLANS, TRIAL_DAYS, isPlanId } from "@/lib/plans";

/** Sends the organiser to Stripe Checkout for the plan they picked. The organiser is created after payment. */
export async function startCheckout(formData: FormData) {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const plan = get("plan");
  const orgName = get("org_name").slice(0, 80);
  const name = get("name").slice(0, 80);
  const email = get("email").toLowerCase();
  const back = (msg: string) =>
    redirect(`/signup?plan=${isPlanId(plan) ? plan : "starter"}&error=${encodeURIComponent(msg)}&org_name=${encodeURIComponent(orgName)}&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`);

  if (!isPlanId(plan)) back("Pick a plan.");
  if (!orgName) back("Tell us what your market or company is called.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) back("Check your email address.");
  const p = PLANS[plan as keyof typeof PLANS];

  let url: string | null = null;
  try {
    const prices = await stripe().prices.list({ lookup_keys: [p.lookupKey], active: true, limit: 1 });
    const price = prices.data[0];
    if (!price) throw new Error(`No active Stripe price with lookup key ${p.lookupKey}. Run scripts/stripe-setup.mjs.`);
    const meta = { plan: p.id, org_name: orgName, name };
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: price.id, quantity: 1 }],
      customer_email: email,
      metadata: meta,
      subscription_data: { metadata: meta, ...(TRIAL_DAYS ? { trial_period_days: TRIAL_DAYS } : {}) },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      locale: "en-GB",
      success_url: siteUrl("/signup/complete?session_id={CHECKOUT_SESSION_ID}"),
      cancel_url: siteUrl(`/pricing?cancelled=1`),
    });
    url = session.url;
  } catch (err) {
    console.error("startCheckout", err);
    back("We couldn't open the payment page. Please try again in a minute.");
  }
  if (!url) back("We couldn't open the payment page. Please try again in a minute.");
  redirect(url!);
}
