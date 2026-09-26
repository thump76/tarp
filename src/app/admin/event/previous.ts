import type { SupabaseClient } from "@supabase/supabase-js";
import { fmtDate } from "@/lib/format";
import type { OrganiserEvent } from "@/lib/types";
import type { PreviousDate } from "./event-form";

/**
 * Dates that can be copied from, grouped by location: every live date with at least one attending
 * trader, newest first. Labelled "Sat 12 Sep, Autumn fair, 18 traders" so the organiser can pick
 * the line-up they mean.
 */
export async function previousDates(supabase: SupabaseClient, orgId: string, excludeId?: string) {
  const { data } = await supabase.from("organiser_events").select("id, market_id, date, theme, approved")
    .eq("organiser_id", orgId).is("deleted_at", null).gt("approved", 0)
    .order("date", { ascending: false }).limit(200)
    .returns<Pick<OrganiserEvent, "id" | "market_id" | "date" | "theme" | "approved">[]>();
  const out: Record<string, PreviousDate[]> = {};
  const thisYear = new Date().getFullYear();
  for (const e of data ?? []) {
    if (e.id === excludeId) continue;
    const year = e.date.slice(0, 4) === String(thisYear) ? undefined : "numeric";
    const label = [fmtDate(e.date, { weekday: "short", day: "numeric", month: "short", year }), e.theme, `${e.approved} trader${e.approved === 1 ? "" : "s"}`]
      .filter(Boolean).join(", ");
    (out[e.market_id] ??= []).push({ id: e.id, label });
  }
  return out;
}
