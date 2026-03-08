import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.js';
import { DatabaseService } from '@/lib/supabase.js';
import { decrypt } from '@/lib/crypto.js';

// Send email on behalf of the authenticated user for Arcus tasks
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const body = await request.json();
    const { to, subject, content, isHtml = false } = body || {};

    if (!to || !subject || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, content' },
        { status: 400 }
      );
    }

    const db = new DatabaseService();
    const tokens = await db.getUserTokens(session.user.email);

    if (!tokens?.encrypted_access_token) {
      return NextResponse.json(
        { error: 'Gmail not connected. Please sign in with Google.' },
        { status: 400 }
      );
    }

    const accessToken = decrypt(tokens.encrypted_access_token);
    const refreshToken = tokens.encrypted_refresh_token ? decrypt(tokens.encrypted_refresh_token) : '';
    const { GmailService } = await import('@/lib/gmail.ts');
    const gmailService = new GmailService(accessToken, refreshToken);

    const result = await gmailService.sendEmail({
      to,
      subject,
      body: content,
      isHtml,
    });

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      result,
    });
  } catch (error) {
    console.error('Send-email endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to send email', details: error.message },
      { status: 500 }
    );
  }
}

