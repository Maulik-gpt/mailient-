import { auth } from '@/lib/auth';
import { getSupabaseAdmin, DatabaseService } from '@/lib/supabase';
import { voiceProfileService } from '@/lib/voice-profile-service';
import { GmailService } from '@/lib/gmail';
import { decrypt } from '@/lib/crypto';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const adminDb = getSupabaseAdmin();
        const { data: profile, error } = await adminDb
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

/**
 * POST — Run email analysis (Method 2) to bootstrap/refresh the profile
 */
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

/**
 * PUT — Save manual profile settings (Method 1: tone sliders, habits, custom instructions)
 */
export async function PUT(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.email;
        const body = await request.json();
        const { tone, habits, customInstructions, learning, activeProfile } = body;

        // Fetch existing profile or create new one
        const existing = await voiceProfileService.getVoiceProfile(userId);
        const profile = existing || voiceProfileService.getDefaultVoiceProfile();

        // Merge manual settings into profile — v2 schema
        profile.manual_settings = {
            tone: {
                formality: tone?.formality ?? 50,     // 0=Casual, 100=Formal
                detail: tone?.detail ?? 40,           // 0=Brief, 100=Detailed
                warmth: tone?.warmth ?? 50,           // 0=Warm, 100=Direct
                confidence: tone?.confidence ?? 30,   // 0=Reserved, 100=Confident
            },
            habits: Array.isArray(habits) ? habits : [],
            customInstructions: typeof customInstructions === 'string' ? customInstructions : '',
            activeProfile: activeProfile || 'work',
        };

        // Learning preferences
        profile.learning = {
            autoImprove: learning?.autoImprove ?? true,
            lastAnalysis: profile.learning?.lastAnalysis || null,
        };

        // Rebuild prompt fragment to incorporate manual settings
        profile.prompt_fragment = voiceProfileService.buildManualPromptFragment(profile.manual_settings, profile);

        profile.status = profile.status === 'default' ? 'manual' : profile.status;
        profile.updated_at = new Date().toISOString();

        await voiceProfileService.saveVoiceProfile(userId, profile);

        return Response.json({ success: true, profile });
    } catch (error) {
        console.error('Error saving manual voice profile:', error);
        return Response.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
