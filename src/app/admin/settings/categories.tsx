"use client";
import { useState } from "react";
import type { Category } from "@/lib/types";
import { field } from "@/components/form";
import { addCategory, deleteCategory, updateCategory } from "./actions";

const PALETTE = ["#8a4b32", "#b8781a", "#6b5a8e", "#5a3e2b", "#3d7357", "#b45f7a", "#c9a227", "#4a6fa5", "#2f7f8c", "#7fa34b", "#9c7b5c", "#a63f35"];

/**
 * Categories with an optional maximum per date. The max is a soft cap: the board and the mix
 * check turn amber when it is reached, but the organiser can always go over.
 */
export function Categories({ categories, counts }: { categories: Category[]; counts: Record<string, number> }) {
  const [adding, setAdding] = useState(false);
  const nextColour = PALETTE[categories.length % PALETTE.length];
  return (
    <div className="rounded-2xl bg-card p-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
            <th className="pb-2 font-semibold">Category</th>
            <th className="pb-2 font-semibold">Max per date</th>
            <th className="pb-2 font-semibold">Colour</th>
            <th className="pb-2 font-semibold">Traders</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {categories.map((c) => <Row key={c.id} c={c} traders={counts[c.id] ?? 0} />)}
          {!categories.length && !adding && <tr><td colSpan={5} className="py-4 text-muted">No categories yet.</td></tr>}
        </tbody>
      </table>
      {adding ? (
        <form action={async (fd) => { await addCategory(fd); setAdding(false); }} className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-[1fr_120px_auto_auto_auto] sm:items-center">
          <input name="name" required autoFocus placeholder="Category name" className={field} />
          <input name="cap" type="number" inputMode="numeric" min={0} placeholder="No max" className={field} />
          <input name="colour" type="color" defaultValue={nextColour} className="h-10 w-12 cursor-pointer rounded-lg border border-line bg-transparent p-1" aria-label="Colour" />
          <button className="btn btn-primary">Add</button>
          <button type="button" className="btn btn-ghost" onClick={() => setAdding(false)}>Cancel</button>
        </form>
      ) : (
        <div className="mt-3 border-t border-line pt-3">
          <button type="button" className="btn btn-ghost" onClick={() => setAdding(true)}>Add a category</button>
        </div>
      )}
    </div>
  );
}

function Row({ c, traders }: { c: Category; traders: number }) {
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  if (editing) {
    return (
      <tr className="border-t border-line">
        <td colSpan={5} className="py-2">
          <form action={async (fd) => { await updateCategory(fd); setEditing(false); }} className="grid gap-2 sm:grid-cols-[1fr_120px_auto_auto_auto] sm:items-center">
            <input type="hidden" name="id" value={c.id} />
            <input name="name" required defaultValue={c.name} className={field} />
            <input name="cap" type="number" inputMode="numeric" min={0} defaultValue={c.cap ?? ""} placeholder="No max" className={field} />
            <input name="colour" type="color" defaultValue={c.colour ?? "#dcd6bb"} className="h-10 w-12 cursor-pointer rounded-lg border border-line bg-transparent p-1" aria-label="Colour" />
            <button className="btn btn-primary">Save</button>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
          </form>
        </td>
      </tr>
    );
  }
  return (
    <tr className="border-t border-line">
      <td className="py-2.5 font-semibold text-ink-strong">{c.name}</td>
      <td className="py-2.5 tnum">{c.cap ?? <span className="text-muted">No max</span>}</td>
      <td className="py-2.5"><i className="inline-block h-4 w-4 rounded-sm align-middle" style={{ background: c.colour ?? "var(--line)" }} /></td>
      <td className="py-2.5 tnum text-muted">{traders}</td>
      <td className="py-2.5 text-right">
        {confirm ? (
          <form action={deleteCategory} className="inline-flex items-center gap-2">
            <input type="hidden" name="id" value={c.id} />
            <span className="text-xs text-red">{traders ? `${traders} trader${traders === 1 ? "" : "s"} will have no category.` : "Delete?"}</span>
            <button className="btn btn-danger !py-1 text-xs">Delete</button>
            <button type="button" className="btn btn-ghost !py-1 text-xs" onClick={() => setConfirm(false)}>Keep</button>
          </form>
        ) : (
          <span className="inline-flex gap-1">
            <button type="button" className="btn btn-ghost !py-1 text-xs" onClick={() => setEditing(true)}>Edit</button>
            <button type="button" className="btn btn-ghost !py-1 text-xs" onClick={() => setConfirm(true)}>Delete</button>
          </span>
        )}
      </td>
    </tr>
  );
}
