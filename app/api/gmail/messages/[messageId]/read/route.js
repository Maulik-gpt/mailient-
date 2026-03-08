import { GmailService } from '@/lib/gmail.ts';
import { DatabaseService } from '@/lib/supabase.js';
import { auth } from '@/lib/auth.js';
import { decrypt } from '@/lib/crypto.js';

export async function POST(request, { params }) {
  try {
    const { messageId } = await params;
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

    // Mark as read by removing UNREAD label
    await gmailService.markAsRead(messageId);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error marking email as read:', error);
    return Response.json({ error: 'Failed to mark email as read' }, { status: 500 });
  }
}

