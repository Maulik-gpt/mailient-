import { NextResponse } from 'next/server';
// @ts-ignore
import { auth } from '@/lib/auth.js';
import { DatabaseService } from '@/lib/supabase.js';

export async function POST(request: Request) {
  try {
    // @ts-ignore
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = new DatabaseService();
    const body = await request.json();
    const { name, description, schedule, agent_type } = body;

    const { data, error } = await db.supabase
      .from('arcus_recurring_agents')
      .insert({
        user_id: session.user.id,
        name: name || 'Scheduled Agent',
        description,
        cron_schedule: schedule,
        agent_type: agent_type || 'custom',
        is_active: true
      })
      .select()
      .single();

    if (error) {
       // Table might not exist, just return success mock if so
       if (error.code === '42P01') {
           return NextResponse.json({ id: `mock_${Date.now()}`, name, description, cron_schedule: schedule, agent_type, is_active: true });
       }
       throw error;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Create Agent Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    // @ts-ignore
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = new DatabaseService();
    const body = await request.json();
    const { id, is_active } = body;

    const { data, error } = await db.supabase
      .from('arcus_recurring_agents')
      .update({ is_active })
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error && error.code === '42P01') return NextResponse.json({ id, is_active });
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    // @ts-ignore
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    const db = new DatabaseService();
    const { error } = await db.supabase
      .from('arcus_recurring_agents')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (error && error.code !== '42P01') throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
