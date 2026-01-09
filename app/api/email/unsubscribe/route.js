import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from "@/lib/supabase.js";
import { GmailTokenService } from '@/lib/gmail-token-service';
import { GmailService } from '@/lib/gmail';
import { auth } from '@/lib/auth';
import { subscriptionService } from '@/lib/subscription-service';

// CRITICAL: Force dynamic rendering to prevent build-time evaluation
export const dynamic = 'force-dynamic';

const supabase = new Proxy({}, {
    get: (target, prop) => getSupabaseAdmin()[prop]
});

// Function to create the unsubscribed_emails table if it doesn't exist
async function ensureUnsubscribedEmailsTable() {
    try {
        // Test if the table exists by trying to select from it
        const { error: testError } = await supabase
            .from('unsubscribed_emails')
            .select('id', { head: true, count: 'exact' });

        // If the table doesn't exist, create it
        if (testError && testError.message.includes('does not exist')) {
            console.log('Creating unsubscribed_emails table...');

            const createTableSQL = `
                CREATE TABLE IF NOT EXISTS unsubscribed_emails (
                    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    user_name TEXT,
                    user_email TEXT NOT NULL,
                    email_id TEXT NOT NULL,
                    sender_email TEXT NOT NULL,
                    sender_name TEXT,
                    subject TEXT,
                    received_at TIMESTAMP WITH TIME ZONE,
                    snippet TEXT,
                    category TEXT,
                    unsubscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                
                CREATE INDEX IF NOT EXISTS idx_unsubscribed_emails_user_id ON unsubscribed_emails(user_id);
                CREATE INDEX IF NOT EXISTS idx_unsubscribed_emails_email_id ON unsubscribed_emails(email_id);
                CREATE INDEX IF NOT EXISTS idx_unsubscribed_emails_sender ON unsubscribed_emails(sender_email);
            `;

            const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });

            if (createError) {
                console.error('❌ Error creating unsubscribed_emails table:', createError);
                throw createError;
            }

            console.log('✅ unsubscribed_emails table created successfully');
        } else {
            // Check for missing columns and add them if necessary
            const { data: columns, error: colError } = await supabase.rpc('exec_sql', {
                sql: "SELECT column_name FROM information_schema.columns WHERE table_name = 'unsubscribed_emails'"
            });

            if (!colError && columns) {
                const columnNames = columns.map(c => c.column_name);

                if (!columnNames.includes('user_name')) {
                    console.log('Adding missing user_name column...');
                    await supabase.rpc('exec_sql', { sql: "ALTER TABLE unsubscribed_emails ADD COLUMN IF NOT EXISTS user_name TEXT;" });
                }

                if (!columnNames.includes('user_email')) {
                    console.log('Adding missing user_email column...');
                    await supabase.rpc('exec_sql', { sql: "ALTER TABLE unsubscribed_emails ADD COLUMN IF NOT EXISTS user_email TEXT;" });
                }
            }
        }
    } catch (error) {
        console.error('❌ Error ensuring unsubscribed_emails table:', error);
        // We don't throw here to avoid failing the whole request if table already exists or RPC is limited
    }
}

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const userId = session.user.email;
        const isActive = await subscriptionService.isSubscriptionActive(userId);
        if (!isActive) {
            return NextResponse.json(
                {
                    error: 'subscription_required',
                    message: 'An active subscription is required to use this feature.',
                    upgradeUrl: '/pricing'
                },
                { status: 403 }
            );
        }

        const payload = await request.json();
        const { emailId, subject, sender, senderName, receivedAt, snippet, userName, category } = payload;
        const userEmail = userId;

        if (!emailId || !sender || !userEmail) {
            return NextResponse.json(
                { error: 'Missing required fields: emailId, sender, or userEmail' },
                { status: 400 }
            );
        }

        // 1. Store the unsubscribe request in the database
        await ensureUnsubscribedEmailsTable();

        const insertData = {
            user_id: userId,
            user_name: userName || null,
            user_email: userEmail,
            email_id: emailId,
            sender_email: sender,
            sender_name: senderName,
            subject: subject,
            received_at: receivedAt,
            snippet: snippet,
            category: category,
            unsubscribed_at: new Date().toISOString()
        };

        const { data, error: dbError } = await supabase
            .from('unsubscribed_emails')
            .insert([insertData]);

        if (dbError) {
            console.error('❌ Error storing unsubscribe record:', dbError);
            // Even if DB fails, we try to proceed with Gmail unsubscribe
        }

        // 2. Perform actual Gmail unsubscribe action
        let gmailActionTaken = 'recorded';
        try {
            const tokenService = new GmailTokenService();
            const tokenResult = await tokenService.getGmailTokens(userId);

            if (tokenResult.success && tokenResult.tokens) {
                const gmail = new GmailService(tokenResult.tokens.accessToken, tokenResult.tokens.refreshToken);

                // Get email details to find List-Unsubscribe header
                const emailDetails = await gmail.getEmailDetails(emailId);
                const headers = emailDetails.payload?.headers || [];
                const listUnsubscribe = headers.find(h => h.name.toLowerCase() === 'list-unsubscribe')?.value;
                const listUnsubscribePost = headers.find(h => h.name.toLowerCase() === 'list-unsubscribe-post')?.value;

                console.log('📬 Found List-Unsubscribe:', listUnsubscribe);

                if (listUnsubscribe) {
                    // Modern Gmail-like unsubscribe: look for mailto or http links
                    const mailtoMatch = listUnsubscribe.match(/<mailto:([^>]+)>/);
                    const httpMatch = listUnsubscribe.match(/<(https?:\/\/[^>]+)>/);

                    if (httpMatch && listUnsubscribePost && listUnsubscribePost.includes('List-Unsubscribe=One-Click')) {
                        // One-Click unsubscribe (RFC 8058)
                        console.log('🚀 Triggering One-Click HTTP Unsubscribe:', httpMatch[1]);
                        await fetch(httpMatch[1], {
                            method: 'POST',
                            body: 'List-Unsubscribe=One-Click',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                        });
                        gmailActionTaken = 'one-click-http';
                    } else if (httpMatch) {
                        // Regular HTTP link - we can't always just GET it safely as an agent without user seeing,
                        // but for newsletters it's often a direct link.
                        console.log('🚀 Visiting HTTP Unsubscribe link:', httpMatch[1]);
                        await fetch(httpMatch[1], { method: 'GET' });
                        gmailActionTaken = 'http-link';
                    } else if (mailtoMatch) {
                        // Mailto unsubscribe
                        console.log('🚀 Sending Unsubscribe Email to:', mailtoMatch[1]);
                        const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || 'Unsubscribe';
                        await gmail.sendEmail({
                            to: mailtoMatch[1],
                            subject: `Unsubscribe: ${subject}`,
                            body: 'Please unsubscribe me from this list.'
                        });
                        gmailActionTaken = 'mailto-sent';
                    }
                }

                // As an extra measure (like Gmail's "Mark as spam and unsubscribe"), 
                // we can move the thread to trash so user never sees it again
                await gmail.deleteEmail(emailId);
                console.log('🗑️ Email moved to trash');
                if (gmailActionTaken === 'recorded') gmailActionTaken = 'trashed';
            }
        } catch (gmailError) {
            console.error('❌ Gmail unsubscribe action failed:', gmailError);
            // We still return success because it's recorded in our DB
        }

        return NextResponse.json(
            {
                success: true,
                message: 'Unsubscribed successfully',
                action: gmailActionTaken,
                data
            },
            { status: 200 }
        );

    } catch (error) {
        console.error('❌ Unsubscribe API error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
