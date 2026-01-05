import { NextResponse } from 'next/server';
// Import auth with proper typing
const authFunction: () => Promise<{
    user?: {
        email?: string;
        name?: string;
    };
    accessToken?: string;
    refreshToken?: string;
}> = require('@/lib/auth').auth;
import { CalendarService } from '@/lib/calendar';
import { DatabaseService } from '@/lib/supabase';
import { decrypt } from '@/lib/crypto';
import { GmailService } from '@/lib/gmail';
import { subscriptionService, FEATURE_TYPES } from '@/lib/subscription-service';

export async function POST(request: Request) {
    try {
        const session = await authFunction();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.email;

        // Check subscription and feature usage
        const canUse = await subscriptionService.canUseFeature(userId, FEATURE_TYPES.SCHEDULE_CALL);
        if (!canUse) {
            const usage = await subscriptionService.getFeatureUsage(userId, FEATURE_TYPES.SCHEDULE_CALL);
            return NextResponse.json({
                error: 'limit_reached',
                message: `Sorry, but you've exhausted all the credits of ${usage.period === 'daily' ? 'the day' : 'the month'}.`,
                usage: usage.usage,
                limit: usage.limit,
                period: usage.period,
                planType: usage.planType,
                upgradeUrl: '/pricing'
            }, { status: 403 });
        }

        let body;
        try {
            body = await request.json();
        } catch (e) {
            return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
        }

        const { summary, description, startTime, endTime, attendees, notifySender, emailId, provider = 'google' } = body;

        if (!startTime || !endTime) {
            return NextResponse.json({ error: 'Start and end times are required' }, { status: 400 });
        }

        // Get tokens
        let accessToken = session?.accessToken;
        let refreshToken = session?.refreshToken;

        if (!accessToken) {
            const db = new DatabaseService();
            const userTokens = await db.getUserTokens(session.user.email);
            if (userTokens?.encrypted_access_token) {
                accessToken = decrypt(userTokens.encrypted_access_token);
                refreshToken = userTokens.encrypted_refresh_token ? decrypt(userTokens.encrypted_refresh_token) : '';
            }
        }

        if (!accessToken) {
            return NextResponse.json({ error: 'Google account not connected' }, { status: 403 });
        }

        const calendarService = new CalendarService(accessToken, refreshToken);

        // Create the event
        const event = await calendarService.createMeeting({
            summary: summary || 'Meeting with Mailient User',
            description: description || 'Scheduled via Mailient',
            startTime,
            endTime,
            attendees: attendees || [],
            provider
        });

        // Notify the sender if requested
        if (notifySender && emailId) {
            try {
                const gmailService = new GmailService(accessToken, refreshToken);
                const emailDetails = await gmailService.getEmailDetails(emailId);
                const parsedEmail = gmailService.parseEmailData(emailDetails);

                // Better sender email extraction
                let senderEmail = parsedEmail.from;
                const match = senderEmail.match(/\<(.+?)\>|(\S+@\S+)/);
                if (match) {
                    senderEmail = match[1] || match[2];
                }

                if (senderEmail) {
                    // Get the appropriate meeting link based on provider
                    const meetLink = provider === 'zoom'
                        ? ((event as any).zoomLink || 'Zoom link will be in the invitation')
                        : ((event as any).hangoutLink || 'Google Meet link will be in the invitation');
                    const notificationBody = `
Hi there,

I've scheduled a meeting with you on ${new Date(startTime).toLocaleString()}.

Topic: ${summary}
Join here: ${meetLink}

Looking forward to it!

Best regards,
${session.user.name || 'Mailient User'}
`.trim();

                    await gmailService.sendEmail({
                        to: senderEmail,
                        subject: `Confirmed Meeting: ${summary}`,
                        body: notificationBody
                    });
                }
            } catch (notifyErr) {
                console.warn('⚠️ Could not send notification email:', notifyErr);
                // Don't fail the whole request just because email notification failed
            }
        }

        // Increment usage after successful scheduling
        await subscriptionService.incrementFeatureUsage(userId, FEATURE_TYPES.SCHEDULE_CALL);

        return NextResponse.json({ success: true, event });

    } catch (error: any) {
        console.error('❌ Scheduling error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
