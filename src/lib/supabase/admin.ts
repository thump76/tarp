import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Bypasses row-level security, so only use it in server code
 * that has already checked who is asking (the Stripe webhook, the sign-up completion route).
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set. See README, Selling Tarp.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
