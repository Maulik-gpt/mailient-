/**
 * Arcus Background Agents — CRUD
 * GET    /api/arcus/agents       → list user's agents
 * POST   /api/arcus/agents       → create agent
 * PATCH  /api/arcus/agents       → update agent (id in body)
 * DELETE /api/arcus/agents?id=   → delete agent
 *
 * Requires Supabase table: arcus_agents
 * SQL:
 *   create table arcus_agents (
 *     id uuid default gen_random_uuid() primary key,
 *     user_id text not null,
 *     name text not null,
 *     task_description text not null,
 *     cron_schedule text not null default '0 7 * * *',
 *     output_channel text not null default 'gmail',
 *     slack_channel text,
 *     status text not null default 'active',
 *     skip_confirmations boolean not null default false,
 *     expires_at date,
 *     last_run_at timestamptz,
 *     last_report_summary text,
 *     created_at timestamptz default now()
 *   );
 *   alter table arcus_agents enable row level security;
 *   create policy "users own their agents" on arcus_agents using (user_id = auth.email());
 *
 *   -- If table already exists, add columns:
 *   alter table arcus_agents add column if not exists skip_confirmations boolean not null default false;
 *   alter table arcus_agents add column if not exists expires_at date;
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../lib/auth.js';
import { getSupabaseAdmin } from '../../../../lib/supabase.js';

async function getUser() {
  const session = await auth();
  if (!session?.user?.email) return null;
  return session.user.email.toLowerCase();
}

export async function GET() {
  const userId = await getUser();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('arcus_agents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error?.code === '42P01') {
    // Table doesn't exist yet — return empty list
    return NextResponse.json({ agents: [] });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ agents: data || [] });
}

export async function POST(request: NextRequest) {
  const userId = await getUser();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { name, taskDescription, cronSchedule, outputChannel, slackChannel, skipConfirmations, expiresAt } = body;

  if (!name?.trim() || !taskDescription?.trim()) {
    return NextResponse.json({ error: 'name and taskDescription are required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('arcus_agents')
    .insert({
      user_id: userId,
      name: name.trim(),
      task_description: taskDescription.trim(),
      cron_schedule: cronSchedule || '0 7 * * *',
      output_channel: outputChannel || 'gmail',
      slack_channel: slackChannel || null,
      skip_confirmations: skipConfirmations ?? false,
      expires_at: expiresAt || null,
      status: 'active',
    })
    .select()
    .single();

  if (error?.code === '42P01') {
    return NextResponse.json({ error: 'Agents table not set up. Please run the SQL migration.' }, { status: 503 });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ agent: data });
}

export async function PATCH(request: NextRequest) {
  const userId = await getUser();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const allowed = ['name', 'task_description', 'cron_schedule', 'output_channel', 'slack_channel', 'status', 'skip_confirmations', 'expires_at'];
  const sanitized: Record<string, any> = {};
  for (const key of allowed) {
    if (key in updates) sanitized[key] = updates[key];
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('arcus_agents')
    .update(sanitized)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ agent: data });
}

export async function DELETE(request: NextRequest) {
  const userId = await getUser();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('arcus_agents')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
