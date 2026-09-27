#!/usr/bin/env node
/**
 * Creates the two Tarp products and monthly GBP prices in Stripe, with the lookup keys the app
 * uses to find them. Safe to run more than once: existing lookup keys are left alone.
 *
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-setup.mjs
 *
 * Run it once with your test key and once with your live key.
 */
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) { console.error("Set STRIPE_SECRET_KEY first."); process.exit(1); }
const stripe = new Stripe(key);

const plans = [
  { lookup: "tarp_starter_monthly", name: "Tarp Starter", pence: 1000, description: "One location, unlimited market dates, 2 admins." },
  { lookup: "tarp_business_monthly", name: "Tarp Business", pence: 4000, description: "Unlimited locations and admins, with help importing your traders." },
];

for (const p of plans) {
  const existing = await stripe.prices.list({ lookup_keys: [p.lookup], active: true, limit: 1 });
  if (existing.data[0]) { console.log(`${p.lookup}: already there (${existing.data[0].id})`); continue; }
  const product = await stripe.products.create({ name: p.name, description: p.description });
  const price = await stripe.prices.create({
    product: product.id, currency: "gbp", unit_amount: p.pence, recurring: { interval: "month" },
    lookup_key: p.lookup, tax_behavior: "inclusive",
  });
  console.log(`${p.lookup}: created ${price.id}`);
}
console.log("\nNext: Settings > Billing > Customer portal in the Stripe dashboard. Turn on 'Customers can switch plans' and add both products.");
