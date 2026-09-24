"use client";
import { useActionState } from "react";
import { applyToTrade, type ApplyState } from "./actions";
import type { Category, Market } from "@/lib/types";

const field = "w-full rounded-xl border border-line bg-white/60 px-3 py-2 text-base focus:outline-2 focus:outline-ink";
const label = "text-sm font-semibold text-ink-strong";

export function ApplyForm({ org, markets, categories }: { org: string; markets: Market[]; categories: Category[] }) {
  const [state, action, pending] = useActionState<ApplyState, FormData>(applyToTrade, undefined);

  return (
    <form action={action} className="mt-8 grid gap-5 rounded-2xl bg-card p-5 sm:p-6">
      <input type="hidden" name="org" value={org} />
      <input type="text" name="company_website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5"><label className={label} htmlFor="business_name">Business name</label>
          <input id="business_name" name="business_name" required className={field} /></div>
        <div className="grid gap-1.5"><label className={label} htmlFor="contact_name">Your name</label>
          <input id="contact_name" name="contact_name" className={field} /></div>
        <div className="grid gap-1.5"><label className={label} htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" className={field} /></div>
        <div className="grid gap-1.5"><label className={label} htmlFor="phone">Phone</label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" className={field} /></div>
      </div>

      <div className="grid gap-1.5">
        <label className={label} htmlFor="category_id">What do you sell?</label>
        <select id="category_id" name="category_id" required defaultValue="" className={field}>
          <option value="" disabled>Choose a category</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="grid gap-1.5">
        <label className={label} htmlFor="description">Tell us about your products</label>
        <textarea id="description" name="description" rows={4} className={field}
          placeholder="What you make or sell, where it comes from, typical prices, anything that makes your stall different." />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5"><label className={label} htmlFor="website">Website</label>
          <input id="website" name="website" type="url" placeholder="https://" className={field} /></div>
        <div className="grid gap-1.5"><label className={label} htmlFor="instagram">Instagram</label>
          <input id="instagram" name="instagram" placeholder="@yourbusiness" className={field} /></div>
      </div>

      <fieldset className="grid gap-2">
        <legend className={`${label} mb-1`}>Which markets would you like to trade at?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {markets.map((m) => (
            <label key={m.id} className="flex items-start gap-3 rounded-xl border border-line bg-cream px-3 py-2.5">
              <input type="checkbox" name="markets" value={m.id} className="mt-1 h-4 w-4 accent-[var(--ink-strong)]" />
              <span><span className="font-semibold text-ink-strong">{m.name}</span><br /><span className="text-sm text-muted">{m.recurrence_note}</span></span>
            </label>
          ))}
        </div>
      </fieldset>

      {state?.error && <p className="rounded-xl bg-red-bg px-3 py-2 text-sm text-red">{state.error}</p>}
      <div className="flex flex-wrap items-center gap-4">
        <button className="btn btn-primary px-6 py-2.5 text-base" disabled={pending}>{pending ? "Sending" : "Send application"}</button>
        <span className="text-sm text-muted">You will need public liability insurance to trade.</span>
      </div>
    </form>
  );
}
