import { NextResponse } from 'next/server';
// @ts-ignore
const { auth } = require('../../../../lib/auth');
// @ts-ignore
const { CalendarService } = require('../../../../lib/calendar');
// @ts-ignore
const { DatabaseService } = require('../../../../lib/supabase');
// @ts-ignore
const { decrypt } = require('../../../../lib/crypto');

export async function POST(request: Request) {
    try {
        const session = await (auth as any)();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let body;
        try {
            body = await request.json();
        } catch (e) {
            return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
        }

        const { timeMin, timeMax } = body;
        if (!timeMin || !timeMax) {
            return NextResponse.json({ error: 'timeMin and timeMax are required' }, { status: 400 });
        }

        // Get tokens
        let accessToken = session?.accessToken;
        let refreshToken = session?.refreshToken;

        if (!accessToken) {
            const db = new DatabaseService();
            const userTokens = await db.getUserTokens(session.user.email);
            if (userTokens?.encrypted_access_token) {
                accessToken = decrypt(userTokens.encrypted_access_token);
                refreshToken = userTokens.encrypted_refresh_token ? decrypt(userTokens.encrypted_refresh_token) : '';
            }
        }

        if (!accessToken) {
            return NextResponse.json({ error: 'Google account not connected' }, { status: 403 });
        }

        const calendarService = new CalendarService(accessToken, refreshToken);
        const busySlots = await calendarService.getBusySlots(timeMin, timeMax);

        return NextResponse.json({ success: true, busySlots });

    } catch (error: any) {
        console.error('❌ FreeBusy error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
