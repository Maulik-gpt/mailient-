import { NextResponse } from 'next/server';
// @ts-ignore
import { auth as authAny } from '@/lib/auth.js';
const auth = authAny as any;
import { DatabaseService } from '@/lib/supabase.js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { shareId } = body;
    if (!shareId) {
      return NextResponse.json({ error: 'shareId is required' }, { status: 400 });
    }

    const db = new DatabaseService();
    const userId = session.user.email.toLowerCase();

    // 1. Fetch the shared conversation snapshot
    const sharedConvo = await db.getSharedConversation(shareId);
    if (!sharedConvo || sharedConvo.is_unshared) {
      return NextResponse.json({ error: 'Shared conversation not found or expired' }, { status: 404 });
    }

    const messages = sharedConvo.messages || [];

    // 2. Generate a new, unique conversation ID
    const newConvoId = db.generateConversationId();

    // 3. Process and pair up the user-assistant message turns for agent_chat_history
    let orderCount = 1;
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      
      // We look for user messages and pair them with the subsequent assistant message
      if (msg.role === 'user') {
        const userText = typeof msg.content === 'string' ? msg.content : (msg.content?.text || '');
        
        let agentText = '';
        if (i + 1 < messages.length && messages[i + 1].role === 'assistant') {
          const nextMsg = messages[i + 1];
          agentText = typeof nextMsg.content === 'string' ? nextMsg.content : (nextMsg.content?.text || '');
          i++; // Skip assistant message in next loop iteration since it is consumed
        }

        const isInitial = orderCount === 1;
        await db.storeAgentChatMessage(
          userId,
          userText,
          agentText,
          newConvoId,
          orderCount,
          isInitial
        );
        orderCount++;
      }
    }

    // 4. Return the new redirect URL
    return NextResponse.json({
      success: true,
      message: 'Conversation cloned successfully',
      conversationId: newConvoId,
      redirectUrl: `/dashboard/agent-talk/${newConvoId}`,
    });
  } catch (error: any) {
    console.error('Error cloning shared conversation:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
