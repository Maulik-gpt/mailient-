import { auth } from '@/lib/auth';
import { voiceProfileService } from '@/lib/voice-profile-service';

export const maxDuration = 30;

/**
 * POST — Generate a live preview sample reply based on current profile settings
 */
export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { manualSettings } = await request.json();

        if (!manualSettings) {
            return Response.json({ error: 'Missing manualSettings' }, { status: 400 });
        }

        const sampleEmail = `Can we reschedule Thursday's call to Friday?`;
        const preview = await voiceProfileService.generatePreviewReply(manualSettings, sampleEmail);

        return Response.json({ preview });
    } catch (error) {
        console.error('Error generating voice preview:', error);
        return Response.json({ 
            preview: 'Friday works for me. I will update the calendar invitation accordingly.' 
        });
    }
}
