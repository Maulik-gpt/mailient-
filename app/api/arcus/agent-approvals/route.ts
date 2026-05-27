/**
 * Agent Approvals API
 * 
 * GET  /api/arcus/agent-approvals — list pending actions for the current user
 * POST /api/arcus/agent-approvals — approve or reject a specific action
 *
 * When an action is approved, the corresponding tool is executed immediately
 * using the stored tool_input. The row is then marked 'approved' with a
 * resolved_at timestamp. Rejected rows are marked 'rejected'.
 */

import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import { auth as nextAuth } from '@/lib/auth.js';
import { getSupabaseAdmin } from '../../../../lib/supabase.js';
import { executeTool } from '../../../../lib/arcus/tools';

// @ts-ignore
const auth: any = nextAuth;

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// GET — list pending actions for the authenticated user
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const email = session.user.email;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('arcus_agent_pending_actions')
    .select(`
      id,
      agent_id,
      run_id,
      tool_name,
      tool_input,
      status,
      created_at,
      resolved_at,
      arcus_agents!inner ( name )
    `)
    .eq('user_id', email.toLowerCase())
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[AgentApprovals] GET error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Flatten agent name into each action
  const actions = (data || []).map((row: any) => ({
    id: row.id,
    agentId: row.agent_id,
    agentName: row.arcus_agents?.name || 'Unknown Agent',
    runId: row.run_id,
    toolName: row.tool_name,
    toolInput: row.tool_input,
    status: row.status,
    createdAt: row.created_at,
  }));

  return NextResponse.json({ actions });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — approve or reject an action
// Body: { actionId: string, decision: 'approve' | 'reject' }
// ─────────────────────────────────────────────────────────────────────────────

// Human-readable labels for tool names in results
const TOOL_LABELS: Record<string, string> = {
  send_email: 'Email sent',
  schedule_meeting: 'Meeting booked',
  send_slack_message: 'Slack message posted',
  slack_send_dm: 'Slack DM sent',
  create_notion_page: 'Notion page created',
  calendar_cancel_event: 'Calendar event cancelled',
};

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const email = session.user.email;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { actionId, decision } = body;
  if (!actionId || !['approve', 'reject'].includes(decision)) {
    return NextResponse.json({ error: 'Required: actionId (string), decision ("approve" | "reject")' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Fetch the action — verify it belongs to this user and is still pending
  const { data: action, error: fetchErr } = await supabase
    .from('arcus_agent_pending_actions')
    .select('*')
    .eq('id', actionId)
    .eq('user_id', email.toLowerCase())
    .eq('status', 'pending')
    .maybeSingle();

  if (fetchErr) {
    console.error('[AgentApprovals] fetch error:', fetchErr.message);
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!action) {
    return NextResponse.json({ error: 'Action not found, already resolved, or does not belong to you.' }, { status: 404 });
  }

  // ── Reject path ──────────────────────────────────────────────────────────
  if (decision === 'reject') {
    await supabase
      .from('arcus_agent_pending_actions')
      .update({ status: 'rejected', resolved_at: new Date().toISOString() })
      .eq('id', actionId);
    return NextResponse.json({ success: true, message: 'Action rejected.' });
  }

  // ── Approve path — execute the tool ──────────────────────────────────────
  try {
    const result = await executeTool(
      action.tool_name,
      action.tool_input,
      action.user_id,
      // No conversationId — bypass the interactive approval gate.
      // isBackgroundAgent false + skipConfirmations true = direct execution
      { skipConfirmations: true },
    );

    await supabase
      .from('arcus_agent_pending_actions')
      .update({ status: 'approved', resolved_at: new Date().toISOString() })
      .eq('id', actionId);

    const label = TOOL_LABELS[action.tool_name] || action.tool_name;
    return NextResponse.json({
      success: true,
      message: `${label} successfully.`,
      toolResult: result.output?.slice(0, 500),
    });
  } catch (err: any) {
    console.error('[AgentApprovals] execution error:', err.message);
    return NextResponse.json({
      success: false,
      error: `Failed to execute ${action.tool_name}: ${err.message}`,
    }, { status: 500 });
  }
}
