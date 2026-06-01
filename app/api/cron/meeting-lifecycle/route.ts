/**
 * Arcus Meeting Lifecycle — Vercel Cron
 * GET /api/cron/meeting-lifecycle
 *
 * Runs every 5-10 minutes. For each user with Gmail connected and
 * meeting-prep enabled in their preferences, scans the next `lead_minutes`
 * (default 25) of calendar events. For meetings with external attendees
 * that haven't been prepped yet, composes a briefing (who / recent thread /
 * past-meeting memory / description) and delivers it by email. Marks the
 * meeting as prepped in arcus_meeting_events and seeds a context memory
 * tagged with attendee emails so future preps get richer automatically.
 *
 * PART 61 — pre-meeting stage only. PART 62 will add the post-meeting
 * follow-up stage using the same table.
 *
 * Required env vars:
 *   RESEND_API_KEY          — Resend API key (email delivery)
 *   RESEND_FROM_EMAIL       — Verified sender (default "Arcus AI <arcus@mailient.xyz>")
 *
 * Optional:
 *   CRON_SECRET             — Bearer token for non-Vercel invocations
 */

import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore — JS module path
import { getSupabaseAdmin } from '../../../../lib/supabase.js';
// @ts-ignore — JS module path
import { decrypt } from '../../../../lib/crypto.js';
import { CalendarService } from '../../../../lib/calendar';
import { composeMeetingPrep } from '../../../../lib/arcus/meeting-prep';
// @ts-ignore — JS module path
import { saveMemory } from '../../../../lib/arcus/memory';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET || 'arcus-cron-secret';
const RESEND_FROM = process.env.RESEND_FROM_EMAIL || 'Arcus AI <arcus@mailient.xyz>';
const DEFAULT_LEAD_MINUTES = 25;
const LOOKAHEAD_PAD_MINUTES = 6; // catches meetings that slipped between cron ticks

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    const vercelCron = request.headers.get('x-vercel-cron');
    if (vercelCron !== '1') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = getSupabaseAdmin();

  // Pull every user with Gmail tokens stored. Decryption happens inside the
  // per-user loop so a single bad token can't kill the whole batch.
  const { data: tokenRows, error: tokenErr } = await supabase
    .from('user_tokens')
    .select('user_id, google_email, encrypted_access_token, encrypted_refresh_token');
  if (tokenErr?.code === '42P01') {
    return NextResponse.json({ message: 'user_tokens table missing — nothing to do.' });
  }
  if (tokenErr) return NextResponse.json({ error: tokenErr.message }, { status: 500 });
  if (!tokenRows?.length) return NextResponse.json({ message: 'No users with Gmail.', prepped: 0 });

  // Pre-fetch all user profiles so we can read preferences in one query.
  const userIds = Array.from(new Set(tokenRows.map((r: any) => (r.google_email || r.user_id || '').toLowerCase()).filter(Boolean)));
  const profileMap = new Map<string, any>();
  try {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, preferences')
      .in('user_id', userIds);
    for (const p of (profiles || [])) profileMap.set(String(p.user_id).toLowerCase(), p.preferences || {});
  } catch { /* missing preferences is fine — defaults apply */ }

  const results: string[] = [];
  let prepped = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of tokenRows) {
    const userId = String(row.google_email || row.user_id || '').toLowerCase();
    if (!userId) { skipped++; continue; }

    const prefs = profileMap.get(userId) || {};
    if (prefs.arcus_meeting_prep_enabled === false) { skipped++; continue; }

    const leadMinutes = Math.max(5, Math.min(120,
      Number(prefs.arcus_meeting_prep_lead_minutes) || DEFAULT_LEAD_MINUTES,
    ));
    const userTz = (prefs.timezone as string) || 'UTC';

    let accessToken: string | null = null;
    let refreshToken: string | null = null;
    try {
      accessToken = row.encrypted_access_token ? decrypt(row.encrypted_access_token) : null;
      refreshToken = row.encrypted_refresh_token ? decrypt(row.encrypted_refresh_token) : null;
    } catch (e: any) {
      console.warn(`[MeetingLifecycle] decrypt failed for ${userId}: ${e?.message}`);
      errors++;
      continue;
    }
    if (!accessToken) { skipped++; continue; }

    let events: any[] = [];
    try {
      const cal = new CalendarService(accessToken, refreshToken || '');
      const now = new Date();
      const timeMin = now.toISOString();
      const timeMax = new Date(now.getTime() + (leadMinutes + LOOKAHEAD_PAD_MINUTES) * 60_000).toISOString();
      events = await cal.listEvents({ timeMin, timeMax, maxResults: 25 });
    } catch (e: any) {
      console.warn(`[MeetingLifecycle] calendar fetch failed for ${userId}: ${e?.message}`);
      errors++;
      continue;
    }

    for (const event of events) {
      if (!event?.id) continue;
      // Skip all-day events — start.date without dateTime
      if (!event.start?.dateTime) continue;

      let existing: { id: string; prep_sent_at: string | null } | null = null;
      try {
        const { data } = await supabase
          .from('arcus_meeting_events')
          .select('id, prep_sent_at')
          .eq('user_id', userId)
          .eq('gcal_event_id', event.id)
          .maybeSingle();
        existing = data as any;
      } catch (e: any) {
        // Table might not exist — fail closed on this run, the user can apply the migration
        if (e?.code === '42P01') {
          return NextResponse.json({ error: 'arcus_meeting_events table missing — apply the migration.', code: '42P01' }, { status: 500 });
        }
      }
      if (existing?.prep_sent_at) continue; // already prepped — idempotent

      let prep;
      try {
        prep = await composeMeetingPrep({
          userId,
          userTimezone: userTz,
          event,
          accessToken,
          refreshToken: refreshToken || '',
        });
      } catch (e: any) {
        console.warn(`[MeetingLifecycle] prep compose failed: ${e?.message}`);
        errors++;
        continue;
      }
      if (!prep) { skipped++; continue; }

      const delivered = await sendPrepEmail(userId, prep);
      if (!delivered) { errors++; continue; }

      try {
        if (existing) {
          await supabase
            .from('arcus_meeting_events')
            .update({ prep_sent_at: new Date().toISOString(), attendees: prep.attendeesExternal, title: event.summary || null })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('arcus_meeting_events')
            .insert({
              user_id: userId,
              gcal_event_id: event.id,
              event_start: prep.startsAtIso,
              event_end: event.end?.dateTime || event.end?.date || null,
              title: event.summary || null,
              attendees: prep.attendeesExternal,
              prep_sent_at: new Date().toISOString(),
            });
        }
      } catch (e: any) {
        console.warn(`[MeetingLifecycle] table write failed: ${e?.message}`);
      }

      // Feature #4 seed — every prep saves a memory tagged with attendees so
      // the NEXT meeting with the same people automatically surfaces this.
      try {
        const attendeeList = prep.attendeesExternal.map((a) => a.name || a.email).join(', ');
        await saveMemory(
          userId,
          `[MEETING] ${new Date(prep.startsAtIso).toISOString().slice(0, 10)} — "${event.summary || 'meeting'}" with ${attendeeList}.`,
          ['meeting', ...prep.attendeesExternal.map((a) => a.email)],
          'agent_run',
        );
      } catch { /* memory write best-effort */ }

      prepped++;
      results.push(`prepped: ${userId} → "${event.summary}" (${prep.attendeesExternal.length} ext)`);
    }
  }

  return NextResponse.json({ message: `Prepped ${prepped}.`, prepped, skipped, errors, results });
}

async function sendPrepEmail(toEmail: string, prep: { markdown: string; subject: string }): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[MeetingLifecycle] RESEND_API_KEY not set — skipping email.');
    return false;
  }
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    const html = wrapHtml(prep.subject, markdownToHtml(prep.markdown));
    const { error } = await resend.emails.send({
      from: RESEND_FROM,
      to: toEmail,
      subject: prep.subject,
      html,
    });
    if (error) {
      console.error('[MeetingLifecycle] resend error:', error);
      return false;
    }
    return true;
  } catch (e: any) {
    console.error('[MeetingLifecycle] sendPrepEmail failed:', e?.message);
    return false;
  }
}

// ─── Minimal markdown → HTML ────────────────────────────────────────────────
// Trimmed-down vs the agent-report renderer because prep briefs are short
// and the structure is predictable (a few headings, bullets, one link).

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inlineFmt(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#0066cc;text-decoration:underline">$1</a>');
}

function markdownToHtml(md: string): string {
  const out: string[] = [];
  let inUl = false;
  const closeUl = () => { if (inUl) { out.push('</ul>'); inUl = false; } };

  for (const raw of md.split('\n')) {
    const line = raw;
    const h = line.match(/^(#{1,6})\s+(.+)/);
    if (h) {
      closeUl();
      const n = h[1].length;
      const styles: Record<number, string> = {
        1: 'font-size:22px;font-weight:700;color:#111;margin:0 0 12px;letter-spacing:-0.02em',
        2: 'font-size:13px;font-weight:600;color:#555;margin:24px 0 8px;text-transform:uppercase;letter-spacing:0.08em',
        3: 'font-size:14px;font-weight:600;color:#333;margin:16px 0 6px',
      };
      out.push(`<h${n} style="${styles[n] || styles[3]}">${inlineFmt(h[2])}</h${n}>`);
      continue;
    }
    const li = line.match(/^\s*-\s+(.+)/);
    if (li) {
      if (!inUl) { out.push('<ul style="margin:6px 0 12px 0;padding-left:20px">'); inUl = true; }
      out.push(`<li style="margin:4px 0;color:#333;line-height:1.6">${inlineFmt(li[1])}</li>`);
      continue;
    }
    closeUl();
    if (line.trim() === '') { out.push('<div style="height:4px"></div>'); continue; }
    out.push(`<p style="margin:6px 0;color:#333;line-height:1.65;font-size:14px">${inlineFmt(line)}</p>`);
  }
  closeUl();
  return out.join('\n');
}

function wrapHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:32px 16px;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #f0f0f0;border-radius:20px;padding:32px 28px;box-shadow:0 2px 14px rgba(0,0,0,0.03)">
    <div style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#888;font-weight:600;margin-bottom:18px">Arcus · meeting prep</div>
    ${body}
    <div style="border-top:1px solid #f0f0f0;margin-top:32px;padding-top:18px;font-size:11px;color:#999;line-height:1.5">
      Quiet notice from Arcus. Reply to silence prep emails or change the lead time in <a href="https://mailient.xyz/dashboard" style="color:#666;text-decoration:underline">settings</a>.
    </div>
  </div>
</body>
</html>`;
}
