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
  }
};

const integrationManager = new ArcusIntegrationManager(db);

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const state = Buffer.from(JSON.stringify({ 
      user: session.user.email,
      provider: 'slack'
    })).toString('base64');

    const authUrl = integrationManager.getAuthUrl('slack', state);
    return NextResponse.json({ url: authUrl });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
