import { GmailService } from '@/lib/gmail.ts';
import { DatabaseService } from '@/lib/supabase.js';
import { auth } from '@/lib/auth.js';
import { decrypt } from '@/lib/crypto.js';

export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename') || 'attachment';
    const { messageId, attachmentId } = await params;

    const session = await auth();
    if (!session?.user?.email) {
      return new Response('Unauthorized', { status: 401 });
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
    const { data } = await gmailService.getAttachment(messageId, attachmentId);

    // data is base64url encoded; decode to binary
    const base64 = (data || '').replace(/-/g, '+').replace(/_/g, '/');
    const binary = Buffer.from(base64, 'base64');

    const headers = new Headers();
    headers.set('Content-Type', 'application/octet-stream');
    headers.set('Content-Disposition', `inline; filename="${filename}"`);
    headers.set('Cache-Control', 'private, max-age=86400');

    return new Response(binary, { headers });
  } catch (error) {
    console.error('Error fetching attachment:', error);
    return new Response('Failed to fetch attachment', { status: 500 });
  }
}



