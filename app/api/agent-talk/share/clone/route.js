import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.js';
import { DatabaseService } from '@/lib/supabase.js';

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { shareId } = await request.json();

    if (!shareId) {
      return NextResponse.json({ error: 'Share ID is required' }, { status: 400 });
    }

    const db = new DatabaseService();
    
    // 1. Get shared data
    const sharedData = await db.getSharedConversation(shareId);
    if (!sharedData) {
      return NextResponse.json({ error: 'Shared conversation not found' }, { status: 404 });
    }

    // 2. Generate a new conversation ID for the user
    const newConversationId = db.generateConversationId();

    // 3. Clone messages to agent_chat_history
    const messages = sharedData.messages;
    
    // We need to iterate and store each pair or each message
    // Note: sharedData.messages is an array of { role, content, ... }
    // Our agent_chat_history stores pairs usually.
    
    // Let's store them sequentially.
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      // In the simplest form, we can just insert them.
      // But DatabaseService.storeAgentChatMessage expects userMessage AND agentResponse as a pair.
      // If messages are alternate, we can pair them.
      
      if (msg.role === 'user') {
        const nextMsg = messages[i + 1];
        const userText = typeof msg.content === 'string' ? msg.content : msg.content.text;
        const agentText = nextMsg && nextMsg.role === 'assistant' 
          ? (typeof nextMsg.content === 'string' ? nextMsg.content : nextMsg.content.text) 
          : '';
        
        await db.storeAgentChatMessage(
          session.user.email,
          userText,
          agentText,
          newConversationId,
          Math.floor(i / 2) + 1,
          i === 0
        );
        i++; // Skip the next message as we processed it as a pair
      }
    }

    return NextResponse.json({
      success: true,
      conversationId: newConversationId,
      redirectUrl: `/dashboard/agent-talk?convId=${newConversationId}`
    });

  } catch (error) {
    console.error('Clone Chat API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
