/**
 * POST /api/leads — landing-page email capture.
 *
 * The legitimate version of "email people who visit the site": it fires ONLY
 * for someone who typed their own email into the opt-in field. There is no
 * anonymous-visitor path — a pageview has no address, and we do not de-anonymise
 * anyone. On a genuinely new address it stores the lead and sends the hook email
 * exactly once; a repeat submission is a no-op.
 *
 * Abuse control: an email-format check, a length cap, and a honeypot field
 * (`company`) that real users never see but bots fill.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendLandingHookEmail } from '@/lib/email-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  // Honeypot: a hidden field only a bot fills. Return 200 so it believes it
  // succeeded, but do nothing.
  if (body?.company) return NextResponse.json({ ok: true });

  const email = String(body?.email || '').trim().toLowerCase();
  const source = String(body?.source || 'landing').slice(0, 64);

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Already one of your users? Don't cold-hook your own customers.
  try {
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('user_id')
      .ilike('user_id', email)
      .maybeSingle();
    if (existingUser) return NextResponse.json({ ok: true });
  } catch {
    // Non-fatal — worst case they get the hook despite being a user.
  }

  // email is the PK, so a duplicate insert is the dedupe. 23505 = unique_violation.
  const { error: insertErr } = await supabase
    .from('landing_leads')
    .insert({ email, source });

  if (insertErr) {
    if ((insertErr as any).code === '23505') {
      // Seen before — already emailed. Silently succeed, never re-send.
      return NextResponse.json({ ok: true });
    }
    // Any other DB error (e.g. table not migrated yet): log it and still send
    // once rather than lose the lead. Without the row we can't dedupe, so this
    // path is only acceptable until the migration is applied.
    console.error('[leads] insert failed:', insertErr.message);
  }

  const result = await sendLandingHookEmail({ toEmail: email });

  // Stamp when the send actually happened, so it's auditable. Only meaningful
  // when the row exists (i.e. the insert above succeeded).
  if (result?.success && !insertErr) {
    try {
      await supabase
        .from('landing_leads')
        .update({ hook_emailed_at: new Date().toISOString() })
        .eq('email', email);
    } catch {
      // Non-fatal.
    }
  }

  // Always report success to the visitor — a Resend hiccup shouldn't look like
  // their submission failed; the lead is captured either way.
  return NextResponse.json({ ok: true });
}
