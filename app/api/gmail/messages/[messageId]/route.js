import { GmailService } from '@/lib/gmail.ts';
import { DatabaseService } from '@/lib/supabase.js';
import { auth } from '@/lib/auth.js';
import { decrypt, encrypt } from '@/lib/crypto.js';
import { subscriptionService } from '@/lib/subscription-service.js';

export async function GET(request, { params }) {
  try {
    console.log('=== SINGLE MESSAGE API START ===');
    const { messageId } = await params;
    console.log('Request params:', { messageId });

    // Try to get session from NextAuth
    console.log('Getting server session...');
    const session = await auth();
    console.log('Session result:', { hasSession: !!session, hasUser: !!session?.user, email: session?.user?.email });

    if (!session?.user?.email) {
      console.log('No valid session, returning 401');
      return Response.json({
        error: 'No valid session found. Please sign in again.'
      }, { status: 401 });
    }

    // 🔒 SECURITY: Check access before allowing email access
    const hasAccess = await subscriptionService.checkAccess(session.user.email);
    if (!hasAccess) {
      return Response.json({
        error: 'subscription_required',
        message: 'Access required.',
        upgradeUrl: '/pricing'
      }, { status: 403 });
    }

    // Get tokens from database, fallback to session tokens
    console.log('Getting tokens from database...');
    const db = new DatabaseService();
    let userTokens = null;
    try {
      userTokens = await db.getUserTokens(session.user.email);
      console.log('Database tokens result:', { hasTokens: !!userTokens, hasAccessToken: !!userTokens?.encrypted_access_token });

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
    } catch (dbError) {
      console.error('Database error getting tokens:', dbError);
      userTokens = null;
    }

    // If no tokens in database, try to use session tokens
    if (!userTokens?.access_token) {
      console.log('No database tokens, checking session tokens...');
      if (session.accessToken && session.refreshToken) {
        userTokens = {
          access_token: session.accessToken,
          refresh_token: session.refreshToken,
          expires_at: new Date(Date.now() + 3600000).toISOString(), // Assume 1 hour
          token_type: 'Bearer'
        };
        console.log('Using session tokens as fallback');
      } else {
        console.log('No session tokens either, returning 401');
        return Response.json({
          error: 'No valid tokens found. Please sign in again.'
        }, { status: 401 });
      }
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(userTokens.expires_at);
    console.log('Token expiration check:', { now: now.toISOString(), expiresAt: expiresAt.toISOString(), isExpired: now >= expiresAt });

    if (now >= expiresAt) {
      console.log('Token expired, attempting refresh...');
      // Token expired, try to refresh
      const gmailService = new GmailService(userTokens.access_token, userTokens.refresh_token);
      try {
        const newAccessToken = await gmailService.refreshAccessToken();
        console.log('Token refresh successful');
        await db.storeUserTokens(session.user.email, {
          access_token: encrypt(newAccessToken),
          refresh_token: encrypt(userTokens.refresh_token),
          expires_in: 3600,
          token_type: 'Bearer'
        });
        userTokens.access_token = newAccessToken;
      } catch (error) {
        console.log('Token refresh failed:', error.message);
        return Response.json({
          error: 'Token expired and refresh failed. Please sign in again.'
        }, { status: 401 });
      }
    }

    const accessToken = userTokens.access_token;
    const refreshToken = userTokens.refresh_token;
    console.log('Final tokens:', { hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken });

    // Create Gmail service instance
    console.log('Creating Gmail service...');
    const gmailService = new GmailService(accessToken, refreshToken);

    // Fetch the specific message with timeout
    console.log('Fetching message:', messageId);

    // Add timeout to prevent hanging requests
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), 10000)
    );

    const fetchPromise = gmailService.getEmailDetails(messageId);
    const messageData = await Promise.race([fetchPromise, timeoutPromise]);

    console.log('Message fetched successfully');

    // Parse data before returning
    const parsedData = gmailService.parseEmailData(messageData);

    // Return successful response with cache headers
    return new Response(JSON.stringify(parsedData), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    });

  } catch (error) {
    console.error('=== ERROR IN SINGLE MESSAGE API ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return Response.json(
      { error: 'Failed to fetch message', details: error.message },
      { status: 500 }
    );
  }
}

