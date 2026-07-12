import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase';
import { logEvent } from '@/lib/logsso';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const TOTAL_SLOTS = 45;

export async function GET(req: NextRequest) {
  return handleApproval(req);
}

export async function POST(req: NextRequest) {
  return handleApproval(req);
}

async function handleApproval(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get('email')?.trim().toLowerCase();
    const token = url.searchParams.get('token');

    // Simple token auth — matches first 16 chars of AUTH_SECRET
    const expectedToken = process.env.AUTH_SECRET?.replace(/"/g, '').slice(0, 16);
    if (!token || token !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Find the request
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

    if (request.status === 'approved') {
      return new NextResponse(
        renderHtmlResponse('Already Approved', `${request.name} (${email}) was already approved.`, 'info'),
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Update status to approved
    const { error: updateError } = await supabase
      .from('access_requests')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .ilike('email', email);

    if (updateError) {
      console.error('[Approve] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to approve' }, { status: 500 });
    }

    // Get remaining slots
    const { count: approvedCount } = await supabase
      .from('access_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved');

    const slotsRemaining = Math.max(0, TOTAL_SLOTS - (approvedCount || 0));

    // Send approval email to applicant
    if (resend) {
      const signupUrl = `${process.env.NEXTAUTH_URL || 'https://mailient.xyz'}/auth/signup`;

      const approvalHtml = `
        <div style="font-family: 'Satoshi', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #fff; background: #0a0a0a; border-radius: 24px; border: 1px solid rgba(255,255,255,0.08);">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://mailient.xyz/mailient-logo-premium.png" alt="Mailient Logo" style="width: 56px; height: 56px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.1);" />
          </div>

          <div style="text-align: center; margin-bottom: 8px;">
            <span style="display: inline-block; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 999px; padding: 4px 14px; font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #a1a1aa;">
              Access Granted
            </span>
          </div>

          <h1 style="font-size: 32px; font-weight: 800; text-align: center; margin: 20px 0 12px; letter-spacing: -0.03em; background: linear-gradient(180deg, #fff 0%, #a1a1aa 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
            You're in, ${request.name}.
          </h1>

          <p style="text-align: center; color: #71717a; font-size: 15px; line-height: 1.6; margin-bottom: 32px; max-width: 420px; margin-left: auto; margin-right: auto;">
            Your access to Mailient has been approved. You're one of the ${TOTAL_SLOTS - slotsRemaining} founding members — only <strong style="color: #fff;">${slotsRemaining} spots</strong> remain.
          </p>

          <div style="text-align: center; margin-bottom: 32px;">
            <a href="${signupUrl}"
               style="display: inline-block; background: #fff; color: #000; text-decoration: none; padding: 14px 36px; border-radius: 14px; font-weight: 800; font-size: 15px; letter-spacing: -0.02em; box-shadow: 0 20px 40px rgba(255,255,255,0.1);">
              Sign Up Now →
            </a>
          </div>

          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; color: #71717a;">What happens next</p>
            <div style="font-size: 13px; color: #a1a1aa; line-height: 1.7;">
              <p style="margin: 0 0 8px;">
                <span style="color: #fff; margin-right: 8px;">1.</span>
                Click "Sign Up Now" and connect your Gmail
              </p>
              <p style="margin: 0 0 8px;">
                <span style="color: #fff; margin-right: 8px;">2.</span>
                Complete the 2-minute onboarding
              </p>
              <p style="margin: 0 0 8px;">
                <span style="color: #fff; margin-right: 8px;">3.</span>
                Start your trial — wake up to your first morning briefing tomorrow
              </p>
            </div>
          </div>

          <div style="text-align: center; margin-bottom: 24px;">
            <p style="font-size: 12px; color: #52525b; margin: 0;">
              Questions? Reply to this email or DM
              <a href="https://x.com/maulik_5" style="color: #a1a1aa; text-decoration: underline;">@maulik_5 on X</a>
            </p>
          </div>

          <div style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 20px; margin-top: 16px; font-size: 10px; color: #3f3f46; text-align: center; font-family: monospace; letter-spacing: 0.1em;">
            MAILIENT // FOUNDING ACCESS // APPROVED ${new Date().toISOString().split('T')[0]}
          </div>
        </div>
      `;

      await resend.emails.send({
        from: 'Mailient <support@mailient.xyz>',
        to: [email],
        subject: `You're in — your Mailient access is approved`,
        html: approvalHtml,
      }).catch((err: unknown) => {
        console.error('[Approve] Resend error:', err);
      });
    }

    // Log event
    logEvent({
      channel: 'access-requests',
      event: '✅ Access Approved',
      description: `${request.name} (${email}) approved. Slots remaining: ${slotsRemaining}`,
      tags: { email, name: request.name, slotsRemaining },
    });

    // Return a nice HTML page for the admin (since they click from email)
    return new NextResponse(
      renderHtmlResponse(
        'Approved ✓',
        `${request.name} (${email}) has been approved and notified via email. ${slotsRemaining} of ${TOTAL_SLOTS} slots remaining.`,
        'success'
      ),
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error) {
    logEvent({ channel: 'failures', event: '❌ Approve Error', description: String(error) });
    console.error('[Approve] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function renderHtmlResponse(title: string, message: string, type: 'success' | 'info') {
  const bgColor = type === 'success' ? '#059669' : '#3b82f6';
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — Mailient</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0a0a0a; color: #fff; font-family: -apple-system, sans-serif; }
  .card { max-width: 480px; text-align: center; padding: 48px 32px; background: #141414; border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; }
  .badge { display: inline-block; background: ${bgColor}; color: #fff; padding: 6px 16px; border-radius: 999px; font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 16px; }
  h1 { font-size: 28px; font-weight: 800; margin: 0 0 12px; letter-spacing: -0.02em; }
  p { color: #a1a1aa; font-size: 14px; line-height: 1.6; margin: 0; }
</style></head>
<body><div class="card">
  <div class="badge">${title}</div>
  <h1>${type === 'success' ? '🎉' : 'ℹ️'}</h1>
  <p>${message}</p>
</div></body></html>`;
}
