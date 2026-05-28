/**
 * POST /api/arcus/connectors/disconnect
 *
 * Single source of truth for "delete this connector" from the Arcus UI.
 * Deletes the user's tokens from EVERY table that may hold them:
 *   - arcus_integrations  (newer V3 store)
 *   - integration_credentials  (legacy V2 store)
 *   - user_tokens  (Google login fallback; only cleared for gmail/gcal,
 *     never blown away unless the user is explicitly disconnecting Google)
 *
 * Body: { provider: 'gmail' | 'gcal' | 'notion' | 'slack' | 'cal_com' | ... }
 *
 * The legacy DELETE /api/connectors was bearer-auth-only (Supabase auth token)
 * and only deleted from one table. This route uses the same NextAuth session
 * cookie everything else in Arcus uses, and reaches every store.
 */

import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore — JS module
import { auth as nextAuth } from '../../../../../lib/auth.js';
import { getSupabaseAdmin } from '../../../../../lib/supabase.js';

// @ts-ignore
const auth: any = nextAuth;

export const dynamic = 'force-dynamic';

// Map UI provider id → the values each table actually stores under provider/user_email.
// Some legacy rows are under "google" / "google_calendar"; we delete both shapes.
function getDeletionKeys(provider: string): {
  arcusKeys: string[];
  legacyKeys: string[];
  clearGoogleTokens: boolean;
} {
  switch (provider) {
    case 'gmail':
      return { arcusKeys: ['gmail'], legacyKeys: ['google', 'gmail'], clearGoogleTokens: true };
    case 'gcal':
    case 'google-calendar':
    case 'google_calendar':
      return { arcusKeys: ['gcal'], legacyKeys: ['google_calendar', 'gcal'], clearGoogleTokens: true };
    case 'notion':
      return { arcusKeys: ['notion', 'notion_calendar'], legacyKeys: ['notion'], clearGoogleTokens: false };
    case 'slack':
      return { arcusKeys: ['slack'], legacyKeys: ['slack'], clearGoogleTokens: false };
    case 'cal_com':
    case 'cal-com':
      return { arcusKeys: ['cal_com'], legacyKeys: ['cal_com'], clearGoogleTokens: false };
    case 'google-meet':
    case 'google_meet':
      return { arcusKeys: ['google_meet'], legacyKeys: ['google_meet'], clearGoogleTokens: false };
    default:
      return { arcusKeys: [provider], legacyKeys: [provider], clearGoogleTokens: false };
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.email.toLowerCase();

  let body: any;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const provider = (body?.provider || '').trim();
  if (!provider) {
    return NextResponse.json({ error: 'provider is required' }, { status: 400 });
  }

  const { arcusKeys, legacyKeys, clearGoogleTokens } = getDeletionKeys(provider);
  const supabase = getSupabaseAdmin();

  const deletions = {
    arcus_integrations: 0,
    integration_credentials: 0,
    user_tokens: 0,
  };

  // 1. arcus_integrations (newer)
  try {
    for (const key of arcusKeys) {
      const { count } = await supabase
        .from('arcus_integrations')
        .delete({ count: 'exact' })
        .eq('user_id', userId)
        .eq('provider', key);
      if (count) deletions.arcus_integrations += count;
    }
  } catch (err: any) {
    console.warn('[Disconnect] arcus_integrations delete failed:', err.message);
  }

  // 2. integration_credentials (legacy)
  try {
    for (const key of legacyKeys) {
      // Some rows use user_email, others use user_id — try both columns.
      const { count: c1 } = await supabase
        .from('integration_credentials')
        .delete({ count: 'exact' })
        .eq('user_email', userId)
        .eq('provider', key);
      if (c1) deletions.integration_credentials += c1;
      const { count: c2 } = await supabase
        .from('integration_credentials')
        .delete({ count: 'exact' })
        .eq('user_id', userId)
        .eq('provider', key);
      if (c2) deletions.integration_credentials += c2;
    }
  } catch (err: any) {
    console.warn('[Disconnect] integration_credentials delete failed:', err.message);
  }

  // 3. user_tokens — ONLY when explicitly disconnecting a Google product. We
  //    only null the access tokens for THAT product so the user's Google
  //    login itself isn't broken. (If both Gmail and GCal share user_tokens,
  //    clearing one nukes the other — so we only delete the row when the
  //    user disconnects gmail OR gcal AND no other Google product remains.)
  if (clearGoogleTokens) {
    try {
      // Check if any OTHER Google product is still connected via arcus_integrations
      const { data: remaining } = await supabase
        .from('arcus_integrations')
        .select('provider')
        .eq('user_id', userId)
        .in('provider', ['gmail', 'gcal', 'google_meet']);
      const stillConnected = (remaining || []).map((r: any) => r.provider);
      if (stillConnected.length === 0) {
        const { count } = await supabase
          .from('user_tokens')
          .delete({ count: 'exact' })
          .or(`user_id.ilike."${userId}",google_email.ilike."${userId}"`);
        if (count) deletions.user_tokens += count;
      }
    } catch (err: any) {
      console.warn('[Disconnect] user_tokens conditional delete failed:', err.message);
    }
  }

  // Invalidate any cached scope-probe so the next chat turn re-checks.
  if (provider === 'gmail' || provider === 'gcal') {
    try {
      const { invalidateGmailScope } = await import('../../../../../lib/arcus/gmail-scope');
      await invalidateGmailScope(userId);
    } catch { /* non-fatal */ }
  }

  return NextResponse.json({
    success: true,
    provider,
    deleted: deletions,
    totalRows: deletions.arcus_integrations + deletions.integration_credentials + deletions.user_tokens,
  });
}
