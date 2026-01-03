/**
 * Download Attachment API
 * Downloads email attachments via Gmail API
 */

import { NextResponse } from 'next/server';
// @ts-ignore
import { auth } from '@/lib/auth.js';
import { GmailService } from '@/lib/gmail';
import { decrypt } from '@/lib/crypto.js';
import { DatabaseService } from '@/lib/supabase.js';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const messageId = searchParams.get('messageId');
        const attachmentId = searchParams.get('attachmentId');
        const filename = searchParams.get('filename') || 'attachment';

        if (!messageId || !attachmentId) {
            return NextResponse.json({
                error: 'Missing messageId or attachmentId'
            }, { status: 400 });
        }

        // Authenticate user
        // @ts-ignore
        const session = await (auth as any)();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userEmail = session.user.email;
        let accessToken = (session as any)?.accessToken;
        let refreshToken = (session as any)?.refreshToken;

        // Fetch tokens from database if not in session
        const db = new DatabaseService();
        if (!accessToken || !refreshToken) {
            try {
                const userTokens = await db.getUserTokens(userEmail);
                if (userTokens?.encrypted_access_token) {
                    if (!accessToken) {
                        accessToken = userTokens.encrypted_access_token.includes(':')
                            ? decrypt(userTokens.encrypted_access_token)
                            : userTokens.encrypted_access_token;
                    }
                    if (!refreshToken && userTokens.encrypted_refresh_token) {
                        refreshToken = userTokens.encrypted_refresh_token.includes(':')
                            ? decrypt(userTokens.encrypted_refresh_token)
                            : userTokens.encrypted_refresh_token;
                    }
                }
            } catch (e) {
                console.error('Error fetching tokens from DB:', e);
            }
        }

        if (!accessToken) {
            return NextResponse.json({ error: 'Gmail not connected' }, { status: 401 });
        }

        // Initialize Gmail service
        const gmail = new GmailService(accessToken, refreshToken || '');

        // Fetch attachment
        console.log(`📎 Downloading attachment: ${attachmentId} from message: ${messageId}`);

        const attachment = await gmail.getAttachment(messageId, attachmentId);

        if (!attachment?.data) {
            return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
        }

        // Decode base64 data (Gmail returns URL-safe base64)
        const base64Data = attachment.data.replace(/-/g, '+').replace(/_/g, '/');
        const binaryData = Buffer.from(base64Data, 'base64');

        // Determine content type from filename
        const extension = filename.split('.').pop()?.toLowerCase() || '';
        const contentTypes: Record<string, string> = {
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'csv': 'text/csv',
            'txt': 'text/plain',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'zip': 'application/zip',
            'rar': 'application/x-rar-compressed',
        };

        const contentType = contentTypes[extension] || 'application/octet-stream';

        console.log(`✅ Attachment downloaded: ${filename} (${binaryData.length} bytes)`);

        // Return file as download
        return new NextResponse(binaryData, {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': binaryData.length.toString(),
            },
        });

    } catch (error) {
        console.error('❌ Download attachment error:', error);
        return NextResponse.json(
            { error: 'Failed to download attachment', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
