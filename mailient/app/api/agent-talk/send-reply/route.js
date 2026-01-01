import { NextResponse } from 'next/server';
import { auth } from '../../../../lib/auth.js';
import { DatabaseService } from '../../../../lib/supabase.js';
import { decrypt } from '../../../../lib/crypto.js';

/**
 * Send reply endpoint for Arcus draft replies
 * Uses session authentication instead of header tokens
 */
export async function POST(request) {
    try {
        const session = await auth();

        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { to, subject, content, replyToMessageId, threadId } = body;

        if (!to || !content) {
            return NextResponse.json(
                { error: 'Recipient (to) and content are required' },
                { status: 400 }
            );
        }

        // Get user tokens from database
        const db = new DatabaseService();
        const userTokens = await db.getUserTokens(session.user.email);

        if (!userTokens?.encrypted_access_token) {
            return NextResponse.json(
                { error: 'Gmail not connected. Please sign in with Google.' },
                { status: 403 }
            );
        }

        const accessToken = decrypt(userTokens.encrypted_access_token);
        const refreshToken = userTokens.encrypted_refresh_token
            ? decrypt(userTokens.encrypted_refresh_token)
            : '';

        // Import Gmail service
        const { GmailService } = await import('../../../../lib/gmail');
        const gmailService = new GmailService(accessToken, refreshToken);

        // Build the email message
        const fromEmail = session.user.email;
        const fromName = session.user.name || '';

        // Create proper MIME message
        const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        let mimeMessage = [
            `From: ${fromName ? `${fromName} <${fromEmail}>` : fromEmail}`,
            `To: ${to}`,
            `Subject: ${subject || 'Re: Your email'}`,
            `MIME-Version: 1.0`,
            `Content-Type: text/plain; charset=UTF-8`,
            `Content-Transfer-Encoding: 7bit`,
        ];

        // Add References and In-Reply-To headers for proper threading
        if (replyToMessageId) {
            mimeMessage.push(`In-Reply-To: ${replyToMessageId}`);
            mimeMessage.push(`References: ${replyToMessageId}`);
        }

        mimeMessage.push(''); // Empty line before body
        mimeMessage.push(content);

        const rawMessage = mimeMessage.join('\r\n');

        // Encode for Gmail API
        const encodedMessage = Buffer.from(rawMessage)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        // Send the email
        const sendPayload = { raw: encodedMessage };

        // If we have a threadId, include it for proper threading
        if (threadId) {
            sendPayload.threadId = threadId;
        }

        const result = await gmailService.makeRequest(
            'https://www.googleapis.com/gmail/v1/users/me/messages/send',
            {
                method: 'POST',
                body: JSON.stringify(sendPayload),
            }
        );

        console.log('✅ Email sent successfully:', result?.id);

        // Log the sent email for analytics
        try {
            await db.logEmailAction(session.user.email, 'send_reply', {
                messageId: result?.id,
                threadId: result?.threadId,
                to: to,
                subject: subject,
                sentAt: new Date().toISOString()
            });
        } catch (logError) {
            console.warn('Failed to log email action:', logError);
        }

        return NextResponse.json({
            success: true,
            messageId: result?.id,
            threadId: result?.threadId,
            message: 'Email sent successfully'
        });

    } catch (error) {
        console.error('❌ Send reply error:', error);

        // Handle specific Gmail API errors
        if (error.message?.includes('401') || error.message?.includes('invalid_grant')) {
            return NextResponse.json(
                { error: 'Gmail session expired. Please sign out and sign in again.' },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to send email', detail: error.message },
            { status: 500 }
        );
    }
}
