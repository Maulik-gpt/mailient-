import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { DatabaseService } from '@/lib/supabase';

const INBOUND_DOMAIN = process.env.INBOUND_EMAIL_DOMAIN || 'inbox.mailient.xyz';

/**
 * GET /api/forwarding/setup
 * Returns the user's current forwarding handle and address.
 */
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const db = new DatabaseService();
        const profile = await db.getUserProfile(session.user.email);

        const handle = profile?.username || session.user.email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase();
        const forwardingEmail = `${handle}@${INBOUND_DOMAIN}`;

        return NextResponse.json({
            handle,
            forwardingEmail,
            domain: INBOUND_DOMAIN,
            isConfigured: !!profile?.username,
        });
    } catch (error) {
        console.error('Forwarding setup GET error:', error);
        return NextResponse.json({ error: 'Failed to get forwarding info' }, { status: 500 });
    }
}

/**
 * POST /api/forwarding/setup
 * Sets the user's forwarding handle.
 * Body: { handle: "maulik" }
 */
export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { handle } = await request.json();

        if (!handle || handle.length < 3 || handle.length > 30) {
            return NextResponse.json({ error: 'Handle must be 3-30 characters' }, { status: 400 });
        }

        // Only allow alphanumeric characters
        const sanitized = handle.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (sanitized.length < 3) {
            return NextResponse.json({ error: 'Handle must contain at least 3 alphanumeric characters' }, { status: 400 });
        }

        const db = new DatabaseService();

        // Check if handle is already taken by another user
        const existing = await db.getUserByHandle(sanitized);
        if (existing && existing.user_id !== session.user.email.toLowerCase()) {
            return NextResponse.json({ error: 'This handle is already taken' }, { status: 409 });
        }

        // Set the handle
        await db.setUserHandle(session.user.email, sanitized);

        const forwardingEmail = `${sanitized}@${INBOUND_DOMAIN}`;

        return NextResponse.json({
            success: true,
            handle: sanitized,
            forwardingEmail,
            domain: INBOUND_DOMAIN,
        });
    } catch (error) {
        console.error('Forwarding setup POST error:', error);
        return NextResponse.json({ error: 'Failed to set forwarding handle' }, { status: 500 });
    }
}
