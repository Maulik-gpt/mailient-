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

        const emailContent = `
            <div style="font-family: 'Satoshi', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #111;">
                <h2 style="font-size: 24px; font-weight: 800; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 30px; tracking: -0.05em;">New User Intelligence Feedback</h2>
                
                <div style="margin-bottom: 40px;">
                    <p style="font-size: 14px; text-transform: uppercase; color: #666; font-weight: 700; margin-bottom: 10px; letter-spacing: 0.1em;">Message</p>
                    <p style="font-size: 18px; line-height: 1.6; color: #000; background: #f9f9f9; padding: 30px; border-radius: 12px; font-style: italic;">
                        "${feedback}"
                    </p>
                </div>

                <div style="border: 1px solid #eee; padding: 25px; border-radius: 12px; background: #fff;">
                    <p style="font-size: 12px; text-transform: uppercase; color: #999; font-weight: 700; margin-bottom: 15px; letter-spacing: 0.1em;">Reporter Context</p>
                    <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #666; width: 100px;">User</td>
                            <td style="padding: 8px 0; font-weight: 700; color: #000;">${session.user?.name || 'Anonymous Intelligence'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #666;">ID</td>
                            <td style="padding: 8px 0; font-family: monospace; color: #444;">${session.user?.email || 'Unknown Source'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #666;">Timestamp</td>
                            <td style="padding: 8px 0; color: #444;">${new Date().toLocaleString()}</td>
                        </tr>
                    </table>
                </div>

                <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #aeaeae;">
                    Sent via Mailient Intelligence Router.
                </div>
            </div>
        `;

        const { data, error } = await resend.emails.send({
            from: 'Feedback <feedback@mailient.xyz>',
            to: ['mailient.xyz@gmail.com'],
            subject: `[Mailient Intelligence] New Feedback from ${session.user?.name || 'User'}`,
            html: emailContent,
        });

        if (error) {
            console.error('Resend error:', error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Feedback API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
