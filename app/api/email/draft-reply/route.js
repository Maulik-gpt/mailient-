// Draft Reply API Route - Optimized for Node.js Runtime

import { AIConfig } from '@/lib/ai-config';
import { subscriptionService, FEATURE_TYPES } from '@/lib/subscription-service';
import { voiceProfileService } from '@/lib/voice-profile-service';
import { auth } from '@/lib/auth.js';

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const userId = session.user.email;

        // Parse request body immediately - subscription check happens in parallel later - accept emailContent from frontend to skip Gmail API call
        const body = await request.json();
        const { 
            emailId, 
            category, 
            context, 
            tone, 
            voiceProfile: voiceProfileFromRequest,
            emailContent: emailContentFromFrontend,
            emailSubject,
            emailFrom,
            emailSnippet
        } = body;
        
        if (!emailId) {
            return new Response(JSON.stringify({ error: 'Email ID required' }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Build email content from frontend data (fast) or fallback to minimal data
        let emailContent;
        if (emailContentFromFrontend) {
            // Use content already loaded in frontend - SKIPS Gmail API call entirely!
            const cleanBody = emailContentFromFrontend
                .replace(/<[^>]*>?/gm, '')
                .replace(/\s+/g, ' ')
                .trim()
                .substring(0, 5000);
            
            emailContent = `
Subject: ${emailSubject || 'Re:'}
From: ${emailFrom || 'Sender'}
Snippet: ${emailSnippet || ''}
Body: ${cleanBody}`;
        } else {
            // Fallback - minimal content to unblock the flow
            emailContent = `
Subject: ${emailSubject || 'Re:'}
From: ${emailFrom || 'Sender'}
Snippet: ${emailSnippet || ''}
Body: ${emailSnippet || ''}`;
        }

        // FAST PATH: Parallelize independent operations
        // 1. Initialize AI service (sync)
        const aiService = new AIConfig();
        if (!aiService.hasAIConfigured()) {
            return new Response(JSON.stringify({ error: 'AI service not configured' }), { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 2. Parallel fetch: subscription check + voice profile (both can run concurrently)
        const voiceProfilePromise = (async () => {
            if (voiceProfileFromRequest && voiceProfileFromRequest.status !== 'default') {
                return voiceProfileFromRequest;
            }
            // Only fetch if mimic tone is selected - skip for other tones
            if (tone === 'mimic') {
                try {
                    return await voiceProfileService.getVoiceProfile(userId);
                } catch {
                    return null;
                }
            }
            return null;
        })();

        const canUsePromise = subscriptionService.canUseFeature(userId, FEATURE_TYPES.DRAFT_REPLY);
        
        // Wait for both in parallel
        const [canUse, voiceProfileRaw] = await Promise.all([canUsePromise, voiceProfilePromise]);

        if (!canUse) {
            const usage = await subscriptionService.getFeatureUsage(userId, FEATURE_TYPES.DRAFT_REPLY);
            return new Response(JSON.stringify({
                error: 'limit_reached',
                message: `Sorry, but you've exhausted all the credits of ${usage.period === 'daily' ? 'the day' : 'the month'}.`,
                usage: usage.usage,
                limit: usage.limit,
                period: usage.period,
                planType: usage.planType,
                upgradeUrl: '/pricing'
            }), { 
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // FAST FALLBACK: If mimic tone selected but no profile, use professional immediately
        // NO on-the-fly analysis - that's a separate background job
        let voiceProfile = voiceProfileRaw;
        let effectiveTone = tone || 'professional';
        
        if (tone === 'mimic' && (!voiceProfile || voiceProfile.status === 'default')) {
            effectiveTone = 'professional'; // Immediate fallback, no delay
            voiceProfile = null;
        }

        // Prepare user context
        const userContext = {
            name: session.user.name || session.user.email.split('@')[0],
            email: session.user.email,
            role: context?.role || null,
            goals: context?.goals || [],
            voiceProfile: voiceProfile,
            tone: effectiveTone,
            aiProtection: body.aiProtection ?? true,
            privacyMode: body.privacyMode ?? false
        };

        // Start streaming IMMEDIATELY - no more delays!
        const { searchParams } = new URL(request.url);
        const shouldStream = searchParams.get('stream') === 'true';

        if (shouldStream) {
            // Fire usage increment in background (don't await)
            subscriptionService.incrementFeatureUsage(userId, FEATURE_TYPES.DRAFT_REPLY).catch(() => {});
            
            const stream = await aiService.getService().generateDraftReplyStream(
                emailContent, 
                category || 'Opportunity', 
                userContext, 
                userContext.privacyMode
            );

            return new Response(stream, {
                headers: {
                    'Content-Type': 'text/plain',
                    'Transfer-Encoding': 'chunked',
                    'X-Voice-Cloned': voiceProfile && voiceProfile.status !== 'default' ? 'true' : 'false'
                }
            });
        }

        // Non-streaming fallback (rarely used)
        const draftReply = await aiService.generateDraftReply(
            emailContent, 
            category || 'Opportunity', 
            userContext, 
            userContext.privacyMode
        );

        // Fire usage increment in background
        subscriptionService.incrementFeatureUsage(userId, FEATURE_TYPES.DRAFT_REPLY).catch(() => {});

        return new Response(JSON.stringify({
            draftReply,
            voiceCloned: !!voiceProfile && voiceProfile.status !== 'default'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('❌ Error generating draft reply:', error);
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
