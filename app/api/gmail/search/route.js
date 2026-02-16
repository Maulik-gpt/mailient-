import { NextResponse } from 'next/server';

// CRITICAL: Force dynamic rendering to prevent build-time evaluation
export const dynamic = 'force-dynamic';
import { GmailSearchService, GmailSearchFilters } from '@/lib/gmail-search-service';
import { GmailTokenService } from '@/lib/gmail-token-service';
import { auth } from '@/lib/auth';
import { subscriptionService } from '@/lib/subscription-service';

export async function POST(request) {
  console.log('=== GMAIL SEARCH API START ===');

  try {
    // Authenticate user
    console.log('=== GMAIL SEARCH API START ===');
    console.log('Getting server session...');
    const session = await auth();
    console.log('Session result:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      email: session?.user?.email,
      hasAccessToken: !!session?.accessToken,
      hasRefreshToken: !!session?.refreshToken
    });

    if (!session?.user?.email) {
      console.log('No valid session, returning 401');
      return NextResponse.json({
        error: 'No valid session found. Please sign in again.',
        needsAuth: true
      }, { status: 401 });
    }

    // 🔒 SECURITY: Check access before allowing email search
    const hasAccess = await subscriptionService.checkAccess(session.user.email);
    if (!hasAccess) {
      return NextResponse.json({
        error: 'subscription_required',
        message: 'Access required.',
        upgradeUrl: '/pricing'
      }, { status: 403 });
    }

    // Get request body
    const body = await request.json();
    const {
      filters,
      maxResults = 100,
      pageToken = null
    } = body;

    console.log('Search request:', {
      maxResults,
      pageToken,
      filters: Object.keys(filters || {})
    });

    // Get Gmail tokens using the new token service
    console.log('Getting Gmail tokens...');
    const tokenService = new GmailTokenService();
    const tokenResult = await tokenService.getGmailTokens(session.user.email);

    if (!tokenResult.success) {
      console.log('Failed to get Gmail tokens:', tokenResult.error);
      return NextResponse.json({
        error: tokenResult.error,
        needsReauth: true,
        help: 'Please sign in with Google to access your Gmail account'
      }, { status: 401 });
    }

    const { accessToken, refreshToken } = tokenResult.tokens;
    console.log('Gmail tokens retrieved from:', tokenResult.source);

    // Initialize Gmail search service
    const gmailService = new GmailSearchService(accessToken, refreshToken);

    // Perform search
    console.log('Performing Gmail search...');
    const searchResults = await gmailService.searchEmails(
      filters,
      maxResults,
      pageToken
    );

    console.log('Search completed successfully:', {
      messageCount: searchResults.messages.length,
      totalEstimate: searchResults.resultSizeEstimate,
      hasNextPage: !!searchResults.nextPageToken
    });

    // Format response
    const response = {
      success: true,
      data: {
        messages: searchResults.messages,
        nextPageToken: searchResults.nextPageToken,
        resultSizeEstimate: searchResults.resultSizeEstimate,
        totalResults: searchResults.messages.length
      },
      query: filters,
      executionTime: Date.now()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Gmail search error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Circuit breaker')) {
        return NextResponse.json({
          error: 'Gmail API temporarily unavailable. Please try again in a few moments.',
          retryAfter: 30000
        }, { status: 503 });
      }

      if (error.message.includes('Rate limit')) {
        return NextResponse.json({
          error: 'Gmail API rate limit exceeded. Please try again later.',
          retryAfter: 60000
        }, { status: 429 });
      }

      if (error.message.includes('Access token expired')) {
        return NextResponse.json({
          error: 'Gmail access token expired. Please reconnect your Gmail account.',
          needsReauth: true
        }, { status: 401 });
      }
    }

    // Generic error response
    return NextResponse.json({
      error: `Search failed: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
    }, { status: 500 });
  }
}

export async function GET(request) {
  console.log('=== GMAIL LABELS API START ===');

  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({
        error: 'No valid session found. Please sign in again.',
        needsAuth: true
      }, { status: 401 });
    }

    // 🔒 SECURITY: Check access before allowing label access
    const hasAccess = await subscriptionService.checkAccess(session.user.email);
    if (!hasAccess) {
      return NextResponse.json({
        error: 'subscription_required',
        message: 'Access required.',
        upgradeUrl: '/pricing'
      }, { status: 403 });
    }

    // Get Gmail tokens using the new token service
    const tokenService = new GmailTokenService();
    const tokenResult = await tokenService.getGmailTokens(session.user.email);

    if (!tokenResult.success) {
      return NextResponse.json({
        error: tokenResult.error,
        needsReauth: true,
        help: 'Please sign in with Google to access your Gmail account'
      }, { status: 401 });
    }

    const { accessToken, refreshToken } = tokenResult.tokens;

    // Get labels
    const gmailService = new GmailSearchService(accessToken, refreshToken);
    const labels = await gmailService.getAllLabels();

    return NextResponse.json({
      success: true,
      data: {
        labels: labels
      }
    });

  } catch (error) {
    console.error('Gmail labels error:', error);
    return NextResponse.json({
      error: `Failed to fetch labels: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
