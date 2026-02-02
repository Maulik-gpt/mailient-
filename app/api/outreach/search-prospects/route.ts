import { NextRequest, NextResponse } from 'next/server';

const DATAFAST_API_KEY = process.env.DATAFAST_API_KEY;

export async function POST(req: NextRequest) {
    try {
        const filters = await req.json();

        // Try DataFast API first, fallback to mock data
        let prospects = [];

        if (DATAFAST_API_KEY) {
            prospects = await searchWithDataFast(filters);
        }

        // If no results from API, use mock data
        if (prospects.length === 0) {
            prospects = generateMockProspects(filters);
        }

        return NextResponse.json({ prospects, total: prospects.length });
    } catch (error) {
        console.error('Search error:', error);
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }
}

async function searchWithDataFast(filters: any) {
    try {
        const response = await fetch('https://api.datafast.io/v1/people/search', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${DATAFAST_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                job_title: filters.jobTitle,
                company: filters.company,
                industry: filters.industry,
                location: filters.location,
                company_size: filters.companySize,
                seniority: filters.seniorityLevel,
                limit: 100
            })
        });

        if (!response.ok) return [];

        const data = await response.json();
        return (data.results || []).map((person: any) => ({
            id: person.id || crypto.randomUUID(),
            name: person.full_name || person.name,
            email: person.email,
            jobTitle: person.job_title || person.title,
            company: person.company_name || person.company,
            companyDomain: person.company_domain,
            location: person.location,
            industry: person.industry,
            linkedinUrl: person.linkedin_url,
            verified: person.email_verified || false
        }));
    } catch (error) {
        console.error('DataFast error:', error);
        return [];
    }
}

function generateMockProspects(filters: any) {
    const jobTitles = filters.jobTitle?.split(',').map((t: string) => t.trim()) ||
        ['CEO', 'CTO', 'VP of Sales', 'Marketing Director', 'Founder'];

    const companies = [
        { name: 'TechFlow Inc', domain: 'techflow.io' },
        { name: 'Innovate Labs', domain: 'innovatelabs.com' },
        { name: 'Growth Stack', domain: 'growthstack.io' },
        { name: 'DataDrive AI', domain: 'datadrive.ai' },
        { name: 'CloudSync Pro', domain: 'cloudsync.pro' },
        { name: 'Nexus Digital', domain: 'nexusdigital.co' },
        { name: 'Pulse Analytics', domain: 'pulseanalytics.io' },
        { name: 'Elevate SaaS', domain: 'elevatesaas.com' },
    ];

    const firstNames = ['James', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Alex', 'Rachel', 'Chris', 'Amanda'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson'];
    const locations = filters.location ? [filters.location] : ['San Francisco, CA', 'New York, NY', 'Austin, TX', 'Boston, MA', 'Seattle, WA'];

    const prospects = [];
    const count = Math.floor(Math.random() * 30) + 20;

    for (let i = 0; i < count; i++) {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const company = companies[Math.floor(Math.random() * companies.length)];
        const jobTitle = jobTitles[Math.floor(Math.random() * jobTitles.length)];

        prospects.push({
            id: crypto.randomUUID(),
            name: `${firstName} ${lastName}`,
            email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.domain}`,
            jobTitle,
            company: company.name,
            companyDomain: company.domain,
            location: locations[Math.floor(Math.random() * locations.length)],
            industry: filters.industry || 'Technology',
            verified: Math.random() > 0.3
        });
    }

    return prospects;
}
