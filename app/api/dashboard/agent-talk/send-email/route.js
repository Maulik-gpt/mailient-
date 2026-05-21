import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.js';
import { DatabaseService, getSupabaseAdmin } from '@/lib/supabase.js';
import { decrypt } from '@/lib/crypto.js';

// Send email on behalf of the authenticated user for Arcus tasks
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const body = await request.json();
    // Accept both `content` and `body` field names
    const { to, subject, content, body: bodyField, isHtml = false, threadId = null } = body || {};
    const emailBody = content || bodyField;

    if (!to || !subject || !emailBody) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, content' },
        { status: 400 }
      );
    }

    const userEmail = session.user.email.toLowerCase();

    // Try user_tokens first (Google sign-in flow)
    let accessToken = null;
    let refreshToken = '';
    const db = new DatabaseService();
    const tokens = await db.getUserTokens(userEmail);
    if (tokens?.encrypted_access_token) {
      accessToken = decrypt(tokens.encrypted_access_token);
      refreshToken = tokens.encrypted_refresh_token ? decrypt(tokens.encrypted_refresh_token) : '';
    }

    // Fallback: check arcus_integrations (Gmail connected via integrations page)
    if (!accessToken) {
      const supabase = getSupabaseAdmin();
      const { data: integData } = await supabase
        .from('arcus_integrations')
        .select('access_token')
        .eq('user_id', userEmail)
        .eq('provider', 'gmail')
        .maybeSingle();
      if (integData?.access_token) {
        accessToken = decrypt(integData.access_token);
      }
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Gmail not connected. Please sign in with Google.' },
        { status: 400 }
      );
    }

    const { GmailService } = await import('@/lib/gmail.ts');
    const gmailService = new GmailService(accessToken, refreshToken);

    const result = await gmailService.sendEmail({
      to,
      subject,
      body: emailBody,
      isHtml,
      threadId,
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

