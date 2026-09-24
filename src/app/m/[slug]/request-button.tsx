"use client";
import { useState, useTransition } from "react";
import { requestPitch } from "./actions";
import type { Category } from "@/lib/types";

/**
 * Request a pitch. First time with an organiser, asks for business name and category
 * so the organiser's mix check has something to go on.
 */
export function RequestButton({ eventId, slug, full, hasProfile, categories, label }:
  { eventId: string; slug: string; full: boolean; hasProfile: boolean; categories: Category[]; label: string }) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(fd: FormData) {
    setErr(null);
    start(async () => {
      const res = await requestPitch(fd);
      if (res?.error) setErr(res.error);
      else setOpen(false);
    });
  }

  if (!open) {
    return <button className="btn btn-primary" onClick={() => setOpen(true)}>{full ? "Join waiting list" : "Request a pitch"}</button>;
  }

  return (
    <form action={submit} className="w-full rounded-xl border border-line bg-cream p-3 text-sm">
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="slug" value={slug} />
      <div className="mb-2 font-semibold">Request {label}</div>
      {!hasProfile && (
        <div className="mb-2 grid gap-2">
          <input name="business_name" required placeholder="Business name" className="rounded-lg border border-line bg-white/60 px-2 py-1.5" />
          <input name="contact_name" placeholder="Your name" className="rounded-lg border border-line bg-white/60 px-2 py-1.5" />
          <select name="category_id" required defaultValue="" className="rounded-lg border border-line bg-white/60 px-2 py-1.5">
            <option value="" disabled>What do you sell?</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}
      <textarea name="message" rows={2} placeholder="Anything the organiser should know (optional)" className="mb-2 w-full rounded-lg border border-line bg-white/60 px-2 py-1.5" />
      {err && <p className="mb-2 text-red">{err}</p>}
      <div className="flex gap-2">
        <button className="btn btn-primary" disabled={pending}>{pending ? "Sending" : "Send request"}</button>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
