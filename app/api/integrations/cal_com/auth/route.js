import { NextResponse } from 'next/server';
import { auth as getSession } from '@/lib/auth';

export async function GET() {
  // Cal.com cloud has NO OAuth application flow — accounts authenticate with a
  // personal API key. This route used to build an OAuth authorize URL from an
  // (unset) CALCOM_CLIENT_ID, so it redirected the user to Cal.com with
  // `client_id=` empty and dead-ended on Cal.com's "no OAuth client" error
  // page. The real connect path is POST /api/integrations/cal_com/connect with
  // a pasted apiKey. Return a clear, actionable error instead of a broken URL.
  const session = await getSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(
    {
      error: 'cal_com_uses_api_key',
      message: 'Cal.com connects with an API key, not a login popup. Open the connectors panel and paste your Cal.com API key.',
    },
    { status: 400 },
  );
}
