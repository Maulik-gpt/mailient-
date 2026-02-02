import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import crypto from 'node:crypto';

const DATAFAST_API_KEY = process.env.DATAFAST_API_KEY;

export async function POST(req: NextRequest) {
    try {
        let session;
        try {
            session = await auth();
        } catch (authError) {
            console.error('Auth verification failed:', authError);
            // In dev mode, we might want to continue for debugging if it's a known issue
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

        if (DATAFAST_API_KEY) {
            console.log('Attempting DataFast API search...');
            try {
                prospects = await searchWithDataFast(filters);
                source = prospects.length > 0 ? 'datafast' : 'none';
                if (prospects.length === 0) {
                    console.log('DataFast returned no results for these filters.');
                }
            } catch (dfError) {
                console.error('DataFast API critical failure:', dfError);
            }
        } else {
            console.warn('DATAFAST_API_KEY is missing in environment variables.');
        }

        // Fallback to mock data if no results from real API or if key is missing
        if (!prospects || prospects.length === 0) {
            console.log('Using intelligent mock data fallback...');
            prospects = generateMockProspects(filters);
            source = 'mock';
        }

        console.log(`Search complete. Found ${prospects.length} prospects from [${source}]`);
        return NextResponse.json({
            prospects,
            total: prospects.length,
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

async function searchWithDataFast(filters: any) {
    const getSafeString = (val: any) => (typeof val === 'string' ? val : Array.isArray(val) ? val.join(', ') : undefined);

    const payload = {
        job_title: getSafeString(filters.jobTitle),
        company: getSafeString(filters.company),
        industry: getSafeString(filters.industry),
        location: getSafeString(filters.location),
        company_size: getSafeString(filters.companySize),
        seniority: getSafeString(filters.seniorityLevel),
        limit: 100
    };

    const response = await fetch('https://api.datafast.io/v1/people/search', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${DATAFAST_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`DataFast API error (${response.status}):`, errorText);
        return [];
    }

    const data = await response.json();
    return (data.results || []).map((person: any) => ({
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
}

function generateMockProspects(filters: any) {
    // Helper to safely get a string from a filter field
    const getSafeString = (val: any) => (typeof val === 'string' ? val : Array.isArray(val) ? val.join(', ') : '');

    // Clean filters - ensure they are strings before trimming
    const jobTitleRaw = getSafeString(filters.jobTitle);
    const industryRaw = getSafeString(filters.industry);
    const locationRaw = getSafeString(filters.location);

    const targetJob = jobTitleRaw.trim() !== '' ? jobTitleRaw : null;
    const targetIndustry = industryRaw.trim() !== '' ? industryRaw : 'Technology';
    const targetLocation = locationRaw.trim() !== '' ? locationRaw : null;

    const jobTitles = targetJob?.split(',').map((t: string) => t.trim()) ||
        ['CEO', 'Founding Engineer', 'CTO', 'VP Production', 'Marketing Lead', 'Growth Director'];

    const companies = [
        { name: 'Velocity AI', domain: 'velocity.ai' },
        { name: 'Quantum Leap', domain: 'quantumleap.io' },
        { name: 'Nexus Solutions', domain: 'nexus.so' },
        { name: 'CloudScale', domain: 'cloudscale.tech' },
        { name: 'Modern Stack', domain: 'modernstack.dev' },
        { name: 'Apex Systems', domain: 'apex.co' },
        { name: 'Horizon Digital', domain: 'horizon.digital' },
        { name: 'Frontier Labs', domain: 'frontier.ai' }
    ];

    const firstNames = ['James', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Alex', 'Rachel', 'Chris', 'Amanda', 'Jordan', 'Casey'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Chen', 'Kumar'];
    const locations = targetLocation ? [targetLocation] : ['San Francisco, CA', 'New York, NY', 'Austin, TX', 'London, UK', 'Berlin, DE', 'Toronto, CA'];

    const prospects = [];
    const count = 25; // Consistent count for better UX

    for (let i = 0; i < count; i++) {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const company = companies[Math.floor(Math.random() * companies.length)];
        const jobTitle = jobTitles[Math.floor(Math.random() * jobTitles.length)];

        prospects.push({
            id: crypto.randomUUID(),
            name: `${firstName} ${lastName}`,
            email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.domain}`,
            jobTitle: jobTitle || 'Executive',
            company: company.name,
            companyDomain: company.domain,
            location: locations[Math.floor(Math.random() * locations.length)],
            industry: targetIndustry,
            verified: Math.random() > 0.2
        });
    }

    return prospects;
}


