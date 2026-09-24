"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function done() {
  revalidatePath("/admin");
  revalidatePath("/admin/requests");
  revalidatePath("/admin/money");
  revalidatePath("/me");
  revalidatePath("/", "layout");
}

export async function approve(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_request", { req: String(formData.get("id")) });
  if (error) throw new Error(error.message);
  done();
}

export async function decline(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("decline_request", { req: String(formData.get("id")) });
  if (error) throw new Error(error.message);
  done();
}

export async function release(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("release_request", { req: String(formData.get("id")) });
  if (error) throw new Error(error.message);
  done();
}

/** Until Stripe is wired in, the organiser marks invoices paid by hand (bank transfer, cash on the day). */
export async function markPaid(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("invoices").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", String(formData.get("id")));
  if (error) throw new Error(error.message);
  done();
}

/** Records a manual reminder. Sending the email itself arrives with the Resend integration. */
export async function remind(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("reminders").insert({ invoice_id: String(formData.get("id")), kind: "manual" });
  if (error) throw new Error(error.message);
  done();
}
