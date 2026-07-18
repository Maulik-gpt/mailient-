/**
 * Composio-as-login START — GET /api/auth/composio-login/start
 *
 * The entry point when Composio is the SOLE Google touchpoint (COMPOSIO_LOGIN
 * =1). No session required — this is how a brand-new user first authenticates.
 * We initiate a Composio Gmail connection (whose auth config includes the
 * openid/email/profile identity scopes), stash the pending account id, and
 * redirect the user to Composio's consent on Composio's VERIFIED Google client.
 * Our own OAuth client never fires.
 *
 * The connection is keyed to a TEMPORARY user id (we don't know their email
 * yet — that's the whole point). The callback resolves the real identity from
 * the connection and signs them in.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { composioLoginEnabled, initiateComposioConnection } from '../../../../../lib/arcus/composio';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL || new URL(request.url).origin;

  if (!composioLoginEnabled()) {
    // Flag off — fall back to the normal sign-in page (own-client login).
    return NextResponse.redirect(new URL('/auth/signin', baseUrl));
  }

  try {
    // No identity yet — key the pending connection to a random handle. The
    // callback rebinds it to the real email once userinfo resolves.
    const tempUser = `pending_${crypto.randomBytes(12).toString('hex')}`;
    const cb = `${baseUrl}/api/auth/composio-login/callback`;
    const { accountId, redirectUrl } = await initiateComposioConnection(tempUser, 'gmail', cb);

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set('composio_login_account', accountId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 900,
      path: '/',
    });
    return response;
  } catch (err) {
    console.error('[Composio login] initiate failed:', (err as Error).message);
    return NextResponse.redirect(new URL('/auth/signin?error=composio_login_start', baseUrl));
  }
}
