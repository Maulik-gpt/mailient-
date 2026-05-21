import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../lib/auth.js';
import { getSupabaseAdmin } from '../../../../lib/supabase.js';
import { decrypt } from '../../../../lib/crypto.js';

function encodeRfc822(to: string, subject: string, body: string, threadId?: string): string {
  const lines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    body,
  ];
  return Buffer.from(lines.join('\r\n')).toString('base64url');
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.email.toLowerCase();
    const { to, subject, body, threadId } = await req.json();

    if (!to || !subject || !body) {
      return NextResponse.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 });
    }

    // Fetch Gmail access token — try arcus_integrations first, then user_tokens fallback
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('arcus_integrations')
      .select('access_token')
      .eq('user_id', userId)
      .eq('provider', 'gmail')
      .maybeSingle();

    let accessToken: string | null = null;

    if (data?.access_token) {
      accessToken = decrypt(data.access_token);
    } else {
      // Fallback: tokens stored by Google sign-in flow live in user_tokens
      const { data: tokenRow } = await supabase
        .from('user_tokens')
        .select('encrypted_access_token')
        .eq('user_id', userId)
        .maybeSingle();
      if (tokenRow?.encrypted_access_token) {
        accessToken = decrypt(tokenRow.encrypted_access_token);
      }
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'Gmail not connected. Please connect Gmail in your integrations.' }, { status: 404 });
    }

    const raw = encodeRfc822(to, subject, body, threadId);

    const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(threadId ? { raw, threadId } : { raw }),
      signal: AbortSignal.timeout(12000),
    });

    if (!gmailRes.ok) {
      const errText = await gmailRes.text().catch(() => '');
      console.error(`[send-email] Gmail API error ${gmailRes.status}:`, errText.slice(0, 300));
      return NextResponse.json(
        { error: `Gmail send failed (${gmailRes.status})`, detail: errText.slice(0, 200) },
        { status: gmailRes.status >= 500 ? 502 : 400 }
      );
    }

    const sent = await gmailRes.json();
    return NextResponse.json({ success: true, messageId: sent.id, threadId: sent.threadId });

  } catch (err: any) {
    console.error('[send-email] Unexpected error:', err?.message);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
