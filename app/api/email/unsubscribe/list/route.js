import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from "@/lib/supabase.js";
import { auth } from '@/lib/auth';

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
        }
    } catch (error) {
        console.error('❌ Error ensuring unsubscribed_emails table:', error);
    }
}

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const userId = session.user.email;

        // Ensure the table exists
        await ensureUnsubscribedEmailsTable();

        // Fetch all unsubscribed emails from the database
        const { data, error } = await supabase
            .from('unsubscribed_emails')
            .select('email_id')
            .eq('user_id', userId);

        if (error) {
            console.error('❌ Error fetching unsubscribed emails:', error);
            return NextResponse.json(
                { success: false, error: 'Failed to fetch unsubscribed emails' },
                { status: 500 }
            );
        }

        console.log('✅ Fetched unsubscribed emails successfully:', data);

        return NextResponse.json(
            { success: true, emails: data },
            { status: 200 }
        );

    } catch (error) {
        console.error('❌ List unsubscribed emails API error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
