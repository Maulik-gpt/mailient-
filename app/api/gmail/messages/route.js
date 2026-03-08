import { GmailService } from '../../../../lib/gmail.ts';
import { DatabaseService } from '../../../../lib/supabase.js';
import { auth } from '../../../../lib/auth.js';
import { decrypt, encrypt } from '../../../../lib/crypto.js';

export async function GET(request) {
  try {
    console.log('=== MESSAGES API START ===');
    const { searchParams } = new URL(request.url);
    const maxResults = parseInt(searchParams.get('maxResults')) || 50; // Start with 50 emails for fast loading
    const query = searchParams.get('query') || '';
    console.log('Request params:', { maxResults, query });

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

    // Get tokens from database, fallback to session tokens
    console.log('Getting tokens from database...');
    const db = new DatabaseService();
    try {
      let userTokens = await db.getUserTokens(session.user.email);
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

    // Get page token for pagination
    const pageToken = searchParams.get('pageToken');
    console.log('Fetching emails:', { maxResults, query, pageToken });

    // Fetch threads with pagination (Gmail organizes by threads)
    console.log('About to call gmailService.getThreads...');
    const threadsResponse = await gmailService.getThreads(maxResults, query, pageToken);
    console.log('Gmail threads API response:', { hasThreads: !!threadsResponse?.threads, threadCount: threadsResponse?.threads?.length, resultSizeEstimate: threadsResponse?.resultSizeEstimate });

    // Get detailed information for each thread (limit to 20 for fast loading)
    const threadsToProcess = threadsResponse.threads?.slice(0, Math.min(maxResults, 20)) || [];
    const emailsWithDetails = await Promise.all(
      threadsToProcess.map(async (thread) => {
        try {
          const threadDetails = await gmailService.getThreadDetails(thread.id);
          // Use the first message in thread for display
          const firstMessage = threadDetails.messages?.[0];
          if (firstMessage) {
            return gmailService.parseEmailData(firstMessage);
          } else {
            return {
              id: thread.id,
              subject: thread.snippet || 'No subject',
              from: 'Unknown',
              date: new Date().toISOString(),
              snippet: thread.snippet || '',
            };
          }
        } catch (error) {
          console.error(`Error fetching details for thread ${thread.id}:`, error);
          return {
            id: thread.id,
            subject: 'Error loading thread',
            from: 'Unknown',
            date: new Date().toISOString(),
            snippet: 'Failed to load thread details',
          };
        }
      })
    );

    // Store emails in database for persistence
    try {
      await db.storeEmails(session.user.email, emailsWithDetails);
    } catch (error) {
      console.error('Error storing emails in database:', error);
      // Continue even if storage fails
    }

    console.log('Parsed emails sample:', emailsWithDetails.slice(0, 3).map(e => ({
      id: e.id,
      subject: e.subject,
      date: e.date,
      from: e.from
    })));

    // Sort emails by date descending (newest first, like Gmail)
    emailsWithDetails.sort((a, b) => new Date(b.date) - new Date(a.date));

    console.log('After sorting, first 3 emails:', emailsWithDetails.slice(0, 3).map(e => ({
      subject: e.subject,
      date: e.date
    })));

    console.log('Returning successful response with', emailsWithDetails.length, 'threads');
    return Response.json({
      emails: emailsWithDetails,
      totalResults: threadsResponse.resultSizeEstimate || 0,
      nextPageToken: threadsResponse.nextPageToken || null,
    });

  } catch (error) {
    console.error('=== ERROR IN EMAILS API ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return Response.json(
      { error: 'Failed to fetch emails', details: error.message },
      { status: 500 }
    );
  }
}


