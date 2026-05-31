/**
 * Multi-VA orchestrator (the "chief of staff") — PART 48.
 *
 * Takes a background-agent + budget, decomposes the work, fans out N
 * concurrent VA runs (each via runVA), and aggregates their outputs into
 * one CommitteeReport the cron runner can ship.
 *
 * Decomposition is intentionally STATIC for v1:
 *   - classifyRelevantVAs (PART 37 classifier) decides which of the 5 VAs
 *     the task touches.
 *   - If 0-1 VAs match, we fall back to running ALL 5 (a background-agent
 *     task without explicit VA keywords — "morning sweep" — is usually
 *     cross-VA by intent; better to give every VA a chance than over-narrow).
 *   - If ≥2 match, only those VAs run — saves API calls + clarifies the
 *     report ("we ran Inbox + CRM" vs "we ran 5 VAs, 3 had nothing to do").
 *
 * v2 will replace this with a small LLM decomposition call that turns the
 * task description into a per-VA assignment object. Deferred — the static
 * path is enough to validate the parallel architecture works.
 */

import { shouldDispatchParallelVAs } from '../inbox-pipeline';
import type { ArcusVA } from '../tool-integration-map';
import { runVA } from './va-runner';
import { buildCommitteeReport } from './aggregator';
import type { CommitteeReport, VAAssignment, VARunResult } from './types';

const ALL_VAS: ArcusVA[] = ['inbox', 'calendar', 'crm', 'comms', 'research'];

function pickVAs(taskDescription: string): ArcusVA[] {
  const classified = shouldDispatchParallelVAs(taskDescription);
  if (classified.vas.length >= 2) return classified.vas;
  // Background-agent tasks like "morning sweep" or "weekly brief" are
  // intentionally vague — fall back to the full committee so we don't
  // miss a domain the keyword classifier didn't catch.
  return ALL_VAS;
}

export interface RunCommitteeOptions {
  /** Hard cap on tool calls SUMMED across all VAs. */
  maxToolCalls: number;
  /** Wall-clock budget in ms for the whole committee (slowest VA bounds it). */
  deadlineMs: number;
}

export async function runAgentAsCommittee(
  agent: {
    user_id: string;
    task_description: string;
    skip_confirmations?: boolean;
    name?: string;
    id?: string;
  },
  opts: RunCommitteeOptions,
): Promise<CommitteeReport> {
  const startedAt = Date.now();
  const vas = pickVAs(agent.task_description);

  // Per-VA budgets — divide the total tool budget evenly with a floor of 8
  // so even the smallest committee member can fetch + draft + report.
  // Wall clock is SHARED — every VA gets the same deadline so the slowest
  // bounds the whole run; the orchestrator doesn't wait for stragglers
  // beyond the original deadline.
  const perVAMaxCalls = Math.max(8, Math.floor(opts.maxToolCalls / vas.length));
  const perVADeadline = Math.max(8_000, opts.deadlineMs - 6_000); // reserve 6s for aggregator + delivery

  const assignments: VAAssignment[] = vas.map(va => ({
    va,
    siblingVAs: vas,
    agent,
    maxToolCalls: perVAMaxCalls,
    deadlineMs: perVADeadline,
  }));

  // Parallel fan-out. Promise.allSettled because we want EVERY VA's result
  // even if some throw — the aggregator renders failed VAs as a stub
  // section instead of dropping them.
  const settled = await Promise.allSettled(assignments.map(a => runVA(a)));

  const results: VARunResult[] = settled.map((s, i) => {
    if (s.status === 'fulfilled') return s.value;
    // Translation: a rejected promise from runVA means an uncaught throw,
    // which runVA already catches internally — so this branch is rare.
    // If it does fire, synthesize a minimal VARunResult so the aggregator
    // can render the failure cleanly.
    return {
      va: assignments[i].va,
      status: 'error' as const,
      toolCalls: 0,
      artifacts: {},
      durationMs: Date.now() - startedAt,
      body: '',
      summary: `${assignments[i].va} VA threw an unhandled error.`,
      error: s.reason instanceof Error ? s.reason.message : String(s.reason),
    };
  });

  return buildCommitteeReport(results, agent);
}
