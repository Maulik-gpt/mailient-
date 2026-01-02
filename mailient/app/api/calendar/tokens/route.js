import { DatabaseService } from '@/lib/supabase.js';
import { auth } from '@/lib/auth.js';
import { encrypt } from '@/lib/crypto.js';

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({ error: 'No session' }, { status: 401 });
    }

    const { access_token, refresh_token, expires_in } = await request.json();

    if (!access_token || !refresh_token) {
      return Response.json({ error: 'Missing tokens' }, { status: 400 });
    }

    const db = new DatabaseService();
    const expires_at = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString();

    await db.storeUserTokens(session.user.email, {
      access_token: encrypt(access_token),
      refresh_token: encrypt(refresh_token),
      expires_in: expires_in || 3600,
      token_type: 'Bearer'
    });

    return Response.json({ success: true });

  } catch (error) {
    console.error('Error storing tokens:', error);
    return Response.json({ error: 'Failed to store tokens' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({ error: 'No session' }, { status: 401 });
    }

    const db = new DatabaseService();
    const tokens = await db.getUserTokens(session.user.email);

    if (!tokens) {
      return Response.json({ error: 'No tokens found' }, { status: 404 });
    }

    // Don't return encrypted tokens
    return Response.json({
      has_tokens: true,
      expires_at: tokens.access_token_expires_at
    });

  } catch (error) {
    console.error('Error getting tokens:', error);
    return Response.json({ error: 'Failed to get tokens' }, { status: 500 });
  }
}

