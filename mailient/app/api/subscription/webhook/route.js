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
