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
    const { data: rows } = await db.supabase
      .from('integration_credentials')
      .select('provider')
      .eq('user_email', userEmail);

    const connected = new Set((rows || []).map(r => r.provider));

    // notion_calendar shares the notion token
    if (connected.has('notion')) connected.add('notion_calendar');
    // google_meet shares the google_calendar token
    if (connected.has('google_calendar')) connected.add('google_meet');

    const PROVIDERS = ['google_calendar', 'google_meet', 'notion', 'notion_calendar', 'slack', 'cal_com'];
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
