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
const TWITTER_HANDLE = 'https://x.com/mailient';
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
    @font-face {
      font-family: 'Satoshi';
      src: url('https://api.fontshare.com/v2/css?f[]=satoshi@700,500,400&display=swap');
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Satoshi', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #fcfcfc;
      color: #1a1a1a;
      -webkit-font-smoothing: antialiased;
    }
    a { color: inherit; text-decoration: none; }
    .glass-card {
      background: #ffffff;
      border: 1px solid #eeeeee;
      border-radius: 24px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.04);
    }
    .footer-link {
      color: #888888;
      text-decoration: none;
    }
    .footer-link:hover {
      color: #1a1a1a;
    }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fcfcfc; min-height:100vh; padding:60px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px; width:100%;">

          <!-- LOGO -->
          <tr>
            <td style="padding-bottom:48px; text-align:center;">
              <span style="font-size:22px; font-weight:700; letter-spacing:-0.5px; color:#000000; font-family:'Satoshi', sans-serif;">
                ✦ Mailient
              </span>
            </td>
          </tr>

          <!-- CONTENT CARD -->
          <tr>
            <td class="glass-card" style="padding:48px;">
              ${content}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding-top:48px; text-align:center;">
              <p style="font-size:12px; color:#999999; line-height:1.6; font-family:'Satoshi', sans-serif;">
                Mailient — AI-powered email intelligence<br/>
                <a href="https://mailient.xyz" class="footer-link">mailient.xyz</a>
                &nbsp;·&nbsp;
                <a href="${TWITTER_HANDLE}" class="footer-link">@mailient</a>
                &nbsp;·&nbsp;
                <a href="mailto:${FEEDBACK_EMAIL}" class="footer-link">support</a>
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
    <h1 style="font-size:32px; font-weight:700; color:#000000; letter-spacing:-0.8px; margin-bottom:16px; font-family:'Satoshi', sans-serif;">
      Welcome to the future of email, ${displayName}.
    </h1>
    <p style="font-size:16px; color:#555555; line-height:1.6; margin-bottom:40px;">
      You've reached a turning point in your productivity. You're now on the Free plan—enough to experience the intelligence of Mailient, but only a fraction of its true power.
    </p>

    <div style="border-top: 1px solid #f0f0f0; border-bottom: 1px solid #f0f0f0; padding: 32px 0; margin-bottom: 40px;">
      <p style="font-size:11px; font-weight:700; color:#999999; letter-spacing:1px; text-transform:uppercase; margin-bottom:20px;">
        Included in your workspace
      </p>
      <table cellpadding="0" cellspacing="0" width="100%">
        ${featureRow('Sift AI', '1 analysis per day')}
        ${featureRow('Arcus AI', '5 queries per day')}
        ${featureRow('Email Summaries', '3 per day')}
        ${featureRow('Draft Replies', '1 per day')}
      </table>
    </div>

    <div style="background:#f9f9f9; border-radius:20px; padding:32px;">
      <h2 style="font-size:18px; font-weight:700; color:#000000; margin-bottom:12px;">Push your limits</h2>
      <p style="font-size:14px; color:#666666; line-height:1.6; margin-bottom:24px;">
        Starter offers 10x more power for $7.99/mo. Deep-dive into Sift, consult Arcus without limits, and never manually summarize an email again.
      </p>
      <a href="${STARTER_CHECKOUT}" style="display:inline-block; padding:12px 32px; background:#000000; color:#ffffff; font-weight:600; font-size:14px; border-radius:12px;">
        Upgrade to Starter
      </a>
    </div>

    <p style="font-size:14px; color:#999999; line-height:1.6; margin-top:40px;">
      Best,<br/>
      The Team at Mailient
    </p>
  `;
  return baseWrapper(content);
}

/* ─────────────── STARTER PLAN EMAIL ─────────────── */

function buildStarterEmail(name) {
  const displayName = name ? name.split(' ')[0] : 'there';
  const content = `
    <h1 style="font-size:32px; font-weight:700; color:#000000; letter-spacing:-0.8px; margin-bottom:16px; font-family:'Satoshi', sans-serif;">
      You're in, ${displayName}.
    </h1>
    <p style="font-size:16px; color:#555555; line-height:1.6; margin-bottom:40px;">
      Welcome to Mailient Starter. Your workspace has been upgraded, and your limits have been removed. It is time to work at the speed of thought.
    </p>

    <div style="border-top: 1px solid #f0f0f0; border-bottom: 1px solid #f0f0f0; padding: 32px 0; margin-bottom: 40px;">
      <p style="font-size:11px; font-weight:700; color:#999999; letter-spacing:1px; text-transform:uppercase; margin-bottom:20px;">
        The Starter Workspace
      </p>
      <table cellpadding="0" cellspacing="0" width="100%">
        ${featureRow('Sift AI', '10 analyses per day')}
        ${featureRow('Arcus AI', '20 queries per day')}
        ${featureRow('Summaries', 'Unlimited')}
        ${featureRow('Drafts', '10 per day')}
        ${featureRow('Scheduling', '30 per month')}
      </table>
    </div>

    <div style="background:#000000; border-radius:20px; padding:32px;">
      <h2 style="font-size:18px; font-weight:700; color:#ffffff; margin-bottom:12px;">Get Started</h2>
      <p style="font-size:14px; color:#888888; line-height:1.6; margin-bottom:24px;">
        Head over to your home feed to see your newly unlocked intelligence in action.
      </p>
      <a href="https://mailient.xyz/home-feed" style="display:inline-block; padding:12px 32px; background:#ffffff; color:#000000; font-weight:600; font-size:14px; border-radius:12px;">
        Open mailient.xyz
      </a>
    </div>

    <p style="font-size:14px; color:#999999; line-height:1.6; margin-top:40px;">
      Thank you for being part of our journey.<br/>
      The Team at Mailient
    </p>
  `;
  return baseWrapper(content);
}

/* ─────────────── PRO PLAN EMAIL ─────────────── */

function buildProEmail(name) {
  const displayName = name ? name.split(' ')[0] : 'there';
  const content = `
    <div style="text-align:center; margin-bottom:40px;">
      <span style="display:inline-block; padding:4px 12px; background:#f0f0f0; border-radius:100px; font-size:10px; font-weight:700; letter-spacing:1px; color:#000000; margin-bottom:16px; text-transform:uppercase;">Mailient Pro</span>
      <h1 style="font-size:36px; font-weight:700; color:#000000; letter-spacing:-1px; margin-bottom:16px; font-family:'Satoshi', sans-serif;">
        Elite Status, ${displayName}.
      </h1>
      <p style="font-size:18px; color:#555555; line-height:1.6;">
        You are now on the Pro plan. Every boundary has been removed. All AI features are now truly unlimited.
      </p>
    </div>

    <div style="border: 1px solid #1a1a1a; border-radius: 24px; padding: 40px; margin-bottom: 40px;">
      <table cellpadding="0" cellspacing="0" width="100%">
        ${proFeatureRow('Sift AI', 'Unlimited')}
        ${proFeatureRow('Arcus AI', 'Unlimited')}
        ${proFeatureRow('Summaries', 'Unlimited')}
        ${proFeatureRow('Drafts', 'Unlimited')}
        ${proFeatureRow('Intelligence', 'Unlimited')}
      </table>
    </div>

    <a href="https://mailient.xyz/home-feed" style="display:block; text-align:center; padding:18px; background:#000000; color:#ffffff; font-weight:700; font-size:16px; border-radius:16px;">
      Enter the Pro Dashboard
    </a>

    <p style="font-size:14px; color:#999999; line-height:1.6; margin-top:40px; text-align:center;">
      You have our full support. Reach out anytime.<br/>
      Team Mailient
    </p>
  `;
  return baseWrapper(content);
}

function featureRow(title, value) {
  return `
    <tr>
      <td style="padding:12px 0; font-size:14px; font-weight:500; color:#1a1a1a; font-family:'Satoshi', sans-serif;">${title}</td>
      <td style="padding:12px 0; font-size:14px; color:#999999; text-align:right; font-family:'Satoshi', sans-serif;">${value}</td>
    </tr>
  `;
}

function proFeatureRow(title, value) {
  return `
    <tr>
      <td style="padding:16px 0; font-size:16px; font-weight:700; color:#000000; font-family:'Satoshi', sans-serif;">${title}</td>
      <td style="padding:16px 0; font-size:15px; font-weight:500; color:#000000; text-align:right; font-family:'Satoshi', sans-serif;">${value}</td>
    </tr>
  `;
}

/* ─────────────────────── PUBLIC API ─────────────────────── */

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
      subject = '✦ Welcome to Mailient';
      htmlBody = buildFreeEmail(toName);
      break;
    case 'starter':
      subject = '✦ Your Starter Plan is Active';
      htmlBody = buildStarterEmail(toName);
      break;
    case 'pro':
      subject = '✦ Welcome to Mailient Pro';
      htmlBody = buildProEmail(toName);
      break;
    default:
      return { success: false, error: `Unknown plan type: ${plan}` };
  }

  try {
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

    return { success: true, id: data.id };
  } catch (err) {
    console.error('❌ Failed to send plan email:', err);
    return { success: false, error: err.message };
  }
}
