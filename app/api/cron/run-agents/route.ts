/**
 * Arcus Background Agent Runner — Vercel Cron
 * GET /api/cron/run-agents
 *
 * Runs every 15 minutes (configure in vercel.json).
 *
 * For each active agent whose next run time has passed:
 * 1. Runs the agent task via the Arcus agentic loop
 * 2. Delivers the report via Resend (email) and/or Slack
 * 3. Updates lastRunAt and lastReportSummary
 *
 * Required env vars:
 *   RESEND_API_KEY          — Resend API key (send email reports)
 *   RESEND_FROM_EMAIL       — Verified Resend sender, e.g. "Arcus <arcus@mailient.xyz>"
 *                             Defaults to "Arcus AI <arcus@mailient.xyz>"
 *
 * Optional env vars:
 *   ARCUS_SLACK_BOT_TOKEN   — Slack bot token for the Mailient workspace.
 *                             If set, used for all Slack delivery instead of
 *                             the user's personal Slack OAuth token.
 *   CRON_SECRET             — Bearer secret for non-Vercel invocations (default: arcus-cron-secret)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase.js';
import { runAgentTask } from '../../../../lib/arcus/run-agent';

const CRON_SECRET = process.env.CRON_SECRET || 'arcus-cron-secret';
const RESEND_FROM = process.env.RESEND_FROM_EMAIL || 'Arcus AI <arcus@mailient.xyz>';

// A 'running' row older than this is treated as a crashed/timed-out run
// (stuck lock) and is allowed to run again, instead of being excluded forever.
// Must exceed the 55-min anti-double-run guard in shouldAgentRunNow so a
// recovered agent isn't immediately re-blocked by its own stale last_run_at.
const STALE_LOCK_MIN = 60;

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel Hobby caps functions at 60s; runs that exceed it are retried via stale-lock recovery

// ─────────────────────────────────────────────────────────────────────────────
// Cron entry
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    const vercelCron = request.headers.get('x-vercel-cron');
    if (vercelCron !== '1') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = getSupabaseAdmin();

  const { data: agents, error } = await supabase
    .from('arcus_agents')
    .select('*')
    .in('status', ['active', 'running']);

  if (error?.code === '42P01') {
    return NextResponse.json({ message: 'arcus_agents table not found — skipping.' });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!agents?.length) return NextResponse.json({ message: 'No active agents.', ran: 0 });

  const now = new Date();
  const results: string[] = [];
  let ran = 0;

  // Vercel kills this function at maxDuration (60s). Reserve a safety margin
  // for report delivery (Gmail/Slack) and DB writes, then split the rest
  // across the agents that actually need to run this tick so none gets
  // killed mid-loop and silently produces nothing.
  const FUNCTION_BUDGET_MS = 58_000;
  const DELIVERY_RESERVE_MS = 9_000;
  const cronStartedAt = Date.now();
  const timeLeftMs = () => FUNCTION_BUDGET_MS - (Date.now() - cronStartedAt);

  // Batch-fetch timezones
  const uniqueUsers = Array.from(new Set(agents.map((a: any) => a.user_id as string)));
  const tzMap: Record<string, string> = {};
  await Promise.all(
    uniqueUsers.map(async (uid: string) => {
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('preferences')
          .ilike('user_id', uid)
          .maybeSingle();
        const prefs = (profile?.preferences as Record<string, unknown>) || {};
        tzMap[uid] = (prefs.timezone as string) || 'UTC';
      } catch {
        tzMap[uid] = 'UTC';
      }
    }),
  );

  for (const agent of agents) {
    try {
      // Expiry: stop (and deactivate) agents past their expiry date.
      if (agent.expires_at) {
        const expiryEnd = new Date(`${agent.expires_at}T23:59:59Z`).getTime();
        if (now.getTime() > expiryEnd) {
          if (agent.status !== 'paused') {
            await supabase.from('arcus_agents').update({ status: 'paused' }).eq('id', agent.id);
            results.push(`Expired (paused): ${agent.name}`);
          }
          continue;
        }
      }

      // Stuck-lock recovery: a 'running' row is either a genuinely in-flight
      // run (skip it) or a crashed/timed-out run that never reset its status
      // (older than STALE_LOCK_MIN — let it run again so it isn't lost forever).
      if (agent.status === 'running') {
        const startedMinAgo = agent.last_run_at
          ? (now.getTime() - new Date(agent.last_run_at).getTime()) / 60000
          : Infinity;
        if (startedMinAgo < STALE_LOCK_MIN) continue;
        results.push(`Recovering stuck agent: ${agent.name}`);
      }

      const userTz = tzMap[agent.user_id] || 'UTC';
      if (!shouldAgentRunNow(agent.cron_schedule, agent.last_run_at, userTz)) continue;

      // Stop launching new agents once there isn't enough time left to run
      // one and still deliver its report within this function invocation.
      const remaining = timeLeftMs() - DELIVERY_RESERVE_MS;
      if (remaining < 12_000) {
        results.push(`Deferred (out of time this tick): ${agent.name}`);
        continue;
      }

      ran++;
      results.push(`Running: ${agent.name} (${agent.user_id})`);

      await supabase.from('arcus_agents').update({ status: 'running' }).eq('id', agent.id);

      const report = await runAgentTask(agent, {
        maxToolCalls: 10,
        deadlineMs: remaining,
      });

      // Always deliver email via Resend — regardless of output_channel setting.
      // Resend is cheap (3k/month free) and email is the universal fallback.
      await sendEmailReport(agent.user_id, agent.name, report);

      // Always attempt Slack if the user has Slack connected or a bot token exists.
      // Use the configured slack_channel if set; otherwise DM the user directly.
      await sendSlackReport(agent.user_id, agent.slack_channel || null, agent.name, report);

      await supabase
        .from('arcus_agents')
        .update({
          status: 'active',
          last_run_at: now.toISOString(),
          last_report_summary: report.slice(0, 500),
        })
        .eq('id', agent.id);

    } catch (err: any) {
      console.error(`[Cron] Agent ${agent.name} failed:`, err.message);
      await supabase
        .from('arcus_agents')
        .update({ status: 'active', last_run_at: now.toISOString(), last_report_summary: `Error: ${err.message}` })
        .eq('id', agent.id);
      try { await sendErrorNotification(agent, err.message); } catch { /* non-critical */ }
    }
  }

  return NextResponse.json({ message: `Ran ${ran} agents.`, results });
}

// ─────────────────────────────────────────────────────────────────────────────
// Cron scheduling logic
// ─────────────────────────────────────────────────────────────────────────────

function shouldAgentRunNow(cronSchedule: string, lastRunAt: string | null, timezone: string): boolean {
  const now = new Date();
  let localHour = now.getUTCHours();
  let localMin = now.getUTCMinutes();
  let localDow = now.getUTCDay();

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'short',
      hour12: false,
    }).formatToParts(now);

    for (const part of parts) {
      if (part.type === 'hour') localHour = parseInt(part.value) % 24;
      if (part.type === 'minute') localMin = parseInt(part.value);
      if (part.type === 'weekday') {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const idx = days.indexOf(part.value);
        if (idx !== -1) localDow = idx;
      }
    }
  } catch { /* use UTC fallbacks */ }

  const cronParts = cronSchedule.trim().split(/\s+/);
  if (cronParts.length !== 5) return false;
  const [minPart, hourPart, , , dowPart] = cronParts;

  if (!matchCronField(hourPart, localHour, 0, 23)) return false;
  if (!matchCronField(dowPart, localDow, 0, 6)) return false;

  if (minPart !== '*' && !minPart.startsWith('*/')) {
    const targetMin = parseInt(minPart);
    if (!isNaN(targetMin) && Math.abs(localMin - targetMin) > 35) return false;
  }

  if (lastRunAt) {
    const diffMin = (now.getTime() - new Date(lastRunAt).getTime()) / 60000;
    if (diffMin < 55) return false;
  }

  return true;
}

function matchCronField(field: string, value: number, _min: number, _max: number): boolean {
  if (field === '*') return true;
  if (field.startsWith('*/')) { const s = parseInt(field.slice(2)); return !isNaN(s) && value % s === 0; }
  if (field.includes('-') && !field.includes(',')) { const [a, b] = field.split('-').map(Number); return value >= a && value <= b; }
  if (field.includes(',')) return field.split(',').map(Number).includes(value);
  return parseInt(field) === value;
}

// ─────────────────────────────────────────────────────────────────────────────
// Email — Resend API
// ─────────────────────────────────────────────────────────────────────────────

async function sendEmailReport(toEmail: string, agentName: string, report: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[Cron] RESEND_API_KEY not set — skipping email delivery.');
    return;
  }

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);

    const date = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const subject = `✨ ${agentName} — Your Arcus Report for ${date}`;
    const html = buildReportHtml(agentName, date, report);

    const { error } = await resend.emails.send({
      from: RESEND_FROM,
      to: toEmail,
      subject,
      html,
    });

    if (error) {
      console.error('[Cron] Resend error:', error);
    }
  } catch (e: any) {
    console.error('[Cron] sendEmailReport failed:', e.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Markdown → HTML conversion
// ─────────────────────────────────────────────────────────────────────────────

function inlineFormat(text: string): string {
  return text
    // Escape bare < and > that aren't already HTML tags
    .replace(/&/g, '&amp;')
    .replace(/<(?![a-zA-Z/])/g, '&lt;')
    // Inline code
    .replace(/`([^`]+)`/g, '<code style="background:#f3f4f6;padding:2px 5px;border-radius:4px;font-family:monospace;font-size:0.9em;color:#374151">$1</code>')
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#6366f1;text-decoration:underline">$1</a>');
}

function markdownToHtml(markdown: string): string {
  const lines = markdown.split('\n');
  const out: string[] = [];
  let inUl = false;
  let inOl = false;
  let inTable = false;
  let tableHeader = false;

  const closeList = () => {
    if (inUl) { out.push('</ul>'); inUl = false; }
    if (inOl) { out.push('</ol>'); inOl = false; }
  };
  const closeTable = () => {
    if (inTable) { out.push('</tbody></table>'); inTable = false; tableHeader = false; }
  };

  for (const raw of lines) {
    const line = raw;

    // ── Headings ─────────────────────────────────────────────────────────────
    const hm = line.match(/^(#{1,6})\s+(.+)/);
    if (hm) {
      closeList(); closeTable();
      const n = hm[1].length;
      const headingStyles: Record<number, string> = {
        1: 'font-size:26px;font-weight:800;color:#111827;margin:32px 0 12px;padding-bottom:8px;border-bottom:2px solid #e5e7eb;letter-spacing:-0.5px',
        2: 'font-size:20px;font-weight:700;color:#1f2937;margin:28px 0 10px',
        3: 'font-size:17px;font-weight:700;color:#374151;margin:20px 0 8px',
        4: 'font-size:15px;font-weight:600;color:#4b5563;margin:16px 0 6px',
        5: 'font-size:13px;font-weight:600;color:#6b7280;margin:12px 0 4px;text-transform:uppercase;letter-spacing:0.5px',
        6: 'font-size:12px;font-weight:600;color:#9ca3af;margin:8px 0 4px;text-transform:uppercase;letter-spacing:1px',
      };
      out.push(`<h${n} style="${headingStyles[n]}">${inlineFormat(hm[2])}</h${n}>`);
      continue;
    }

    // ── Horizontal rule ───────────────────────────────────────────────────────
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      closeList(); closeTable();
      out.push('<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">');
      continue;
    }

    // ── Tables ────────────────────────────────────────────────────────────────
    if (line.startsWith('|')) {
      closeList();
      const cells = line.split('|').filter((_, i, a) => i > 0 && i < a.length - 1);

      // Separator row (e.g. | --- | --- |)
      if (cells.every(c => /^[-:\s]+$/.test(c))) {
        tableHeader = false; // next rows are body
        continue;
      }

      if (!inTable) {
        out.push(`<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">`);
        out.push('<thead>');
        inTable = true;
        tableHeader = true;
      }

      if (tableHeader) {
        out.push('<tr>');
        cells.forEach(c => {
          out.push(`<th style="background:#f9fafb;border:1px solid #e5e7eb;padding:10px 14px;text-align:left;font-weight:700;color:#374151">${inlineFormat(c.trim())}</th>`);
        });
        out.push('</tr></thead><tbody>');
        tableHeader = false;
      } else {
        // Zebra stripe
        const rowIdx = out.filter(l => l.startsWith('<tr') && !l.includes('</tr')).length;
        const bg = rowIdx % 2 === 0 ? '#ffffff' : '#f9fafb';
        out.push(`<tr style="background:${bg}">`);
        cells.forEach(c => {
          out.push(`<td style="border:1px solid #e5e7eb;padding:9px 14px;color:#374151">${inlineFormat(c.trim())}</td>`);
        });
        out.push('</tr>');
      }
      continue;
    } else if (inTable) {
      closeTable();
    }

    // ── Bullet list ───────────────────────────────────────────────────────────
    const ulm = line.match(/^(\s*)[-*+]\s+(.+)/);
    if (ulm) {
      closeTable();
      if (!inUl) { out.push('<ul style="margin:8px 0 8px 0;padding-left:24px">'); inUl = true; }
      out.push(`<li style="margin:5px 0;color:#374151;line-height:1.6">${inlineFormat(ulm[2])}</li>`);
      continue;
    }

    // ── Ordered list ──────────────────────────────────────────────────────────
    const olm = line.match(/^\d+\.\s+(.+)/);
    if (olm) {
      closeTable();
      if (!inOl) { out.push('<ol style="margin:8px 0 8px 0;padding-left:24px">'); inOl = true; }
      out.push(`<li style="margin:5px 0;color:#374151;line-height:1.6">${inlineFormat(olm[1])}</li>`);
      continue;
    }

    // ── Blockquote ────────────────────────────────────────────────────────────
    const bqm = line.match(/^>\s*(.+)/);
    if (bqm) {
      closeList(); closeTable();
      out.push(`<blockquote style="border-left:4px solid #6366f1;background:#f5f3ff;margin:12px 0;padding:10px 16px;border-radius:0 8px 8px 0;color:#4b5563;font-style:italic">${inlineFormat(bqm[1])}</blockquote>`);
      continue;
    }

    // ── Empty line ────────────────────────────────────────────────────────────
    if (line.trim() === '') {
      closeList(); closeTable();
      out.push('<div style="height:6px"></div>');
      continue;
    }

    // ── Paragraph ─────────────────────────────────────────────────────────────
    closeList(); closeTable();
    out.push(`<p style="margin:6px 0;color:#374151;line-height:1.7;font-size:15px">${inlineFormat(line)}</p>`);
  }

  closeList();
  closeTable();
  return out.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Beautiful HTML email template (light theme)
// ─────────────────────────────────────────────────────────────────────────────

function buildReportHtml(agentName: string, date: string, report: string): string {
  const body = markdownToHtml(report);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${agentName} — Arcus Report</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%">

          <!-- Header bar -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a78bfa 100%);border-radius:20px 20px 0 0;padding:36px 40px 32px">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display:inline-flex;align-items:center;gap:10px">
                      <span style="font-size:28px">🤖</span>
                      <span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px">Arcus AI</span>
                      <span style="background:rgba(255,255,255,0.2);color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px;letter-spacing:1px;text-transform:uppercase;vertical-align:middle">Report</span>
                    </div>
                    <div style="color:rgba(255,255,255,0.75);font-size:13px;margin-top:6px">
                      📅 ${date}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Agent name banner -->
          <tr>
            <td style="background:#fff;padding:20px 40px 4px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb">
              <div style="display:flex;align-items:center;gap:8px;padding:14px 18px;background:#f5f3ff;border:1px solid #e0d7ff;border-radius:12px">
                <span style="font-size:18px">⚡</span>
                <div>
                  <div style="font-size:11px;font-weight:600;color:#7c3aed;text-transform:uppercase;letter-spacing:0.8px">Agent Report</div>
                  <div style="font-size:16px;font-weight:700;color:#1f2937;margin-top:1px">${agentName}</div>
                </div>
              </div>
            </td>
          </tr>

          <!-- Report body -->
          <tr>
            <td style="background:#fff;padding:8px 40px 36px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 20px 20px;padding:20px 40px">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="color:#9ca3af;font-size:12px;line-height:1.6">
                      Sent by <strong style="color:#6366f1">Arcus</strong> for <a href="https://mailient.xyz" style="color:#6366f1;text-decoration:none">Mailient</a> — mailient.xyz
                      <br>Generated ${new Date().toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                    </div>
                  </td>
                  <td align="right">
                    <span style="font-size:22px">✨</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Slack — rich Block Kit report
// ─────────────────────────────────────────────────────────────────────────────

async function sendSlackReport(userId: string, channel: string | null, agentName: string, report: string): Promise<void> {
  try {
    // Platform-level bot token takes priority — no user token needed if configured.
    // Fall back to the user's own Slack OAuth token from arcus_integrations.
    let token: string | null = process.env.ARCUS_SLACK_BOT_TOKEN || null;

    if (!token) {
      const { decrypt } = await import('../../../../lib/crypto.js');
      const supabase = getSupabaseAdmin();
      const { data } = await supabase
        .from('arcus_integrations')
        .select('access_token')
        .eq('user_id', userId)
        .eq('provider', 'slack')
        .maybeSingle();
      if (!data?.access_token) {
        console.warn(`[Cron] No Slack token for user ${userId} and ARCUS_SLACK_BOT_TOKEN not set — skipping Slack delivery.`);
        return;
      }
      token = decrypt(data.access_token);
    }

    // Resolve the target channel: use configured channel, or DM the user directly.
    let targetChannel = channel;
    if (!targetChannel) {
      // Look up the user's Slack member ID by email, then open a DM.
      const lookupRes = await fetch(`https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(userId)}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
      });
      const lookupJson = await lookupRes.json() as any;
      if (!lookupJson.ok || !lookupJson.user?.id) {
        console.warn(`[Cron] Slack users.lookupByEmail failed for ${userId}: ${lookupJson.error ?? 'unknown'} — skipping Slack delivery.`);
        return;
      }
      const slackUserId = lookupJson.user.id;

      // Open (or reuse) the DM channel with this user.
      const dmRes = await fetch('https://slack.com/api/conversations.open', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: slackUserId }),
        signal: AbortSignal.timeout(8000),
      });
      const dmJson = await dmRes.json() as any;
      if (!dmJson.ok || !dmJson.channel?.id) {
        console.warn(`[Cron] Slack conversations.open failed: ${dmJson.error ?? 'unknown'} — skipping Slack delivery.`);
        return;
      }
      targetChannel = dmJson.channel.id;
    }

    const date = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const blocks = buildSlackBlocks(agentName, date, report);

    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: targetChannel,
        blocks,
        text: `✨ ${agentName} — Arcus Report for ${date}`,
      }),
      signal: AbortSignal.timeout(10000),
    });

    const json = await res.json() as any;
    if (!json.ok) console.error('[Cron] Slack send error:', json.error);
  } catch (e: any) {
    console.error('[Cron] sendSlackReport failed:', e.message);
  }
}

function buildSlackBlocks(agentName: string, date: string, report: string): any[] {
  const mrkdwn = markdownToSlackMrkdwn(report);

  // Split into sections of ≤3000 chars (Slack limit per block)
  const chunks: string[] = [];
  let remaining = mrkdwn;
  while (remaining.length > 0) {
    if (remaining.length <= 2900) {
      chunks.push(remaining);
      break;
    }
    // Split on double newline to keep paragraphs intact
    const cutAt = remaining.lastIndexOf('\n\n', 2900);
    const cut = cutAt > 500 ? cutAt : 2900;
    chunks.push(remaining.slice(0, cut).trimEnd());
    remaining = remaining.slice(cut).trimStart();
  }

  const blocks: any[] = [
    // Header
    {
      type: 'header',
      text: { type: 'plain_text', text: `✨ ${agentName}`, emoji: true },
    },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `🤖 *Arcus AI Report* · 📅 ${date}` }],
    },
    { type: 'divider' },
    // Body chunks
    ...chunks.map(chunk => ({
      type: 'section',
      text: { type: 'mrkdwn', text: chunk },
    })),
    { type: 'divider' },
    // Footer
    {
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `⚡ Sent by *Arcus* for <https://mailient.xyz|Mailient> — mailient.xyz · ${new Date().toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}` },
      ],
    },
  ];

  return blocks;
}

// ─────────────────────────────────────────────────────────────────────────────
// Error notification — brief message when an agent run fails
// ─────────────────────────────────────────────────────────────────────────────

async function sendErrorNotification(agent: any, errorMessage: string): Promise<void> {
  const ts = new Date().toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
  const report = `# ⚠️ Agent Run Failed — ${agent.name}\n\nYour agent **${agent.name}** encountered an issue during its scheduled run at ${ts}.\n\n**Error:** ${errorMessage}\n\nThe agent has been kept active and will attempt to run again at its next scheduled time. If this error repeats, check your connected integrations or update the agent's task description.\n\n_If you need help, reply to this message or visit [mailient.xyz](https://mailient.xyz)._`;

  await sendEmailReport(agent.user_id, `⚠️ ${agent.name} — Run Failed`, report);
  await sendSlackReport(agent.user_id, agent.slack_channel || null, `⚠️ ${agent.name} — Run Failed`, report);
}

function markdownToSlackMrkdwn(markdown: string): string {
  return markdown
    // Convert markdown headings to bold + emoji prefix
    .replace(/^#{1}\s+(.+)/gm, '\n*📌 $1*\n')
    .replace(/^#{2}\s+(.+)/gm, '\n*$1*\n')
    .replace(/^#{3}\s+(.+)/gm, '\n_*$1*_\n')
    .replace(/^#{4,6}\s+(.+)/gm, '\n_$1_\n')
    // Bold (already ** in MD — Slack uses *)
    .replace(/\*\*\*(.+?)\*\*\*/g, '*_$1_*')
    .replace(/\*\*(.+?)\*\*/g, '*$1*')
    // Tables → plain text representation
    .replace(/^\|(.+)\|$/gm, (line) => {
      const cells = line.split('|').filter((_, i, a) => i > 0 && i < a.length - 1);
      if (cells.every(c => /^[-:\s]+$/.test(c))) return ''; // separator
      return cells.map(c => c.trim()).join('  |  ');
    })
    // Horizontal rules
    .replace(/^(-{3,}|\*{3,})$/gm, '──────────────────────────────')
    // Trim multiple blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
