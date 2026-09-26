"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Market } from "@/lib/types";
import { field, Field } from "@/components/form";
import { createEvent, updateEvent, type EventInput } from "./actions";

export type PreviousDate = { id: string; label: string };

type Props = {
  markets: Market[];
  /** previous dates per location, newest first, for "copy traders from" */
  previous: Record<string, PreviousDate[]>;
  initial?: Partial<EventInput> & { id?: string };
};

const SIX_HOURS = 6 * 60;

/** "YYYY-MM-DDTHH:MM" plus minutes, in local wall time. */
function addMinutes(local: string, mins: number) {
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return "";
  d.setMinutes(d.getMinutes() + mins);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function EventForm({ markets, previous, initial }: Props) {
  const router = useRouter();
  const editing = !!initial?.id;
  const firstMarket = markets.find((m) => m.id === initial?.market_id) ?? markets[0];
  const [v, setV] = useState<EventInput>({
    market_id: firstMarket?.id ?? "",
    theme: initial?.theme ?? "",
    starts: initial?.starts ?? "",
    ends: initial?.ends ?? "",
    max_pitches: initial?.max_pitches ?? firstMarket?.default_pitches ?? 30,
    fee_pounds: initial?.fee_pounds ?? String((firstMarket?.default_fee_pence ?? 4000) / 100),
    note: initial?.note ?? "",
    copy_from: "",
  });
  const [endTouched, setEndTouched] = useState(!!initial?.ends);
  const [touched, setTouched] = useState({ pitches: !!initial?.max_pitches, fee: !!initial?.fee_pounds });
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const set = <K extends keyof EventInput>(k: K, val: EventInput[K]) => setV((cur) => ({ ...cur, [k]: val }));

  function onLocation(id: string) {
    const m = markets.find((x) => x.id === id);
    setV((cur) => ({
      ...cur, market_id: id, copy_from: "",
      max_pitches: touched.pitches || !m ? cur.max_pitches : m.default_pitches,
      fee_pounds: touched.fee || !m ? cur.fee_pounds : String(m.default_fee_pence / 100),
    }));
  }

  function onStart(val: string) {
    setV((cur) => ({ ...cur, starts: val, ends: endTouched && cur.ends ? cur.ends : addMinutes(val, SIX_HOURS) }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    start(async () => {
      const res = editing ? await updateEvent(initial!.id!, v) : await createEvent(v);
      if ("error" in res) { setErr(res.error); return; }
      const q = "copied" in res && res.copied ? `?copied=${res.copied}` : "";
      router.push(`/admin/event/${res.id}${q}`);
    });
  }

  const prev = previous[v.market_id] ?? [];

  return (
    <form onSubmit={submit} className="grid gap-5">
      <Field label="Location">
        <select value={v.market_id} onChange={(e) => onLocation(e.target.value)} className={field} required disabled={editing}>
          {markets.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </Field>

      <Field label="Theme" hint="Optional. Shown to traders on the calendar, for example Christmas market or Spring fair.">
        <input value={v.theme} onChange={(e) => set("theme", e.target.value)} className={field} placeholder="Theme" maxLength={80} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starts">
          <input type="datetime-local" value={v.starts} onChange={(e) => onStart(e.target.value)} className={field} required />
        </Field>
        <Field label="Ends" hint="Set to six hours after the start until you change it.">
          <input type="datetime-local" value={v.ends} min={v.starts} onChange={(e) => { setEndTouched(true); set("ends", e.target.value); }} className={field} required />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Number of pitches">
          <input type="number" inputMode="numeric" min={1} max={500} value={v.max_pitches}
            onChange={(e) => { setTouched((t) => ({ ...t, pitches: true })); set("max_pitches", Number(e.target.value)); }} className={field} required />
        </Field>
        <Field label="Price per pitch">
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">£</span>
            <input type="number" inputMode="decimal" min={0} step="0.5" value={v.fee_pounds}
              onChange={(e) => { setTouched((t) => ({ ...t, fee: true })); set("fee_pounds", e.target.value); }} className={`${field} pl-7`} required />
          </div>
        </Field>
      </div>

      {!editing && (
        <Field label="Copy traders from" hint="Everyone who attended that date is added to this one as a draft invitation. Send the invitations from the board.">
          <select value={v.copy_from} onChange={(e) => set("copy_from", e.target.value)} className={field} disabled={!prev.length}>
            <option value="">{prev.length ? "Start with an empty board" : "No previous dates at this location"}</option>
            {prev.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </Field>
      )}

      <Field label="Note" hint="Optional, organiser only. Parking, gate codes, anything for the day.">
        <textarea value={v.note} onChange={(e) => set("note", e.target.value)} className={field} rows={2} />
      </Field>

      {err && <p className="text-sm text-red">{err}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-primary" disabled={pending}>{pending ? "Saving" : editing ? "Save changes" : "Create event date"}</button>
        <button type="button" className="btn btn-ghost" onClick={() => router.back()}>Cancel</button>
      </div>
    </form>
  );
}
