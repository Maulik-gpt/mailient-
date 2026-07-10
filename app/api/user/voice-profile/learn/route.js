import { auth } from '@/lib/auth';
import { voiceProfileService } from '@/lib/voice-profile-service';
import { logEvent } from "@/lib/logsso";

/**
 * POST — Process continuous learning from AI draft vs user's edited version
 * This is called fire-and-forget after every email send.
 */
export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { aiDraft, userFinal } = await request.json();

        if (!aiDraft || !userFinal) {
            return Response.json({ error: 'Missing aiDraft or userFinal' }, { status: 400 });
        }

        // Check if auto-improve is enabled for this user
        const profile = await voiceProfileService.getVoiceProfile(session.user.email);
        if (profile?.learning?.autoImprove === false) {
            return Response.json({ skipped: true, reason: 'auto-improve disabled' });
        }

        await voiceProfileService.learnFromDiff(session.user.email, aiDraft, userFinal);

        return Response.json({ success: true });
    } catch (error) {
    logEvent({ channel: "failures", event: "❌ API Error", description: String(error) });
        console.error('Voice learning error:', error);
        // Non-fatal — always return 200 since this is fire-and-forget
        return Response.json({ success: false, error: error.message });
    }
}
