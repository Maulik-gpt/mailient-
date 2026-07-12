import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase';
import { logEvent } from '@/lib/logsso';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const TOTAL_SLOTS = 45;

export async function POST(req: Request) {
  try {
    const { email, name, hasInternationalCard } = await req.json();

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
      const approveUrl = `${process.env.NEXTAUTH_URL || 'https://mailient.xyz'}/api/access-request/approve?email=${encodeURIComponent(trimmedEmail)}&token=${process.env.AUTH_SECRET?.slice(0, 16)}`;

      const adminHtml = `
        <div style="font-family: 'Satoshi', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #111; background: #fff; border-radius: 24px; border: 1px solid #f0f0f0;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://mailient.xyz/mailient-logo-premium.png" alt="Mailient Logo" style="width: 48px; height: 48px; border-radius: 12px; border: 1px solid #f0f0f0;" />
          </div>

          <h2 style="font-size: 22px; font-weight: 800; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 30px; letter-spacing: -0.03em; text-align: center; color: #000;">
            🔔 New Access Request
          </h2>

          <div style="margin-bottom: 25px; background: #fcfcfc; padding: 20px; border-radius: 16px; border: 1px solid #f5f5f5;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: 500; width: 140px;">Name:</td>
                <td style="padding: 8px 0; color: #000; font-weight: 700;">${trimmedName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: 500;">Email:</td>
                <td style="padding: 8px 0; color: #000; font-weight: 700; font-family: monospace;">
                  <a href="mailto:${trimmedEmail}" style="color: #0066cc; text-decoration: none;">${trimmedEmail}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: 500;">Intl Card:</td>
                <td style="padding: 8px 0; color: #000; font-weight: 700;">
                  ${hasInternationalCard ? '✅ Confirmed' : '❌ Not confirmed'}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: 500;">Slots Left:</td>
                <td style="padding: 8px 0; color: #000; font-weight: 700;">${slotsRemaining} of ${TOTAL_SLOTS}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: 500;">Submitted:</td>
                <td style="padding: 8px 0; color: #000;">
                  ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })} (IST)
                </td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${approveUrl}"
               style="background: #000; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 700; font-size: 14px; display: inline-block;">
              ✓ Approve & Send Invite
            </a>
          </div>

          <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin-top: 20px;">
            <p style="margin: 0; font-size: 12px; color: #92400e; font-weight: 600;">⚠️ Remember after approving:</p>
            <p style="margin: 8px 0 0; font-size: 12px; color: #92400e;">
              Add <strong>${trimmedEmail}</strong> to
              <a href="https://console.cloud.google.com/apis/credentials/consent?project=mailient" style="color: #0066cc;">Google Cloud Console → OAuth consent → Test users</a>
              so they can sign in through Google OAuth.
            </p>
          </div>

          <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; font-size: 10px; color: #aaa; text-align: center; font-family: monospace; letter-spacing: 0.05em;">
            ACCESS GATEWAY // MAILIENT // SECURE
          </div>
        </div>
      `;

      await resend.emails.send({
        from: 'Mailient Access <support@mailient.xyz>',
        to: ['mailient.xyz@gmail.com'],
        replyTo: trimmedEmail,
        subject: `[Access Request] ${trimmedName} (${trimmedEmail}) wants in — ${slotsRemaining} slots left`,
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
      message: 'Your access request has been submitted. We\'ll review it and email you within 24 hours.',
      slotsRemaining,
    });
  } catch (error) {
    logEvent({ channel: 'failures', event: '❌ Access Request Error', description: String(error) });
    console.error('[Access Request] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
