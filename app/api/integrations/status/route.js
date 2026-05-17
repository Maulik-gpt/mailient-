import { DatabaseService } from '@/lib/supabase.js';
import { auth } from '@/lib/auth.js';

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({ error: 'No session' }, { status: 401 });
    }

    const { integrationId, enabled } = await request.json();

    if (!integrationId) {
      return Response.json({ error: 'Missing integrationId' }, { status: 400 });
    }

    const db = new DatabaseService();
    await db.updateIntegrationStatus(session.user.email, integrationId, enabled);

    return Response.json({ success: true });

  } catch (error) {
    console.error('Error updating integration status:', error);
    return Response.json({ error: 'Failed to update status' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({ error: 'No session' }, { status: 401 });
    }
    const userEmail = session.user.email.toLowerCase();

    const db = new DatabaseService();
    // Check both tables: legacy integration_credentials and V3 arcus_integrations
    const [{ data: legacyRows }, { data: v3Rows }] = await Promise.all([
      db.supabase.from('integration_credentials').select('provider').eq('user_email', userEmail),
      db.supabase.from('arcus_integrations').select('provider').eq('user_id', userEmail),
    ]);

    const connected = new Set([
      ...(legacyRows || []).map(r => r.provider),
      // Map V3 provider names to UI names
      ...(v3Rows || []).map(r => r.provider === 'gcal' ? 'google_calendar' : r.provider),
    ]);

    // Derived connections
    if (connected.has('notion')) connected.add('notion_calendar');
    if (connected.has('google_calendar')) connected.add('google_meet');

    const PROVIDERS = ['gmail', 'google_calendar', 'google_meet', 'notion', 'notion_calendar', 'slack', 'cal_com'];
    const integrations = PROVIDERS.map(provider => ({
      provider,
      connected: connected.has(provider),
    }));

    return Response.json({ integrations });

  } catch (error) {
    console.error('Error getting integration status:', error);
    return Response.json({ error: 'Failed to get status' }, { status: 500 });
  }
}
