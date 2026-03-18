import { NextResponse } from 'next/server';
// @ts-ignore
import { auth as nextAuth } from '@/lib/auth.js';
import { Resend } from 'resend';

// ... (keep resend init)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// @ts-ignore
const auth: any = nextAuth;

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { feedback } = await req.json();

        if (!feedback) {
            return NextResponse.json({ error: 'Feedback is required' }, { status: 400 });
        }

        if (!resend) {
            console.error('RESEND_API_KEY is missing. Feedback received:', feedback);
            // Even if email fails, we return success so user doesn't get frustrated
            // You can log this to Supabase later if you want
            return NextResponse.json({ success: true, message: 'Feedback received (logged to console)' });
        }

        const { data, error } = await resend.emails.send({
            from: 'Mailient Feedback <onboarding@resend.dev>',
            to: ['mailient.xyz@gmail.com'],
            subject: `Feedback from ${session.user.name || session.user.email}`,
            text: `
User Email: ${session.user.email}
User Name: ${session.user.name}
Feedback:
${feedback}
            `,
        });

        if (error) {
            console.error('Error sending feedback email:', error);
            // Still return success to user, but log error
            return NextResponse.json({ success: true, message: 'Feedback received, but email failed' });
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Feedback API error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
