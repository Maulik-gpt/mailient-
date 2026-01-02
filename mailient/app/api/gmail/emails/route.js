import { GmailService } from '@/lib/gmail.ts';
import { DatabaseService } from '@/lib/supabase.js';
import { auth } from '@/lib/auth.js';
import { decrypt, encrypt } from '@/lib/crypto.js';

// Global Gmail service instance for debugging
let globalGmailService = null;

// Debug endpoint to reset rate limiting
export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'resetRateLimiting') {
      if (globalGmailService) {
        globalGmailService.emergencyReset(); // Use emergency reset for complete cleanup
        console.log('Emergency reset called via API - circuit breaker force closed');
      }
      return Response.json({ success: true, message: 'Emergency reset complete - circuit breaker closed, all states cleared' });
    }

    if (action === 'forceCloseCircuitBreaker') {
      if (globalGmailService) {
        globalGmailService.circuitBreakerOpen = false;
        globalGmailService.circuitBreakerUntil = null;
        globalGmailService.consecutiveErrors = 0;
        console.log('Circuit breaker force closed via API');
      }
      return Response.json({ success: true, message: 'Circuit breaker force closed' });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in debug POST:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request) {
  // Add overall timeout for the entire API route
  const API_TIMEOUT = 90000; // 150 seconds (increased from 90)

  try {
    console.log('=== EMAILS API START ===');
    const { searchParams } = new URL(request.url);
    const maxResults = parseInt(searchParams.get('maxResults')) || 500; // Increased default for processing more emails
    const query = searchParams.get('query') || '';
    const fetchAll = searchParams.get('all') === 'true';
    const debugReset = searchParams.get('debugReset') === 'true';
    console.log('Request params:', { maxResults, query, fetchAll, debugReset });

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
    let userTokens = null;
    try {
      userTokens = await db.getUserTokens(session.user.email);
      console.log('Database tokens result:', { hasTokens: !!userTokens, hasAccessToken: !!userTokens?.encrypted_access_token });

      // Decrypt tokens if they exist
      if (userTokens?.encrypted_access_token) {
        try {
          userTokens.access_token = decrypt(userTokens.encrypted_access_token);
          console.log('Access token decrypted successfully');
        } catch (decryptError) {
          console.error('Failed to decrypt access token:', decryptError.message);
          return Response.json({
            error: 'Failed to decrypt access token. Please sign in again.',
            details: 'Token decryption failed'
          }, { status: 401 });
        }
      }
      if (userTokens?.encrypted_refresh_token) {
        try {
          userTokens.refresh_token = decrypt(userTokens.encrypted_refresh_token);
          console.log('Refresh token decrypted successfully');
        } catch (decryptError) {
          console.error('Failed to decrypt refresh token:', decryptError.message);
          return Response.json({
            error: 'Failed to decrypt refresh token. Please sign in again.',
            details: 'Token decryption failed'
          }, { status: 401 });
        }
      }
      if (userTokens?.access_token_expires_at) {
        userTokens.expires_at = userTokens.access_token_expires_at;
      }
    } catch (dbError) {
      console.error('Database error getting tokens:', dbError);
      console.error('Database error details:', {
        message: dbError.message,
        code: dbError.code,
        stack: dbError.stack,
        name: dbError.name
      });
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

    // Create Gmail service instance (reuse global instance for debugging)
    console.log('Creating Gmail service...');
    let gmailService;
    try {
      if (!globalGmailService || debugReset) {
        console.log('Creating new Gmail service instance');
        globalGmailService = new GmailService(accessToken, refreshToken);
        if (debugReset) {
          globalGmailService.emergencyReset(); // Use emergency reset for complete cleanup
          console.log('Emergency reset applied to new Gmail service instance');
        }
      } else {
        // Update tokens if they changed
        globalGmailService.accessToken = accessToken;
        globalGmailService.refreshToken = refreshToken;
      }
      gmailService = globalGmailService;
      console.log('Gmail service created successfully');
    } catch (serviceError) {
      console.error('Failed to create Gmail service:', serviceError.message);
      return Response.json({
        error: 'Failed to initialize Gmail service',
        details: serviceError.message,
        errorType: 'ServiceInitialization'
      }, { status: 500 });
    }

    let allMessages = [];
    let pageToken = searchParams.get('pageToken');
    let fetchedPageToken = null;

    // Check if Gmail service indicates heavy rate limiting
    const isHeavyRateLimited = gmailService.isHeavyRateLimited();

    // Use adaptive batch sizing based on rate limiting status
    let apiBatchSize;
    if (isHeavyRateLimited) {
      apiBatchSize = 50; // Conservative batch size for heavy rate limiting
    } else {
      apiBatchSize = 100; // Optimal batch size for normal operation
    }

    let totalFetched = 0;
    const maxTotalEmails = fetchAll ? (isHeavyRateLimited ? 150 : 500) : Math.min(maxResults, isHeavyRateLimited ? 150 : 500);

    try {
      if (fetchAll) {
        console.log('Fetching emails with pagination and rate limiting...');
        let attempts = 0;
        const maxAttempts = 5;

        do {
          console.log(`Fetching batch ${attempts + 1}, pageToken: ${pageToken}, total so far: ${totalFetched}`);

          try {
            const messagesResponse = await gmailService.getEmails(apiBatchSize, query, pageToken, 'internalDate desc');
            const messages = messagesResponse.messages || [];
            allMessages.push(...messages);
            totalFetched += messages.length;
            pageToken = messagesResponse.nextPageToken;

            // Reset attempts on successful fetch
            attempts = 0;

            // Stop if we've reached the limit or no more pages
            if (totalFetched >= maxTotalEmails || !pageToken) break;

            // Add shorter delay between successful requests for debugging
            const delay = isHeavyRateLimited ? 5000 : 2000; // 5 seconds for heavy rate limiting (reduced for debugging)
            await new Promise(resolve => setTimeout(resolve, delay));

          } catch (error) {
            attempts++;
            console.error(`Error in batch ${attempts + 1}:`, error.message);

            if (attempts >= maxAttempts) {
              console.error('Max attempts reached, stopping fetch');
              break;
            }

            // Wait longer on error
            const delay = Math.min(2000 * attempts, 10000);
            console.log(`Waiting ${delay}ms before retry`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } while (pageToken && attempts < maxAttempts);

        console.log(`Fetched ${totalFetched} messages in total`);
      } else {
        // Single page fetch with retry logic
        console.log('Fetching single page with rate limiting:', { apiBatchSize, query, pageToken });

        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
          try {
            const messagesResponse = await gmailService.getEmails(apiBatchSize, query, pageToken, 'internalDate desc');
            allMessages = messagesResponse.messages || [];
            totalFetched = allMessages.length;
            fetchedPageToken = messagesResponse.nextPageToken;
            console.log('Fetched page token:', fetchedPageToken);
            break; // Success, exit retry loop
          } catch (error) {
            attempts++;
            console.error(`Error fetching emails (attempt ${attempts}):`, error.message);

            if (attempts >= maxAttempts) {
              throw error; // Max attempts reached
            }

            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
          }
        }
      }
    } catch (error) {
      console.error('Error in email fetching process:', error);

      // If it's a rate limit error, return a user-friendly response
      if (error.message.includes('429') || error.message.includes('rateLimitExceeded')) {
        // Extract retry time from error message if available
        const retryTimeMatch = error.message.match(/until (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
        const retryTime = retryTimeMatch ? retryTimeMatch[1] : null;

        return Response.json({
          error: retryTime
            ? `Rate limit exceeded. Please wait until ${retryTime}.`
            : 'Rate limit exceeded. Please wait a few seconds before trying again.',
          retryAfter: retryTime || new Date(Date.now() + 10 * 1000).toISOString(),
          emails: [],
          totalResults: 0
        }, { status: 429 });
      }

      // If it's quota exhaustion, handle differently
      if (error.message.includes('quota exhausted')) {
        return Response.json({
          error: 'Gmail API quota exceeded. Please wait before trying again.',
          retryAfter: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
          emails: [],
          totalResults: 0
        }, { status: 429 });
      }

      throw error;
    }

    // Get detailed information for each message with improved rate limiting and timeout
    const messagesToProcess = allMessages.slice(0, maxTotalEmails);
    console.log(`Processing details for ${messagesToProcess.length} messages`);
    const emailsWithDetails = [];

    // Process emails in optimized batches based on rate limiting status
    const batchSize = isHeavyRateLimited ? 1 : 10; // 1 for heavy rate limiting, 10 for normal

    // Add overall timeout for the entire process - increased for 500 emails
    const overallTimeout = 420000; // 420 seconds max (7 minutes) for 500 emails
    const processStartTime = Date.now();

    for (let i = 0; i < messagesToProcess.length; i += batchSize) {
      // Check if we're approaching the overall timeout
      if (Date.now() - processStartTime > overallTimeout) {
        console.log('Overall timeout reached, stopping batch processing');
        break;
      }

      const batch = messagesToProcess.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(messagesToProcess.length / batchSize)}`);

      const promises = batch.map(async (message) => {
        try {
          // Add timeout to prevent hanging requests
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), 30000) // 30 seconds timeout
          );

          const detailsPromise = gmailService.getEmailDetails(message.id);
          const messageDetails = await Promise.race([detailsPromise, timeoutPromise]);

          return gmailService.parseEmailData(messageDetails);
        } catch (error) {
          console.error(`Error fetching details for message ${message.id}:`, error.message);
          return {
            id: message.id,
            subject: 'Error loading message',
            from: 'Unknown',
            date: new Date().toISOString(),
            snippet: 'Failed to load message details',
          };
        }
      });

      try {
        const batchResults = await Promise.all(promises);
        emailsWithDetails.push(...batchResults);

        // Adaptive delay between batches based on rate limiting
        if (isHeavyRateLimited) {
          // Longer delays for heavy rate limiting
          const batchDelay = i + batchSize < messagesToProcess.length ? 3000 : 0; // 3 seconds between batches
          if (batchDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, batchDelay));
          }
        } else {
          // Shorter delays for normal operation
          const batchDelay = i + batchSize < messagesToProcess.length ? 1000 : 0; // 1 second between batches
          if (batchDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, batchDelay));
          }
        }
      } catch (batchError) {
        console.error('Batch processing error:', batchError);
        // Continue with next batch even if current batch fails
        const errorDelay = isHeavyRateLimited ? 15000 : 8000; // Longer delay on error
        if (i + batchSize < messagesToProcess.length) {
          await new Promise(resolve => setTimeout(resolve, errorDelay));
        }
      }
    }

    // Store emails in database for persistence (optional, since we're fetching from Gmail)
    try {
      if (emailsWithDetails.length > 0) {
        await db.storeEmails(session.user.email, emailsWithDetails);
      }
    } catch (error) {
      console.error('Error storing emails in database:', error);
      // Continue even if storage fails
    }

    // Sort emails by date descending (newest first, like Gmail)
    if (emailsWithDetails.length > 0) {
      emailsWithDetails.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    console.log('Returning response with', emailsWithDetails.length, 'messages (partial results if incomplete)');

    console.log('API route completed successfully with', emailsWithDetails.length, 'emails');

    // Debug logging for troubleshooting
    console.log('=== FINAL RESPONSE DEBUG ===');
    console.log('emailsWithDetails length:', emailsWithDetails.length);
    console.log('totalFetched:', totalFetched);
    console.log('emailsWithDetails sample:', emailsWithDetails.slice(0, 2));
    console.log('=== END DEBUG ===');

    // Always return what we have, even if incomplete
    return Response.json({
      emails: emailsWithDetails,
      totalResults: totalFetched,
      nextPageToken: fetchAll ? null : fetchedPageToken,
      isPartial: emailsWithDetails.length < totalFetched,
      fetchedCount: emailsWithDetails.length,
    });

  } catch (error) {
    console.error('=== ERROR IN EMAILS API ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error type:', typeof error);
    console.error('Error constructor:', error.constructor?.name);

    // Check for specific error types and provide better debugging
    let errorType = 'Unknown';
    let statusCode = 500;

    if (error.message?.includes('Rate limit exceeded')) {
      errorType = 'RateLimit';
      statusCode = 429;
    } else if (error.message?.includes('Circuit breaker')) {
      errorType = 'CircuitBreaker';
      statusCode = 429;
    } else if (error.message?.includes('Authentication required') || error.message?.includes('Token')) {
      errorType = 'Authentication';
      statusCode = 401;
    } else if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
      errorType = 'Timeout';
      statusCode = 408;
    } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
      errorType = 'Network';
      statusCode = 502;
    } else if (error.message?.includes('database') || error.message?.includes('Database')) {
      errorType = 'Database';
      statusCode = 503;
    }

    // Check if this is a rate limiting error and provide helpful information
    const isRateLimited = error.message.includes('Rate limit exceeded');

    return Response.json(
      {
        error: 'Failed to fetch emails',
        details: error.message,
        errorType,
        isRateLimited,
        rateLimitStatus: isRateLimited ? {
          message: 'Gmail API rate limit exceeded. This happens when too many requests are made too quickly.',
          solution: 'Wait a few minutes or use the emergency reset endpoint: POST /api/gmail/emails with action=resetRateLimiting',
          resetEndpoint: '/api/gmail/emails',
          resetMethod: 'POST',
          resetAction: 'resetRateLimiting'
        } : null,
        timestamp: new Date().toISOString(),
        debug: {
          errorName: error.name,
          errorStack: error.stack,
          errorCause: error.cause,
          hasMessage: !!error.message,
          hasStack: !!error.stack
        }
      },
      { status: statusCode }
    );
  }
}

