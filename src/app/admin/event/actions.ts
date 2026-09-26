"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentOrganiser } from "@/lib/admin";

export type EventInput = {
  market_id: string;
  theme: string;
  starts: string;      // "YYYY-MM-DDTHH:MM" from a datetime-local input
  ends: string;
  max_pitches: number;
  fee_pounds: string;  // "40" or "42.50"
  note: string;
  copy_from: string;   // event id, or ""
};

export type ActionResult = { error: string } | { id: string; copied?: number };

function refresh(id?: string) {
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  if (id) revalidatePath(`/admin/event/${id}`);
}

type Row = { market_id: string; date: string; start_time: string; end_time: string; max_pitches: number; fee_pence: number; theme: string | null; note: string | null };

function parse(input: EventInput): { error: string } | { row: Row } {
  const [date, start] = input.starts.split("T");
  const [endDate, end] = input.ends.split("T");
  if (!date || !start) return { error: "Pick a start date and time." };
  if (!end) return { error: "Pick an end time." };
  if (endDate < date || (endDate === date && end <= start)) return { error: "The end must be after the start." };
  const pence = Math.round(parseFloat(input.fee_pounds || "0") * 100);
  if (!Number.isFinite(pence) || pence < 0) return { error: "Enter a price per pitch." };
  const pitches = Math.floor(Number(input.max_pitches));
  if (!pitches || pitches < 1) return { error: "How many pitches?" };
  return {
    row: {
      market_id: input.market_id, date, start_time: start, end_time: end,
      max_pitches: pitches, fee_pence: pence,
      theme: input.theme.trim() || null, note: input.note.trim() || null,
    },
  };
}

function friendly(message: string, code?: string) {
  if (code === "23505") return "There is already a date at this location on that day.";
  return message;
}

export async function createEvent(input: EventInput): Promise<ActionResult> {
  const { supabase, org } = await currentOrganiser();
  const p = parse(input);
  if ("error" in p) return p;
  const { data: mk } = await supabase.from("markets").select("id").eq("id", p.row.market_id).eq("organiser_id", org.id).is("deleted_at", null).maybeSingle();
  if (!mk) return { error: "Pick a location." };
  const { data, error } = await supabase.from("events").insert(p.row).select("id").single();
  if (error || !data) return { error: friendly(error?.message ?? "Could not save", error?.code) };
  let copied: number | undefined;
  if (input.copy_from) {
    const { data: n, error: e2 } = await supabase.rpc("copy_lineup", { ev: data.id, from_ev: input.copy_from });
    if (!e2) copied = n as number;
  }
  refresh(data.id);
  return { id: data.id, copied };
}

export async function updateEvent(id: string, input: EventInput): Promise<ActionResult> {
  const { supabase } = await currentOrganiser();
  const p = parse(input);
  if ("error" in p) return p;
  const { error } = await supabase.from("events").update(p.row).eq("id", id);
  if (error) return { error: friendly(error.message, error.code) };
  refresh(id);
  return { id };
}

/** Soft delete. Unpaid invoices are voided; the date can be restored from the archive. */
export async function deleteEvent(formData: FormData) {
  const { supabase } = await currentOrganiser();
  const { error } = await supabase.rpc("delete_event", { ev: String(formData.get("id")) });
  if (error) throw new Error(error.message);
  refresh();
  redirect("/admin");
}

export async function restoreEvent(formData: FormData) {
  const { supabase } = await currentOrganiser();
  const { error } = await supabase.rpc("restore_event", { ev: String(formData.get("id")) });
  if (error) throw new Error(error.message);
  refresh();
}

export async function restoreMarket(formData: FormData) {
  const { supabase } = await currentOrganiser();
  const { error } = await supabase.rpc("restore_market", { mk: String(formData.get("id")) });
  if (error) throw new Error(error.message);
  refresh();
  revalidatePath("/admin/locations");
}
