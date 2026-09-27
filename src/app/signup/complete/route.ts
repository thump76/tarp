import { NextResponse, type NextRequest } from "next/server";
import { provisionFromCheckout } from "@/lib/billing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** How long after checkout the thank-you link will still sign someone in without an email. */
const AUTO_SIGN_IN_SECONDS = 2 * 60 * 60;

/**
 * Stripe sends the buyer here after paying. We create the organiser (if the webhook has not
 * already), then sign them straight in so they land in the organiser view. The link works once
 * and only for two hours; after that they sign in with the usual email link.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId) return NextResponse.redirect(`${origin}/pricing`);

  let result: Awaited<ReturnType<typeof provisionFromCheckout>> = null;
  try {
    result = await provisionFromCheckout(sessionId);
  } catch (err) {
    console.error("signup complete", err);
  }
  if (!result) return NextResponse.redirect(`${origin}/signup?problem=1`);

  const toLogin = NextResponse.redirect(`${origin}/login?next=/admin&paid=1&email=${encodeURIComponent(result.email)}`);
  if (Date.now() / 1000 - result.sessionCreated > AUTO_SIGN_IN_SECONDS) return toLogin;

  const db = createAdminClient();
  // one use only
  const { data: claimed } = await db.from("signups").update({ welcomed_at: new Date().toISOString() })
    .eq("checkout_session_id", sessionId).is("welcomed_at", null).select("checkout_session_id");
  if (!claimed?.length) return toLogin;

  // make sure the auth user exists, then mint a one-time sign-in token and redeem it here
  await db.auth.admin.createUser({ email: result.email, email_confirm: true }); // errors if they already exist; fine
  const { data: link, error: linkErr } = await db.auth.admin.generateLink({ type: "magiclink", email: result.email });
  if (linkErr || !link?.properties?.hashed_token) return toLogin;

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type: "email", token_hash: link.properties.hashed_token });
  if (error) return toLogin;
  await supabase.rpc("claim_my_memberships");
  await supabase.rpc("claim_my_profiles");
  return NextResponse.redirect(`${origin}/admin?welcome=1`);
}
