/**
 * Arcus V3 — Notion OAuth Callback
 * 
 * Handles the redirect from Notion after the user consents.
 * Exchanges the authorization code for an access token, encrypts it,
 * and stores it in arcus_integrations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../../lib/auth.js';
import { getSupabaseAdmin } from '../../../../../../../lib/supabase.js';
import { encrypt } from '../../../../../../../lib/crypto.js';
import { auditLogger } from '../../../../../../../lib/audit-logger.js';

export async function GET(request: NextRequest) {
  try {
    // 1. Verify user is authenticated
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    const userId = session.user.email.toLowerCase();

    // 2. Extract params
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('[Arcus V3] Notion OAuth error:', error);
      return NextResponse.redirect(new URL('/dashboard/agent-talk?error=notion_denied', request.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL('/dashboard/agent-talk?error=no_code', request.url));
    }

    // 3. Validate CSRF state
    const storedState = request.cookies.get('arcus_notion_state')?.value;
    if (!state || !storedState || state !== storedState) {
      console.error('[Arcus V3] Notion OAuth state mismatch');
      return NextResponse.redirect(new URL('/dashboard/agent-talk?error=csrf', request.url));
    }

    // 4. Exchange code for access token
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/arcus/v3/oauth/notion/callback`;
    
    const clientId = process.env.NOTION_CLIENT_ID || '';
    const clientSecret = process.env.NOTION_CLIENT_SECRET || '';
    const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${encoded}`,
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[Arcus V3] Notion token exchange failed:', errorText);
      return NextResponse.redirect(new URL('/dashboard/agent-talk?error=token_exchange', request.url));
    }

    const data = await tokenResponse.json();
    const { access_token, workspace_name, workspace_icon, workspace_id, bot_id } = data;

    if (!access_token) {
      return NextResponse.redirect(new URL('/dashboard/agent-talk?error=no_token', request.url));
    }

    // 5. Store encrypted token in arcus_integrations
    const supabase = getSupabaseAdmin();
    const { error: dbError } = await supabase
      .from('arcus_integrations')
      .upsert({
        user_id: userId,
        provider: 'notion',
        access_token: encrypt(access_token),
        workspace_info: {
          workspace_name,
          workspace_icon,
          workspace_id,
          bot_id,
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,provider' });

    if (dbError) {
      console.error('[Arcus V3] DB store error:', dbError.message);
      return NextResponse.redirect(new URL('/dashboard/agent-talk?error=db_store', request.url));
    }

    // 6. Audit log
    await auditLogger.log(userId, 'arcus.notion_connected', {
      workspaceName: workspace_name,
      workspaceId: workspace_id,
    });

    // 7. Clear state cookie and redirect to the agent dashboard with success signal
    const successUrl = new URL('/dashboard/agent-talk', request.url);
    successUrl.searchParams.set('success', 'connected');
    successUrl.searchParams.set('provider', 'notion');
    const response = NextResponse.redirect(successUrl);
    response.cookies.delete('arcus_notion_state');
    return response;

  } catch (error) {
    console.error('[Arcus V3] Notion callback error:', (error as Error).message);
    return NextResponse.redirect(new URL('/dashboard/agent-talk?error=callback', request.url));
  }
}
