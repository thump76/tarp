import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MarketingShell, Section, Eyebrow, PricingCards, Faq, PricingJsonLd, trialLine } from "@/components/marketing";
import { TRIAL_DAYS } from "@/lib/plans";
import { siteUrl } from "@/lib/email";
import { Photo } from "@/components/photo";

export const metadata: Metadata = {
  title: "Tarp | Booking, invoicing and calendar for market organisers",
  description: "Run your market without the spreadsheet. Trader applications, pitch bookings, line-ups and invoices in one place. From £10 a month.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Tarp | Run your market without the spreadsheet",
    description: "Trader applications, pitch bookings, line-ups and invoices in one place. From £10 a month.",
    type: "website",
    locale: "en_GB",
  },
};

const PAINS = [
  { t: "Applications everywhere", d: "Emails, Instagram DMs, a form from 2019. Half of them missing a photo or a product list." },
  { t: "A spreadsheet of who's paid", d: "Cross-checked against the bank app on a Sunday night, one reference at a time." },
  { t: "Chasing the week before", d: "Who's confirmed, who's dropped out, and why are there four candle stalls?" },
];

const STEPS = [
  { n: "1", t: "Traders apply once", d: "Share one link. Traders send their business, category, photos and the markets they want. You approve them into a pool for each location." },
  { n: "2", t: "Build the line-up", d: "Drag regulars from the pool, or copy last month's line-up in one tap. Tarp flags when a category is full." },
  { n: "3", t: "Invitations go out", d: "Traders say yes from their phone. Confirmed traders move to Attending and get an invoice with a payment reference." },
  { n: "4", t: "See who's paid", d: "One page shows what's due and what's late, by market date. Mark paid, send a reminder or release the pitch." },
];

const STRIP = [
  { slot: "choosing", caption: "Better balanced markets, because you can see the category mix before you book." },
  { slot: "handover", caption: "Traders who know where they stand: confirmed, invoiced and ready for the day." },
  { slot: "aisle", caption: "A full site, with fewer gaps from late drop-outs." },
] as const;

const FEATURES = [
  { t: "Public calendar", d: "Every date with pitches left, so traders stop asking if there's space." },
  { t: "Trader pools", d: "Each location has its own list of approved traders, ready to invite." },
  { t: "Category mix", d: "Set a soft cap per category and see the balance of every date at a glance." },
  { t: "Spreadsheet import", d: "Bring the traders you already work with. They get an invitation to sign in." },
  { t: "Payment references", d: "Every invoice gets one, like TARP-0412, so bank transfers match in seconds." },
  { t: "No passwords", d: "Everyone signs in with an emailed link, on iPad, phone or laptop." },
];

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <MarketingShell signedIn={!!user}>
      <PricingJsonLd url={siteUrl("/")} />

      {/* ---------- hero ---------- */}
      <Section className="grid items-center gap-12 pb-20 pt-10 md:grid-cols-[1fr_1fr] md:pt-16">
        <div>
          <Eyebrow>For market organisers</Eyebrow>
          <h1 className="mt-3 text-5xl font-bold leading-[1.05] sm:text-6xl">Run your market without the spreadsheet.</h1>
          <p className="mt-5 max-w-xl text-lg text-ink">
            Tarp keeps your dates, traders, pitches and payments in one place. Traders apply and book online, you build the line-up, and every invoice carries a reference so you know who has paid.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/signup" className="btn btn-primary !px-6 !py-3 text-base">{TRIAL_DAYS ? `Start your ${TRIAL_DAYS}-day free trial` : "Get started"}</Link>
            <Link href="/pricing" className="btn btn-ghost !px-6 !py-3 text-base">See pricing</Link>
          </div>
          <p className="mt-3 text-sm text-muted">From £10 a month. {trialLine()}</p>
        </div>
        <div className="relative md:pl-8">
          <Photo slot="hero" preload sizes="(min-width: 768px) 45vw, 100vw" className="aspect-[4/5] rounded-3xl" />
          <div className="relative -mt-28 ml-auto w-[90%] max-w-sm md:absolute md:-left-4 md:bottom-10 md:mt-0 md:w-[22rem]">
            <BoardPreview />
          </div>
        </div>
      </Section>

      {/* ---------- the problem ---------- */}
      <div className="bg-cream-deep/70 py-20">
        <Section className="grid items-center gap-10 md:grid-cols-[5fr_7fr] md:gap-16">
          <Photo slot="organiser" sizes="(min-width: 768px) 40vw, 100vw" className="aspect-[4/5] rounded-3xl max-md:aspect-[4/3]" />
          <div>
            <Eyebrow>Sound familiar?</Eyebrow>
            <h2 className="mt-3 text-4xl font-bold">Most markets are run from an inbox, a spreadsheet and a group chat.</h2>
            <ul className="mt-8 divide-y divide-line border-y border-line">
              {PAINS.map((p) => (
                <li key={p.t} className="py-5">
                  <h3 className="text-xl font-semibold">{p.t}</h3>
                  <p className="mt-1 text-muted">{p.d}</p>
                </li>
              ))}
            </ul>
            <p className="mt-6 font-semibold text-ink-strong">Tarp puts all of it in one place, so market day is the easy bit again.</p>
          </div>
        </Section>
      </div>

      {/* ---------- how it works ---------- */}
      <Section id="how" className="py-20">
        <Eyebrow>How it works</Eyebrow>
        <h2 className="mt-3 max-w-2xl text-4xl font-bold">From application to paid pitch, in four steps.</h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n}>
              <div className="display flex h-10 w-10 items-center justify-center rounded-full bg-ink-strong text-lg font-semibold !text-cream">{s.n}</div>
              <h3 className="mt-4 text-xl font-semibold">{s.t}</h3>
              <p className="mt-2 text-muted">{s.d}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* ---------- photo strip ---------- */}
      <Section className="pb-20">
        <div className="grid grid-cols-3 gap-3 sm:gap-5">
          {STRIP.map((x) => (
            <figure key={x.slot}>
              <Photo slot={x.slot} sizes="(min-width: 1152px) 370px, 33vw" className="aspect-[3/4] rounded-2xl sm:rounded-3xl" />
              <figcaption className="mt-3 text-sm text-muted max-sm:hidden">{x.caption}</figcaption>
            </figure>
          ))}
        </div>
      </Section>

      {/* ---------- features ---------- */}
      <Section className="pb-20">
        <div className="grid gap-x-10 gap-y-8 rounded-3xl bg-card p-6 sm:grid-cols-2 sm:p-10 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.t}>
              <h3 className="text-lg font-semibold">{f.t}</h3>
              <p className="mt-1 text-muted">{f.d}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          Built with market organisers in South East London. Traders never pay to use it.
        </p>
      </Section>

      {/* ---------- pricing ---------- */}
      <div className="bg-cream-deep/70 py-20">
        <Section>
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>Pricing</Eyebrow>
            <h2 className="mt-3 text-4xl font-bold">About the price of one pitch a month.</h2>
            <p className="mt-3 text-muted">Two plans, no set-up fee, no charge per trader. {trialLine()}</p>
          </div>
          <div className="mx-auto mt-10 max-w-4xl"><PricingCards /></div>
          <p className="mt-6 text-center"><Link href="/pricing#compare" className="link-secondary">Compare the plans in full</Link></p>
        </Section>
      </div>

      {/* ---------- FAQ ---------- */}
      <Section className="py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-4xl font-bold">Questions</h2>
          <div className="mt-8"><Faq /></div>
        </div>
      </Section>

      {/* ---------- final call to action ---------- */}
      <Section className="pb-24">
        <div className="relative isolate overflow-hidden rounded-3xl bg-ink-strong text-center text-cream">
          <Photo slot="evening" dark sizes="(min-width: 1152px) 1104px, 100vw" className="absolute inset-0 -z-10" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-strong via-ink-strong/80 to-ink-strong/40" />
          <div className="px-6 pb-14 pt-40 sm:px-12 sm:pt-56">
            <h2 className="text-4xl font-bold !text-cream">Get your next market off the spreadsheet.</h2>
            <p className="mx-auto mt-3 max-w-xl text-cream/80">Set up takes about ten minutes. Add your location, import your traders and send the first invitations today.</p>
            <Link href="/signup" className="btn mt-8 bg-cream !px-6 !py-3 text-base text-ink-strong hover:bg-card">{TRIAL_DAYS ? "Start free trial" : "Get started"}</Link>
          </div>
        </div>
      </Section>
    </MarketingShell>
  );
}

/** A static picture of the line-up board, built from the app's own chips so it always looks like the product. */
function BoardPreview() {
  const cols: { h: string; kind: "req" | "appr"; items: [string, string][] }[] = [
    { h: "Requested", kind: "req", items: [["Hollow Oak Bakery", "Bakery"], ["Fern & Wick", "Candles"]] },
    { h: "Attending", kind: "appr", items: [["Little Roast", "Coffee"], ["Salt Kitchen", "Hot food"]] },
  ];
  return (
    <div aria-hidden="true">
      <div className="rounded-3xl bg-card p-4 shadow-[0_20px_50px_-20px_rgb(21_21_30/0.45)] sm:p-5">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">Sunday 4 October</div>
            <div className="display text-xl font-semibold">Castle Gardens</div>
          </div>
          <span className="tnum text-sm text-muted">26 of 30 booked</span>
        </div>
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-cream-deep">
          <i className="block h-full bg-green" style={{ width: "80%" }} />
          <i className="block h-full bg-amber" style={{ width: "7%" }} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {cols.map((c) => (
            <div key={c.h} className="rounded-2xl bg-cream p-2.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">{c.h}</div>
              <ul className="mt-2 grid gap-2">
                {c.items.map(([n, cat]) => (
                  <li key={n} className="rounded-xl bg-card px-2.5 py-2 text-xs">
                    <div className="font-semibold text-ink-strong">{n}</div>
                    <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted">
                      {cat}
                      <span className={`chip chip-${c.kind}`}>{c.kind === "appr" ? "Paid" : "New"}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-red-bg/60 px-3 py-2 text-xs">
          <span className="font-semibold text-red">Candles 2 of 2</span>
          <span className="text-red">Category full</span>
        </div>
      </div>
    </div>
  );
}
