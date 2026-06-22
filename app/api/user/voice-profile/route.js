import { auth } from '@/lib/auth';
import { getSupabaseAdmin, DatabaseService } from '@/lib/supabase';
import { voiceProfileService } from '@/lib/voice-profile-service';
import { GmailService } from '@/lib/gmail';
import { decrypt } from '@/lib/crypto';

// Building the voice profile fetches sent mail + runs LLM analysis, which can
// take a while on a busy mailbox. Give it room so it doesn't get killed at the
// platform default.
export const maxDuration = 60;

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

        // 2. Run analysis — prefer the user's last 90 days of sent mail so the
        //    voice reflects how they write now; fall back to all-time if a
        //    low-volume sender has fewer than 3 in that window.
        // Keep the sample tight: every email is a separate Gmail round-trip, and
        // the analysis only needs ~25 to capture a voice (the LLM reads up to 15).
        const gmailService = new GmailService(accessToken, refreshToken);
        let sentEmails = await voiceProfileService.fetchSentEmails(gmailService, 25, 90);
        if (sentEmails.length < 3) {
            sentEmails = await voiceProfileService.fetchSentEmails(gmailService, 25);
        }

        if (sentEmails.length < 3) {
            return Response.json({ error: 'Not enough sent emails to analyze (minimum 3 required)' }, { status: 400 });
        }

        const profile = await voiceProfileService.analyzeVoiceProfile(sentEmails);

        // 3. Generate ONE real sample reply in the user's own voice for the
        //    "This is how you sound" preview — best-effort, never blocks save.
        try {
            const sample = await voiceProfileService.generatePreviewReply(
                profile.manual_settings,
                'Hi — could you send over the latest version of the doc when you get a chance? Hoping to review before our call tomorrow.'
            );
            if (sample && sample.trim()) profile.sample_reply = sample.trim();
        } catch (e) {
            console.warn('⚠️ Voice sample generation failed (non-fatal):', e.message);
        }

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

        // Merge manual settings into profile — v2 schema. Preserve any structured
        // directives the user added via the conversational refiner (PATCH); a tone
        // slider save must not wipe "never use emojis".
        profile.manual_settings = {
            tone: {
                formality: tone?.formality ?? 50,     // 0=Casual, 100=Formal
                detail: tone?.detail ?? 40,           // 0=Brief, 100=Detailed
                warmth: tone?.warmth ?? 50,           // 0=Warm, 100=Direct
                confidence: tone?.confidence ?? 30,   // 0=Reserved, 100=Confident
            },
            habits: Array.isArray(habits) ? habits : [],
            customInstructions: typeof customInstructions === 'string' ? customInstructions : '',
            directives: Array.isArray(existing?.manual_settings?.directives) ? existing.manual_settings.directives : [],
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

/**
 * Distill conversational feedback into 1-3 crisp imperative style rules via a free
 * LLM. Falls back to the raw instruction (one rule) if the LLM is unavailable, so
 * refinement always works.
 */
async function distillDirectives(instruction) {
    const key = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY2;
    const raw = String(instruction).trim();
    if (!key) return [raw];
    try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://mailient.xyz' },
            body: JSON.stringify({
                model: 'openai/gpt-oss-120b:free',
                max_tokens: 200,
                temperature: 0.1,
                messages: [
                    { role: 'system', content: 'Turn the user\'s feedback about how their writing should sound into 1-3 SHORT imperative style rules (max ~10 words each), each a standalone instruction an email writer can follow. No preamble. Output ONLY the rules, one per line, no numbering or bullets. Example feedback: "too robotic, I never use emojis" -> "Never use emojis." / "Sound warm and human, not robotic."' },
                    { role: 'user', content: raw },
                ],
            }),
            signal: AbortSignal.timeout(9000),
        });
        if (!res.ok) return [raw];
        const json = await res.json();
        let text = json.choices?.[0]?.message?.content || '';
        text = text.replace(/<\/?(?:thinking|thought|reasoning)[^>]*>/gi, '');
        const rules = text.split('\n').map((l) => l.replace(/^\s*[-*\d.)]+\s*/, '').trim()).filter((l) => l.length >= 3 && l.length <= 140).slice(0, 3);
        return rules.length ? rules : [raw];
    } catch {
        return [raw];
    }
}

/**
 * PATCH — Conversational refinement. The user types natural-language feedback
 * ("this doesn't sound like me, I never use emojis, it's too robotic"); we distill
 * it into structured directives and add them. They ride into every draft as
 * highest-priority [CRITICAL DIRECTIVES] (see buildManualPromptFragment).
 */
export async function PATCH(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = session.user.email;
        const { instruction } = await request.json();
        if (!instruction || !String(instruction).trim()) {
            return Response.json({ error: 'instruction is required' }, { status: 400 });
        }

        const existing = await voiceProfileService.getVoiceProfile(userId) || voiceProfileService.getDefaultVoiceProfile();
        const ms = existing.manual_settings || {};
        const directives = Array.isArray(ms.directives) ? [...ms.directives] : [];

        const rules = await distillDirectives(instruction);
        const now = new Date().toISOString();
        for (const text of rules) {
            // Skip near-duplicates (case-insensitive).
            if (directives.some((d) => (d?.text || '').toLowerCase() === text.toLowerCase())) continue;
            directives.push({ id: `dir_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, text, created_at: now, origin: 'distilled' });
        }
        // Keep the list bounded (most recent 30).
        const trimmed = directives.slice(-30);

        existing.manual_settings = {
            tone: ms.tone || { formality: 50, detail: 40, warmth: 50, confidence: 30 },
            habits: Array.isArray(ms.habits) ? ms.habits : [],
            customInstructions: ms.customInstructions || '',
            directives: trimmed,
            activeProfile: ms.activeProfile || 'work',
        };
        existing.prompt_fragment = voiceProfileService.buildManualPromptFragment(existing.manual_settings, existing);
        existing.status = existing.status === 'default' ? 'manual' : existing.status;
        existing.updated_at = now;

        await voiceProfileService.saveVoiceProfile(userId, existing);
        return Response.json({ success: true, directives: trimmed, added: rules, profile: existing });
    } catch (error) {
        console.error('Error refining voice profile:', error);
        return Response.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}

/**
 * DELETE — remove a single voice directive by id.
 */
export async function DELETE(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = session.user.email;
        const { directiveId } = await request.json();
        if (!directiveId) return Response.json({ error: 'directiveId is required' }, { status: 400 });

        const existing = await voiceProfileService.getVoiceProfile(userId);
        if (!existing?.manual_settings) return Response.json({ success: true, directives: [] });
        const ms = existing.manual_settings;
        ms.directives = (Array.isArray(ms.directives) ? ms.directives : []).filter((d) => d?.id !== directiveId);
        existing.manual_settings = ms;
        existing.prompt_fragment = voiceProfileService.buildManualPromptFragment(ms, existing);
        existing.updated_at = new Date().toISOString();

        await voiceProfileService.saveVoiceProfile(userId, existing);
        return Response.json({ success: true, directives: ms.directives });
    } catch (error) {
        console.error('Error deleting voice directive:', error);
        return Response.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
