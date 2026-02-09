import { NextResponse } from 'next/server';
import { subscriptionService, PLANS } from '@/lib/subscription-service';

/**
 * Whop Webhook Handler
 * Handles subscription events from Whop payment gateway
 * 
 * CRITICAL: This is the ONLY way subscriptions should be activated.
 * Client-side activation is disabled for security.
 */
export async function POST(request) {
    try {
        const rawBody = await request.text();
        let body;
        try {
            body = rawBody ? JSON.parse(rawBody) : {};
        } catch (e) {
            console.error('❌ Failed to parse webhook payload:', e);
            return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
        }

        console.log('🔔 Whop Webhook received:', JSON.stringify(body, null, 2));

        const { action, data } = body;

        if (!action || !data) {
            console.error('❌ Missing action or data in webhook payload');
            return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
        }

        // Log critical subscription date information from Whop
        if (data.created_at || data.valid_until || data.expires_at) {
            console.log('📅 Whop Date Fields:', {
                created_at: data.created_at ? new Date(data.created_at * 1000).toISOString() : 'N/A',
                valid_until: data.valid_until ? new Date(data.valid_until * 1000).toISOString() : 'N/A',
                expires_at: data.expires_at ? new Date(data.expires_at * 1000).toISOString() : 'N/A',
                user: data.user?.email,
                product: data.product?.id
            });
        }

        // Validate webhook signature (Standard Webhooks spec)
        const webhookSecret = process.env.WHOP_WEBHOOK_SECRET;

        if (!webhookSecret) {
            console.error('❌ CRITICAL: WHOP_WEBHOOK_SECRET environment variable is not set!');
            console.error('❌ Webhook signature verification will fail. Please set this in your environment.');
            // Continue processing but log the error - in production you may want to reject
        }

        const headersObj = Object.fromEntries(request.headers);
        const isValid = subscriptionService.validateWebhookSignature(rawBody, headersObj, webhookSecret);
        if (!isValid) {
            console.warn('❌ Invalid Whop webhook signature');
            console.warn('❌ Headers received:', JSON.stringify(headersObj, null, 2));
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        console.log('✅ Webhook signature validated successfully');

        // CRITICAL: Test Supabase connection before processing
        const connectionOk = await subscriptionService.testConnection();
        if (!connectionOk) {
            console.error('❌ CRITICAL: Cannot process webhook - Supabase connection failed!');
            console.error('❌ Check your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
            // Return 500 so Whop will retry the webhook
            return NextResponse.json({
                error: 'Database connection failed. Please check server logs.'
            }, { status: 500 });
        }

        // Process the webhook event
        console.log(`📬 Processing webhook event: ${action} for user: ${data.user?.email}`);
        await subscriptionService.handleWebhookEvent({ action, data });

        console.log(`✅ Webhook processed successfully: ${action} for ${data.user?.email}`);
        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('❌ Whop webhook error:', error);
        console.error('❌ Error stack:', error.stack);

        // Return 500 so Whop will retry the webhook
        return NextResponse.json({
            error: 'Webhook processing failed',
            message: error.message
        }, { status: 500 });
    }
}

/**
 * GET handler to verify webhook endpoint is working and test Supabase connection
 */
export async function GET() {
    // Test Supabase connection
    let supabaseStatus = 'unknown';
    let supabaseError = null;

    try {
        const connectionOk = await subscriptionService.testConnection();
        supabaseStatus = connectionOk ? 'connected' : 'error';
    } catch (error) {
        supabaseStatus = 'error';
        supabaseError = error.message;
    }

    return NextResponse.json({
        status: 'active',
        message: 'Whop webhook endpoint is ready',
        database: {
            status: supabaseStatus,
            error: supabaseError
        },
        environment: {
            hasWebhookSecret: !!process.env.WHOP_WEBHOOK_SECRET,
            hasSupabaseUrl: !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
            hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
        },
        supported_events: [
            'membership.went_valid',
            'membership.renewed',
            'membership.went_invalid',
            'membership.cancelled'
        ]
    });
}
