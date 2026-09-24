"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, siteUrl } from "@/lib/email";

export type ApplyState = { error?: string } | undefined;

export async function applyToTrade(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const org = get("org");
  // simple spam trap: real people never fill the hidden field
  if (get("company_website")) redirect(`/apply/${org}/thanks`);

  const markets = formData.getAll("markets").map(String);
  const email = get("email");
  if (!get("business_name")) return { error: "Please add your business name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Please check your email address." };
  if (!get("category_id")) return { error: "Please choose what you sell." };
  if (!markets.length) return { error: "Tick at least one market you would like to trade at." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("apply_to_organiser", {
    org_slug: org,
    p_business: get("business_name"),
    p_contact: get("contact_name") || null,
    p_email: email,
    p_phone: get("phone") || null,
    p_category: get("category_id"),
    p_description: get("description") || null,
    p_website: get("website") || null,
    p_instagram: get("instagram") || null,
    p_markets: markets,
  });
  if (error) return { error: error.message };

  if (data !== "exists") {
    await sendEmail({
      to: email,
      subject: "We have your application",
      text: `Thanks for applying to trade with us.\n\nThe organiser will look at your application and email you when it has been reviewed. If you are approved, that email will tell you which markets you can book.\n\nYou can check where things are at any time by signing in at ${siteUrl("/me")}\n\nTarp`,
    });
  }
  redirect(`/apply/${org}/thanks?r=${data}`);
}
