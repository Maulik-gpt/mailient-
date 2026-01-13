import { NextResponse } from 'next/server';

/**
 * Store DataFast visitor ID for payment attribution
 * This endpoint stores the visitor ID temporarily so it can be
 * retrieved in the webhook handler when payment is processed
 */
export async function POST(request) {
    try {
        const { email, datafast_visitor_id } = await request.json();

        if (!email || !datafast_visitor_id) {
            return NextResponse.json({ error: 'Missing email or visitor ID' }, { status: 400 });
        }

        // Store in a simple in-memory cache (in production, use Redis or database)
        // For now, we'll use a simple approach - store with expiration
        const globalCache = global.datafastVisitorCache || {};
        global.datafastVisitorCache = globalCache;
        
        // Store with 1 hour expiration
        const expirationTime = Date.now() + (60 * 60 * 1000);
        globalCache[email.toLowerCase()] = {
            visitorId: datafast_visitor_id,
            expiresAt: expirationTime
        };

        console.log('🍪 Stored DataFast visitor ID for:', email);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error storing visitor ID:', error);
        return NextResponse.json({ error: 'Failed to store visitor ID' }, { status: 500 });
    }
}

/**
 * Get stored DataFast visitor ID
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');

        if (!email) {
            return NextResponse.json({ error: 'Missing email parameter' }, { status: 400 });
        }

        const globalCache = global.datafastVisitorCache || {};
        const stored = globalCache[email.toLowerCase()];

        if (!stored) {
            return NextResponse.json({ visitor_id: null });
        }

        // Check if expired
        if (Date.now() > stored.expiresAt) {
            delete globalCache[email.toLowerCase()];
            return NextResponse.json({ visitor_id: null });
        }

        return NextResponse.json({ visitor_id: stored.visitorId });
    } catch (error) {
        console.error('Error retrieving visitor ID:', error);
        return NextResponse.json({ error: 'Failed to retrieve visitor ID' }, { status: 500 });
    }
}
