import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import crypto from 'node:crypto';

export async function POST(req: NextRequest) {
    const DATAFAST_API_KEY = process.env.DATAFAST_API_KEY;
    try {
        let session;
        try {
            session = await auth();
        } catch (authError) {
            console.error('Auth verification failed:', authError);
            if (process.env.NODE_ENV === 'production') {
                return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
            }
        }

        if (!session?.user && process.env.NODE_ENV === 'production') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const filters = await req.json();
        console.log('Prospect search initiated with filters:', JSON.stringify(filters, null, 2));

        let prospects = [];
        let source = 'none';
        let totalFound = 0;

        if (DATAFAST_API_KEY) {
            console.log('Attempting DataFast API search...');
            try {
                const result = await searchWithDataFast(filters, DATAFAST_API_KEY);
                prospects = result.prospects;
                totalFound = result.total || prospects.length;
                source = prospects.length > 0 ? 'datafast' : 'none';

                if (prospects.length === 0) {
                    console.log('DataFast returned no results for these filters.');
                }
            } catch (dfError) {
                console.error('DataFast API critical failure:', dfError);
                return NextResponse.json({
                    error: 'Lead database connection failed',
                    details: dfError instanceof Error ? dfError.message : 'The global prospect engine is temporarily unreachable.'
                }, { status: 503 });
            }
        } else {
            console.error('Lead Engine Error: DATAFAST_API_KEY is not defined in process.env');
            return NextResponse.json({
                error: 'Lead Engine Configuration Error',
                details: 'The DATAFAST_API_KEY is missing from the server environment. Please ensure it is set in your .env.local and restart your dev server.'
            }, { status: 500 });
        }

        console.log(`Search complete. Found ${prospects.length} prospects from [${source}] (Total capacity: ${totalFound}+)`);

        return NextResponse.json({
            prospects,
            total: prospects.length,
            total_found: totalFound,
            source,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('SEARCH_PROSPECTS_GLOBAL_ERROR:', error);
        return NextResponse.json({
            error: 'Failed to search prospects',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

async function searchWithDataFast(filters: any, apiKey: string) {
    const getSafeString = (val: any) => (typeof val === 'string' ? val : Array.isArray(val) ? val.join(', ') : undefined);

    const payload = {
        job_title: getSafeString(filters.jobTitle),
        company: getSafeString(filters.company),
        industry: getSafeString(filters.industry),
        location: getSafeString(filters.location),
        company_size: getSafeString(filters.companySize),
        seniority: getSafeString(filters.seniorityLevel),
        limit: 1000
    };

    const response = await fetch('https://api.datafast.io/v1/people/search', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`DataFast API error (${response.status}):`, errorText);
        throw new Error(`Lead engine error: ${response.status}`);
    }

    const data = await response.json();
    const prospects = (data.results || []).map((person: any) => ({
        id: person.id || crypto.randomUUID(),
        name: person.full_name || person.name,
        email: person.email,
        jobTitle: person.job_title || person.title || 'Professional',
        company: person.company_name || person.company || 'Unknown Company',
        companyDomain: person.company_domain,
        location: person.location || 'Remote',
        industry: person.industry || filters.industry || 'Technology',
        linkedinUrl: person.linkedin_url,
        verified: person.email_verified || person.verification_status === 'verified'
    }));

    return {
        prospects,
        total: data.total || prospects.length
    };
}



