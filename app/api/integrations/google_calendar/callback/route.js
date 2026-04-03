import { NextResponse } from 'next/server';
import { auth as getSession } from '@/lib/auth';
import { ArcusIntegrationManager } from '@/lib/arcus-integration-manager';
import { supabase } from '@/lib/supabase';

// Database wrapper
const db = {
  async storeIntegrationCredentials(userEmail, provider, credentials) {
    const { error } = await supabase
      .from('integration_credentials')
      .upsert({
        user_email: userEmail,
        provider,
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken,
        expires_at: credentials.expiresAt,
        scopes: credentials.scopes,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_email,provider'
      });
    
    if (error) throw error;
  },

  async logIntegrationEvent(userEmail, provider, event, metadata = {}) {
    await supabase
      .from('integration_events')
      .insert({
        user_email: userEmail,
        provider,
        event,
        metadata,
        created_at: new Date().toISOString()
      });
  }
};

const integrationManager = new ArcusIntegrationManager(db);

/**
 * GET /api/integrations/google_calendar/callback
 * Handles the OAuth callback from Google specifically for Calendar
 */
export async function GET(request) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.redirect(
        `/dashboard/agent-talk?error=unauthorized`
      );
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    console.log('[Google Calendar Callback] Code received:', !!code, 'Error:', error);

    const provider = 'google_calendar';
    const userEmail = session.user.email;

    // Handle OAuth error from Google
    if (error) {
      console.error(`[Google Calendar Callback] error:`, error, errorDescription);
      return NextResponse.redirect(
        `/dashboard/agent-talk?error=oauth_failed&provider=${provider}&message=${encodeURIComponent(errorDescription || error)}`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `/dashboard/agent-talk?error=missing_code`
      );
    }

    // Exchange code for tokens
    const credentials = await integrationManager.exchangeCode(provider, code);

    // Store credentials
    await integrationManager.storeCredentials(userEmail, provider, credentials);

    // Log success
    await db.logIntegrationEvent(userEmail, provider, 'connected', {
      scopes: credentials.scopes
    });

    // Redirect back to chat with success
    return NextResponse.redirect(
      `/dashboard/agent-talk?success=connected&provider=${provider}`
    );
  } catch (err) {
    console.error('[Google Calendar Callback] Error:', err);
    return NextResponse.redirect(
      `/dashboard/agent-talk?error=exchange_failed&message=${encodeURIComponent(err.message)}`
    );
  }
}
