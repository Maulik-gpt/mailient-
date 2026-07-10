import { auth } from '@/lib/auth';
import { voiceProfileService } from '@/lib/voice-profile-service';
import { logEvent } from "@/lib/logsso";

/**
 * POST — Manual source import. Instead of (or in addition to) scanning Gmail, the
 * user pastes their own writing samples and we learn the voice from those.
 *
 * Body: { text: string }  (samples separated by blank lines)
 *    or { samples: string[] }
 */
export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = session.user.email;
        const { text, samples } = await request.json();

        // Normalize into an array of sample strings. A pasted block is split on
        // blank lines so multiple emails/messages each count as a sample.
        let raw = [];
        if (Array.isArray(samples)) raw = samples;
        else if (typeof text === 'string') raw = text.split(/\n\s*\n+/);

        const emails = raw
            .map((s) => String(s || '').trim())
            .filter((s) => s.length >= 20)
            .slice(0, 40)
            .map((body, i) => ({ subject: `Imported sample ${i + 1}`, body }));

        if (emails.length === 0) {
            return Response.json(
                { error: 'Paste at least one writing sample (20+ characters).' },
                { status: 400 },
            );
        }

        const profile = await voiceProfileService.analyzeVoiceProfile(emails);

        // Preserve the user's conversational directives + customInstructions — a
        // re-analyze must not wipe "never use emojis".
        const existing = await voiceProfileService.getVoiceProfile(userId);
        const prevMs = existing?.manual_settings || {};
        profile.manual_settings = {
            ...(profile.manual_settings || {}),
            customInstructions: prevMs.customInstructions || (profile.manual_settings?.customInstructions || ''),
            directives: Array.isArray(prevMs.directives) ? prevMs.directives : [],
        };
        profile.prompt_fragment = voiceProfileService.buildManualPromptFragment(profile.manual_settings, profile);

        // Record source provenance (metadata only — no raw writing is stored).
        const now = new Date().toISOString();
        profile.sources = [
            ...(Array.isArray(existing?.sources) ? existing.sources : []),
            { type: 'manual_import', count: emails.length, added_at: now },
        ].slice(-10);
        profile.status = 'imported';
        profile.updated_at = now;

        await voiceProfileService.saveVoiceProfile(userId, profile);
        return Response.json({ success: true, samplesUsed: emails.length, profile });
    } catch (error) {
    logEvent({ channel: "failures", event: "❌ API Error", description: String(error) });
        console.error('Error importing voice samples:', error);
        return Response.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
