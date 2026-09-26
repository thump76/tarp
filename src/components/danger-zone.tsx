"use client";
import { useState } from "react";

/**
 * Two-tap delete. The first tap reveals what will happen and a confirm button, so there is no
 * browser dialog to fight with on an iPad. `action` is a server action taking FormData with `id`.
 */
export function DangerZone({ title, summary, action, id, button }: {
  title: string; summary: string; action: (fd: FormData) => Promise<void>; id: string; button: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="mt-10 max-w-2xl rounded-2xl border border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-0.5 text-sm text-muted">{summary}</p>
        </div>
        {!open && <button type="button" className="btn btn-danger" onClick={() => setOpen(true)}>{button}</button>}
      </div>
      {open && (
        <form action={action} className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-red-bg p-3 text-sm">
          <input type="hidden" name="id" value={id} />
          <span className="mr-auto font-semibold text-red">Are you sure?</span>
          <button className="btn btn-primary !bg-red">Yes, {button.toLowerCase()}</button>
          <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Keep it</button>
        </form>
      )}
    </section>
  );
}
