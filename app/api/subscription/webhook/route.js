import { NextResponse } from 'next/server';
import { subscriptionService, PLANS } from '@/lib/subscription-service';

/**
 * Whop Webhook Handler
 * Handles subscription events from Whop payment gateway
 */
export async function POST(request) {
    try {
        const body = await request.json();
        console.log('🔔 Whop Webhook received:', JSON.stringify(body, null, 2));

        const { action, data } = body;

        if (!action || !data) {
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

        // Validate webhook signature (implement based on Whop's documentation)
        // const signature = request.headers.get('x-whop-signature');
        // const webhookSecret = process.env.WHOP_WEBHOOK_SECRET;
        // if (!subscriptionService.validateWebhookSignature(body, signature, webhookSecret)) {
        //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        // }

        await subscriptionService.handleWebhookEvent({ action, data });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('❌ Whop webhook error:', error);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}

/**
 * GET handler to verify webhook endpoint is working
 */
export async function GET() {
    return NextResponse.json({
        status: 'active',
        message: 'Whop webhook endpoint is ready',
        supported_events: [
            'membership.went_valid',
            'membership.renewed',
            'membership.went_invalid',
            'membership.cancelled'
        ]
    });
}
