import { NextResponse } from 'next/server';
import { GmailService } from '../../../../lib/gmail.ts';

function getAccessTokenFromHeaders(request) {
  const bearer = request.headers.get('authorization');
  if (bearer?.toLowerCase().startsWith('bearer ')) {
    return bearer.slice(7).trim();
  }
  return request.headers.get('x-gmail-access-token') || null;
}

function normalizeRecipients(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

// Public webhook: Send email for ElevenLabs tool calls
export async function POST(request) {
  try {
    const accessToken = getAccessTokenFromHeaders(request);
    const refreshToken = request.headers.get('x-gmail-refresh-token') || '';
    const userEmail = request.headers.get('x-user-email') || undefined;

    if (!accessToken) {
      return NextResponse.json(
        { error: { code: 'missing_token', message: 'x-gmail-access-token header is required' } },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const to = normalizeRecipients(body.to);
    const cc = normalizeRecipients(body.cc);
    const bcc = normalizeRecipients(body.bcc);
    const subject = body.subject || '';
    const content = body.body || body.content || '';
    const isHtml = !!body.isHtml;

    if (!to.length || !subject || !content) {
      return NextResponse.json(
        { error: { code: 'invalid_input', message: 'to, subject, and body are required' } },
        { status: 400 }
      );
    }

    const gmailService = new GmailService(accessToken, refreshToken);

    // Build a single RFC822 "To" header string (CC/BCC optional)
    const toHeader = to.join(', ');
    const ccHeader = cc.length ? `\r\nCc: ${cc.join(', ')}` : '';
    const bccHeader = bcc.length ? `\r\nBcc: ${bcc.join(', ')}` : '';

    const mimeMessage = [
      `To: ${toHeader}${ccHeader}${bccHeader}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: ${isHtml ? 'text/html' : 'text/plain'}; charset=UTF-8`,
      '',
      content,
    ].join('\r\n');

    const encodedMessage = Buffer.from(mimeMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const result = await gmailService.makeRequest('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      body: JSON.stringify({ raw: encodedMessage }),
    });

    return NextResponse.json({
      success: true,
      status: 'sent',
      user_email: userEmail || null,
      id: result?.id || null,
      thread_id: result?.threadId || null,
      request: { to, cc, bcc, subject, isHtml },
    });
  } catch (error) {
    console.error('send_email webhook error:', error);
    return NextResponse.json(
      { error: { code: 'server_error', message: 'Failed to send email', detail: error.message } },
      { status: 500 }
    );
  }
}

