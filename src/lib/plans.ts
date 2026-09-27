/**
 * The two organiser plans. One source of truth for the pricing page, the comparison table,
 * Stripe Checkout and the limits enforced in the organiser area.
 *
 * Prices live in Stripe; `lookupKey` is how we find them (see scripts/stripe-setup.mjs).
 * `pence` is for display only, so keep it in step with the Stripe price.
 */
export type PlanId = "starter" | "business";

export type Plan = {
  id: PlanId;
  name: string;
  pence: number;
  lookupKey: string;
  blurb: string;
  maxLocations: number | null; // null = unlimited
  maxAdmins: number | null;
};

export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: "starter",
    name: "Starter",
    pence: 1000,
    lookupKey: "tarp_starter_monthly",
    blurb: "For one market that runs every week or month.",
    maxLocations: 1,
    maxAdmins: 2,
  },
  business: {
    id: "business",
    name: "Business",
    pence: 4000,
    lookupKey: "tarp_business_monthly",
    blurb: "For organisers running several sites with a team.",
    maxLocations: null,
    maxAdmins: null,
  },
};

export const PLAN_LIST = [PLANS.starter, PLANS.business];

/** Free trial length for new sign-ups. 0 turns the trial off; copy across the site follows it. */
export const TRIAL_DAYS = Math.max(0, Number(process.env.NEXT_PUBLIC_TRIAL_DAYS ?? 14) || 0);

export function isPlanId(v: unknown): v is PlanId {
  return v === "starter" || v === "business";
}

export function planFromLookupKey(key: string | null | undefined): PlanId | null {
  return PLAN_LIST.find((p) => p.lookupKey === key)?.id ?? null;
}

export const pounds = (pence: number) => `£${(pence / 100).toFixed(pence % 100 ? 2 : 0)}`;

/** Rows for the comparison table. A string is shown as is; true is a tick, false a dash. */
export type Cell = boolean | string;
export const COMPARISON: { group: string; rows: { label: string; hint?: string; starter: Cell; business: Cell }[] }[] = [
  {
    group: "Markets",
    rows: [
      { label: "Locations", hint: "A venue with its own dates and trader pool", starter: "1", business: "Unlimited" },
      { label: "Market dates", starter: "Unlimited", business: "Unlimited" },
      { label: "Pitches per date", starter: "Unlimited", business: "Unlimited" },
      { label: "Public calendar with pitches left", starter: true, business: true },
    ],
  },
  {
    group: "Traders",
    rows: [
      { label: "Online trader applications", starter: true, business: true },
      { label: "Import traders from a spreadsheet", starter: true, business: true },
      { label: "Traders request dates themselves", starter: true, business: true },
      { label: "Invitations traders accept in one tap", starter: true, business: true },
    ],
  },
  {
    group: "Building the day",
    rows: [
      { label: "Drag-and-drop line-up board", starter: true, business: true },
      { label: "Copy last month's line-up", starter: true, business: true },
      { label: "Category mix check", hint: "Warns you before you book a fourth candle stall", starter: true, business: true },
    ],
  },
  {
    group: "Money",
    rows: [
      { label: "Invoices with a payment reference", starter: true, business: true },
      { label: "See who has paid and who is due", starter: true, business: true },
      { label: "Card payments via Stripe or SumUp", starter: "Coming soon", business: "Coming soon" },
    ],
  },
  {
    group: "Team and help",
    rows: [
      { label: "Admins", starter: "2", business: "Unlimited" },
      { label: "Email support", starter: true, business: true },
      { label: "We import your traders for you", starter: false, business: true },
    ],
  },
];
