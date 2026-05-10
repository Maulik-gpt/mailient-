import { GmailService } from '@/lib/gmail';
import { auth } from '@/lib/auth.js';

export async function POST(request) {
  try {
    const session = await auth();
    let accessToken = session?.accessToken;
    let refreshToken = session?.refreshToken;

    if (!accessToken) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        accessToken = authHeader.replace('Bearer ', '');
      }
    }

    if (!accessToken) {
      return Response.json({ error: 'No valid session found' }, { status: 401 });
    }

    const { to, subject, body, threadId = null, isHtml = false } = await request.json();

    if (!to || !subject || !body) {
      return Response.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 });
    }

    const gmailService = new GmailService(accessToken, refreshToken);
    if (session?.user?.email) {
      gmailService.setUserEmail(session.user.email); // Enable token refresh persistence
    }
    
    const result = await gmailService.createDraft({ to, subject, body, threadId, isHtml });

    return Response.json(result);
  } catch (error) {
    console.error('Error creating Gmail draft:', error);
    return Response.json(
      { error: 'Failed to create draft', details: error.message },
      { status: 500 }
    );
  }
}
