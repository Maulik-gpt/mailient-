import { NextResponse } from 'next/server';
// @ts-ignore
const { auth } = require('@/lib/auth.js');
import { DatabaseService } from '@/lib/supabase.js';

export const dynamic = 'force-dynamic';

/** POST /api/arcus/conversation — upsert a full conversation snapshot */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId, messages, title } = body;

    if (!conversationId || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'conversationId and messages are required' }, { status: 400 });
    }

    const db = new DatabaseService();
    const result = await db.saveArcusChatSession(
      session.user.email,
      conversationId,
      messages,
      title || '',
    );

    return NextResponse.json({ success: true, saved: !!result });
  } catch (err: any) {
    console.error('[POST /api/arcus/conversation]', err.message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/** GET /api/arcus/conversation — list conversations for the current user */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = new DatabaseService();
    const sessions = await db.listArcusChatSessions(session.user.email);
    return NextResponse.json({ sessions });
  } catch (err: any) {
    console.error('[GET /api/arcus/conversation]', err.message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
