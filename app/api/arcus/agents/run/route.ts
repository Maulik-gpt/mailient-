/**
 * Run a background agent immediately ("Run now" from the agent card).
 * POST /api/arcus/agents/run  { id }
 *
 * Runs the agent's task through the agentic loop right now and persists the
 * result as a new conversation (arcus_chat_sessions) so it shows up in chat
 * history. Returns the new conversationId for client-side navigation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../lib/auth.js';
import { getSupabaseAdmin, DatabaseService } from '../../../../../lib/supabase.js';
import { runAgentTask } from '../../../../../lib/arcus/run-agent';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel Hobby cap; the agentic loop may need most of it

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.email.toLowerCase();

  const body = await request.json().catch(() => ({}));
  const { id } = body;
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: agent, error } = await supabase
    .from('arcus_agents')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

  let report: string;
  try {
    report = await runAgentTask(agent);
  } catch (err: any) {
    return NextResponse.json({ error: `Agent run failed: ${err.message}` }, { status: 500 });
  }

  // Record the run on the agent row (same fields the scheduled runner updates).
  await supabase
    .from('arcus_agents')
    .update({ last_run_at: new Date().toISOString(), last_report_summary: report.slice(0, 500) })
    .eq('id', agent.id);

  // Persist as a new conversation so it appears in chat history.
  const conversationId =
    (globalThis.crypto?.randomUUID?.() as string | undefined) ||
    `agentrun_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  const time = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const messages = [
    {
      id: Date.now(),
      type: 'user',
      role: 'user',
      content: agent.task_description,
      time,
    },
    {
      id: Date.now() + 1,
      type: 'agent',
      role: 'assistant',
      content: { text: report, list: [], footer: '' },
      time,
      meta: { agentSteps: [], agentNarratives: [], ranBy: 'run_now', agentName: agent.name },
    },
  ];

  const db = new DatabaseService();
  await db.saveArcusChatSession(session.user.email, conversationId, messages, agent.name);

  return NextResponse.json({ success: true, conversationId });
}
