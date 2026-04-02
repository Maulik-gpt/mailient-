import { NextResponse } from 'next/server';
import { auth as getSession } from '@/lib/auth';
import { ArcusIntegrationManager } from '@/lib/arcus-integration-manager';
import { supabase } from '@/lib/supabase';

const db = {
  async storeIntegrationCredentials(userEmail, provider, credentials) {
    await supabase.from('integration_credentials').upsert({
      user_email: userEmail,
      provider,
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken,
      expires_at: credentials.expiresAt,
      scopes: credentials.scopes,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_email,provider' });
  },

  async logIntegrationEvent(userEmail, provider, event, metadata = {}) {
    await supabase.from('integration_events').insert({
      user_email: userEmail,
      provider,
      event,
      metadata,
      created_at: new Date().toISOString()
    });
  }
};

const integrationManager = new ArcusIntegrationManager(db);

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session?.user?.email) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/agent-talk?error=unauthorized`);

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const userEmail = session.user.email;
    const provider = 'notion';

    if (!code) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/agent-talk?error=missing_code`);

    const credentials = await integrationManager.exchangeCode(provider, code);
    await integrationManager.storeCredentials(userEmail, provider, credentials);
    await db.logIntegrationEvent(userEmail, provider, 'connected', { scopes: credentials.scopes });

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/agent-talk?success=connected&provider=${provider}`);
  } catch (err) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/agent-talk?error=exchange_failed&message=${encodeURIComponent(err.message)}`);
  }
}
