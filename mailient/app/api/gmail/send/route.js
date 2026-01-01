import { GmailService } from '../../../../lib/gmail.ts';
import { auth } from '../../../../lib/auth.js';

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

    const emailData = await request.json();
    const { to, subject, body, isHtml = false } = emailData;

    if (!to || !subject || !body) {
      return Response.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 });
    }

    const gmailService = new GmailService(accessToken, refreshToken);
    if (session?.user?.email) {
      gmailService.setUserEmail(session.user.email); // Enable token refresh persistence
    }
    const result = await gmailService.sendEmail({ to, subject, body, isHtml });

    return Response.json(result);
  } catch (error) {
    console.error('Error sending email:', error);
    return Response.json(
      { error: 'Failed to send email', details: error.message },
      { status: 500 }
    );
  }
}


