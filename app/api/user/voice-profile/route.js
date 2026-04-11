import { auth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { voiceProfileService } from '@/lib/voice-profile-service';
import { GmailService } from '@/lib/gmail';
import { DatabaseService } from '@/lib/supabase';
import { decrypt } from '@/lib/crypto';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile, error } = await supabase
            .from('user_voice_profiles')
            .select('*')
            .eq('user_id', session.user.email)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching voice profile:', error);
            throw error;
        }

        return Response.json({ profile: profile || null });
    } catch (error) {
        return Response.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}

export async function POST() {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.email;
        
        // 1. Get tokens for Gmail access
        let accessToken = session?.accessToken;
        let refreshToken = session?.refreshToken;

        if (!accessToken || !refreshToken) {
            const db = new DatabaseService();
            const userTokens = await db.getUserTokens(userId);
            if (userTokens?.encrypted_access_token) {
                accessToken = decrypt(userTokens.encrypted_access_token);
                refreshToken = userTokens.encrypted_refresh_token ? decrypt(userTokens.encrypted_refresh_token) : null;
            }
        }

        if (!accessToken) {
            return Response.json({ error: 'Gmail not connected' }, { status: 403 });
        }

        // 2. Run analysis
        const gmailService = new GmailService(accessToken, refreshToken);
        const sentEmails = await voiceProfileService.fetchSentEmails(gmailService, 40);
        
        if (sentEmails.length < 3) {
            return Response.json({ error: 'Not enough sent emails to analyze (minimum 3 required)' }, { status: 400 });
        }

        const profile = await voiceProfileService.analyzeVoiceProfile(sentEmails);
        await voiceProfileService.saveVoiceProfile(userId, profile);

        return Response.json({ success: true, profile });
    } catch (error) {
        console.error('Error re-analyzing voice profile:', error);
        return Response.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
