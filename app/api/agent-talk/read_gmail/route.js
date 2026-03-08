import { NextResponse } from 'next/server';
import { GmailService } from '@/lib/gmail.ts';
import { subscriptionService } from '@/lib/subscription-service.js';

function getAccessTokenFromHeaders(request) {
  const bearer = request.headers.get('authorization');
  if (bearer?.toLowerCase().startsWith('bearer ')) {
    return bearer.slice(7).trim();
  }

  return request.headers.get('x-gmail-access-token') || null;
}

// Public webhook: Read Gmail for ElevenLabs tool calls
export async function POST(request) {
  try {
    const accessToken = getAccessTokenFromHeaders(request);
    const refreshToken = request.headers.get('x-gmail-refresh-token') || '';
    const userEmail = request.headers.get('x-user-email') || undefined;

    if (!userEmail) {
      return NextResponse.json(
        { error: { code: 'missing_user', message: 'x-user-email header is required' } },
        { status: 401 }
      );
    }

    // 🔒 SECURITY: Check access status
    const hasAccess = await subscriptionService.checkAccess(userEmail);
    if (!hasAccess) {
      return NextResponse.json({
        error: {
          message: 'Access required.',
          code: 'subscription_required'
        }
      }, { status: 403 });
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: { code: 'missing_token', message: 'x-gmail-access-token header is required' } },
        { status: 401 }
      );
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      // allow empty body
    }

    const {
      query = 'newer_than:7d',
      max_results = 5,
      thread_id = null,
      include_body = true,
      sort = 'internalDate desc',
    } = body;

    const gmailService = new GmailService(accessToken, refreshToken);

    if (thread_id) {
      const thread = await gmailService.getThreadDetails(thread_id);
      const messages = thread?.messages || [];

      const emails = messages.map((msg) => {
        const parsed = gmailService.parseEmailData(msg);
        const bodyText = include_body ? (parsed.body?.substring(0, 5000) || parsed.snippet || '') : undefined;
        return {
          id: parsed.id || msg.id,
          thread_id: parsed.threadId || thread_id,
          subject: parsed.subject || '(No Subject)',
          from: parsed.from || 'Unknown Sender',
          to: parsed.to || '',
          date: parsed.date || '',
          snippet: parsed.snippet || '',
          labels: parsed.labels || [],
          is_unread: parsed.labels?.includes('UNREAD') || false,
          is_important: parsed.labels?.includes('IMPORTANT') || false,
          body_text: bodyText,
        };
      });

      return NextResponse.json({
        success: true,
        user_email: userEmail || null,
        count: emails.length,
        query,
        thread_id,
        emails,
      });
    }

    const emailsResponse = await gmailService.getEmails(
      Math.min(Number(max_results) || 5, 50),
      query,
      null,
      sort
    );
    const messages = emailsResponse?.messages || [];

    const emails = [];
    for (const message of messages) {
      try {
        const details = await gmailService.getEmailDetails(message.id);
        const parsed = gmailService.parseEmailData(details);
        const bodyText = include_body ? (parsed.body?.substring(0, 5000) || parsed.snippet || '') : undefined;

        emails.push({
          id: message.id,
          thread_id: parsed.threadId || '',
          subject: parsed.subject || '(No Subject)',
          from: parsed.from || 'Unknown Sender',
          to: parsed.to || '',
          date: parsed.date || '',
          snippet: parsed.snippet || '',
          labels: parsed.labels || [],
          is_unread: parsed.labels?.includes('UNREAD') || false,
          is_important: parsed.labels?.includes('IMPORTANT') || false,
          body_text: bodyText,
        });
      } catch (error) {
        console.log('Error processing email for read_gmail webhook:', error.message);
      }
    }

    return NextResponse.json({
      success: true,
      user_email: userEmail || null,
      query,
      count: emails.length,
      emails,
    });
  } catch (error) {
    console.error('read_gmail webhook error:', error);
    return NextResponse.json(
      { error: { code: 'server_error', message: 'Failed to read Gmail', detail: error.message } },
      { status: 500 }
    );
  }
}

