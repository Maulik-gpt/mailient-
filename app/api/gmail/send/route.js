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

    // INCREMENTAL VOICE PROFILING: Learn from this new sent email
    if (session?.user?.email && result && !result.error) {
      try {
        const { voiceProfileService } = await import('@/lib/voice-profile-service');
        // Clean body if HTML
        const cleanBody = isHtml ? body.replace(/<[^>]*>?/gm, '').trim() : body;
        // Don't await - let it run in background to keep send fast
        voiceProfileService.addToProfile(session.user.email, cleanBody);
      } catch (profileError) {
        console.warn('⚠️ Failed to incrementally update voice profile:', profileError.message);
      }
    }

    return Response.json(result);
  } catch (error) {
    console.error('Error sending email:', error);
    return Response.json(
      { error: 'Failed to send email', details: error.message },
      { status: 500 }
    );
  }
}


