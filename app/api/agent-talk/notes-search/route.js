import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase.js';
import { auth } from '@/lib/auth.js';

/**
 * Notes Search API for Arcus
 * Searches through user's notes and returns relevant results
 */
export async function POST(request) {
    try {
        const { query, searchType = 'all' } = await request.json();

        if (!query || typeof query !== 'string') {
            return NextResponse.json(
                { error: 'Search query is required' },
                { status: 400 }
            );
        }

        let session = null;
        try {
            session = await auth();
        } catch (error) {
            console.log('⚠️ Auth not available:', error.message);
        }

        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const db = new DatabaseService();
        const userId = session.user.email;
        const searchTerm = query.toLowerCase().trim();

        // Build search query based on search type
        let searchQuery = db.supabase
            .from('notes')
            .select('*')
            .eq('user_id', userId);

        // Apply search filters based on search type
        if (searchType === 'subject') {
            searchQuery = searchQuery.ilike('subject', `%${searchTerm}%`);
        } else if (searchType === 'content') {
            searchQuery = searchQuery.ilike('content', `%${searchTerm}%`);
        } else {
            // 'all' - search in both subject and content
            searchQuery = searchQuery.or(`subject.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);
        }

        // Add tags search if searchTerm matches tag pattern
        if (searchTerm.startsWith('#')) {
            const tagSearch = searchTerm.substring(1);
            searchQuery = searchQuery.contains('tags', [tagSearch]);
        }

        // Order by most recent first
        searchQuery = searchQuery.order('created_at', { ascending: false });

        const { data: notes, error } = await searchQuery.limit(20);

        if (error) {
            console.error('Error searching notes:', error);
            return NextResponse.json(
                { error: 'Failed to search notes' },
                { status: 500 }
            );
        }

        // Process and format the results
        const processedNotes = (notes || []).map(note => ({
            id: note.id,
            subject: note.subject,
            content: note.content,
            tags: note.tags || [],
            created_at: note.created_at,
            updated_at: note.updated_at,
            // Add relevance score based on where the match was found
            relevance_score: calculateRelevanceScore(searchTerm, note)
        }));

        // Sort by relevance score (higher first)
        processedNotes.sort((a, b) => b.relevance_score - a.relevance_score);

        return NextResponse.json({
            success: true,
            query,
            searchType,
            results: processedNotes,
            totalFound: processedNotes.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('💥 Notes search API error:', error);
        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error.message
            },
            { status: 500 }
        );
    }
}

/**
 * Calculate relevance score based on search term match location
 */
function calculateRelevanceScore(searchTerm, note) {
    let score = 0;
    const lowerSearch = searchTerm.toLowerCase();
    const subject = (note.subject || '').toLowerCase();
    const content = (note.content || '').toLowerCase();

    // Exact subject match gets highest score
    if (subject === lowerSearch) {
        score += 100;
    }
    // Subject starts with search term
    else if (subject.startsWith(lowerSearch)) {
        score += 80;
    }
    // Subject contains search term
    else if (subject.includes(lowerSearch)) {
        score += 60;
    }

    // Content exact match
    if (content === lowerSearch) {
        score += 50;
    }
    // Content starts with search term
    else if (content.startsWith(lowerSearch)) {
        score += 40;
    }
    // Content contains search term
    else if (content.includes(lowerSearch)) {
        score += 30;
    }

    // Tag matches
    if (note.tags && Array.isArray(note.tags)) {
        const tagMatch = note.tags.some(tag =>
            (tag || '').toLowerCase().includes(lowerSearch)
        );
        if (tagMatch) score += 20;
    }

    // Bonus for recency (newer notes get slightly higher scores)
    const noteDate = new Date(note.created_at);
    const now = new Date();
    const daysDiff = (now - noteDate) / (1000 * 60 * 60 * 24);
    if (daysDiff < 1) score += 10;
    else if (daysDiff < 7) score += 5;

    return score;
}
