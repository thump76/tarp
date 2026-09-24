"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function answerInvite(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_invite", {
    req: String(formData.get("id")),
    accept: formData.get("answer") === "yes",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/me");
  revalidatePath("/admin", "layout");
}
