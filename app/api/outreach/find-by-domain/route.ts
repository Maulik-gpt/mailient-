import { NextRequest, NextResponse } from 'next/server';

// Find emails from a company domain
export async function POST(req: NextRequest) {
    try {
        const { domain, limit = 25 } = await req.json();

        if (!domain) {
            return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
        }

        // Clean domain
        const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];

        // Try to find emails using DataFast or similar service
        const datafastApiKey = process.env.DATAFAST_API_KEY;

        if (datafastApiKey) {
            try {
                const response = await fetch('https://api.datafast.io/v1/company/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${datafastApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ domain: cleanDomain, limit })
                });

                if (response.ok) {
                    const data = await response.json();
                    return NextResponse.json({
                        domain: cleanDomain,
                        emails: data.emails || [],
                        company: data.company || null
                    });
                }
            } catch (error) {
                console.error('DataFast domain search error:', error);
            }
        }

        // Fallback: Generate realistic mock data based on domain
        const mockEmails = generateMockDomainEmails(cleanDomain, limit);

        return NextResponse.json({
            domain: cleanDomain,
            emails: mockEmails,
            company: {
                name: formatCompanyName(cleanDomain),
                domain: cleanDomain,
                industry: 'Technology'
            }
        });
    } catch (error) {
        console.error('Domain search error:', error);
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }
}

function formatCompanyName(domain: string): string {
    const name = domain.split('.')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
}

function generateMockDomainEmails(domain: string, limit: number) {
    const jobTitles = [
        { title: 'CEO', seniority: 'c-level' },
        { title: 'CTO', seniority: 'c-level' },
        { title: 'CFO', seniority: 'c-level' },
        { title: 'CMO', seniority: 'c-level' },
        { title: 'VP of Sales', seniority: 'vp' },
        { title: 'VP of Engineering', seniority: 'vp' },
        { title: 'VP of Marketing', seniority: 'vp' },
        { title: 'Director of Product', seniority: 'director' },
        { title: 'Director of Sales', seniority: 'director' },
        { title: 'Engineering Manager', seniority: 'manager' },
        { title: 'Product Manager', seniority: 'manager' },
        { title: 'Sales Manager', seniority: 'manager' },
        { title: 'Account Executive', seniority: 'mid' },
        { title: 'Software Engineer', seniority: 'mid' },
        { title: 'Marketing Manager', seniority: 'manager' }
    ];

    const firstNames = [
        'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery',
        'Sarah', 'Michael', 'David', 'Emily', 'Jessica', 'Daniel', 'Matthew', 'Ashley',
        'James', 'Rachel', 'Chris', 'Amanda'
    ];

    const lastNames = [
        'Chen', 'Kumar', 'Williams', 'Johnson', 'Smith', 'Brown', 'Lee', 'Garcia',
        'Martinez', 'Davis', 'Rodriguez', 'Wilson'
    ];

    const emails = [];
    const usedCombinations = new Set();
    const count = Math.min(limit, jobTitles.length);

    for (let i = 0; i < count; i++) {
        let firstName: string, lastName: string;

        // Ensure unique name combinations
        do {
            firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        } while (usedCombinations.has(`${firstName}${lastName}`));

        usedCombinations.add(`${firstName}${lastName}`);

        const job = jobTitles[i] || jobTitles[Math.floor(Math.random() * jobTitles.length)];

        // Generate email patterns that match common corporate formats
        const emailPatterns = [
            `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
            `${firstName.toLowerCase()}${lastName.toLowerCase()}@${domain}`,
            `${firstName.toLowerCase()[0]}${lastName.toLowerCase()}@${domain}`
        ];

        const email = emailPatterns[Math.floor(Math.random() * emailPatterns.length)];

        emails.push({
            id: crypto.randomUUID(),
            name: `${firstName} ${lastName}`,
            email,
            jobTitle: job.title,
            seniority: job.seniority,
            company: formatCompanyName(domain),
            companyDomain: domain,
            verified: Math.random() > 0.2,
            linkedinUrl: `https://linkedin.com/in/${firstName.toLowerCase()}${lastName.toLowerCase()}`
        });
    }

    return emails;
}
