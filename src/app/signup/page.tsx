import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell, Section, trialLine } from "@/components/marketing";
import { Field, field } from "@/components/form";
import { PLAN_LIST, PLANS, TRIAL_DAYS, isPlanId, pounds } from "@/lib/plans";
import { startCheckout } from "./actions";

export const metadata: Metadata = {
  title: "Sign up | Tarp",
  description: "Set up Tarp for your market in a few minutes.",
  robots: { index: false },
};

type Params = { plan?: string; error?: string; problem?: string; org_name?: string; name?: string; email?: string };

export default async function Signup({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const chosen = isPlanId(sp.plan) ? sp.plan : "starter";

  return (
    <MarketingShell>
      <Section className="pb-24 pt-8 md:pt-14">
        <div className="mx-auto max-w-xl">
          <h1 className="text-4xl font-bold">Set up Tarp for your market</h1>
          <p className="mt-2 text-muted">
            {TRIAL_DAYS
              ? `Try it free for ${TRIAL_DAYS} days. You go straight into your organiser view once your card is added.`
              : "You go straight into your organiser view once payment goes through."}
          </p>

          {(sp.error || sp.problem) && (
            <div role="alert" className="mt-6 rounded-2xl bg-red-bg px-4 py-3 text-sm text-red">
              {sp.error ?? "We couldn't confirm that payment. If you were charged, email philipbrumpton@gmail.com and we will sort it out today."}
            </div>
          )}

          <form action={startCheckout} className="mt-8 grid gap-6">
            <fieldset>
              <legend className="text-sm font-semibold">Plan</legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {PLAN_LIST.map((p) => (
                  <label key={p.id} className="relative flex cursor-pointer flex-col rounded-2xl border border-line bg-card p-4 transition has-[:checked]:border-ink-strong has-[:checked]:shadow-[inset_0_0_0_1px_var(--ink-strong)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink">
                    <input type="radio" name="plan" value={p.id} defaultChecked={p.id === chosen} className="sr-only" />
                    <span className="display text-lg font-semibold">{p.name}</span>
                    <span className="text-sm"><b className="tnum text-ink-strong">{pounds(p.pence)}</b> / month</span>
                    <span className="mt-1 text-xs text-muted">{p.blurb}</span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">Not sure? Start on {PLANS.starter.name} and upgrade from Settings when you add a second location. <Link href="/pricing#compare" className="underline">Compare plans</Link></p>
            </fieldset>

            <Field label="Market or company name" hint="What traders will see, e.g. Plumstead Community Market">
              <input name="org_name" required maxLength={80} defaultValue={sp.org_name ?? ""} autoComplete="organization" className={field} />
            </Field>
            <Field label="Your name">
              <input name="name" maxLength={80} defaultValue={sp.name ?? ""} autoComplete="name" className={field} />
            </Field>
            <Field label="Email" hint="You sign in with this. No password needed.">
              <input name="email" type="email" required defaultValue={sp.email ?? ""} autoComplete="email" className={field} />
            </Field>

            <div>
              <button className="btn btn-primary w-full !py-3 text-base">Continue to secure payment</button>
              <p className="mt-3 text-center text-xs text-muted">{trialLine()} Payments are handled by Stripe.</p>
            </div>
          </form>

          <p className="mt-10 text-center text-sm text-muted">Already using Tarp? <Link href="/login?next=/admin" className="underline">Sign in</Link></p>
        </div>
      </Section>
    </MarketingShell>
  );
}
