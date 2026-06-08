/**
 * Arcus Background Agent — Run History
 * GET /api/arcus/agents/runs?agentId=<uuid>&limit=<n>
 *
 * Returns the most recent run rows for the signed-in user, optionally scoped
 * to a single agent. Backs the "Recent runs" section in the AgentsPanel UI.
 *
 * Reads from arcus_agent_runs (see supabase/migrations/arcus_agent_runs.sql);
 * the cron runner inserts one row per attempt and updates it with status +
 * delivery + tool_calls + artifact_links as the run progresses.
 *
 * Default limit is 7 (the "last 7 runs at a glance" the migration was
 * designed for). Hard cap is 50 to keep the payload bounded.
 */

import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore — JS module, no .d.ts
import { auth } from '../../../../../lib/auth.js';
// @ts-ignore — JS module, no .d.ts
import { getSupabaseAdmin } from '../../../../../lib/supabase.js';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 7;
const MAX_LIMIT = 50;

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user.email as string).toLowerCase();

  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('agentId') || undefined;
  const limitParam = parseInt(searchParams.get('limit') || '', 10);
  const limit = Number.isFinite(limitParam) && limitParam > 0
    ? Math.min(limitParam, MAX_LIMIT)
    : DEFAULT_LIMIT;

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('arcus_agent_runs')
    .select('id, agent_id, started_at, completed_at, duration_ms, status, tool_calls, report_summary, error_message, email_delivery, slack_delivery, artifact_links')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (agentId) query = query.eq('agent_id', agentId);

  const { data, error } = await query;

  if (error?.code === '42P01') return NextResponse.json({ runs: [] });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const STUCK_THRESHOLD_MS = 5 * 60 * 1000;
  const nowMs = Date.now();
  const runs = (data ?? []).map((r: any) => {
    if (r.status !== 'running') return r;
    const startedMs = r.started_at ? new Date(r.started_at).getTime() : nowMs;
    if (!Number.isFinite(startedMs) || nowMs - startedMs < STUCK_THRESHOLD_MS) return r;
    const minutes = Math.floor((nowMs - startedMs) / 60000);
    return {
      ...r,
      status: 'error',
      duration_ms: r.duration_ms ?? (nowMs - startedMs),
      error_message: r.error_message
        || `Run never reported completion (started ${minutes}m ago). Likely a Vercel timeout or a DB write failure mid-update — the next scheduled tick will retry.`,
    };
  });

  return NextResponse.json({ runs });
}
