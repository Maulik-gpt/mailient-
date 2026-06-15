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
 *   CRON_SECRET             — REQUIRED. cron-job.org sends this as
 *                             `Authorization: Bearer <CRON_SECRET>` on every
 *                             trigger. Set it in cron-job.org → job →
 *                             Headers → "Authorization: Bearer <value>" and
 *                             in Vercel env vars as the same value.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase.js';
// @ts-ignore - JS module
import { subscriptionService } from '../../../../lib/subscription-service.js';
import { runAgentTask, generateRunPlan } from '../../../../lib/arcus/run-agent';
import { hasPendingActions } from '../../../../lib/arcus/agent-approvals';
import { scoreReportSignal, decideDelivery } from '../../../../lib/arcus/signal-density';
import { checkEventAgents, mergeProcessedIds } from '../../../../lib/arcus/triggers/reactive-poll';
import { enqueueChainHandoff, drainChainQueue } from '../../../../lib/arcus/triggers/chain';

const CRON_SECRET = process.env.CRON_SECRET || 'arcus-cron-secret';
const RESEND_FROM = process.env.RESEND_FROM_EMAIL || 'Arcus AI <arcus@mailient.xyz>';

// A 'running' row older than this is treated as a crashed/timed-out run
// (stuck lock) and is allowed to run again, instead of being excluded forever.
// Must exceed the 55-min anti-double-run guard in shouldAgentRunNow so a
// recovered agent isn't immediately re-blocked by its own stale last_run_at.
const STALE_LOCK_MIN = 60;

export const dynamic = 'force-dynamic';
// Vercel HOBBY (free) plan hard-caps at 60s. We CANNOT use 300 here — Vercel
// would kill the function at 60s with the committee mid-run (status='running',
// no report). So we cap at 60 and size the internal budget below it. The
// committee runs leaner (fewer tool calls, shorter deadline) so it self-
// terminates and DELIVERS a report inside 60s rather than crashing.
// (On Vercel Pro, raise this to 300 and FUNCTION_BUDGET_MS to ~285_000.)
// cron-job.org's own request timeout should be ≥60s so it captures the response.
export const maxDuration = 60;

// ─────────────────────────────────────────────────────────────────────────────
// Cron entry
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const isCronJobOrg =
    authHeader === `Bearer ${CRON_SECRET}` ||
    request.headers.get('x-arcus-cron-secret') === CRON_SECRET;
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  if (!isCronJobOrg && !isVercelCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Phase 2 — fast reactive lane. Point a frequent cron-job (~every 2 min) at
  // /api/cron/run-agents?only=events: it processes ONLY event/condition agents
  // and chain hand-offs (schedule agents are skipped), cutting reactive latency
  // from ~15 min to ~2 min while reusing this whole runner (budget, delivery,
  // F3.1, run records). The classic 15-min job runs the full set as before.
  const onlyEvents = new URL(request.url).searchParams.get('only') === 'events';

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

  // Vercel kills this function at maxDuration (300s). Reserve a generous
  // margin for report delivery (Gmail/Slack) + DB writes, then split the
  // remaining wall-clock across the agents due this tick so the committee
  // self-terminates and writes its report BEFORE Vercel pulls the plug.
  // Sized for the Vercel Hobby 60s cap: 52s working budget leaves 8s headroom,
  // with 12s reserved for report delivery (Gmail/Slack) + DB writes. The
  // committee self-terminates and ships a report inside 60s. (On Pro: 285_000 /
  // 20_000.)
  const FUNCTION_BUDGET_MS = 52_000;
  const DELIVERY_RESERVE_MS = 12_000;
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

  // Plan gate: only DEPLOY agents for users on a paid plan (pro / annual /
  // lifetime, including active free-Pro referral grants and owner emails).
  // A free/expired user's agents stay 'active' but dormant — so the moment they
  // subscribe, their agents start running on the very next tick. This is what
  // makes "after you pay, your agents deploy automatically" actually true.
  const paidMap: Record<string, boolean> = {};
  await Promise.all(
    uniqueUsers.map(async (uid: string) => {
      try {
        const plan = await subscriptionService.getUserPlanType(uid);
        paidMap[uid] = !!plan && plan !== 'free' && plan !== 'none';
      } catch {
        paidMap[uid] = false;
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
  const polledNotFired: any[] = []; // event agents polled this tick with no match
  for (const agent of agents) {
    // Dormant until the owner is on a paid plan.
    if (!paidMap[agent.user_id]) continue;

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
    const triggerType = agent.trigger_type || 'schedule';

    // 'chained' agents never fire on the clock — only the chain drainer below.
    if (triggerType === 'chained') continue;

    // Event / condition agents: reactive poll. Gated by last_polled_at (NOT
    // last_run_at) so an idle agent that never fires still won't re-read Gmail
    // more than once per debounce window — critical now that the fast lane can
    // hit this route every ~2 min. We stamp last_polled_at whether or not it
    // fires (fired → in the post-run state update; not-fired → batched below).
    if (triggerType === 'event' || triggerType === 'condition') {
      const debMin = Number(agent.trigger_config?.debounce_min) || 15;
      const lastPolled = agent.agent_state?.last_polled_at || agent.last_run_at;
      if (lastPolled && (now.getTime() - new Date(lastPolled).getTime()) / 60000 < debMin) continue;
      let reactive;
      try { reactive = await checkEventAgents(agent); } catch { reactive = null; }
      if (!reactive?.shouldFire) {
        polledNotFired.push(agent); // stamp last_polled_at after the loop
        continue;
      }
      agent._triggerSource = 'event';
      agent._matchedEvents = reactive.matchedEvents;
      agent._newProcessedIds = reactive.newProcessedIds;
      readyToRun.push(agent);
      continue;
    }

    // In the fast event lane we skip schedule agents entirely — the classic
    // 15-min job owns them.
    if (onlyEvents) continue;

    // schedule (default) — unchanged path.
    if (!shouldAgentRunNow(agent.cron_schedule, agent.last_run_at, userTz)) continue;
    agent._triggerSource = 'schedule';
    readyToRun.push(agent);
  }

  // Stamp last_polled_at for event agents we polled but that didn't fire, so the
  // fast lane respects each agent's debounce window regardless of cron cadence.
  if (polledNotFired.length) {
    const polledAt = now.toISOString();
    await Promise.all(polledNotFired.map(a =>
      supabase.from('arcus_agents')
        .update({ agent_state: { ...(a.agent_state || {}), last_polled_at: polledAt } })
        .eq('id', a.id),
    ));
  }

  // ── Chain drainer ─────────────────────────────────────────────────────────
  // Pipeline hand-offs enqueued by a parent run last tick. Load each child and
  // append it (subject to the same paid/expiry/status gate).
  try {
    const drained = await drainChainQueue(supabase);
    for (const d of drained) {
      const { data: child } = await supabase.from('arcus_agents').select('*').eq('id', d.agentId).maybeSingle();
      if (!child || child.status === 'paused') continue;
      if (child.expires_at && now.getTime() > new Date(`${child.expires_at}T23:59:59Z`).getTime()) continue;
      if (!(child.user_id in paidMap)) {
        try {
          const plan = await subscriptionService.getUserPlanType(child.user_id);
          paidMap[child.user_id] = !!plan && plan !== 'free' && plan !== 'none';
        } catch { paidMap[child.user_id] = false; }
      }
      if (!paidMap[child.user_id]) continue;
      if (readyToRun.some(a => a.id === child.id)) continue; // already queued this tick
      child._triggerSource = 'chain';
      child._chainInput = d.chainInput;
      child._parentRunId = d.parentRunId;
      child._chainDepth = d.chainDepth;
      child._visited = d.visited;
      readyToRun.push(child);
      results.push(`Chained: ${child.name} (from pipeline)`);
    }
  } catch (e: any) {
    console.warn('[Cron] chain drain failed:', e?.message);
  }

  if (readyToRun.length === 0) {
    return NextResponse.json({ message: 'No agents due this tick.', ran: 0, results });
  }

  // Highest priority first (1 = highest), so when budget is tight the agents
  // that matter most get their tool-call share before the rest.
  readyToRun.sort((a, b) => (a.priority ?? 5) - (b.priority ?? 5));

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
  // throughput. Sized for the 60s/Hobby budget: floor 8, cap 30 (batch tools
  // do the heavy lifting in few calls). (On Pro: floor 20, cap 80.)
  const perAgentSlice = sharedBudget / readyToRun.length;
  const perAgentToolCalls = Math.min(30, Math.max(8, Math.floor(perAgentSlice / 2500)));

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
            // Next-gen provenance — why/how this run fired.
            trigger_source: agent._triggerSource || 'schedule',
            triggering_event: agent._matchedEvents ? { matches: agent._matchedEvents } : null,
            parent_run_id: agent._parentRunId || null,
            chain_depth: agent._chainDepth || 0,
            chain_input: agent._chainInput || null,
          })
          .select('id')
          .single();
        runRecordId = runRecord?.id || null;
      } catch (e: any) {
        // Table may not be migrated yet — non-fatal, run still proceeds.
        console.warn(`[Cron:Runs] Could not insert run record: ${e.message}`);
      }

      // Layer 1 — generate a short plain-English plan before executing, store it
      // on the run record so the UI can show "intended vs did". Best-effort: a
      // planning failure (or unmigrated `plan` column) never blocks the run.
      if (runRecordId) {
        try {
          const plan = await generateRunPlan(agent);
          if (plan) {
            await supabase.from('arcus_agent_runs').update({ plan }).eq('id', runRecordId);
          }
        } catch (e: any) {
          console.warn(`[Cron:Runs] Plan generation/store failed: ${e?.message}`);
        }
      }

      try {
        const { report, toolCalls, artifactLinks: structuredLinks } = await runAgentTask(agent, {
          // Per-agent override (advanced agents can be given a bigger/smaller
          // tool budget) falls back to the fair per-tick share.
          maxToolCalls: agent.max_tool_calls || perAgentToolCalls,
          deadlineMs: sharedBudget,
        }, runRecordId || undefined);

        const runHasPending = await hasPendingActions(agent.id);

        // PART 60 — Signal-density gate. Score the report; if it's below the
        // threshold AND the agent's policy is 'suppress' (opt-in) AND there
        // are no pending approval actions, skip delivery. Pending actions
        // ALWAYS override — the user can't approve what they don't see.
        const signal = scoreReportSignal(report);
        const decision = { deliver: true, reason: 'force_always_send', score: signal.score };

        const [emailResult, slackResult] = await Promise.allSettled([
          sendEmailReport(agent.user_id, agent.name, report, runHasPending),
          sendSlackReport(agent.user_id, agent.slack_channel || null, agent.name, report, runHasPending),
        ]);

        const emailOk = emailResult.status === 'fulfilled';
        const slackOk = slackResult.status === 'fulfilled';
        const emailErr = !emailOk ? String((emailResult as PromiseRejectedResult).reason?.message || (emailResult as PromiseRejectedResult).reason || 'email_failed').slice(0, 200) : null;
        const slackErr = !slackOk ? String((slackResult as PromiseRejectedResult).reason?.message || (slackResult as PromiseRejectedResult).reason || 'slack_failed').slice(0, 200) : null;
        if (!emailOk) console.warn(`[Cron] ${agent.name} email delivery failed:`, emailErr);
        if (!slackOk) console.warn(`[Cron] ${agent.name} slack delivery failed:`, slackErr);
        results.push(`Delivered: ${agent.name} (email ${emailOk ? '✓' : '✗'}, slack ${slackOk ? '✓' : '✗'})`);

        const completedAt = new Date();
        const deliverySuffix = emailOk
          ? ''
          : ` · Email delivery failed: ${emailErr}`;
        const quietSuffix = deliverySuffix;

        // Cross-run memory: for event/condition agents, remember which items
        // we've now handled (so we never re-fire on the same email) and when we
        // last fired (for debounce).
        const agentUpdate: Record<string, any> = {
          status: 'active',
          last_run_at: completedAt.toISOString(),
          last_report_summary: (report.slice(0, 460) + quietSuffix).slice(0, 500),
        };
        if (agent._triggerSource === 'event' && Array.isArray(agent._newProcessedIds)) {
          const prior = agent.agent_state || {};
          agentUpdate.agent_state = {
            ...prior,
            processed_event_ids: mergeProcessedIds(prior.processed_event_ids, agent._newProcessedIds),
            last_fired_at: completedAt.toISOString(),
            last_polled_at: completedAt.toISOString(),
          };
        }
        await supabase
          .from('arcus_agents')
          .update(agentUpdate)
          .eq('id', agent.id);

        // Pipeline hand-off: enqueue each child agent with this run's summary +
        // artifacts as its chain_input. Depth/cycle-guarded inside enqueue.
        const pipeline: string[] = Array.isArray(agent.pipeline) ? agent.pipeline : [];
        if (pipeline.length) {
          const visited = [...(agent._visited || []), agent.id];
          const summaryForChild = (report || '').slice(0, 1200);
          for (const childId of pipeline) {
            await enqueueChainHandoff(supabase, agent.user_id, {
              childId,
              parentAgentId: agent.id,
              parentRunId: runRecordId,
              chainDepth: (agent._chainDepth || 0) + 1,
              visited,
              summary: summaryForChild,
              artifactLinks: structuredLinks || null,
            });
          }
        }

        // FX.2 — Update the run record with final status + delivery.
        // PART 35 — also persist tool_calls + artifact_links (defined in the
        // migration but previously left empty), so the Recent runs UI can
        // surface "drafted 8 / booked 2 / 47 tool calls" at a glance.
        // PART 60 — also persist signal_score + delivery_decision so the
        // dashboard can show "suppressed: quiet day" instead of a silent gap.
        if (runRecordId) {
          // Prefer the structured links the committee already collected; fall
          // back to parsing the report markdown only if they're absent (legacy
          // single-LLM path). Avoids re-parsing — and breaking on — the report
          // format.
          const artifactLinks = structuredLinks && Object.keys(structuredLinks).length
            ? structuredLinks
            : extractArtifactLinks(report);
          const coreUpdate = {
            completed_at: completedAt.toISOString(),
            duration_ms: completedAt.getTime() - runStartedAt.getTime(),
            status: 'success',
            tool_calls: toolCalls,
            artifact_links: artifactLinks,
            report_summary: (report.slice(0, 450) + (deliverySuffix || '')).slice(0, 500),
            email_delivery: emailOk ? 'sent' : 'failed',
            slack_delivery: slackOk ? 'sent' : 'failed',
          };
          try {
            const { error: coreErr } = await supabase
              .from('arcus_agent_runs')
              .update(coreUpdate)
              .eq('id', runRecordId);
            if (coreErr) {
              console.warn('[Cron] run-record core update failed:', coreErr.message);
            }
          } catch (e: any) {
            console.warn('[Cron] run-record core update threw:', e?.message);
          }
          try {
            const errBlob = !emailOk ? ` · email_err: ${emailErr}` : '';
            await supabase
              .from('arcus_agent_runs')
              .update({
                signal_score: signal.score,
                delivery_decision: `${decision.reason}${errBlob} · ${signal.reasons.slice(0, 3).join(' | ')}`.slice(0, 500),
              })
              .eq('id', runRecordId);
          } catch { /* PART 60 columns may not be migrated — non-fatal */ }
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
// Artifact link extraction — PART 35
// ─────────────────────────────────────────────────────────────────────────────
//
// Parse the report's "## 🔗 All Links" section into a structured object so the
// Recent runs UI can render clickable per-bucket links without re-parsing
// markdown client-side. Buckets mirror REPORT_FORMAT_SUFFIX exactly:
//   gmail   ← Gmail drafts + Emails sent
//   calendar ← Calendar events
//   notion  ← Notion pages
//   slack   ← Slack messages
//
// Returns null when no Links section is found (read-only scans, malformed
// reports) so the column stays null instead of {} — easier to filter on.

interface ArtifactLink {
  label: string;
  url: string;
}
interface ArtifactLinks {
  gmail?: ArtifactLink[];
  calendar?: ArtifactLink[];
  notion?: ArtifactLink[];
  slack?: ArtifactLink[];
}

function extractArtifactLinks(report: string): ArtifactLinks | null {
  // Find the Links section header — emoji-tolerant, also matches " All Links"
  // without the emoji in case the LLM stripped it.
  const linksHeaderRe = /^##\s+(?:[^\w\s]+\s+)?All Links[^\n]*$/im;
  const headerMatch = linksHeaderRe.exec(report);
  if (!headerMatch) return null;

  const after = report.slice(headerMatch.index + headerMatch[0].length);
  // Cut at the next ## heading or the trust-receipts footer divider, whichever
  // comes first.
  const endIdx = after.search(/\n##\s+|\n---\s*\n/);
  const section = endIdx === -1 ? after : after.slice(0, endIdx);

  // Each bucket starts with a bold label like **📧 Gmail drafts** or
  // **📤 Emails sent**. Walk line by line, attributing markdown links to the
  // most recent bucket.
  const out: ArtifactLinks = {};
  let bucket: keyof ArtifactLinks | null = null;
  const linkRe = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

  for (const line of section.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Bucket header detection — also tolerates a leading list marker.
    const headerLine = trimmed.replace(/^[-*+]\s+/, '');
    if (/^\*\*/.test(headerLine)) {
      const lower = headerLine.toLowerCase();
      if (lower.includes('gmail draft') || lower.includes('emails sent') || lower.includes('email sent')) bucket = 'gmail';
      else if (lower.includes('calendar')) bucket = 'calendar';
      else if (lower.includes('notion')) bucket = 'notion';
      else if (lower.includes('slack')) bucket = 'slack';
      else bucket = null;
      continue;
    }

    if (!bucket) continue;
    let m: RegExpExecArray | null;
    linkRe.lastIndex = 0;
    while ((m = linkRe.exec(trimmed)) !== null) {
      const list = out[bucket] ?? (out[bucket] = []);
      list.push({ label: m[1].slice(0, 200), url: m[2].slice(0, 500) });
    }
  }

  // Empty result → return null so the DB column stays null, not {}.
  return Object.keys(out).length === 0 ? null : out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Email — Resend API
// ─────────────────────────────────────────────────────────────────────────────

async function sendEmailReport(toEmail: string, agentName: string, report: string, hasPending: boolean = false): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    const err = '[Cron] RESEND_API_KEY not set — cannot send email report.';
    console.warn(err);
    throw new Error(err);
  }

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
    const msg = `Resend rejected: ${(error as any).name || 'unknown'} — ${(error as any).message || JSON.stringify(error)}`;
    console.error('[Cron] sendEmailReport error:', msg);
    throw new Error(msg);
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
