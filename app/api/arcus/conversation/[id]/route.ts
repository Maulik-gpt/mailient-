import { NextResponse } from 'next/server';
// @ts-ignore
const { auth } = require('@/lib/auth.js');
import { DatabaseService } from '@/lib/supabase.js';

export const dynamic = 'force-dynamic';

/** GET /api/arcus/conversation/[id] — load a single conversation by ID */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
    }

    const db = new DatabaseService();
    const session_ = await db.loadArcusChatSession(session.user.email, id);

    if (!session_) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({
      conversationId: session_.id,
      messages: session_.messages || [],
      title: session_.title || '',
      updatedAt: session_.updated_at,
    });
  } catch (err: any) {
    console.error('[GET /api/arcus/conversation/[id]]', err.message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
