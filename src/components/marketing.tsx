import Link from "next/link";
import type { ReactNode } from "react";
import { COMPARISON, PLAN_LIST, TRIAL_DAYS, pounds, type Cell, type Plan } from "@/lib/plans";

/** Header and footer for the public selling pages. Wider than the app shell. */
export function MarketingShell({ children, signedIn = false }: { children: ReactNode; signedIn?: boolean }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-5 sm:px-6">
        <Link href="/" className="display text-2xl font-bold">Tarp</Link>
        <nav className="flex items-center gap-1 text-sm" aria-label="Main">
          <Link href="/#how" className="nav-item whitespace-nowrap max-sm:!hidden">How it works</Link>
          <Link href="/pricing" className="nav-item whitespace-nowrap">Pricing</Link>
          <Link href="/markets" className="nav-item whitespace-nowrap max-md:!hidden">For traders</Link>
          {signedIn ? (
            <Link href="/admin" className="btn btn-primary ml-2">Open Tarp</Link>
          ) : (
            <>
              <Link href="/login?next=/admin" className="nav-item whitespace-nowrap">Sign in</Link>
              <Link href="/signup" className="btn btn-primary ml-1 whitespace-nowrap max-sm:!hidden">{TRIAL_DAYS ? "Start free trial" : "Get started"}</Link>
            </>
          )}
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm text-muted sm:grid-cols-[1fr_auto] sm:px-6">
          <div>
            <div className="display text-lg font-bold text-ink-strong">Tarp</div>
            <p className="mt-1 max-w-sm">Booking, invoicing and calendar for market organisers. Made in South East London.</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Footer">
            <Link href="/pricing" className="hover:text-ink">Pricing</Link>
            <Link href="/markets" className="hover:text-ink">Find a market</Link>
            <Link href="/login" className="hover:text-ink">Sign in</Link>
            <a href="mailto:philipbrumpton@gmail.com" className="hover:text-ink">Contact</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export function Section({ id, children, className = "" }: { id?: string; children: ReactNode; className?: string }) {
  return <section id={id} className={`mx-auto w-full max-w-6xl scroll-mt-6 px-4 sm:px-6 ${className}`}>{children}</section>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="text-xs font-semibold uppercase tracking-wider text-amber">{children}</div>;
}

export function trialLine(plan?: Plan) {
  const after = plan ? `, then ${pounds(plan.pence)} a month` : "";
  return TRIAL_DAYS ? `${TRIAL_DAYS} days free${after}. Cancel any time.` : "Monthly. Cancel any time.";
}

function Tick({ label = "Included" }: { label?: string }) {
  return (
    <svg viewBox="0 0 20 20" className="inline h-5 w-5 text-green" role="img" aria-label={label}>
      <circle cx="10" cy="10" r="10" fill="var(--green-bg)" />
      <path d="M6 10.5l2.6 2.5L14 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CellView({ v }: { v: Cell }) {
  if (v === true) return <Tick />;
  if (v === false) return <span className="text-muted" aria-label="Not included">&ndash;</span>;
  if (v === "Coming soon") return <span className="chip chip-avail">Coming soon</span>;
  return <span className="font-semibold text-ink-strong">{v}</span>;
}

const HIGHLIGHTS: Record<string, string[]> = {
  starter: ["1 location, unlimited dates", "Online applications and trader pools", "Line-up board and invoices", "2 admins"],
  business: ["Unlimited locations", "Everything in Starter", "Unlimited admins", "We import your traders for you"],
};

export function PricingCards() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {PLAN_LIST.map((p) => {
        const featured = p.id === "business";
        return (
          <div key={p.id} className={`relative flex flex-col rounded-3xl p-6 sm:p-8 ${featured ? "bg-ink-strong text-cream" : "bg-card"}`}>
            {featured && <span className="absolute right-6 top-6 rounded-full bg-amber-bg px-3 py-1 text-xs font-semibold text-amber">Best for several sites</span>}
            <h3 className={`display text-2xl font-semibold ${featured ? "!text-cream" : ""}`}>{p.name}</h3>
            <p className={`mt-1 text-sm ${featured ? "text-cream/75" : "text-muted"}`}>{p.blurb}</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className={`display text-5xl font-bold tnum ${featured ? "!text-cream" : ""}`}>{pounds(p.pence)}</span>
              <span className={featured ? "text-cream/75" : "text-muted"}>/ month</span>
            </div>
            <ul className="mt-6 grid gap-2.5 text-sm">
              {HIGHLIGHTS[p.id].map((h) => (
                <li key={h} className="flex items-start gap-2"><Tick /><span>{h}</span></li>
              ))}
            </ul>
            <div className="mt-auto pt-8">
              <Link href={`/signup?plan=${p.id}`} className={`btn w-full !py-3 text-base ${featured ? "bg-cream text-ink-strong hover:bg-card" : "btn-primary"}`}>
                {TRIAL_DAYS ? `Start ${TRIAL_DAYS}-day free trial` : `Choose ${p.name}`}
              </Link>
              <p className={`mt-3 text-center text-xs ${featured ? "text-cream/70" : "text-muted"}`}>{trialLine()}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ComparisonTable() {
  return (
    <div className="overflow-hidden rounded-3xl bg-card">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">Starter and Business plans compared</caption>
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="w-[46%] p-4 sm:w-1/2 sm:p-5"><span className="sr-only">Feature</span></th>
            {PLAN_LIST.map((p) => (
              <th key={p.id} scope="col" className="px-2 py-4 text-center sm:p-5">
                <div className="display text-lg font-semibold">{p.name}</div>
                <div className="font-normal text-muted"><span className="tnum">{pounds(p.pence)}</span> / month</div>
              </th>
            ))}
          </tr>
        </thead>
        {COMPARISON.map((g) => (
          <tbody key={g.group}>
            <tr><th colSpan={3} scope="colgroup" className="bg-cream-deep/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted sm:px-5">{g.group}</th></tr>
            {g.rows.map((r) => (
              <tr key={r.label} className="border-t border-line/70">
                <th scope="row" className="py-4 pl-4 pr-2 font-medium text-ink sm:px-5">
                  {r.label}
                  {r.hint && <div className="mt-0.5 text-xs font-normal text-muted">{r.hint}</div>}
                </th>
                <td className="px-2 py-4 text-center sm:px-5"><CellView v={r.starter} /></td>
                <td className="px-2 py-4 text-center sm:px-5"><CellView v={r.business} /></td>
              </tr>
            ))}
          </tbody>
        ))}
        <tfoot>
          <tr className="border-t border-line">
            <td className="p-4 sm:p-5" />
            {PLAN_LIST.map((p) => (
              <td key={p.id} className="px-2 py-4 text-center sm:p-5">
                <Link href={`/signup?plan=${p.id}`} className={`btn ${p.id === "business" ? "btn-primary" : "btn-ghost"} w-full max-w-40`}>Choose {p.name}</Link>
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export const FAQS: { q: string; a: string }[] = [
  { q: "Do my traders pay anything?", a: "No. Traders apply, request dates and see their invoices for free. Only the organiser has a subscription." },
  {
    q: "Can I try it before paying?",
    a: TRIAL_DAYS
      ? `Yes. Every plan starts with ${TRIAL_DAYS} days free. We take your card details at the start and email you before the first payment. Cancel before then and you pay nothing.`
      : "You can cancel in the first month for a full refund, no questions asked.",
  },
  { q: "How quickly can I start?", a: "Straight away. As soon as you have signed up you land in your organiser view, ready to add your first location and invite traders." },
  { q: "How do traders pay their pitch fees?", a: "Today, by bank transfer. Every invoice carries a reference like TARP-0412 so you can match payments at a glance. Card payment links through Stripe or SumUp are next. Pitch fees always go straight to you; Tarp never holds your money." },
  { q: "I already have a spreadsheet of traders.", a: "Paste it or upload it and Tarp sends each trader an invitation to sign in. On Business, send us the spreadsheet and we will do it for you." },
  { q: "Does it work on an iPad?", a: "Yes. Tarp runs in the browser on iPad, phone and laptop, so there is nothing to install for you or your traders." },
  { q: "Can I change plan or cancel?", a: "Any time, from Settings, Billing. Upgrades take effect immediately and are charged pro rata. If you cancel you keep access until the end of the month you have paid for." },
];

export function Faq() {
  return (
    <div className="divide-y divide-line rounded-3xl bg-card px-5 sm:px-8">
      {FAQS.map((f) => (
        <details key={f.q} className="group py-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink-strong">
            {f.q}
            <span aria-hidden="true" className="text-xl leading-none text-muted transition group-open:rotate-45">+</span>
          </summary>
          <p className="mt-3 max-w-prose text-muted">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

/** Structured data so search engines can show the price in results. */
export function PricingJsonLd({ url }: { url: string }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Tarp",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, iPadOS, iOS, Android",
    description: "Booking, invoicing and calendar software for market organisers.",
    url,
    offers: PLAN_LIST.map((p) => ({
      "@type": "Offer",
      name: p.name,
      price: (p.pence / 100).toFixed(2),
      priceCurrency: "GBP",
      priceSpecification: { "@type": "UnitPriceSpecification", price: (p.pence / 100).toFixed(2), priceCurrency: "GBP", unitCode: "MON" },
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
