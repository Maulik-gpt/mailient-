/**
 * Google OAuth callback handler
 * Processes the authorization code from Google and completes authentication
 */

import { NextResponse } from 'next/server';
import { handlers } from '@/lib/auth';
import { logEvent } from "@/lib/logsso";

/**
 * Handle GET requests to the Google OAuth callback
 * Processes the authorization code and state parameters
 */
export async function GET(request) {
  try {
    console.log('🔄 Google OAuth callback received');
    console.log('📋 URL:', request.url);
    console.log('🔍 Search params:', Object.fromEntries(new URL(request.url).searchParams));

    const response = await handlers.GET(request);

    console.log('✅ OAuth callback successful');
    console.log('📍 Response status:', response.status);
    console.log('📍 Response headers:', Object.fromEntries(response.headers));

    return response;

  } catch (error) {
    logEvent({ channel: "failures", event: "❌ API Error", description: String(error) });
    console.error('❌ OAuth callback error:', error.message);
    console.error('❌ Error stack:', error.stack);

    // Handle specific error types
    if (error.message?.includes('pkceCodeVerifier')) {
      console.log('🔄 PKCE validation failed, redirecting to retry');
      return createErrorRedirect(request, 'pkce-retry');
    }

    // Generic OAuth failure
    return createErrorRedirect(request, 'oauth-failed');
  }
}

/**
 * Handle POST requests to the Google OAuth callback
 * Used for certain OAuth flows or token exchanges
 */
export async function POST(request) {
  try {
    console.log('🔄 Google OAuth callback POST received');
    return await handlers.POST(request);
  } catch (error) {
    logEvent({ channel: "failures", event: "❌ API Error", description: String(error) });
    console.error('❌ OAuth callback POST error:', error.message);
    return createErrorRedirect(request, 'oauth-failed');
  }
}

/**
 * Create a redirect response to the signin page with an error parameter
 * @param {Request} request - The original request
 * @param {string} errorType - The error type to include in the redirect
 * @returns {NextResponse} Redirect response
 */
function createErrorRedirect(request, errorType) {
  const signinUrl = new URL('/auth/signin', request.url);
  signinUrl.searchParams.set('error', errorType);
  return NextResponse.redirect(signinUrl);
}
