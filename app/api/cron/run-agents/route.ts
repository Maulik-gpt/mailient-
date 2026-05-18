/**
 * Arcus Background Agent Runner — Vercel Cron
 * GET /api/cron/run-agents
 *
 * Runs every 15 minutes (configure in vercel.json).
 * Schedule pattern: every 15 minutes.
 *
 * For each active agent whose next run time has passed:
 * 1. Runs the agent task using the Arcus agentic loop
 * 2. Sends the report to Gmail and/or Slack per agent settings
 * 3. Updates lastRunAt and lastReportSummary
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase.js';
import { runAgentLoop } from '../../../../lib/arcus/loop';
import { buildSystemPrompt, getConnectedIntegrations } from '../../../../lib/arcus/system-prompt';
import { searchMemories } from '../../../../lib/arcus/memory';
import { getSupabaseAdmin as getAdmin } from '../../../../lib/supabase.js';

const CRON_SECRET = process.env.CRON_SECRET || 'arcus-cron-secret';

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized runs
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    // Also allow Vercel's internal cron which sets x-vercel-cron: true
    const vercelCron = request.headers.get('x-vercel-cron');
    if (vercelCron !== '1') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = getAdmin();

  // Fetch all active agents
  const { data: agents, error } = await supabase
    .from('arcus_agents')
    .select('*')
    .eq('status', 'active');

  if (error?.code === '42P01') {
    return NextResponse.json({ message: 'arcus_agents table not found — skipping.' });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!agents?.length) return NextResponse.json({ message: 'No active agents.', ran: 0 });

  const now = new Date();
  const results: string[] = [];
  let ran = 0;

  for (const agent of agents) {
    try {
      // Check if agent should run now based on its cron schedule
      const shouldRun = shouldAgentRunNow(agent.cron_schedule, agent.last_run_at);
      if (!shouldRun) continue;

      ran++;
      results.push(`Running: ${agent.name} (${agent.user_id})`);

      // Mark as running
      await supabase
        .from('arcus_agents')
        .update({ status: 'running' })
        .eq('id', agent.id);

      const report = await runAgent(agent);

      // Send report
      if (agent.output_channel === 'gmail' || agent.output_channel === 'both') {
        await sendGmailReport(agent.user_id, agent.name, report);
      }
      if ((agent.output_channel === 'slack' || agent.output_channel === 'both') && agent.slack_channel) {
        await sendSlackReport(agent.user_id, agent.slack_channel, agent.name, report);
      }

      // Update agent
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
        .update({ status: 'active', last_report_summary: `Error: ${err.message}` })
        .eq('id', agent.id);
    }
  }

  return NextResponse.json({ message: `Ran ${ran} agents.`, results });
}

/**
 * Determine if an agent should run now based on its cron schedule.
 * Matches the current UTC hour/minute against the cron expression.
 * Runs if: the cron matches this hour AND the agent hasn't already run in this window.
 */
function shouldAgentRunNow(cronSchedule: string, lastRunAt: string | null): boolean {
  const now = new Date();
  const parts = cronSchedule.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [minPart, hourPart, , , dowPart] = parts;

  const nowMin = now.getUTCMinutes();
  const nowHour = now.getUTCHours();
  const nowDow = now.getUTCDay(); // 0=Sun

  // Check hour
  if (!matchCronField(hourPart, nowHour, 0, 23)) return false;

  // Check minute — cron runs in a 60-min window per hour, so match loosely:
  // if the minute field is a specific value, we're within ±30 min of target
  if (minPart !== '*' && !minPart.startsWith('*/')) {
    const targetMin = parseInt(minPart);
    if (!isNaN(targetMin)) {
      const targetMs = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), nowHour, targetMin),
      ).getTime();
      if (Math.abs(now.getTime() - targetMs) > 35 * 60 * 1000) return false;
    }
  }

  // Check day of week
  if (!matchCronField(dowPart, nowDow, 0, 6)) return false;

  // Prevent double-firing: if already ran in the last 55 minutes, skip
  if (lastRunAt) {
    const last = new Date(lastRunAt);
    const diffMin = (now.getTime() - last.getTime()) / 60000;
    if (diffMin < 55) return false;
  }

  return true;
}

function matchCronField(field: string, value: number, min: number, max: number): boolean {
  if (field === '*') return true;

  // Step: */N
  if (field.startsWith('*/')) {
    const step = parseInt(field.slice(2));
    return !isNaN(step) && value % step === 0;
  }

  // Range: N-M
  if (field.includes('-') && !field.includes(',')) {
    const [start, end] = field.split('-').map(Number);
    return value >= start && value <= end;
  }

  // List: N,M,K
  if (field.includes(',')) {
    return field.split(',').map(Number).includes(value);
  }

  // Exact
  return parseInt(field) === value;
}

/**
 * Run an agent's task using the agentic loop. Returns the final report text.
 */
async function runAgent(agent: any): Promise<string> {
  const userId = agent.user_id;
  const taskDescription = agent.task_description;

  const [connectedIntegrations, memories] = await Promise.all([
    getConnectedIntegrations(userId),
    searchMemories(userId, taskDescription, 3),
  ]);

  const systemPrompt = buildSystemPrompt({
    userName: 'User',
    userId,
    connectedIntegrations,
    memories,
    isBackgroundAgent: true,
    agentTaskDescription: taskDescription,
  });

  // Collect the full output from the stream
  const stream = runAgentLoop({
    userId,
    systemPrompt,
    history: [],
    userMessage: taskDescription,
    connectedIntegrations,
  });

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalText = '';
  let currentEventType = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('event: ')) { currentEventType = line.slice(7).trim(); continue; }
      if (line.startsWith('data: ') && currentEventType === 'message') {
        try {
          const data = JSON.parse(line.slice(6).trim());
          if (data.content) finalText = data.content;
        } catch { /* ok */ }
        currentEventType = '';
      }
    }
  }

  return finalText || 'Agent completed but produced no report.';
}

/**
 * Send an HTML report email to the user's own Gmail address.
 */
async function sendGmailReport(userId: string, agentName: string, report: string): Promise<void> {
  try {
    const { getSupabaseAdmin } = await import('../../../../lib/supabase.js');
    const { decrypt } = await import('../../../../lib/crypto.js');

    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('arcus_integrations')
      .select('access_token')
      .eq('user_id', userId)
      .eq('provider', 'gmail')
      .maybeSingle();

    if (!data?.access_token) return;
    const token = decrypt(data.access_token);

    const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const htmlBody = buildReportHtml(agentName, date, report);

    const emailLines = [
      `To: ${userId}`,
      `Subject: Arcus Report: ${agentName} — ${date}`,
      'Content-Type: text/html; charset=UTF-8',
      'MIME-Version: 1.0',
      '',
      htmlBody,
    ];
    const raw = Buffer.from(emailLines.join('\r\n')).toString('base64url');

    await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    // Silent
  }
}

function buildReportHtml(agentName: string, date: string, report: string): string {
  const html = report.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  return `<!DOCTYPE html><html><head><style>
    body { font-family: -apple-system, sans-serif; max-width: 640px; margin: 40px auto; color: #111; }
    h1 { font-size: 22px; font-weight: 700; }
    .meta { color: #666; font-size: 14px; margin-bottom: 24px; }
    .body { font-size: 15px; line-height: 1.7; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; color: #999; font-size: 12px; }
  </style></head><body>
    <h1>Arcus Agent Report</h1>
    <div class="meta"><strong>${agentName}</strong> — ${date}</div>
    <div class="body">${html}</div>
    <div class="footer">Sent by Arcus AI · Mailient</div>
  </body></html>`;
}

/**
 * Send a Slack notification with the report.
 */
async function sendSlackReport(userId: string, channel: string, agentName: string, report: string): Promise<void> {
  try {
    const { getSupabaseAdmin } = await import('../../../../lib/supabase.js');
    const { decrypt } = await import('../../../../lib/crypto.js');

    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('arcus_integrations')
      .select('access_token')
      .eq('user_id', userId)
      .eq('provider', 'slack')
      .maybeSingle();

    if (!data?.access_token) return;
    const token = decrypt(data.access_token);

    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel,
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: `Arcus: ${agentName}` } },
          { type: 'section', text: { type: 'mrkdwn', text: report.slice(0, 3000) } },
        ],
        text: `Arcus Report: ${agentName}`,
      }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    // Silent
  }
}
