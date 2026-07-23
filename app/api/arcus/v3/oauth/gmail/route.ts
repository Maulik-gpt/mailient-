/**
 * Arcus V3 — Gmail OAuth Initiation
 * GET /api/arcus/v3/oauth/gmail
 *
 * Generates a Google OAuth URL scoped to Gmail read/compose/send
 * and redirects the user to Google's consent screen.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../lib/auth.js';
import crypto from 'crypto';
import { composioEnabled, initiateComposioConnection } from '../../../../../../lib/arcus/composio';

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
].join(' ');

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  // ── Composio-managed path ──────────────────────────────────────────────────
  // When COMPOSIO_API_KEY + COMPOSIO_GMAIL_AUTH_CONFIG_ID are set, the consent
  // runs on Composio's VERIFIED Google client — no 100-user test cap from our
  // own client. The pending connected-account id rides in a short-lived cookie;
  // the Composio callback route verifies ACTIVE and persists the marker row.
  // Any initiate failure falls through to the legacy own-client OAuth below.
  // Where to send the user back after the whole reconnect completes (e.g. the
  // home-feed banner passes ?returnTo=/home-feed). Threaded to the Composio
  // callback so the user lands back where they started, not on a fixed page.
  const rawReturn = new URL(request.url).searchParams.get('returnTo') || '';
  const returnTo = rawReturn.startsWith('/') && !rawReturn.startsWith('//') ? rawReturn : '';

  if (composioEnabled('gmail')) {
    try {
      const cb = `${baseUrl}/api/integrations/composio/callback?toolkit=gmail${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ''}`;
      const { accountId, redirectUrl } = await initiateComposioConnection(session.user.email, 'gmail', cb);
      const response = NextResponse.redirect(redirectUrl);
      response.cookies.set('composio_conn_gmail', accountId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 900,
        path: '/',
      });
      return response;
    } catch (err) {
      console.error('[Composio] Gmail initiate failed — falling back to own OAuth client:', (err as Error).message);
    }
  }

  const redirectUri = `${baseUrl}/api/arcus/v3/oauth/gmail/callback`;
  const state = crypto.randomBytes(16).toString('hex');

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GMAIL_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  const response = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  );

  // Store CSRF state in a cookie (15-minute TTL)
  response.cookies.set('arcus_gmail_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 900,
    path: '/',
  });

  return response;
}
