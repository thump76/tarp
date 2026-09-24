"use client";
import { useState, useTransition } from "react";
import { requestPitch } from "./actions";

/** Request a pitch on one date. Only shown to traders approved for this market. */
export function RequestButton({ eventId, slug, full, label }: { eventId: string; slug: string; full: boolean; label: string }) {
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
    return <button className="btn btn-primary" onClick={() => setOpen(true)}>{full ? "Ask to join if a space opens" : "Request a pitch"}</button>;
  }

  return (
    <form action={submit} className="w-full rounded-xl border border-line bg-cream p-3 text-sm">
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="slug" value={slug} />
      <div className="mb-2 font-semibold">Request {label}</div>
      <textarea name="message" rows={2} placeholder="Anything the organiser should know (optional)" className="mb-2 w-full rounded-lg border border-line bg-white/60 px-2 py-1.5" />
      {err && <p className="mb-2 text-red">{err}</p>}
      <div className="flex gap-2">
        <button className="btn btn-primary" disabled={pending}>{pending ? "Sending" : "Send request"}</button>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
