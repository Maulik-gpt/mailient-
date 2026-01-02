import { GmailService } from '@/lib/gmail.ts';
import { DatabaseService } from '@/lib/supabase.js';
import { auth } from '@/lib/auth.js';
import { decrypt } from '@/lib/crypto.js';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return Response.json({ error: 'No session' }, { status: 401 });
    }

    const db = new DatabaseService();
    let userTokens = await db.getUserTokens(session.user.email);

    // Decrypt tokens if they exist
    if (userTokens?.encrypted_access_token) {
      userTokens.access_token = decrypt(userTokens.encrypted_access_token);
    }
    if (userTokens?.encrypted_refresh_token) {
      userTokens.refresh_token = decrypt(userTokens.encrypted_refresh_token);
    }
    if (userTokens?.access_token_expires_at) {
      userTokens.expires_at = userTokens.access_token_expires_at;
    }

    // Fallback to session tokens
    if (!userTokens?.access_token && session.accessToken) {
      userTokens = {
        access_token: session.accessToken,
        refresh_token: session.refreshToken,
        expires_at: new Date(Date.now() + 3600000).toISOString()
      };
    }

    if (!userTokens?.access_token) {
      return Response.json({ error: 'No tokens' }, { status: 401 });
    }

    const gmailService = new GmailService(userTokens.access_token, userTokens.refresh_token);

    // Test profile
    const profile = await gmailService.getProfile();
    console.log('Gmail profile:', profile);

    // Test threads
    const threads = await gmailService.getThreads(5);
    console.log('Gmail threads:', threads);

    return Response.json({
      profile: profile,
      threadsCount: threads.threads?.length || 0,
      threads: threads.threads?.slice(0, 3) || []
    });

  } catch (error) {
    console.error('Gmail debug error:', error);
    return Response.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

