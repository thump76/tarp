import { fmtDate } from "@/lib/format";
import type { EventMix, PublicEvent } from "@/lib/types";

type Cat = { id: string; name: string; cap: number | null; colour: string | null; sort: number };

/** Category mix for one event: a stacked bar and a count per category, with "full" when a soft cap is reached. */
export function MixPanel({ event, mix, categories }: { event: PublicEvent; mix: EventMix[]; categories: Cat[] }) {
  const byCat = new Map(mix.map((m) => [m.category_id ?? "none", m]));
  const rows = categories.map((c) => ({ ...c, approved: byCat.get(c.id)?.approved ?? 0, requested: byCat.get(c.id)?.requested ?? 0 }));
  const uncategorised = byCat.get("none")?.approved ?? 0;

  return (
    <div className="mt-6 rounded-2xl bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <b className="display text-lg font-semibold">Mix for {fmtDate(event.date)}, {event.market_name}</b>
        <span className="text-xs text-muted">{event.approved} approved of {event.max_pitches}. Tap another date to compare.</span>
      </div>
      <div className="mt-3 flex h-3.5 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
        {rows.filter((r) => r.approved > 0).map((r) => (
          <i key={r.id} className="block h-full" style={{ width: `${(r.approved / event.max_pitches) * 100}%`, background: r.colour ?? "var(--line)" }} title={`${r.name} ${r.approved}`} />
        ))}
        {uncategorised > 0 && <i className="block h-full bg-line" style={{ width: `${(uncategorised / event.max_pitches) * 100}%` }} />}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm tnum">
        {rows.map((r) => {
          const full = r.cap != null && r.approved >= r.cap;
          return (
            <span key={r.id} className={`inline-flex items-center gap-1.5 ${full ? "text-amber" : ""}`}>
              <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: r.colour ?? "var(--line)" }} />
              {r.name} <b className="font-semibold text-ink-strong">{r.approved}</b>
              {r.requested > 0 && <span className="text-muted">+{r.requested}</span>}
              {full && <span>full</span>}
            </span>
          );
        })}
        {uncategorised > 0 && <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-line" />Uncategorised <b className="font-semibold">{uncategorised}</b></span>}
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm border border-line bg-cream-deep" />Available <b className="font-semibold">{event.available}</b></span>
      </div>
    </div>
  );
}
