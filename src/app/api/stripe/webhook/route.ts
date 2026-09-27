import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { provisionFromCheckout, syncSubscription } from "@/lib/billing";

/**
 * Stripe webhook. In the Stripe dashboard, add an endpoint for https://<site>/api/stripe/webhook
 * with these events: checkout.session.completed, customer.subscription.updated,
 * customer.subscription.deleted. Put its signing secret in STRIPE_WEBHOOK_SECRET.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return new Response("Webhook not configured", { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(await request.text(), signature, secret);
  } catch (err) {
    return new Response(`Bad signature: ${(err as Error).message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await provisionFromCheckout(event.data.object.id);
        break;
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object);
        break;
    }
  } catch (err) {
    console.error("Stripe webhook failed", event.type, err);
    return new Response("Handler failed", { status: 500 }); // Stripe retries
  }
  return Response.json({ received: true });
}
