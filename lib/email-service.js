/**
 * Mailient Email Service — powered by Resend
 * Sends transactional plan emails:
 *   - free  → welcome + upgrade nudge
 *   - starter → celebration + features + feedback invite
 *   - pro   → celebration + features + feedback invite (premium)
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = 'Mailient <onboarding@mailient.xyz>';
const FEEDBACK_EMAIL = 'mailient.xyz@gmail.com';
const TWITTER_HANDLE = 'https://x.com/Maulik_055';
const STARTER_CHECKOUT = 'https://buy.polar.sh/polar_cl_B9DSDJSz1EeVhR8rtLcVgn1vVvjvizMvp0yOs3IQOJW';

/* ─────────────────────────── helpers ─────────────────────────── */

function baseWrapper(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mailient</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background-color: #0a0a0a;
      color: #e5e5e5;
      -webkit-font-smoothing: antialiased;
    }
    a { color: inherit; text-decoration: none; }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a; min-height:100vh; padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%;">

          <!-- HEADER / LOGO -->
          <tr>
            <td style="padding-bottom:32px; text-align:center;">
              <span style="font-size:24px; font-weight:700; letter-spacing:-0.5px; color:#ffffff;">
                ✦ Mailient
              </span>
            </td>
          </tr>

          <!-- CARD -->
          <tr>
            <td style="background:#111111; border:1px solid rgba(255,255,255,0.08); border-radius:20px; overflow:hidden;">
              ${content}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding-top:32px; text-align:center;">
              <p style="font-size:11px; color:rgba(255,255,255,0.25); line-height:1.6;">
                Mailient — AI-powered email intelligence<br/>
                <a href="https://mailient.xyz" style="color:rgba(255,255,255,0.35);">mailient.xyz</a>
                &nbsp;·&nbsp;
                <a href="${TWITTER_HANDLE}" style="color:rgba(255,255,255,0.35);">@Maulik_055</a>
                &nbsp;·&nbsp;
                <a href="mailto:${FEEDBACK_EMAIL}" style="color:rgba(255,255,255,0.35);">${FEEDBACK_EMAIL}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ─────────────────── FREE PLAN EMAIL ─────────────────── */

function buildFreeEmail(name) {
  const displayName = name ? name.split(' ')[0] : 'there';
  const content = `
      <!-- HERO GRADIENT BAR -->
      <tr>
        <td style="height:4px; background:linear-gradient(90deg,#6366f1,#a855f7,#ec4899);"></td>
      </tr>

      <!-- BODY -->
      <tr>
        <td style="padding:40px 40px 36px;">

          <!-- Greeting -->
          <h1 style="font-size:28px; font-weight:700; color:#ffffff; letter-spacing:-0.5px; margin-bottom:8px;">
            Welcome to Mailient, ${displayName}! 🎉
          </h1>
          <p style="font-size:15px; color:rgba(255,255,255,0.55); line-height:1.7; margin-bottom:32px;">
            You're now on the <strong style="color:#e5e5e5;">Free plan</strong> — a great starting point to experience
            the power of AI-driven email intelligence.
          </p>

          <!-- What you get -->
          <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:24px; margin-bottom:28px;">
            <p style="font-size:12px; font-weight:600; color:#6366f1; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:16px;">
              Your Free Plan Includes
            </p>
            <table cellpadding="0" cellspacing="0" width="100%">
              ${freeFeatureRow('✦', 'Sift AI', '1 analysis / day')}
              ${freeFeatureRow('✦', 'Arcus AI', '5 queries / day')}
              ${freeFeatureRow('✦', 'Email Summaries', '3 / day')}
              ${freeFeatureRow('✦', 'Draft Replies', '1 / day')}
              ${freeFeatureRow('✦', 'AI Notes', '2 / month')}
            </table>
          </div>

          <!-- Upgrade CTA -->
          <div style="background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(168,85,247,0.08)); border:1px solid rgba(99,102,241,0.25); border-radius:14px; padding:24px; margin-bottom:28px;">
            <p style="font-size:14px; font-weight:600; color:#a78bfa; margin-bottom:8px;">
              🚀 Unlock the Full Potential
            </p>
            <p style="font-size:14px; color:rgba(255,255,255,0.55); line-height:1.7; margin-bottom:20px;">
              Upgrade to <strong style="color:#e5e5e5;">Starter ($7.99/mo)</strong> and get 10× more AI power — 
              more Sift AI, more Arcus queries, unlimited summaries, and priority features.
            </p>
            <a href="${STARTER_CHECKOUT}" style="display:inline-block; padding:12px 28px; background:linear-gradient(135deg,#6366f1,#a855f7); color:#ffffff; font-weight:600; font-size:14px; border-radius:10px; letter-spacing:0.2px;">
              Upgrade to Starter →
            </a>
          </div>

          <!-- Personal note -->
          <p style="font-size:14px; color:rgba(255,255,255,0.45); line-height:1.7;">
            Have questions or ideas? Reply to this email or reach me directly at 
            <a href="mailto:${FEEDBACK_EMAIL}" style="color:#a78bfa;">${FEEDBACK_EMAIL}</a> — 
            I read every message. You can also find me on 
            <a href="${TWITTER_HANDLE}" style="color:#a78bfa;">X (Twitter)</a>.
          </p>

        </td>
      </tr>

      <!-- SIGNATURE -->
      <tr>
        <td style="padding:0 40px 40px;">
          <div style="border-top:1px solid rgba(255,255,255,0.06); padding-top:24px;">
            <p style="font-size:14px; color:rgba(255,255,255,0.4);">
              With ✦,<br/>
              <strong style="color:rgba(255,255,255,0.7);">Maulik</strong> — Founder, Mailient
            </p>
          </div>
        </td>
      </tr>
    `;
  return baseWrapper(content);
}

function freeFeatureRow(icon, feature, limit) {
  return `
      <tr>
        <td style="padding:6px 0; width:20px; vertical-align:top;">
          <span style="color:#6366f1; font-size:12px;">${icon}</span>
        </td>
        <td style="padding:6px 12px 6px 8px; font-size:14px; color:rgba(255,255,255,0.7);">${feature}</td>
        <td style="padding:6px 0; font-size:13px; color:rgba(255,255,255,0.35); text-align:right;">${limit}</td>
      </tr>
    `;
}

/* ─────────────── STARTER PLAN EMAIL ─────────────── */

function buildStarterEmail(name) {
  const displayName = name ? name.split(' ')[0] : 'there';
  const content = `
      <!-- GRADIENT BAR -->
      <tr>
        <td style="height:4px; background:linear-gradient(90deg,#6366f1,#a855f7);"></td>
      </tr>

      <tr>
        <td style="padding:40px 40px 36px;">

          <!-- Hero -->
          <div style="text-align:center; margin-bottom:36px;">
            <div style="font-size:48px; margin-bottom:16px;">🎊</div>
            <h1 style="font-size:30px; font-weight:700; color:#ffffff; letter-spacing:-0.5px; margin-bottom:8px;">
              You're on Starter, ${displayName}!
            </h1>
            <p style="font-size:15px; color:rgba(255,255,255,0.5); line-height:1.7;">
              Welcome to the smarter side of email. Your Starter plan is now <strong style="color:#a78bfa;">active</strong>.
            </p>
          </div>

          <!-- Feature grid -->
          <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:24px; margin-bottom:28px;">
            <p style="font-size:12px; font-weight:600; color:#6366f1; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:16px;">
              What's Unlocked
            </p>
            <table cellpadding="0" cellspacing="0" width="100%">
              ${planFeatureRow('⚡', 'Sift AI', '10 analyses / day')}
              ${planFeatureRow('🤖', 'Arcus AI', '20 queries / day')}
              ${planFeatureRow('📝', 'Email Summaries', '30 / day')}
              ${planFeatureRow('✍️', 'Draft Replies', '10 / day')}
              ${planFeatureRow('📌', 'AI Notes', '50 / month')}
              ${planFeatureRow('📅', 'Schedule Calls', '30 / month')}
            </table>
          </div>

          <!-- Thanks message -->
          <div style="border:1px solid rgba(99,102,241,0.25); border-radius:14px; padding:24px; margin-bottom:28px; background:rgba(99,102,241,0.05);">
            <p style="font-size:15px; font-weight:600; color:#ffffff; margin-bottom:8px;">
              Thank you for choosing Mailient ✦
            </p>
            <p style="font-size:14px; color:rgba(255,255,255,0.5); line-height:1.7; margin-bottom:16px;">
              Your support means everything — it's what keeps us building. If you have any feedback, ideas, 
              or run into anything, please share it. I personally read every message.
            </p>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:12px;">
                  <a href="mailto:${FEEDBACK_EMAIL}" style="display:inline-block; padding:10px 20px; background:rgba(255,255,255,0.08); color:#e5e5e5; font-size:13px; font-weight:500; border-radius:8px; border:1px solid rgba(255,255,255,0.1);">
                    📧 Send Feedback
                  </a>
                </td>
                <td>
                  <a href="${TWITTER_HANDLE}" style="display:inline-block; padding:10px 20px; background:rgba(255,255,255,0.08); color:#e5e5e5; font-size:13px; font-weight:500; border-radius:8px; border:1px solid rgba(255,255,255,0.1);">
                    𝕏 Find Me on X
                  </a>
                </td>
              </tr>
            </table>
          </div>

          <a href="https://mailient.xyz/home-feed" style="display:block; text-align:center; padding:14px; background:linear-gradient(135deg,#6366f1,#a855f7); color:#ffffff; font-weight:600; font-size:15px; border-radius:12px; letter-spacing:0.2px;">
            Open Mailient Dashboard →
          </a>

        </td>
      </tr>

      <tr>
        <td style="padding:0 40px 40px;">
          <div style="border-top:1px solid rgba(255,255,255,0.06); padding-top:24px;">
            <p style="font-size:14px; color:rgba(255,255,255,0.4);">
              With ✦,<br/>
              <strong style="color:rgba(255,255,255,0.7);">Maulik</strong> — Founder, Mailient
            </p>
          </div>
        </td>
      </tr>
    `;
  return baseWrapper(content);
}

/* ─────────────── PRO PLAN EMAIL ─────────────── */

function buildProEmail(name) {
  const displayName = name ? name.split(' ')[0] : 'there';
  const content = `
      <!-- GOLD GRADIENT BAR -->
      <tr>
        <td style="height:4px; background:linear-gradient(90deg,#f59e0b,#f97316,#ec4899);"></td>
      </tr>

      <tr>
        <td style="padding:40px 40px 36px;">

          <!-- Hero -->
          <div style="text-align:center; margin-bottom:36px;">
            <div style="font-size:48px; margin-bottom:16px;">🏆</div>
            <h1 style="font-size:30px; font-weight:700; color:#ffffff; letter-spacing:-0.5px; margin-bottom:8px;">
              Welcome to Pro, ${displayName}!
            </h1>
            <p style="font-size:15px; color:rgba(255,255,255,0.5); line-height:1.7;">
              You're now on Mailient <strong style="color:#fbbf24;">Pro</strong> — the most powerful plan we offer.
              Everything is unlimited. Go build something amazing.
            </p>
          </div>

          <!-- Unlimited badge -->
          <div style="text-align:center; margin-bottom:28px;">
            <span style="display:inline-block; padding:8px 24px; background:linear-gradient(135deg,rgba(245,158,11,0.2),rgba(236,72,153,0.15)); border:1px solid rgba(245,158,11,0.3); border-radius:40px; font-size:13px; font-weight:600; color:#fbbf24; letter-spacing:0.5px;">
              ✦ UNLIMITED ACCESS — ALL FEATURES
            </span>
          </div>

          <!-- Feature grid -->
          <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:24px; margin-bottom:28px;">
            <p style="font-size:12px; font-weight:600; color:#f59e0b; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:16px;">
              Everything Unlocked
            </p>
            <table cellpadding="0" cellspacing="0" width="100%">
              ${proFeatureRow('⚡', 'Sift AI', 'Unlimited')}
              ${proFeatureRow('🤖', 'Arcus AI', 'Unlimited')}
              ${proFeatureRow('📝', 'Email Summaries', 'Unlimited')}
              ${proFeatureRow('✍️', 'Draft Replies', 'Unlimited')}
              ${proFeatureRow('📌', 'AI Notes', 'Unlimited')}
              ${proFeatureRow('📅', 'Schedule Calls', 'Unlimited')}
            </table>
          </div>

          <!-- Thank you -->
          <div style="border:1px solid rgba(245,158,11,0.2); border-radius:14px; padding:24px; margin-bottom:28px; background:rgba(245,158,11,0.04);">
            <p style="font-size:15px; font-weight:600; color:#ffffff; margin-bottom:8px;">
              Thank you for choosing Pro ✦
            </p>
            <p style="font-size:14px; color:rgba(255,255,255,0.5); line-height:1.7; margin-bottom:16px;">
              You're among our most valued users. Your trust and investment in Mailient Pro genuinely drives 
              us to keep pushing the boundaries of what's possible with AI email intelligence. 
              Any feedback, ideas, or requests — I'd love to hear them.
            </p>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:12px;">
                  <a href="mailto:${FEEDBACK_EMAIL}" style="display:inline-block; padding:10px 20px; background:rgba(255,255,255,0.08); color:#e5e5e5; font-size:13px; font-weight:500; border-radius:8px; border:1px solid rgba(255,255,255,0.1);">
                    📧 ${FEEDBACK_EMAIL}
                  </a>
                </td>
                <td>
                  <a href="${TWITTER_HANDLE}" style="display:inline-block; padding:10px 20px; background:rgba(255,255,255,0.08); color:#e5e5e5; font-size:13px; font-weight:500; border-radius:8px; border:1px solid rgba(255,255,255,0.1);">
                    𝕏 @Maulik_055
                  </a>
                </td>
              </tr>
            </table>
          </div>

          <a href="https://mailient.xyz/home-feed" style="display:block; text-align:center; padding:14px; background:linear-gradient(135deg,#f59e0b,#f97316); color:#ffffff; font-weight:600; font-size:15px; border-radius:12px; letter-spacing:0.2px;">
            Open Mailient Dashboard →
          </a>

        </td>
      </tr>

      <tr>
        <td style="padding:0 40px 40px;">
          <div style="border-top:1px solid rgba(255,255,255,0.06); padding-top:24px;">
            <p style="font-size:14px; color:rgba(255,255,255,0.4);">
              With ✦,<br/>
              <strong style="color:rgba(255,255,255,0.7);">Maulik</strong> — Founder, Mailient
            </p>
          </div>
        </td>
      </tr>
    `;
  return baseWrapper(content);
}

function planFeatureRow(icon, feature, limit) {
  return `
      <tr>
        <td style="padding:7px 0; width:24px; vertical-align:middle; font-size:16px;">${icon}</td>
        <td style="padding:7px 12px 7px 8px; font-size:14px; color:rgba(255,255,255,0.75);">${feature}</td>
        <td style="padding:7px 0; font-size:13px; color:#a78bfa; text-align:right; font-weight:500;">${limit}</td>
      </tr>
    `;
}

function proFeatureRow(icon, feature, limit) {
  return `
      <tr>
        <td style="padding:7px 0; width:24px; vertical-align:middle; font-size:16px;">${icon}</td>
        <td style="padding:7px 12px 7px 8px; font-size:14px; color:rgba(255,255,255,0.75);">${feature}</td>
        <td style="padding:7px 0; font-size:13px; color:#fbbf24; text-align:right; font-weight:500;">${limit}</td>
      </tr>
    `;
}

/* ─────────────────────── PUBLIC API ─────────────────────── */

/**
 * Send a welcome/plan email to a user.
 *
 * @param {object} opts
 * @param {string} opts.toEmail   — recipient email
 * @param {string} [opts.toName] — recipient display name (optional)
 * @param {'free'|'starter'|'pro'} opts.plan — plan type
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export async function sendPlanEmail({ toEmail, toName, plan }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY not set — skipping plan email');
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  if (!toEmail) {
    return { success: false, error: 'No recipient email provided' };
  }

  let subject, htmlBody;

  switch (plan) {
    case 'free':
      subject = '✦ Welcome to Mailient — Your Free Plan is Ready';
      htmlBody = buildFreeEmail(toName);
      break;
    case 'starter':
      subject = '🎊 Welcome to Mailient Starter — You\'re In!';
      htmlBody = buildStarterEmail(toName);
      break;
    case 'pro':
      subject = '🏆 Welcome to Mailient Pro — Unlimited Everything';
      htmlBody = buildProEmail(toName);
      break;
    default:
      console.warn(`⚠️ Unknown plan type: ${plan}`);
      return { success: false, error: `Unknown plan type: ${plan}` };
  }

  try {
    console.log(`📧 Sending ${plan} plan email to ${toEmail}...`);

    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [toEmail],
      subject,
      html: htmlBody,
    });

    if (error) {
      console.error('❌ Resend error:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Plan email sent successfully. ID: ${data.id}`);
    return { success: true, id: data.id };
  } catch (err) {
    console.error('❌ Failed to send plan email:', err);
    return { success: false, error: err.message };
  }
}
