import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.js';
import { DatabaseService } from '@/lib/supabase.js';

// Main handler for both GET and DELETE requests
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const db = new DatabaseService();

    // Get conversations for the user
    let messages;

    // Check if we can access the database
    try {
      messages = await db.getAgentChatHistoryWithPagination(session.user.email, limit * 2, offset);
      console.log(`Found ${messages.length} messages for user`);
    } catch (error) {
      console.log('Database not available, using localStorage fallback:', error.message);
      // Return empty array - conversations will be managed via localStorage
      messages = [];
    }

    // Group messages by conversation_id to create conversations
    const conversationMap = new Map();

    messages.forEach((message) => {
      const convId = message.conversation_id || message.id; // Fallback to message ID for backward compatibility

      if (!conversationMap.has(convId)) {
        conversationMap.set(convId, {
          id: message.id,
          conversation_id: convId,
          user_id: message.user_id,
          user_message: message.user_message,
          agent_response: message.agent_response,
          message_order: message.message_order,
          is_initial_message: message.is_initial_message,
          created_at: message.created_at,
          messages: []
        });
      }

      conversationMap.get(convId).messages.push(message);
    });

    // Convert to array and sort by creation date (most recent first)
    let conversations = Array.from(conversationMap.values()).map(conv => ({
      ...conv,
      messageCount: conv.messages.length,
      initialMessagePreview: conv.user_message.length > 100
        ? conv.user_message.substring(0, 100) + '...'
        : conv.user_message,
      // Use the most recent message's creation date for sorting
      lastMessageDate: conv.messages.reduce((latest, msg) =>
        new Date(msg.created_at) > new Date(latest) ? msg.created_at : latest, conv.created_at)
    }));

    // Sort conversations by last message date (most recent first)
    conversations.sort((a, b) => new Date(b.lastMessageDate) - new Date(a.lastMessageDate));

    // Apply pagination
    const paginatedConversations = conversations.slice(offset, offset + limit);

    return NextResponse.json({
      history: paginatedConversations || [],
      hasMore: conversations && conversations.length > (offset + limit),
      limit,
      offset,
      total: conversations ? conversations.length : 0
    });

  } catch (error) {
    console.error('Chat history API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'An unexpected error occurred',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a conversation
export async function DELETE(request) {
  try {
    console.log('DELETE request received for conversation deletion');

    const session = await auth();
    console.log('Session check:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userEmail: session?.user?.email,
      sessionKeys: session ? Object.keys(session) : null
    });

    if (!session?.user?.email) {
      console.log('No valid session found, returning 401');
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { conversationId } = body;
    console.log('Request body parsed:', { conversationId });

    if (!conversationId) {
      console.log('No conversationId provided');
      return NextResponse.json(
        { error: 'Conversation ID is required', code: 'MISSING_CONVERSATION_ID' },
        { status: 400 }
      );
    }

    const db = new DatabaseService();
    console.log('DatabaseService created, attempting deletion for user:', session.user.email);

    console.log('Attempting database deletion with params:', {
      user_id: session.user.email,
      conversation_id: conversationId
    });

    // Delete all messages in the conversation for the current user
    // First check if the table exists and has the conversation_id column
    let deleteQuery;

    try {
      // Try to delete using conversation_id column
      deleteQuery = db.supabase
        .from('agent_chat_history')
        .delete()
        .eq('user_id', session.user.email)
        .eq('conversation_id', conversationId)
        .select();

      console.log('Using conversation_id column for deletion');
    } catch (columnError) {
      console.log('conversation_id column not available, falling back to id-based deletion');
      // Fallback: if conversation_id column doesn't exist, treat conversationId as message ID
      deleteQuery = db.supabase
        .from('agent_chat_history')
        .delete()
        .eq('user_id', session.user.email)
        .eq('id', conversationId)
        .select();
    }

    const { data, error } = await deleteQuery;

    console.log('Supabase delete query result:', {
      hasData: !!data,
      dataLength: data?.length,
      error: error?.message,
      errorCode: error?.code,
      errorDetails: error?.details,
      errorHint: error?.hint
    });

    if (error) {
      console.error('Database error during deletion:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));

      // If table doesn't exist, return success (nothing to delete)
      if (error.code === '42P01') {
        console.log('agent_chat_history table does not exist, returning success');
        return NextResponse.json({
          success: true,
          message: 'Conversation deleted successfully (no data to delete)'
        });
      }

      // If conversation_id column doesn't exist, this is expected for older schema
      if (error.message?.includes('conversation_id') && error.message?.includes('does not exist')) {
        console.log('conversation_id column missing, falling back to id-based deletion');

        // Fallback deletion using message ID
        const { data: fallbackData, error: fallbackError } = await db.supabase
          .from('agent_chat_history')
          .delete()
          .eq('user_id', session.user.email)
          .eq('id', conversationId)
          .select();

        if (fallbackError) {
          console.error('Fallback deletion also failed:', fallbackError);
          return NextResponse.json(
            { error: 'Failed to delete conversation', details: fallbackError.message, code: 'DATABASE_ERROR' },
            { status: 500 }
          );
        }

        console.log('Fallback deletion successful, rows affected:', fallbackData?.length || 0);
        return NextResponse.json({
          success: true,
          message: 'Conversation deleted successfully',
          deletedCount: fallbackData?.length || 0
        });
      }

      // Check for specific database connection issues
      if (error.message?.includes('connection') || error.message?.includes('network')) {
        console.error('Database connection issue:', error.message);
        return NextResponse.json(
          { error: 'Database connection failed. Please check your Supabase configuration.', code: 'DATABASE_CONNECTION_ERROR' },
          { status: 503 }
        );
      }

      console.error('Returning generic database error');
      return NextResponse.json(
        { error: 'Failed to delete conversation', details: error.message, code: 'DATABASE_ERROR' },
        { status: 500 }
      );
    }

    console.log('Deletion successful, rows affected:', data?.length || 0);
    console.log('Returning success response with data:', {
      success: true,
      message: 'Conversation deleted successfully',
      deletedCount: data?.length || 0
    });
    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully',
      deletedCount: data?.length || 0
    });

  } catch (error) {
    console.error('Delete conversation API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}


