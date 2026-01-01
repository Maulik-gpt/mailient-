import { GmailService } from '@/lib/gmail.ts';
import { DatabaseService } from '@/lib/supabase.js';
import { auth } from '@/lib/auth.js';
import { decrypt } from '@/lib/crypto.js';

export async function GET(request, { params }) {
  try {
    const { threadId } = await params;
    const session = await auth();

    if (!session?.user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = new DatabaseService();
    let userTokens = await db.getUserTokens(session.user.email);

    if (userTokens?.encrypted_access_token) {
      userTokens.access_token = decrypt(userTokens.encrypted_access_token);
    }
    if (userTokens?.encrypted_refresh_token) {
      userTokens.refresh_token = decrypt(userTokens.encrypted_refresh_token);
    }

    const gmailService = new GmailService(userTokens.access_token, userTokens.refresh_token);

    // Get full thread details
    const threadDetails = await gmailService.getThreadDetails(threadId);

    // Parse all messages in the thread
    const messages = threadDetails.messages?.map(message =>
      gmailService.parseEmailData(message)
    ) || [];

    return Response.json({
      threadId,
      messages,
      totalMessages: messages.length
    });
  } catch (error) {
    console.error('Error fetching thread details:', error);
    return Response.json({ error: 'Failed to fetch thread details' }, { status: 500 });
  }
}

