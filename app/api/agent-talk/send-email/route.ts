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

    // Fetch Gmail access token
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('arcus_integrations')
      .select('access_token')
      .eq('user_id', userId)
      .eq('provider', 'gmail')
      .maybeSingle();

    if (error || !data?.access_token) {
      return NextResponse.json({ error: 'Gmail not connected' }, { status: 404 });
    }

    const accessToken = decrypt(data.access_token);
    if (!accessToken) {
      return NextResponse.json({ error: 'Token decryption failed' }, { status: 500 });
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
