/**
 * Arcus V3 — Google Calendar OAuth Flow
 * 
 * Separate OAuth flow from NextAuth because we need Calendar-specific
 * scopes. Uses the same GOOGLE_CLIENT_ID but requests calendar.events
 * and calendar.readonly instead of Gmail scopes.
 * 
 * Flow:
 *   1. GET /api/arcus/v3/oauth/gcal → Redirects to Google consent screen
 *   2. Google redirects back to /api/arcus/v3/oauth/gcal/callback
 *   3. We exchange code for tokens, encrypt, store, register Watch API
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { auth } from '../../../../../../lib/auth.js';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
].join(' ');

/**
 * GET — Initiate OAuth flow. Redirects user to Google consent screen.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Generate state token for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Determine callback URL based on environment
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/arcus/v3/oauth/gcal/callback`;

    // Build Google OAuth URL
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state,
      login_hint: session.user.email,
    });

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

    // Store state in a cookie for validation on callback
    const response = NextResponse.redirect(googleAuthUrl);
    response.cookies.set('arcus_gcal_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[Arcus V3] GCal OAuth init error:', (error as Error).message);
    return NextResponse.redirect(new URL('/arcus-v3?error=oauth_init', request.url));
  }
}
