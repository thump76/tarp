import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MarketingShell, Section, Eyebrow, PricingCards, ComparisonTable, Faq, PricingJsonLd, trialLine } from "@/components/marketing";
import { siteUrl } from "@/lib/email";

export const metadata: Metadata = {
  title: "Pricing | Tarp",
  description: "Tarp Starter is £10 a month for one market. Business is £40 a month for unlimited locations and admins. Compare the plans.",
  alternates: { canonical: "/pricing" },
};

export default async function Pricing({ searchParams }: { searchParams: Promise<{ cancelled?: string }> }) {
  const { cancelled } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <MarketingShell signedIn={!!user}>
      <PricingJsonLd url={siteUrl("/pricing")} />
      <Section className="pb-16 pt-10 md:pt-16">
        {cancelled && (
          <div className="mx-auto mb-8 max-w-2xl rounded-2xl bg-amber-bg px-4 py-3 text-center text-sm text-amber">
            No problem, you have not been charged. Pick a plan whenever you are ready.
          </div>
        )}
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>Pricing</Eyebrow>
          <h1 className="mt-3 text-5xl font-bold">Simple pricing for markets of every size.</h1>
          <p className="mt-4 text-lg text-muted">Two plans, no set-up fee, no charge per trader. Traders always use Tarp for free. {trialLine()}</p>
        </div>
        <div className="mx-auto mt-12 max-w-4xl"><PricingCards /></div>
      </Section>

      <Section id="compare" className="pb-20">
        <h2 className="text-center text-4xl font-bold">Compare the plans</h2>
        <div className="mx-auto mt-8 max-w-4xl"><ComparisonTable /></div>
        <p className="mx-auto mt-4 max-w-4xl text-center text-sm text-muted">
          Running more than ten locations or a council-run market? <a className="underline" href="mailto:philipbrumpton@gmail.com?subject=Tarp%20for%20larger%20markets">Email us</a> and we will talk it through.
        </p>
      </Section>

      <Section className="pb-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-4xl font-bold">Questions</h2>
          <div className="mt-8"><Faq /></div>
          <p className="mt-8 text-center"><Link href="/signup" className="btn btn-primary !px-6 !py-3 text-base">Get started</Link></p>
        </div>
      </Section>
    </MarketingShell>
  );
}
