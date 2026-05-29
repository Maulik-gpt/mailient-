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

  // Table not migrated yet — return an empty list instead of a 500 so the
  // UI can render "No runs yet" cleanly until the migration is applied.
  if (error?.code === '42P01') return NextResponse.json({ runs: [] });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ runs: data ?? [] });
}
