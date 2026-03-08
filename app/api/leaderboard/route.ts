
import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const db = new DatabaseService(true); // Admin scope to read all profiles
        const leaderboard = await db.getLeaderboard(10); // Get top 10

        return NextResponse.json({
            users: leaderboard
        });
    } catch (error) {
        console.error('Leaderboard API Error:', error);
        return NextResponse.json({ users: [] }, { status: 500 });
    }
}
