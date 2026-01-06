import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { GmailService } from '@/lib/gmail';
import { voiceProfileService } from '@/lib/voice-profile-service';
import { decrypt } from '@/lib/crypto';
import { DatabaseService } from '@/lib/supabase';
import { subscriptionService } from '@/lib/subscription-service';

/**
 * GET - Fetch user's current voice profile
 */
export async function GET(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.email;

        // Get existing voice profile
        const voiceProfile = await voiceProfileService.getVoiceProfile(userId);

        if (!voiceProfile) {
            return NextResponse.json({
                exists: false,
                needsAnalysis: true,
                message: 'Voice profile not found. Run POST to analyze emails and create profile.'
            });
        }

        // Check if refresh is needed
        const needsRefresh = await voiceProfileService.needsRefresh(userId, 7);

        return NextResponse.json({
            exists: true,
            needsRefresh,
            voiceProfile,
            analyzedAt: voiceProfile.analyzed_at,
            emailCount: voiceProfile.email_count,
            status: voiceProfile.status
        });

    } catch (error) {
        console.error('Error fetching voice profile:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * POST - Analyze user's sent emails and create/update voice profile
 */
export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.email;
        const body = await request.json().catch(() => ({}));
        const forceRefresh = body?.forceRefresh || false;

        // Check if we need to refresh
        if (!forceRefresh) {
            const needsRefresh = await voiceProfileService.needsRefresh(userId, 7);
            if (!needsRefresh) {
                const existingProfile = await voiceProfileService.getVoiceProfile(userId);
                if (existingProfile) {
                    return NextResponse.json({
                        message: 'Voice profile is up to date',
                        voiceProfile: existingProfile,
                        refreshed: false
                    });
                }
            }
        }

        // Get Gmail access token
        let accessToken = session?.accessToken;
        let refreshToken = session?.refreshToken;

        // Fetch tokens from database if needed
        if (!accessToken || !refreshToken) {
            try {
                const db = new DatabaseService();
                console.log('🔑 Fetching tokens from database for voice profile:', userId);
                const userTokens = await db.getUserTokens(userId);
                if (userTokens?.encrypted_access_token) {
                    accessToken = accessToken || decrypt(userTokens.encrypted_access_token);
                    refreshToken = refreshToken || (userTokens.encrypted_refresh_token ? decrypt(userTokens.encrypted_refresh_token) : '');
                    console.log('✅ Tokens retrieved from database');
                }
            } catch (e) {
                console.error('Failed to fetch tokens from database:', e);
            }
        }

        if (!accessToken) {
            return NextResponse.json({ error: 'Gmail not connected. Please reconnect your Gmail account.' }, { status: 403 });
        }

        const gmailService = new GmailService(accessToken, refreshToken);
        gmailService.setUserEmail(userId);

        console.log('📧 Starting voice profile analysis for:', userId);

        // Fetch sent emails
        const sentEmails = await voiceProfileService.fetchSentEmails(gmailService, 30);

        if (sentEmails.length < 5) {
            return NextResponse.json({
                error: 'Not enough sent emails to analyze. At least 5 sent emails are required.',
                emailsFound: sentEmails.length
            }, { status: 400 });
        }

        // Analyze voice profile
        const voiceProfile = await voiceProfileService.analyzeVoiceProfile(sentEmails);

        // Save to database
        await voiceProfileService.saveVoiceProfile(userId, voiceProfile);

        console.log('✅ Voice profile created/updated for:', userId);

        return NextResponse.json({
            message: 'Voice profile created successfully',
            voiceProfile,
            refreshed: true,
            emailsAnalyzed: sentEmails.length
        });

    } catch (error) {
        console.error('Error creating voice profile:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * DELETE - Remove user's voice profile (revert to default AI behavior)
 */
export async function DELETE(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.email.toLowerCase().trim();

        const { getSupabaseAdmin } = await import('@/lib/supabase');
        const supabase = getSupabaseAdmin();

        const { error } = await supabase
            .from('user_voice_profiles')
            .delete()
            .eq('user_id', userId);

        if (error) {
            console.error('Error deleting voice profile:', error);
            return NextResponse.json({ error: 'Failed to delete voice profile' }, { status: 500 });
        }

        return NextResponse.json({
            message: 'Voice profile deleted. AI will now use default writing style.',
            deleted: true
        });

    } catch (error) {
        console.error('Error deleting voice profile:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
