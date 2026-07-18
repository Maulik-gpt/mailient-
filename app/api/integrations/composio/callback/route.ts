/**
 * Composio managed-auth callback — GET /api/integrations/composio/callback
 *
 * Composio redirects the user here after they finish Google consent on
 * Composio's verified client (?toolkit=gmail|gcal). The pending
 * connected-account id rides in the short-lived cookie the initiate route
 * set. We verify the account reached ACTIVE on Composio's side, persist the
 * marker row (`composio:<accountId>` in arcus_integrations.access_token —
 * the token getters resolve the live Google token from Composio on demand),
 * and bounce back to the chat with the same success/error params the
 * connectors modal already understands.
 *
 * No Google tokens ever touch this route — Composio holds and refreshes
 * them; we only store the pointer.
 */

import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore — JS module
import { auth } from '../../../../../lib/auth.js';
// @ts-ignore — JS module
import { getSupabaseAdmin } from '../../../../../lib/supabase.js';
// @ts-ignore — JS module
import { encrypt } from '../../../../../lib/crypto.js';
import { getComposioAccountStatus, COMPOSIO_TOKEN_PREFIX } from '../../../../../lib/arcus/composio';

export const dynamic = 'force-dynamic';

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  // Whitelist the toolkit explicitly. This used to be `=== 'gcal' ? 'gcal' :
  // 'gmail'`, which silently funnelled ANY other value into 'gmail' — so adding
  // a third toolkit would have stored its connection over the user's Gmail row
  // (same user_id, same provider, upsert on conflict) and severed their inbox.
  const raw = url.searchParams.get('toolkit');
  const toolkit: 'gmail' | 'gcal' | 'gmeet' =
    raw === 'gcal' ? 'gcal' : raw === 'gmeet' ? 'gmeet' : 'gmail';
  // The provider name the connectors UI uses for success toasts/status.
  const uiProvider =
    toolkit === 'gcal' ? 'google_calendar' : toolkit === 'gmeet' ? 'google_meet' : 'gmail';
  const fail = (code: string) =>
    NextResponse.redirect(new URL(`/dashboard/agent-talk?error=${code}&provider=${uiProvider}`, request.url));

  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    const userId = session.user.email.toLowerCase();

    const accountId = request.cookies.get(`composio_conn_${toolkit}`)?.value;
    if (!accountId) return fail('composio_no_pending');

    // Composio marks the account ACTIVE when its own Google callback lands —
    // usually before the user's browser reaches us. Poll briefly to absorb
    // the race; FAILED/EXPIRED means the consent was denied or timed out.
    let status = '';
    for (let attempt = 0; attempt < 6; attempt++) {
      status = await getComposioAccountStatus(accountId);
      if (status === 'ACTIVE') break;
      if (status === 'FAILED' || status === 'EXPIRED' || status === 'REVOKED') {
        return fail('composio_denied');
      }
      await sleep(2000);
    }
    if (status !== 'ACTIVE') return fail('composio_pending');

    const supabase = getSupabaseAdmin();
    // arcus_integrations has NO `status` column — writing it fails the upsert
    // (PGRST204). A row existing = connected.
    const { error: dbError } = await supabase.from('arcus_integrations').upsert({
      user_id: userId,
      provider: toolkit,
      access_token: encrypt(`${COMPOSIO_TOKEN_PREFIX}${accountId}`),
      refresh_token: null,
      scopes: [],
      expires_at: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,provider' });
    if (dbError) {
      console.error('[Composio] callback DB store error:', dbError.message);
      return fail('db_store');
    }

    // A fresh Gmail grant invalidates any cached "missing scopes" verdict.
    if (toolkit === 'gmail') {
      try {
        const { invalidateGmailScope } = await import('../../../../../lib/arcus/gmail-scope');
        await invalidateGmailScope(userId);
      } catch { /* cache module optional — non-fatal */ }
    }

    const successUrl = new URL('/dashboard/agent-talk', request.url);
    successUrl.searchParams.set('success', 'connected');
    successUrl.searchParams.set('provider', uiProvider);
    const response = NextResponse.redirect(successUrl);
    response.cookies.delete(`composio_conn_${toolkit}`);
    return response;
  } catch (err) {
    console.error('[Composio] callback error:', (err as Error).message);
    return fail('composio_callback');
  }
}
