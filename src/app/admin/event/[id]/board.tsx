"use client";

import { useMemo, useState, useTransition } from "react";
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors,
  useDraggable, useDroppable, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import type { Category, RequestState } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import { placeTrader, copyLineup, sendInvitations, type Column } from "./actions";
import type { PreviousDate } from "../event-form";

export type BoardTrader = {
  id: string;
  name: string;
  contact: string | null;
  categoryId: string | null;
  state: RequestState | null;   // null = in the pool, never on this date
  lastCame: string | null;      // last date attended at this market
  draft: boolean;               // invited but not yet emailed
  unpaid: boolean;
  message: string | null;
};

type Col = "pool" | "requested" | "invited" | "attending";

const colOf = (s: RequestState | null): Col =>
  s === "requested" ? "requested" : s === "invited" ? "invited" : s === "approved" ? "attending" : "pool";

/** What dropping a card from one column into another asks the server to do, or null if not allowed. */
function move(from: Col, to: Col): Column | null {
  if (from === to) return null;
  if (to === "attending") return "approved";
  if (to === "invited") return from === "pool" ? "invited" : null;
  if (to === "pool") return "pool";
  return null; // nothing can be dropped into Requested; traders put themselves there
}

/** The state a card lands in after a move, mirroring place_trader() in SQL. */
function nextState(cur: RequestState | null, to: Column): RequestState | null {
  if (to === "invited") return "invited";
  if (to === "approved") return "approved";
  if (cur === "requested") return "declined";
  if (cur === "approved") return "released";
  return null;
}

const COLS: { id: Col; title: string; hint: string }[] = [
  { id: "pool", title: "Pool", hint: "Approved for this market. Drag to Invited." },
  { id: "requested", title: "Requested", hint: "Traders asking for this date." },
  { id: "invited", title: "Invited", hint: "Waiting for a yes." },
  { id: "attending", title: "Attending", hint: "Confirmed and invoiced." },
];

export function Board({ eventId, maxPitches, categories, initial, previous, copiedOnCreate = 0 }: {
  eventId: string; maxPitches: number; categories: Category[]; initial: BoardTrader[]; previous: PreviousDate[]; copiedOnCreate?: number;
}) {
  const [traders, setTraders] = useState(initial);
  const [copyFrom, setCopyFrom] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);
  // arriving from Create event date with traders copied over shows a toast straight away
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(
    copiedOnCreate > 0 ? { text: `${copiedOnCreate} trader${copiedOnCreate === 1 ? "" : "s"} copied over as drafts. Send the invitations when you are ready.` } : null,
  );
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [pending, start] = useTransition();

  // server data wins whenever the page re-renders with fresh props
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) { setSeen(initial); setTraders(initial); }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const by = (c: Col) => traders.filter((t) => colOf(t.state) === c);
  const attending = by("attending"), invited = by("invited");
  const left = maxPitches - attending.length - invited.length - by("requested").length;
  const drafts = invited.filter((t) => t.draft).length;

  // category mix for this date: attending solid, invited faint
  const mix = categories.map((c) => ({
    ...c,
    attending: attending.filter((t) => t.categoryId === c.id).length,
    invited: invited.filter((t) => t.categoryId === c.id).length,
  }));
  const full = new Set(mix.filter((m) => m.cap != null && m.attending + m.invited >= m.cap).map((m) => m.id));

  function flash(text: string, undo?: () => void) {
    setToast({ text, undo });
    window.setTimeout(() => setToast((t) => (t?.text === text ? null : t)), 5000);
  }

  function apply(id: string, to: Column) {
    const t = traders.find((x) => x.id === id);
    if (!t) return;
    const was = traders;
    setTraders((cur) => cur.map((x) => x.id === id
      ? { ...x, state: nextState(x.state, to), draft: to === "invited", unpaid: to === "approved" }
      : x));
    start(async () => {
      try {
        const res = await placeTrader(eventId, id, to);
        if (res === "released") flash(`${t.name} removed and invoice cancelled`, () => apply(id, "approved"));
        else if (res === "declined") flash(`${t.name}'s request declined, they have been told`);
        else if (res === "approved" && t.state === "requested") flash(`${t.name} confirmed and invoiced`);
      } catch (e) {
        setTraders(was);
        flash(e instanceof Error ? e.message : "That did not save. Try again.");
      }
    });
  }

  function onDragStart(e: DragStartEvent) { setDragging(String(e.active.id)); }
  function onDragEnd(e: DragEndEvent) {
    setDragging(null);
    const id = String(e.active.id), to = e.over?.id as Col | undefined;
    const t = traders.find((x) => x.id === id);
    if (!t || !to) return;
    const m = move(colOf(t.state), to);
    if (m) apply(id, m);
  }

  const dragged = traders.find((t) => t.id === dragging) ?? null;
  const fromCol = dragged ? colOf(dragged.state) : null;

  const poolShown = by("pool")
    .filter((t) => (!cat || t.categoryId === cat) && (!q || t.name.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => (b.lastCame ?? "").localeCompare(a.lastCame ?? "") || a.name.localeCompare(b.name));

  return (
    <div className="mt-6">
      {/* summary and mix */}
      <div className="rounded-2xl bg-card p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="display text-lg font-semibold">
            {attending.length} attending <span className="font-sans text-sm font-medium text-muted">· {invited.length} invited · {by("requested").length} requested · {left} of {maxPitches} left</span>
          </span>
          {pending && <span className="text-xs text-muted">Saving</span>}
        </div>
        <div className="mt-3 flex h-3.5 gap-0.5 overflow-hidden rounded-full bg-cream-deep" aria-hidden="true">
          {mix.flatMap((m) => [
            m.attending > 0 && <i key={`${m.id}a`} className="block h-full" style={{ width: `${(m.attending / maxPitches) * 100}%`, background: m.colour ?? "var(--line)" }} />,
            m.invited > 0 && <i key={`${m.id}i`} className="block h-full opacity-40" style={{ width: `${(m.invited / maxPitches) * 100}%`, background: m.colour ?? "var(--line)" }} />,
          ])}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm tnum">
          {mix.map((m) => (
            <button key={m.id} onClick={() => setCat(cat === m.id ? "" : m.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-1.5 ${cat === m.id ? "bg-cream-deep" : ""} ${full.has(m.id) ? "text-amber" : ""}`}
              title={`Show only ${m.name} in the pool`}>
              <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: m.colour ?? "var(--line)" }} />
              {m.name} <b className="font-semibold text-ink-strong">{m.attending}</b>
              {m.invited > 0 && <span className="text-muted">+{m.invited}</span>}
              {m.cap != null && <span className="text-muted">/{m.cap}</span>}
            </button>
          ))}
        </div>
      </div>

      <DndContext id={`board-${eventId}`} sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
        <div className="mt-5 overflow-x-auto pb-2">
          <div className="grid min-w-[880px] grid-cols-4 gap-3">
            {COLS.map((c) => {
              const items = c.id === "pool" ? poolShown : by(c.id);
              const canDrop = fromCol ? move(fromCol, c.id) !== null : false;
              return (
                <Lane key={c.id} id={c.id} title={c.title} hint={c.hint} count={c.id === "pool" ? by("pool").length : items.length}
                  active={!!dragging} canDrop={canDrop}
                  header={
                    c.id === "pool" ? (
                      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the pool"
                        className="w-full rounded-lg border border-line bg-white/60 px-2 py-1 text-sm" />
                    ) : c.id === "invited" ? (
                      <div className="flex flex-col gap-1.5">
                        {previous.length > 0 && (
                          <div className="flex gap-1.5">
                            <select value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} aria-label="Copy traders from"
                              className="min-w-0 flex-1 rounded-lg border border-line bg-white/60 px-2 py-1 text-xs">
                              <option value="">Copy traders from…</option>
                              {previous.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                            </select>
                            <button className="btn btn-ghost !px-2.5 !py-1 text-xs" disabled={pending || !copyFrom}
                              onClick={() => start(async () => {
                                const label = previous.find((p) => p.id === copyFrom)?.label ?? "that date";
                                const n = await copyLineup(eventId, copyFrom);
                                flash(n ? `${n} trader${n === 1 ? "" : "s"} from ${label} added as drafts` : `Everyone from ${label} is already on this date`);
                                setCopyFrom("");
                              })}>
                              Copy
                            </button>
                          </div>
                        )}
                        {drafts > 0 && (
                          <button className="btn btn-primary !py-1 text-xs" disabled={pending}
                            onClick={() => start(async () => { const n = await sendInvitations(eventId); flash(`${n} invitation${n === 1 ? "" : "s"} sent`); })}>
                            Send {drafts} invitation{drafts === 1 ? "" : "s"}
                          </button>
                        )}
                      </div>
                    ) : null
                  }>
                  {items.map((t) => (
                    <Card key={t.id} t={t} col={c.id} cat={t.categoryId ? catById.get(t.categoryId) : undefined}
                      catFull={!!t.categoryId && full.has(t.categoryId)} onMove={(to) => apply(t.id, to)} hidden={dragging === t.id} />
                  ))}
                  {!items.length && <p className="px-1 py-3 text-xs text-muted">{c.id === "pool" && (q || cat) ? "No matches." : c.hint}</p>}
                </Lane>
              );
            })}
          </div>
        </div>
        <DragOverlay dropAnimation={null}>
          {dragged ? <CardBody t={dragged} cat={dragged.categoryId ? catById.get(dragged.categoryId) : undefined} lifted /> : null}
        </DragOverlay>
      </DndContext>

      {toast && (
        <div role="status" className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+20px)] left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-ink-strong px-4 py-2.5 text-sm text-cream shadow-lg">
          {toast.text}
          {toast.undo && <button className="font-semibold underline" onClick={() => { toast.undo?.(); setToast(null); }}>Undo</button>}
        </div>
      )}
    </div>
  );
}

function Lane({ id, title, hint, count, active, canDrop, header, children }: {
  id: Col; title: string; hint: string; count: number; active: boolean; canDrop: boolean; header: React.ReactNode; children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section ref={setNodeRef} aria-label={title}
      className={`flex min-h-[420px] flex-col gap-2 rounded-2xl p-2.5 transition ${
        isOver && canDrop ? "bg-green-bg" : active && canDrop ? "bg-cream-deep outline-2 -outline-offset-2 outline-dashed outline-line" : "bg-cream-deep"
      } ${active && !canDrop ? "opacity-60" : ""}`}>
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-base font-semibold">{title}</h2>
        <span className="text-xs text-muted tnum">{count}</span>
      </div>
      <span className="sr-only">{hint}</span>
      {header}
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function Card({ t, col, cat, catFull, onMove, hidden }: {
  t: BoardTrader; col: Col; cat?: Category; catFull: boolean; onMove: (to: Column) => void; hidden: boolean;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: t.id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={`touch-none select-none ${hidden ? "opacity-30" : ""}`}>
      <CardBody t={t} cat={cat} catFull={catFull && col === "pool"}>
        {/* tap alternatives to dragging */}
        <div className="mt-2 flex flex-wrap gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
          {col === "pool" && <Mini onClick={() => onMove("invited")}>Invite</Mini>}
          {col === "requested" && <><Mini primary onClick={() => onMove("approved")}>Accept</Mini><Mini onClick={() => onMove("pool")}>Decline</Mini></>}
          {col === "invited" && <><Mini onClick={() => onMove("approved")}>Mark confirmed</Mini><Mini onClick={() => onMove("pool")}>Remove</Mini></>}
          {col === "attending" && <Mini onClick={() => onMove("pool")}>Remove</Mini>}
        </div>
      </CardBody>
    </div>
  );
}

function CardBody({ t, cat, catFull, lifted, children }: { t: BoardTrader; cat?: Category; catFull?: boolean; lifted?: boolean; children?: React.ReactNode }) {
  const note =
    t.state === "withdrawn" ? "Said no to this date" :
    t.state === "declined" ? "Request declined" :
    t.state === "released" ? "Removed from this date" : null;
  return (
    <div className={`cursor-grab rounded-xl bg-card px-3 py-2.5 active:cursor-grabbing ${lifted ? "rotate-1 shadow-xl ring-1 ring-line" : "shadow-[0_1px_0_var(--line)]"}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold leading-snug text-ink-strong">{t.name}</span>
        {t.draft && <span className="chip chip-avail !px-2 !text-[10px]">Draft</span>}
        {t.state === "invited" && !t.draft && <span className="chip chip-req !px-2 !text-[10px]">Sent</span>}
        {t.unpaid && <span className="chip chip-due !px-2 !text-[10px]">Unpaid</span>}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
        <span className={`inline-flex items-center gap-1 ${catFull ? "text-amber" : ""}`}>
          <i className="inline-block h-2 w-2 rounded-sm" style={{ background: cat?.colour ?? "var(--line)" }} />
          {cat?.name ?? "No category"}{catFull ? " (full)" : ""}
        </span>
        {t.lastCame && <span>· last came {fmtDate(t.lastCame, { day: "numeric", month: "short" })}</span>}
      </div>
      {note && <div className="mt-1 text-xs text-muted">{note}</div>}
      {t.message && t.state === "requested" && <div className="mt-1 text-xs italic text-muted">&ldquo;{t.message}&rdquo;</div>}
      {children}
    </div>
  );
}

function Mini({ children, onClick, primary }: { children: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button type="button" onClick={onClick}
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${primary ? "bg-ink-strong text-cream" : "border border-line text-ink hover:bg-cream"}`}>
      {children}
    </button>
  );
}
