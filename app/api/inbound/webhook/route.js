import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase';

/**
 * POST /api/inbound/webhook
 * 
 * Receives forwarded emails from an inbound email parsing service
 * (e.g. SendGrid Inbound Parse, Mailgun, Cloudflare Email Workers).
 * 
 * The webhook extracts the recipient handle from the "to" address,
 * looks up the user, and stores the email for Arcus AI processing.
 * 
 * Supported payload formats:
 *   - JSON: { to, from, subject, text, html }
 *   - Form/Multipart: SendGrid Inbound Parse format
 */
export async function POST(request) {
    try {
        const db = new DatabaseService();

        let emailData;

        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            emailData = await request.json();
        } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
            // SendGrid Inbound Parse sends multipart form data
            const formData = await request.formData();
            emailData = {
                to: formData.get('to') || formData.get('envelope')?.to?.[0],
                from: formData.get('from'),
                subject: formData.get('subject'),
                text: formData.get('text'),
                html: formData.get('html'),
                headers: formData.get('headers'),
                envelope: formData.get('envelope'),
            };

            // Try to parse envelope for more reliable "to" extraction
            if (!emailData.to && formData.get('envelope')) {
                try {
                    const envelope = JSON.parse(formData.get('envelope'));
                    emailData.to = envelope.to?.[0];
                } catch { }
            }
        } else {
            // Try JSON as fallback
            try {
                emailData = await request.json();
            } catch {
                return NextResponse.json({ error: 'Unsupported content type' }, { status: 400 });
            }
        }

        if (!emailData.to || !emailData.from) {
            return NextResponse.json({ error: 'Missing required fields: to, from' }, { status: 400 });
        }

        // Extract the handle from the recipient address
        // e.g. "maulik@inbox.mailient.xyz" => "maulik"
        // or  "John Doe <maulik@inbox.mailient.xyz>" => "maulik"
        const toAddress = emailData.to;
        const emailMatch = toAddress.match(/<?([^@<\s]+)@/);
        const handle = emailMatch?.[1]?.toLowerCase();

        if (!handle) {
            console.error('Inbound webhook: Could not extract handle from:', toAddress);
            return NextResponse.json({ error: 'Could not parse recipient handle' }, { status: 400 });
        }

        console.log(`📨 Inbound email received for handle: ${handle}`);
        console.log(`   From: ${emailData.from}`);
        console.log(`   Subject: ${emailData.subject}`);

        // Look up the user by their handle
        const user = await db.getUserByHandle(handle);

        if (!user) {
            console.warn(`📨 No user found for handle: ${handle}`);
            // Still return 200 to avoid the email service retrying
            return NextResponse.json({
                received: true,
                processed: false,
                reason: 'Unknown recipient handle'
            });
        }

        console.log(`📨 Matched user: ${user.user_id}`);

        // Store the inbound email
        await db.storeInboundEmail(user.user_id, {
            from: emailData.from,
            to: emailData.to,
            subject: emailData.subject,
            text: emailData.text || '',
            html: emailData.html || '',
            threadId: emailData.threadId || null,
        });

        // Update user activity timestamp
        try {
            await db.supabase
                .from('user_profiles')
                .update({
                    last_email_activity: new Date().toISOString(),
                    emails_processed: db.supabase.rpc ? undefined : undefined, // Will increment separately
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user.user_id);

            // Increment emails_processed counter
            await db.supabase.rpc('increment_emails_processed', { uid: user.user_id }).catch(() => {
                // If RPC doesn't exist, do a manual increment
                console.warn('increment_emails_processed RPC not found, skipping counter update');
            });
        } catch (err) {
            console.warn('Failed to update user activity:', err);
        }

        console.log(`✅ Inbound email stored for ${user.user_id}`);

        return NextResponse.json({
            received: true,
            processed: true,
            handle
        });

    } catch (error) {
        console.error('❌ Inbound webhook error:', error);
        // Return 200 even on errors to prevent the email service from retrying
        return NextResponse.json({
            received: true,
            processed: false,
            error: 'Internal processing error'
        });
    }
}

// GET endpoint for webhook verification (some services ping GET first)
export async function GET() {
    return NextResponse.json({ status: 'ok', service: 'mailient-inbound-webhook' });
}
