import Stripe from "stripe";

let client: Stripe | null = null;

/** Server-only Stripe client. Throws a clear error if STRIPE_SECRET_KEY is missing. */
export function stripe() {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set. See README, Selling Tarp.");
  client = new Stripe(key);
  return client;
}
