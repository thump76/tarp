"use client";
import { useOptimistic, useTransition } from "react";
import type { Category, Market, Stallholder } from "@/lib/types";
import { setCategory, toggleMarket } from "./actions";

/** One approved trader: category and a tick per market. Changes save as you tap. */
export function TraderRow({ trader, markets, categories, ticked }: { trader: Stallholder; markets: Market[]; categories: Category[]; ticked: string[] }) {
  const [pending, start] = useTransition();
  const [ticks, setTicks] = useOptimistic(ticked, (cur: string[], [id, on]: [string, boolean]) => (on ? [...cur, id] : cur.filter((x) => x !== id)));

  return (
    <tr className={`border-t border-line ${pending ? "opacity-70" : ""}`}>
      <td className="px-4 py-2.5">
        <div className="font-semibold text-ink-strong">{trader.business_name}</div>
        <div className="text-xs text-muted">{trader.contact_name ? `${trader.contact_name} · ` : ""}{trader.email}{trader.user_id ? "" : " · not signed in yet"}</div>
      </td>
      <td className="px-4 py-2.5">
        <select defaultValue={trader.category_id ?? ""} aria-label={`Category for ${trader.business_name}`}
          onChange={(e) => start(() => setCategory(trader.id, e.target.value))}
          className="rounded-lg border border-line bg-white/60 px-2 py-1 text-sm">
          <option value="">No category</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </td>
      {markets.map((m) => {
        const on = ticks.includes(m.id);
        return (
          <td key={m.id} className="px-2 py-2.5 text-center">
            <input type="checkbox" checked={on} aria-label={`${trader.business_name} at ${m.name}`}
              onChange={() => start(async () => { setTicks([m.id, !on]); await toggleMarket(trader.id, m.id, !on); })}
              className="h-5 w-5 accent-[var(--ink-strong)]" />
          </td>
        );
      })}
    </tr>
  );
}
