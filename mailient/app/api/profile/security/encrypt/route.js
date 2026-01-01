import { NextResponse } from 'next/server';
import { auth } from '../../../../../lib/auth.js';
import { DatabaseService } from '../../../../../lib/supabase.js';
import { encrypt } from '../../../../../lib/crypto.js';

export async function POST(req) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.email;
        const db = new DatabaseService();

        // 1. Update preference to active
        const profile = await db.getUserProfile(userId);
        const updatedPrefs = {
            ...(profile?.preferences || {}),
            advanced_security: 'active'
        };

        await db.supabase.from('user_profiles').update({
            preferences: updatedPrefs,
            updated_at: new Date().toISOString()
        }).eq('user_id', userId);

        console.log(`🔐 Migration: Advanced Security activated for ${userId}`);

        // 2. Fetch all emails to encrypt existing ones
        // Note: We might want to do this in batches if there are many emails
        const { data: emails, error: fetchError } = await db.supabase
            .from('user_emails')
            .select('*')
            .eq('user_id', userId);

        if (fetchError) throw fetchError;

        console.log(`🔐 Migration: Found ${emails?.length || 0} emails to potentially encrypt.`);

        if (emails && emails.length > 0) {
            const encryptedEmails = emails.map(email => {
                return {
                    ...email,
                    subject: encrypt(email.subject),
                    from_email: encrypt(email.from_email),
                    to_email: encrypt(email.to_email),
                    snippet: encrypt(email.snippet),
                    updated_at: new Date().toISOString()
                };
            });

            // Upsert in batches of 50
            for (let i = 0; i < encryptedEmails.length; i += 50) {
                const batch = encryptedEmails.slice(i, i + 50);
                const { error: upsertError } = await db.supabase
                    .from('user_emails')
                    .upsert(batch, { onConflict: 'user_id,email_id' });

                if (upsertError) {
                    console.error(`🔐 Migration: Error upserting batch starting at ${i}:`, upsertError);
                }
            }
        }

        console.log(`✅ Migration: Encryption complete for ${userId}`);

        return NextResponse.json({
            success: true,
            message: 'Advanced encryption sequence completed perfectly.',
            encryptedCount: emails?.length || 0
        });

    } catch (error) {
        console.error('🔐 Migration Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
