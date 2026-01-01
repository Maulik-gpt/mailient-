// app/api/debug/user/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET(req) {
  const url = new URL(req.url);
  const email = url.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "missing email" }, { status: 400 });

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


