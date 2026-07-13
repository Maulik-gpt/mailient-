import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase';
import { logEvent } from '@/lib/logsso';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const TOTAL_SLOTS = 45;

export async function POST(req: Request) {
  try {
    const { email, name, xHandle, hasInternationalCard } = await req.json();

    // --- Validation ---
    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    if (trimmedName.length < 2) {
      return NextResponse.json(
        { error: 'Please enter your full name' },
        { status: 400 }
      );
    }

    if (!hasInternationalCard) {
      return NextResponse.json(
        { error: 'An international payment card (Visa, Mastercard, Amex) is required to use Mailient' },
        { status: 400 }
      );
    }

    // --- Insert into Supabase ---
    const supabase = getSupabaseAdmin();

    // Check for duplicate
    const { data: existing } = await supabase
      .from('access_requests')
      .select('id, status')
      .ilike('email', trimmedEmail)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'approved') {
        return NextResponse.json({
          success: true,
          alreadyApproved: true,
          message: 'Great news — you\'ve already been approved! Check your email for the sign-up link.',
        });
      }
      return NextResponse.json({
        success: true,
        alreadyRequested: true,
        message: 'You\'ve already requested access. We\'ll email you once approved.',
      });
    }

    const { error: insertError } = await supabase
      .from('access_requests')
      .insert({
        email: trimmedEmail,
        name: trimmedName,
        has_international_card: hasInternationalCard,
        x_handle: xHandle || null,
        status: 'pending',
      });

    if (insertError) {
      console.error('[Access Request] Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to submit request. Please try again.' },
        { status: 500 }
      );
    }

    // --- Get slot count ---
    const { count: approvedCount } = await supabase
      .from('access_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved');

    const slotsRemaining = Math.max(0, TOTAL_SLOTS - (approvedCount || 0));

    // --- Send admin notification email ---
    if (resend) {
      const authToken = process.env.AUTH_SECRET?.replace(/"/g, '').slice(0, 16);
      const baseUrl = process.env.NEXTAUTH_URL || 'https://mailient.xyz';
      const approveUrl = `${baseUrl}/api/access-request/approve?email=${encodeURIComponent(trimmedEmail)}&token=${encodeURIComponent(authToken || '')}`;
      const rejectUrl = `${baseUrl}/api/access-request/reject?email=${encodeURIComponent(trimmedEmail)}&token=${encodeURIComponent(authToken || '')}`;
      const userXHandle = xHandle ? xHandle.replace('@', '').trim() : null;
      const dmUrl = userXHandle ? `https://x.com/${encodeURIComponent(userXHandle)}` : null;

      const adminHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #111; background: #fff; border-radius: 20px; border: 1px solid #f0f0f0;">
          <div style="text-align: center; margin-bottom: 24px;">
            <img src="https://mailient.xyz/mailient-logo-premium.png" alt="Mailient" style="width: 40px; height: 40px; border-radius: 10px; border: 1px solid #f0f0f0;" />
          </div>

          <h2 style="font-size: 20px; font-weight: 600; text-align: center; margin: 0 0 24px; letter-spacing: -0.03em; color: #000;">
            New access request
          </h2>

          <div style="margin-bottom: 24px; background: #fafafa; padding: 20px; border-radius: 14px; border: 1px solid #f0f0f0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 7px 0; color: #888; font-weight: 500; width: 120px;">Name</td>
                <td style="padding: 7px 0; color: #000; font-weight: 600;">${trimmedName}</td>
              </tr>
              <tr>
                <td style="padding: 7px 0; color: #888; font-weight: 500;">Email</td>
                <td style="padding: 7px 0; color: #000; font-weight: 600; font-family: ui-monospace, monospace; font-size: 13px;">
                  <a href="mailto:${trimmedEmail}" style="color: #0066cc; text-decoration: none;">${trimmedEmail}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 7px 0; color: #888; font-weight: 500;">Intl card</td>
                <td style="padding: 7px 0; color: #000; font-weight: 600;">
                  ${hasInternationalCard ? '✅ Confirmed' : '—'}
                </td>
              </tr>
              ${userXHandle ? `
              <tr>
                <td style="padding: 7px 0; color: #888; font-weight: 500;">X Handle</td>
                <td style="padding: 7px 0; color: #000; font-weight: 600;">
                  <a href="${dmUrl}" style="color: #0066cc; text-decoration: none;">@${userXHandle}</a>
                </td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 7px 0; color: #888; font-weight: 500;">Slots left</td>
                <td style="padding: 7px 0; color: #000; font-weight: 600;">${slotsRemaining} of ${TOTAL_SLOTS}</td>
              </tr>
              <tr>
                <td style="padding: 7px 0; color: #888; font-weight: 500;">Submitted</td>
                <td style="padding: 7px 0; color: #555; font-size: 13px;">
                  ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })} IST
                </td>
              </tr>
            </table>
          </div>

          <!-- Action buttons -->
          <div style="text-align: center; margin: 28px 0 16px;">
            <a href="${approveUrl}"
               style="display: inline-block; background: #000; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 600; font-size: 14px; margin-right: 8px;">
              Approve
            </a>
            <a href="${rejectUrl}"
               style="display: inline-block; background: #fff; color: #000; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 600; font-size: 14px; border: 1px solid #e5e5e5;">
              Decline
            </a>
          </div>

          ${userXHandle ? `
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${dmUrl}"
               style="display: inline-block; color: #666; text-decoration: none; padding: 8px 20px; font-size: 13px; font-weight: 500;">
              or chat with them on X →
            </a>
          </div>
          ` : ''}

          <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 14px 16px; margin-top: 8px;">
            <p style="margin: 0; font-size: 12px; color: #92400e; line-height: 1.5;">
              <strong>After approving:</strong> add <strong>${trimmedEmail}</strong> to
              <a href="https://console.cloud.google.com/apis/credentials/consent?project=mailient" style="color: #0066cc;">Google Cloud Console → OAuth → Test users</a>
            </p>
          </div>

          <div style="border-top: 1px solid #f0f0f0; padding-top: 16px; margin-top: 24px; font-size: 11px; color: #ccc; text-align: center;">
            Mailient · Access Gateway
          </div>
        </div>
      `;

      await resend.emails.send({
        from: 'Mailient Access <support@mailient.xyz>',
        to: ['mailient.xyz@gmail.com'],
        replyTo: trimmedEmail,
        subject: `${trimmedName} requested access — ${slotsRemaining} slots left`,
        html: adminHtml,
      }).catch((err: unknown) => {
        console.error('[Access Request] Resend error:', err);
      });
    }

    // --- Log event ---
    logEvent({
      channel: 'access-requests',
      event: '🔑 New Access Request',
      description: `${trimmedName} (${trimmedEmail}) requested access. Intl card: ${hasInternationalCard}. Slots remaining: ${slotsRemaining}`,
      tags: { email: trimmedEmail, name: trimmedName, slotsRemaining },
    });

    return NextResponse.json({
      success: true,
      message: 'Your request has been submitted. We\'ll review it and email you within 24 hours.',
      slotsRemaining,
    });
  } catch (error) {
    logEvent({ channel: 'failures', event: '❌ Access Request Error', description: String(error) });
    console.error('[Access Request] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
