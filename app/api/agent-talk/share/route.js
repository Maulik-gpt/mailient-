import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.js';
import { DatabaseService } from '@/lib/supabase.js';

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId, messages, title } = await request.json();

    if (!conversationId || !messages) {
      return NextResponse.json({ error: 'Conversation ID and messages are required' }, { status: 400 });
    }

    const db = new DatabaseService();
    const result = await db.createSharedConversation(
      session.user.email,
      conversationId,
      messages,
      title
    );

    if (!result) {
      return NextResponse.json({ error: 'Failed to create share link. Database table might be missing.' }, { status: 500 });
    }

    return NextResponse.json({
      shareId: result.id,
      shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/share/${result.id}`
    });

  } catch (error) {
    console.error('Create Share API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
