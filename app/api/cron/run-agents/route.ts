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
import { hasPendingActions } from '../../../../lib/arcus/agent-approvals';

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

  // ── Pre-flight pass ──────────────────────────────────────────────────────
  // Walk every active agent ONCE and classify it:
  //   - expired → pause and skip
  //   - stuck-locked → either recover or skip
  //   - not due this tick → skip silently
  //   - due → add to the parallel run batch
  // No cron-time math inside the parallel batch — the schedule decision
  // happens once, here.
  const readyToRun: any[] = [];
  for (const agent of agents) {
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

    if (agent.status === 'running') {
      const startedMinAgo = agent.last_run_at
        ? (now.getTime() - new Date(agent.last_run_at).getTime()) / 60000
        : Infinity;
      if (startedMinAgo < STALE_LOCK_MIN) continue;
      results.push(`Recovering stuck agent: ${agent.name}`);
    }

    const userTz = tzMap[agent.user_id] || 'UTC';
    if (!shouldAgentRunNow(agent.cron_schedule, agent.last_run_at, userTz)) continue;
    readyToRun.push(agent);
  }

  if (readyToRun.length === 0) {
    return NextResponse.json({ message: 'No agents due this tick.', ran: 0, results });
  }

  // ── Parallel run ─────────────────────────────────────────────────────────
  // All due agents run concurrently within the same wall-clock budget. Each
  // gets the SAME deadlineMs (function ends at the same time for everyone)
  // and an equal share of the tool-call ceiling so one greedy agent can't
  // starve another in the same tick.
  const sharedBudget = timeLeftMs() - DELIVERY_RESERVE_MS;
  if (sharedBudget < 12_000) {
    results.push(`Skipped ${readyToRun.length} agent(s) — insufficient budget this tick.`);
    return NextResponse.json({ message: 'Insufficient budget.', ran: 0, results });
  }

  // Per-agent tool-call ceiling: derived from per-agent share of remaining
  // wall-clock time. Two agents running in parallel each get ~half the calls
  // a single agent would get, because they're competing for the same LLM
  // throughput. Floor at 20, cap at 80.
  const perAgentSlice = sharedBudget / readyToRun.length;
  const perAgentToolCalls = Math.min(80, Math.max(20, Math.floor(perAgentSlice / 2500)));

  // F3.1 — Mark 'running' AND set last_run_at = now in ONE write up front.
  //
  // Previously only status was updated here; last_run_at was written after
  // the run completed. If Vercel's 60s timeout killed the function before
  // that post-run write, the row was left as {status:'running', last_run_at:
  // <stale>}. The stale-lock check on the next tick (60-min threshold)
  // would see the stale last_run_at, treat the agent as crash-recovered,
  // and re-run it. Long-running agents could loop indefinitely.
  //
  // By stamping last_run_at at START, even a timeout leaves a fresh
  // timestamp — the stale-lock recovery only fires after a real 60-min
  // hang, never on a normal long-but-completed run.
  const nowIso = now.toISOString();
  await Promise.all(
    readyToRun.map(a =>
      supabase.from('arcus_agents')
        .update({ status: 'running', last_run_at: nowIso })
        .eq('id', a.id),
    ),
  );

  const runResults = await Promise.allSettled(
    readyToRun.map(async (agent) => {
      results.push(`Running: ${agent.name} (${agent.user_id})`);
      // FX.2 — Insert a run record so we have history beyond just the
      // most-recent on arcus_agents. Updated in-flight as the run progresses.
      const runStartedAt = new Date();
      let runRecordId: string | null = null;
      try {
        const { data: runRecord } = await supabase
          .from('arcus_agent_runs')
          .insert({
            agent_id: agent.id,
            user_id: agent.user_id,
            started_at: runStartedAt.toISOString(),
            status: 'running',
          })
          .select('id')
          .single();
        runRecordId = runRecord?.id || null;
      } catch (e: any) {
        // Table may not be migrated yet — non-fatal, run still proceeds.
        console.warn(`[Cron:Runs] Could not insert run record: ${e.message}`);
      }

      try {
        const report = await runAgentTask(agent, {
          maxToolCalls: perAgentToolCalls,
          deadlineMs: sharedBudget,
        });

        const runHasPending = await hasPendingActions(agent.id);

        // Delivery (email + Slack) in parallel per agent — capture per-channel
        // results so we can record which worked.
        const [emailResult, slackResult] = await Promise.allSettled([
          sendEmailReport(agent.user_id, agent.name, report, runHasPending),
          sendSlackReport(agent.user_id, agent.slack_channel || null, agent.name, report, runHasPending),
        ]);

        const completedAt = new Date();
        await supabase
          .from('arcus_agents')
          .update({
            status: 'active',
            last_run_at: now.toISOString(),
            last_report_summary: report.slice(0, 500),
          })
          .eq('id', agent.id);

        // FX.2 — Update the run record with final status + delivery.
        if (runRecordId) {
          try {
            await supabase
              .from('arcus_agent_runs')
              .update({
                completed_at: completedAt.toISOString(),
                duration_ms: completedAt.getTime() - runStartedAt.getTime(),
                status: 'success',
                report_summary: report.slice(0, 500),
                email_delivery: emailResult.status === 'fulfilled' ? 'sent' : 'failed',
                slack_delivery: slackResult.status === 'fulfilled' ? 'sent' : 'failed',
              })
              .eq('id', runRecordId);
          } catch { /* non-fatal */ }
        }

        return agent.name;
      } catch (err: any) {
        console.error(`[Cron] Agent ${agent.name} failed:`, err.message);

        // F3.3 — Transient-failure retry. If the error is something like
        // "models busy" / "timeout" / "5xx", shift last_run_at backward by
        // ~30 minutes so the next cron tick re-runs the agent ~30 min from
        // now, instead of waiting the full schedule (~24 h for a daily
        // agent). Hard failures (validation errors, auth) keep last_run_at
        // = now so they don't loop on a permanent error.
        const errStr = String(err.message || '').toLowerCase();
        const isTransient =
          errStr.includes('models are currently busy') ||
          errStr.includes('rate limit') ||
          errStr.includes('429') ||
          errStr.includes('timeout') ||
          errStr.includes('timed out') ||
          errStr.includes('etimedout') ||
          errStr.includes('econnreset') ||
          /\b5\d\d\b/.test(errStr) ||
          errStr.includes('service unavailable');

        // The 30-min retry window: schedule a re-run by pretending last_run_at
        // was 30 min before the agent's normal interval would have fired.
        // Stamp last_run_at = (now - cron_interval + 30 min). Since we don't
        // parse cron deltas here, approximate: subtract 23.5 h from now —
        // for a daily agent the next "due" check (which requires diffMin > 55
        // from current last_run_at) clears in ~30 min. For sub-daily agents
        // this is more aggressive, which is fine for transient errors.
        const RETRY_DELAY_MIN = 30;
        const APPROX_INTERVAL_MS = 24 * 60 * 60 * 1000; // assume daily
        const retryStamp = isTransient
          ? new Date(now.getTime() - APPROX_INTERVAL_MS + RETRY_DELAY_MIN * 60_000).toISOString()
          : now.toISOString();
        const summary = isTransient
          ? `Transient error (retrying in ~${RETRY_DELAY_MIN}m): ${err.message}`
          : `Error: ${err.message}`;

        await supabase
          .from('arcus_agents')
          .update({ status: 'active', last_run_at: retryStamp, last_report_summary: summary })
          .eq('id', agent.id);

        // FX.2 — Update the run record with failure status.
        if (runRecordId) {
          try {
            await supabase
              .from('arcus_agent_runs')
              .update({
                completed_at: new Date().toISOString(),
                duration_ms: Date.now() - runStartedAt.getTime(),
                status: isTransient ? 'transient_error' : 'error',
                error_message: String(err.message || 'unknown error').slice(0, 1000),
              })
              .eq('id', runRecordId);
          } catch { /* non-fatal */ }
        }

        // Only notify the user on hard failures — transient ones will
        // self-recover on the retry.
        if (!isTransient) {
          try { await sendErrorNotification(agent, err.message); } catch { /* non-critical */ }
        }
        throw err;
      }
    }),
  );

  ran = runResults.filter(r => r.status === 'fulfilled').length;

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

async function sendEmailReport(toEmail: string, agentName: string, report: string, hasPending: boolean = false): Promise<void> {
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
    const subject = `${agentName} — Your Arcus Report for ${date}`;
    const html = buildReportHtml(agentName, date, report, hasPending);

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
    .replace(/`([^`]+)`/g, '<code style="background:#f0f0f0;padding:2px 5px;border-radius:4px;font-family:monospace;font-size:0.9em;color:#e83e8c">$1</code>')
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#0066cc;text-decoration:underline">$1</a>');
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
        1: 'font-size:26px;font-weight:800;color:#111;margin:32px 0 12px;padding-bottom:8px;border-bottom:2px solid #eee;letter-spacing:-0.5px',
        2: 'font-size:20px;font-weight:700;color:#222;margin:28px 0 10px',
        3: 'font-size:17px;font-weight:700;color:#333;margin:20px 0 8px',
        4: 'font-size:15px;font-weight:600;color:#444;margin:16px 0 6px',
        5: 'font-size:13px;font-weight:600;color:#666;margin:12px 0 4px;text-transform:uppercase;letter-spacing:0.5px',
        6: 'font-size:12px;font-weight:600;color:#888;margin:8px 0 4px;text-transform:uppercase;letter-spacing:1px',
      };
      out.push(`<h${n} style="${headingStyles[n]}">${inlineFormat(hm[2])}</h${n}>`);
      continue;
    }

    // ── Horizontal rule ───────────────────────────────────────────────────────
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      closeList(); closeTable();
      out.push('<hr style="border:none;border-top:1px solid #eee;margin:20px 0">');
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
          out.push(`<th style="background:#fcfcfc;border:1px solid #eee;padding:10px 14px;text-align:left;font-weight:700;color:#333">${inlineFormat(c.trim())}</th>`);
        });
        out.push('</tr></thead><tbody>');
        tableHeader = false;
      } else {
        // Zebra stripe
        const rowIdx = out.filter(l => l.startsWith('<tr') && !l.includes('</tr')).length;
        const bg = rowIdx % 2 === 0 ? '#ffffff' : '#fafafa';
        out.push(`<tr style="background:${bg}">`);
        cells.forEach(c => {
          out.push(`<td style="border:1px solid #eee;padding:9px 14px;color:#444">${inlineFormat(c.trim())}</td>`);
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
      out.push(`<li style="margin:5px 0;color:#444;line-height:1.6">${inlineFormat(ulm[2])}</li>`);
      continue;
    }

    // ── Ordered list ──────────────────────────────────────────────────────────
    const olm = line.match(/^\d+\.\s+(.+)/);
    if (olm) {
      closeTable();
      if (!inOl) { out.push('<ol style="margin:8px 0 8px 0;padding-left:24px">'); inOl = true; }
      out.push(`<li style="margin:5px 0;color:#444;line-height:1.6">${inlineFormat(olm[1])}</li>`);
      continue;
    }

    // ── Blockquote ────────────────────────────────────────────────────────────
    const bqm = line.match(/^>\s*(.+)/);
    if (bqm) {
      closeList(); closeTable();
      out.push(`<blockquote style="border-left:4px solid #ccc;background:#f9f9f9;margin:12px 0;padding:10px 16px;border-radius:0 8px 8px 0;color:#555;font-style:italic">${inlineFormat(bqm[1])}</blockquote>`);
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
    out.push(`<p style="margin:6px 0;color:#444;line-height:1.7;font-size:15px">${inlineFormat(line)}</p>`);
  }

  closeList();
  closeTable();
  return out.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Beautiful HTML email template (light theme)
// ─────────────────────────────────────────────────────────────────────────────

function buildReportHtml(agentName: string, date: string, report: string, hasPending: boolean = false): string {
  const body = markdownToHtml(report);
  const trackingId = Math.random().toString(36).substring(7).toUpperCase();

  const ctaButton = hasPending
    ? `<div style="text-align: center; margin-top: 35px;">
          <a href="https://mailient.xyz/dashboard?tab=agents&approve=pending" 
             style="background: #f59e0b; color: #000; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 800; font-size: 14px; display: inline-block; letter-spacing: -0.01em;">
              ⚡ Approve Queued Actions
          </a>
          <div style="margin-top: 10px;">
            <a href="https://mailient.xyz/dashboard" 
               style="color: #888; text-decoration: underline; font-size: 12px;">
                or view dashboard
            </a>
          </div>
      </div>`
    : `<div style="text-align: center; margin-top: 35px;">
          <a href="https://mailient.xyz/dashboard" 
             style="background: #000; color: #fff; text-decoration: none; padding: 12px 25px; border-radius: 12px; font-weight: 700; font-size: 13px; display: inline-block;">
              View Dashboard
          </a>
      </div>`;

  const pendingBanner = hasPending
    ? `<div style="background: #fffbeb; border: 1px solid #f59e0b; border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; font-size: 13px; color: #92400e;">
          ⏳ <strong>Actions awaiting your approval</strong> — This agent queued write actions (emails, meetings, etc.) that need your review before they execute.
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${agentName} — Arcus Report</title>
</head>
<body style="margin:0;padding:40px 16px;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,sans-serif">
  <div style="font-family: 'Satoshi', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #111; background: #fff; border-radius: 24px; border: 1px solid #f0f0f0; box-shadow: 0 4px 24px rgba(0,0,0,0.02);">
      <div style="text-align: center; margin-bottom: 30px;">
          <img src="https://mailient.xyz/mailient-logo-premium.png" alt="Mailient Logo" style="width: 48px; height: 48px; border-radius: 12px; border: 1px solid #f0f0f0;" />
      </div>
      
      <h2 style="font-size: 22px; font-weight: 800; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 30px; letter-spacing: -0.03em; text-align: center; color: #000;">
          Arcus AI Report
      </h2>
      
      ${pendingBanner}

      <div style="margin-bottom: 25px; background: #fcfcfc; padding: 20px; border-radius: 16px; border: 1px solid #f5f5f5;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                  <td style="padding: 6px 0; color: #666; font-weight: 500; width: 120px;">Agent:</td>
                  <td style="padding: 6px 0; color: #000; font-weight: 700; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;">
                      ${agentName}
                  </td>
              </tr>
              <tr>
                  <td style="padding: 6px 0; color: #666; font-weight: 500;">Date:</td>
                  <td style="padding: 6px 0; color: #000; font-weight: 700;">
                      ${date}
                  </td>
              </tr>
          </table>
      </div>

      <div style="margin-bottom: 25px; font-size: 14px; line-height: 1.6; color: #333;">
          ${body}
      </div>

      ${ctaButton}

      <div style="border-top: 1px solid #eee; padding-top: 25px; margin-top: 40px; font-size: 10px; color: #aaa; text-align: center; font-family: monospace; letter-spacing: 0.05em;">
          ARCUS AUTONOMOUS REPORT // AGENT: ${agentName.toUpperCase()} // ID: ${trackingId} // SECURE
      </div>
  </div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Slack — rich Block Kit report
// ─────────────────────────────────────────────────────────────────────────────

async function sendSlackReport(userId: string, channel: string | null, agentName: string, report: string, hasPending: boolean = false): Promise<void> {
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

    const blocks = buildSlackBlocks(agentName, date, report, hasPending);

    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: targetChannel,
        blocks,
        text: `${agentName} — Arcus Report for ${date}`,
      }),
      signal: AbortSignal.timeout(10000),
    });

    const json = await res.json() as any;
    if (!json.ok) console.error('[Cron] Slack send error:', json.error);
  } catch (e: any) {
    console.error('[Cron] sendSlackReport failed:', e.message);
  }
}

function buildSlackBlocks(agentName: string, date: string, report: string, hasPending: boolean = false): any[] {
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

  const pendingBlock = hasPending ? [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: ':hourglass_flowing_sand: *Actions awaiting your approval* — This agent queued write actions that need your review.' },
      accessory: {
        type: 'button',
        text: { type: 'plain_text', text: '⚡ Approve Actions', emoji: true },
        url: 'https://mailient.xyz/dashboard?tab=agents&approve=pending',
        style: 'primary',
      },
    },
  ] : [];

  const blocks: any[] = [
    // Header
    {
      type: 'header',
      text: { type: 'plain_text', text: `${agentName}`, emoji: false },
    },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `🤖 *Arcus AI Report* · 📅 ${date}` }],
    },
    { type: 'divider' },
    ...pendingBlock,
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
