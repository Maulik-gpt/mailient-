import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase';
import { logEvent } from '@/lib/logsso';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function GET(req: NextRequest) {
  return handleRejection(req);
}

export async function POST(req: NextRequest) {
  return handleRejection(req);
}

async function handleRejection(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get('email')?.trim().toLowerCase();
    const token = url.searchParams.get('token');

    const expectedToken = process.env.AUTH_SECRET?.replace(/"/g, '').slice(0, 16);
    const sanitizedToken = token?.replace(/ /g, '+');
    if (!sanitizedToken || sanitizedToken !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: request, error: findError } = await supabase
      .from('access_requests')
      .select('*')
      .ilike('email', email)
      .maybeSingle();

    if (findError || !request) {
      return NextResponse.json(
        { error: 'Access request not found for this email' },
        { status: 404 }
      );
    }

    if (request.status === 'rejected') {
      return new NextResponse(
        renderHtmlResponse('Already Declined', `${request.name} (${email}) was already declined.`),
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Update status
    const { error: updateError } = await supabase
      .from('access_requests')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .ilike('email', email);

    if (updateError) {
      console.error('[Reject] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to reject' }, { status: 500 });
    }

    // Send rejection email to applicant
    if (resend) {
      const rejectionHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 48px 24px; color: #fff; background: #0a0a0a; border-radius: 20px; border: 1px solid rgba(255,255,255,0.06);">
          <div style="text-align: center; margin-bottom: 28px;">
            <img src="https://mailient.xyz/mailient-logo-premium.png" alt="Mailient" style="width: 44px; height: 44px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);" />
          </div>

          <h1 style="font-size: 24px; font-weight: 600; text-align: center; margin: 0 0 12px; letter-spacing: -0.03em; color: #fff;">
            Update on your request
          </h1>

          <p style="text-align: center; color: #71717a; font-size: 14px; line-height: 1.7; margin: 0 0 28px; max-width: 400px; margin-left: auto; margin-right: auto;">
            Hi ${request.name}, thank you for your interest in Mailient. Unfortunately, we're unable to grant access at this time — all founding slots have been claimed.
          </p>

          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 20px; margin-bottom: 28px; text-align: center;">
            <p style="margin: 0; font-size: 13px; color: #a1a1aa; line-height: 1.6;">
              We're opening more slots soon. You'll be the first to know when new spots are available. No action needed — we'll reach out.
            </p>
          </div>

          <div style="text-align: center; margin-bottom: 24px;">
            <a href="https://x.com/maulik_5"
               style="display: inline-block; background: rgba(255,255,255,0.06); color: #a1a1aa; text-decoration: none; padding: 10px 24px; border-radius: 10px; font-weight: 600; font-size: 13px; border: 1px solid rgba(255,255,255,0.08);">
              Follow @maulik_5 for updates
            </a>
          </div>

          <div style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px; margin-top: 8px; font-size: 11px; color: #3f3f46; text-align: center;">
            Mailient · mailient.xyz
          </div>
        </div>
      `;

      await resend.emails.send({
        from: 'Mailient <support@mailient.xyz>',
        to: [email],
        subject: `Update on your Mailient access request`,
        html: rejectionHtml,
      }).catch((err: unknown) => {
        console.error('[Reject] Resend error:', err);
      });
    }

    logEvent({
      channel: 'access-requests',
      event: '❌ Access Declined',
      description: `${request.name} (${email}) was declined and notified.`,
      tags: { email, name: request.name },
    });

    return new NextResponse(
      renderHtmlResponse(
        'Declined',
        `${request.name} (${email}) has been declined and notified via email.`
      ),
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error) {
    logEvent({ channel: 'failures', event: '❌ Reject Error', description: String(error) });
    console.error('[Reject] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function renderHtmlResponse(title: string, message: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — Mailient</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0a0a0a; color: #fff; font-family: -apple-system, sans-serif; }
  .card { max-width: 480px; text-align: center; padding: 48px 32px; background: #141414; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; }
  h1 { font-size: 22px; font-weight: 600; margin: 0 0 12px; letter-spacing: -0.02em; }
  p { color: #a1a1aa; font-size: 14px; line-height: 1.6; margin: 0; }
</style></head>
<body><div class="card">
  <h1>${title}</h1>
  <p>${message}</p>
</div></body></html>`;
}
