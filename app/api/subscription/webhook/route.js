import { NextResponse } from 'next/server';
import { subscriptionService, PLANS } from '@/lib/subscription-service';
import { sendPlanEmail } from '@/lib/email-service';
import crypto from 'crypto';

/**
 * Webhook Handler
 * Handles subscription events from payment gateway (Polar)
 * 
 * Polar uses Standard Webhooks specification for signing
 * https://docs.polar.sh/integrate/webhooks
 */

/**
 * Validate Polar webhook signature using Standard Webhooks spec
 */
function validatePolarWebhook(payload, headers, secret) {
    try {
        if (!secret) {
            console.warn('⚠️ POLAR_WEBHOOK_SECRET not set, skipping validation');
            return true; // Allow in development - REMOVE IN PRODUCTION
        }

        const webhookId = headers['webhook-id'];
        const webhookTimestamp = headers['webhook-timestamp'];
        const webhookSignature = headers['webhook-signature'];

        if (!webhookId || !webhookTimestamp || !webhookSignature) {
            console.error('❌ Missing webhook headers:', { webhookId, webhookTimestamp, webhookSignature });
            return false;
        }

        // Check timestamp is within 5 minutes
        const ts = Number(webhookTimestamp);
        const nowSeconds = Math.floor(Date.now() / 1000);
        if (Math.abs(nowSeconds - ts) > 300) {
            console.error('❌ Webhook timestamp too old');
            return false;
        }

        // Decode secret
        let key = secret.trim();
        if (key.startsWith('polar_whs_')) {
            key = key.slice('polar_whs_'.length);
        } else if (key.startsWith('whsec_')) {
            key = key.slice('whsec_'.length);
        }
        const keyBytes = Buffer.from(key, 'base64');

        // Create signature
        const toSign = `${webhookId}.${webhookTimestamp}.${payload}`;
        const expected = crypto.createHmac('sha256', keyBytes).update(toSign).digest('base64');

        // Check against all signature candidates
        const candidates = webhookSignature.split(' ').map(s => s.trim()).filter(Boolean);
        for (const candidate of candidates) {
            const [version, sig] = candidate.split(',', 2);
            if (version !== 'v1' || !sig) continue;

            if (sig === expected) return true;
        }

        console.error('❌ Signature mismatch');
        return false;
    } catch (error) {
        console.error('❌ Webhook validation error:', error);
        return false;
    }
}



export async function POST(request) {
    try {
        const rawBody = await request.text();
        let body;

        try {
            body = rawBody ? JSON.parse(rawBody) : {};
        } catch (e) {
            console.error('❌ Failed to parse Polar webhook payload:', e);
            return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
        }

        console.log('🔔 Polar Webhook received:', JSON.stringify(body, null, 2));

        // Get headers for validation
        const headers = {};
        request.headers.forEach((value, key) => {
            headers[key.toLowerCase()] = value;
        });

        // Validate webhook signature
        const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
        const isValid = validatePolarWebhook(rawBody, headers, webhookSecret);

        if (!isValid && webhookSecret) {
            console.warn('❌ Invalid Polar webhook signature');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        if (!webhookSecret) {
            console.warn('⚠️ POLAR_WEBHOOK_SECRET not configured - processing without validation');
        }

        // Test Supabase connection
        const connectionOk = await subscriptionService.testConnection();
        if (!connectionOk) {
            console.error('❌ CRITICAL: Supabase connection failed!');
            return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
        }

        // Extract event type and data
        const eventType = body.type || body.event;
        const data = body.data || body;

        console.log(`📬 Processing Polar event: ${eventType}`);

        // Handle different Polar webhook events
        switch (eventType) {
            case 'subscription.created':
            case 'subscription.updated':
            case 'subscription.active':
            case 'checkout.completed':
            case 'order.created': {
                // Get user email from various possible locations (exhaustive search)
                const userEmail = data.customer?.email ||
                    data.user?.email ||
                    data.email ||
                    data.customer_email ||
                    data.metadata?.email ||
                    data.customer?.metadata?.email ||
                    (data.customer?.id && !data.customer.email ? null : data.customer?.email);

                if (!userEmail) {
                    console.error('❌ No user email found in webhook data');
                    console.log('Available data keys:', Object.keys(data));
                    return NextResponse.json({ error: 'No user email in payload' }, { status: 400 });
                }

                const planType = subscriptionService.determinePlanType(data);
                const subscriptionId = data.id || data.subscription_id || data.order_id;

                // Get dates from Polar
                const polarDates = {
                    createdAt: data.created_at ? new Date(data.created_at).getTime() / 1000 : null,
                    validUntil: data.current_period_end ? new Date(data.current_period_end).getTime() / 1000 : null,
                    expiresAt: data.cancel_at ? new Date(data.cancel_at).getTime() / 1000 : null,
                    isRenewal: eventType === 'subscription.updated'
                };

                console.log(`✅ Activating ${planType} plan for ${userEmail}`);
                console.log('📅 Polar dates:', polarDates);
                console.log('🆔 Subscription ID:', subscriptionId);

                // Activate subscription
                const activated = await subscriptionService.activateSubscription(
                    userEmail,
                    planType,
                    subscriptionId,
                    polarDates
                );

                console.log(`✅ Subscription activation result:`, !!activated);

                // Send welcome email only on brand-new subscriptions (not monthly renewals)
                const isRenewal = eventType === 'subscription.updated';
                if (activated && !isRenewal && (planType === 'starter' || planType === 'pro')) {
                    const customerName = data.customer?.name || data.user?.name || null;
                    sendPlanEmail({ toEmail: userEmail, toName: customerName, plan: planType })
                        .then(result => {
                            if (result.success) console.log(`📧 Welcome email sent for ${planType} plan → ${userEmail}`);
                            else console.warn(`⚠️ Welcome email failed for ${userEmail}:`, result.error);
                        })
                        .catch(err => console.error('❌ Email send threw unexpectedly:', err));
                }
                break;
            }

            case 'subscription.canceled':
            case 'subscription.cancelled':
            case 'subscription.revoked':
            case 'subscription.deleted': {
                const cancelEmail = data.customer?.email || data.user?.email || data.email;
                if (cancelEmail) {
                    console.log(`❌ Cancelling subscription for: ${cancelEmail}`);
                    await subscriptionService.cancelSubscription(cancelEmail);
                }
                break;
            }

            default:
                console.log(`ℹ️ Unhandled Polar event type: ${eventType}`);
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('❌ Polar webhook error:', error);
        return NextResponse.json({ error: 'Webhook processing failed', details: error.message }, { status: 500 });
    }
}

/**
 * GET handler to verify webhook endpoint is working
 */
export async function GET() {
    let supabaseStatus = 'unknown';

    try {
        const connectionOk = await subscriptionService.testConnection();
        supabaseStatus = connectionOk ? 'connected' : 'error';
    } catch (error) {
        supabaseStatus = 'error';
    }

    return NextResponse.json({
        status: 'active',
        message: 'Webhook endpoint is ready',
        database: supabaseStatus,
        environment: {
            hasWebhookSecret: !!process.env.POLAR_WEBHOOK_SECRET,
            hasSupabaseUrl: !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
            hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            hasResendKey: !!process.env.RESEND_API_KEY
        },
        supported_events: [
            'subscription.created',
            'subscription.updated',
            'subscription.active',
            'subscription.canceled',
            'subscription.revoked',
            'checkout.completed',
            'order.created'
        ]
    });
}
