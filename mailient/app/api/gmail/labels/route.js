import { GmailService } from '@/lib/gmail.ts';
import { auth } from '@/lib/auth.js';

export async function GET(request) {
  try {
    console.log('=== LABELS API START ===');
    const session = await auth();
    console.log('Labels API session:', { hasSession: !!session, hasAccessToken: !!session?.accessToken, hasRefreshToken: !!session?.refreshToken });

    let accessToken = session?.accessToken;
    let refreshToken = session?.refreshToken;

    if (!accessToken) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        accessToken = authHeader.replace('Bearer ', '');
      }
    }

    if (!accessToken) {
      console.log('No accessToken found for labels API');
      return Response.json({ error: 'No valid session found' }, { status: 401 });
    }

    console.log('Creating GmailService for labels...');
    const gmailService = new GmailService(accessToken, refreshToken);
    const labels = await gmailService.getLabels();
    console.log('Labels fetched successfully:', labels?.labels?.length || 0, 'labels');

    return Response.json(labels);
  } catch (error) {
    console.error('=== ERROR IN LABELS API ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return Response.json(
      { error: 'Failed to fetch labels', details: error.message },
      { status: 500 }
    );
  }
}


