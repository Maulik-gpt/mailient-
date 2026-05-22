import { NextResponse } from 'next/server';
// @ts-ignore
const { auth } = require('@/lib/auth.js');
import { DatabaseService } from '@/lib/supabase.js';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

/** GET /api/arcus/conversation/[id] — load a single conversation */
export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = new DatabaseService();
    const data = await db.loadArcusChatSession(session.user.email, id);
    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[GET /api/arcus/conversation/[id]]', err.message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/** DELETE /api/arcus/conversation/[id] — delete a conversation */
export async function DELETE(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // @ts-ignore
    const { getSupabaseAdmin } = require('@/lib/supabase.js');
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('arcus_chat_sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.email.toLowerCase());

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/arcus/conversation/[id]]', err.message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/** PATCH /api/arcus/conversation/[id] — rename a conversation title */
export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title } = await request.json();
    if (!title?.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    // @ts-ignore
    const { getSupabaseAdmin } = require('@/lib/supabase.js');
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('arcus_chat_sessions')
      .update({ title: title.trim(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', session.user.email.toLowerCase());

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[PATCH /api/arcus/conversation/[id]]', err.message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
