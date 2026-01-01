import { NextResponse } from 'next/server';
import { auth } from '../../../../../lib/auth.js';
import { DatabaseService } from '../../../../../lib/supabase.js';

// GET endpoint to fetch a specific conversation by ID
export async function GET(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    const db = new DatabaseService();

    // Try to get conversation thread by conversation ID
    let conversationData;
    try {
      conversationData = await db.getConversationThread(session.user.email, id);
    } catch (error) {
      console.log('Database columns not available yet, returning empty array for now');
      // Return empty array - conversations will be loaded from localStorage
      conversationData = [];
    }

    if (!conversationData || conversationData.length === 0) {
      return NextResponse.json([]);
    }

    // Format the conversation data for frontend consumption
    const formattedMessages = conversationData.map((message, index) => ({
      id: message.id,
      type: index % 2 === 0 ? 'user' : 'agent',
      content: index % 2 === 0 ? message.user_message : message.agent_response,
      time: new Date(message.created_at).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }),
      messageOrder: message.message_order || 1,
      isInitialMessage: message.is_initial_message || true
    }));

    return NextResponse.json({
      conversationId: id,
      messages: formattedMessages,
      messageCount: formattedMessages.length,
      createdAt: conversationData[0]?.created_at,
      lastUpdated: conversationData[conversationData.length - 1]?.created_at
    });

  } catch (error) {
    console.error('Conversation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

