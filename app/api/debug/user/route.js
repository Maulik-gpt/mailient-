// app/api/debug/user/route.js
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth.js";
import { getSupabaseAdmin } from "@/lib/supabase.js";

// CRITICAL: Force dynamic rendering to prevent build-time evaluation
export const dynamic = 'force-dynamic';

const supabase = new Proxy({}, {
  get: (target, prop) => getSupabaseAdmin()[prop]
});

export async function GET(req) {
  // AUTH REQUIRED. Unauthenticated, this route was an account-existence oracle:
  // anyone could probe any address and learn whether it belongs to a Mailient
  // user, plus that account's token state. Only ever report on the caller.
  const session = await auth();
  const sessionEmail = session?.user?.email;
  if (!sessionEmail) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const url = new URL(req.url);
  const requested = url.searchParams.get("email");
  if (requested && requested.toLowerCase() !== sessionEmail.toLowerCase()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const email = sessionEmail;

  const { data: row, error } = await supabase.from("user_tokens").select("id,google_email,encrypted_refresh_token,encrypted_access_token,access_token_expires_at,last_refreshed_at").eq("google_email", email).maybeSingle();
  if (error) return NextResponse.json({ error: String(error) }, { status: 500 });
  if (!row) return NextResponse.json({ exists: false });
  return NextResponse.json({
    exists: true,
    has_encrypted_refresh_token: !!row.encrypted_refresh_token,
    has_encrypted_access_token: !!row.encrypted_access_token,
    access_token_expires_at: row.access_token_expires_at,
    last_refreshed_at: row.last_refreshed_at
  });
}


