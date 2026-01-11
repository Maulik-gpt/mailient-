import { GmailService } from '@/lib/gmail.ts';
import { DatabaseService } from '@/lib/supabase.js';
import { auth } from '@/lib/auth.js';
import { decrypt, encrypt } from '@/lib/crypto.js';
import { subscriptionService } from '@/lib/subscription-service.js';

export async function GET(request) {
  try {
    console.log('=== TRADITIONAL MESSAGES API START ===');
    const { searchParams } = new URL(request.url);
    const maxResults = parseInt(searchParams.get('maxResults')) || 50;
    const query = searchParams.get('query') || '';

    // Get session
    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({ error: 'No valid session found' }, { status: 401 });
    }

    // 🔒 SECURITY: Check subscription before allowing email access
    const hasSubscription = await subscriptionService.isSubscriptionActive(session.user.email);
    if (!hasSubscription) {
      return Response.json({
        error: 'subscription_required',
        message: 'An active subscription is required to access your emails.',
        upgradeUrl: '/pricing'
      }, { status: 403 });
    }

    const userEmail = session.user.email;
    let accessToken = session.accessToken;
    let refreshToken = session.refreshToken;

    // Fetch tokens from database if missing from session
    const db = new DatabaseService();
    if (!accessToken || !refreshToken) {
      try {
        console.log('📦 Fetching tokens from database for:', userEmail);
        const userTokens = await db.getUserTokens(userEmail);

        if (userTokens) {
          if (userTokens.encrypted_access_token) {
            accessToken = decrypt(userTokens.encrypted_access_token);
          }
          if (userTokens.encrypted_refresh_token) {
            refreshToken = decrypt(userTokens.encrypted_refresh_token);
          }
        }
      } catch (dbError) {
        console.error('Database error getting tokens:', dbError);
      }
    }

    if (!accessToken) {
      return Response.json({ error: 'Gmail not connected' }, { status: 401 });
    }

    // Initialize Gmail service
    const gmailService = new GmailService(accessToken, refreshToken || '');
    gmailService.setUserEmail(userEmail); // Enable token refresh persistence

    // Get page token for pagination
    const pageToken = searchParams.get('pageToken');
    console.log('📧 Fetching traditional emails:', { maxResults, query, pageToken });

    // Fetch messages list
    const messagesResponse = await gmailService.getEmails(maxResults, query, pageToken);

    if (!messagesResponse.messages || messagesResponse.messages.length === 0) {
      console.log('📭 No messages found');
      return Response.json({
        emails: [],
        totalResults: 0,
        nextPageToken: null
      });
    }

    // Get detailed information for each message in batches to be safe
    const messageIds = messagesResponse.messages.map(m => m.id);
    const emailsWithDetails = [];

    // Process in batches of 10 to be efficient but safe
    for (let i = 0; i < Math.min(messageIds.length, 50); i += 10) {
      const batch = messageIds.slice(i, i + 10);
      const batchDetails = await Promise.all(
        batch.map(async (id) => {
          try {
            const details = await gmailService.getEmailDetails(id);
            return gmailService.parseEmailData(details);
          } catch (error) {
            console.error(`Error fetching detail for ${id}:`, error);
            return null;
          }
        })
      );
      emailsWithDetails.push(...batchDetails.filter(Boolean));
    }

    console.log(`✅ Processed ${emailsWithDetails.length} messages`);

    // Sort by date descending
    emailsWithDetails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return Response.json({
      emails: emailsWithDetails,
      totalResults: messagesResponse.resultSizeEstimate || 0,
      nextPageToken: messagesResponse.nextPageToken || null,
    });

  } catch (error) {
    console.error('=== ERROR IN TRADITIONAL MESSAGES API ===');
    console.error('Error:', error);
    return Response.json(
      { error: 'Failed to fetch emails', details: error.message },
      { status: 500 }
    );
  }
}
