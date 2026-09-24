import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // attach this sign-in to any trader profile created by an application or an import
      await supabase.rpc("claim_my_profiles");
      return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/"}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=1`);
}
