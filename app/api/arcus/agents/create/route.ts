// @ts-nocheck
/**
 * POST / api / arcus / agents / create
  * Direct agent creation — skips the LLM loop, used by IntegrationRequiredCard
    * after the user connects all missing integrations.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../lib/auth.js';
import { getSupabaseAdmin } from '../../../../../lib/supabase.js';

const DOW_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function cronToLabel(cron: string): string {
  const p = cron.trim().split(/\s+/);
  if (p.length !== 5) return `Schedule: ${cron}`;
  const [min, hour, , , dow] = p;
  const hh = /^\d+$/.test(hour) ? hour.padStart(2, '0') : hour;
  const mm = /^\d+$/.test(min) ? min.padStart(2, '0') : min;
  if (hour.startsWith('*/')) return `Every ${hour.slice(2)} hour(s)`;
  if (min.startsWith('*/')) return `Every ${min.slice(2)} minute(s)`;
  const at = `${hh}:${mm}`;
  if (dow === '*') return `Daily at ${at}`;
  if (/^\d$/.test(dow)) return `Weekly on ${DOW_NAMES[Number(dow)]} at ${at}`;
  return `At ${at} (${cron})`;
}

function nextRunIso(cron: string): string | null {
  const p = cron.trim().split(/\s+/);
  if (p.length !== 5) return null;
  const [minS, hourS, , , dowS] = p;
  const now = new Date();
  const next = new Date(now);
  if (hourS.startsWith('*/')) {
    const step = parseInt(hourS.slice(2)) || 1;
    next.setMinutes(/^\d+$/.test(minS) ? parseInt(minS) : 0, 0, 0);
    while (next <= now || next.getHours() % step !== 0) next.setHours(next.getHours() + 1);
    return next.toISOString();
  }
  if (minS.startsWith('*/')) {
    const step = parseInt(minS.slice(2)) || 15;
    next.setSeconds(0, 0);
    do { next.setMinutes(next.getMinutes() + 1); } while (next <= now || next.getMinutes() % step !== 0);
    return next.toISOString();
  }
  const h = parseInt(hourS), m = parseInt(minS);
  if (isNaN(h) || isNaN(m)) return null;
  next.setHours(h, m, 0, 0);
  if (/^\d$/.test(dowS)) {
    const targetDow = Number(dowS);
    while (next <= now || next.getDay() !== targetDow) next.setDate(next.getDate() + 1);
  } else if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next.toISOString();
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.email.toLowerCase();

    const body = await request.json();
    const { name, task_description, cron_schedule, output_channel, slack_channel, skip_confirmations, expires_at } = body;

    if (!name?.trim() || !task_description?.trim()) {
      return NextResponse.json({ error: 'name and task_description are required' }, { status: 400 });
    }

    const cron = (cron_schedule || '0 7 * * *').trim();
    if (cron.split(/\s+/).length !== 5) {
      return NextResponse.json({ error: `Invalid cron schedule: ${cron}` }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('arcus_agents')
      .insert({
        user_id: userId,
        name: name.trim(),
        task_description: task_description.trim(),
        cron_schedule: cron,
        output_channel: output_channel || 'gmail',
        slack_channel: slack_channel || null,
        skip_confirmations: skip_confirmations ?? false,
        expires_at: expires_at || null,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const scheduleLabel = cronToLabel(cron);
    const nextRun = nextRunIso(cron);

    return NextResponse.json({
      agent: {
        id: data.id,
        name: data.name,
        task: data.task_description,
        scheduleLabel,
        cron,
        channel: data.output_channel,
        skipConfirmations: data.skip_confirmations,
        status: data.status,
        nextRun: nextRun || undefined,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
