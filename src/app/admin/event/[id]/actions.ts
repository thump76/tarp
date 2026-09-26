"use server";

import { revalidatePath } from "next/cache";
import { currentOrganiser } from "@/lib/admin";
import { paymentBlock, sendEmail, siteUrl } from "@/lib/email";
import { fmtDate, fmtMoney } from "@/lib/format";

export type Column = "pool" | "invited" | "approved";

async function eventInfo(eventId: string) {
  const { supabase, org } = await currentOrganiser();
  const { data: ev } = await supabase.from("public_events").select("date, market_name, fee_pence").eq("id", eventId).single();
  return { supabase, org, ev };
}

function refresh(eventId: string) {
  revalidatePath(`/admin/event/${eventId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/money");
}

/**
 * Move a trader on the board. Emails go out only for decisions the trader is waiting on:
 * approving their request, declining it, or releasing a confirmed pitch. Organiser invitations
 * stay as drafts until sendInvitations().
 */
export async function placeTrader(eventId: string, stallholderId: string, to: Column): Promise<string> {
  const { supabase, org, ev } = await eventInfo(eventId);
  const { data: before } = await supabase.from("requests").select("id, state, source").eq("event_id", eventId).eq("stallholder_id", stallholderId).maybeSingle();
  const { data: result, error } = await supabase.rpc("place_trader", { ev: eventId, sh: stallholderId, to_state: to });
  if (error) throw new Error(error.message);

  const { data: sh } = await supabase.from("stallholders").select("email, business_name").eq("id", stallholderId).single();
  if (sh && ev) {
    const when = `${fmtDate(ev.date, { weekday: "long", day: "numeric", month: "long" })} at ${ev.market_name}`;
    if (result === "approved" && before?.state === "requested") {
      const [{ data: inv }, { data: bank }] = await Promise.all([
        supabase.from("invoices").select("reference, amount_pence, due_date").eq("request_id", before.id).single(),
        supabase.from("organiser_settings").select("bank_account_name, bank_sort_code, bank_account_number, payment_note").eq("organiser_id", org.id).maybeSingle(),
      ]);
      await sendEmail({ to: sh.email, subject: `Confirmed: ${when}`,
        text: `${sh.business_name} is confirmed for ${when}.\n\n${inv ? `Pitch fee ${fmtMoney(inv.amount_pence)}, due by ${fmtDate(inv.due_date, { day: "numeric", month: "long" })}.\n\n${paymentBlock(bank, inv.reference)}\n\n` : ""}See your bookings: ${siteUrl("/me")}\n\n${org.name}` });
    } else if (result === "declined") {
      await sendEmail({ to: sh.email, subject: `Your request for ${when}`,
        text: `Thank you for asking. We are not able to offer ${sh.business_name} a pitch on ${when}, usually because the market is full or we already have similar stalls that day. Do request another date.\n\n${siteUrl("/me")}\n\n${org.name}` });
    } else if (result === "released" && before?.state === "approved") {
      await sendEmail({ to: sh.email, subject: `Pitch released: ${when}`,
        text: `Your pitch for ${sh.business_name} on ${when} has been released and any unpaid invoice cancelled. If this is a mistake, reply to the organiser.\n\n${org.name}` });
    }
  }
  refresh(eventId);
  return result as string;
}

/** Invite everyone who attended another date at this location. Creates drafts. */
export async function copyLineup(eventId: string, fromEventId: string): Promise<number> {
  const { supabase } = await currentOrganiser();
  const { data, error } = await supabase.rpc("copy_lineup", { ev: eventId, from_ev: fromEventId });
  if (error) throw new Error(error.message);
  refresh(eventId);
  return data as number;
}

/** Email every draft invitation on this date and mark them sent. */
export async function sendInvitations(eventId: string): Promise<number> {
  const { supabase, org, ev } = await eventInfo(eventId);
  const { data: drafts } = await supabase.from("requests")
    .select("id, stallholders(email, business_name)")
    .eq("event_id", eventId).eq("state", "invited").is("notified_at", null);
  if (!drafts?.length || !ev) return 0;
  const when = `${fmtDate(ev.date, { weekday: "long", day: "numeric", month: "long" })} at ${ev.market_name}`;
  for (const d of drafts as unknown as { id: string; stallholders: { email: string; business_name: string } }[]) {
    await sendEmail({ to: d.stallholders.email, subject: `Invitation: ${when}`,
      text: `${org.name} would like ${d.stallholders.business_name} at ${when}.\n\nPitch fee ${fmtMoney(ev.fee_pence)}. Say yes or no here:\n${siteUrl("/me")}\n\nSaying yes confirms your pitch and sends the invoice.` });
  }
  const { error } = await supabase.from("requests").update({ notified_at: new Date().toISOString() }).in("id", drafts.map((d) => d.id));
  if (error) throw new Error(error.message);
  refresh(eventId);
  return drafts.length;
}
