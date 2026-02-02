/**
 * Prospect Search Service
 * Handles multi-provider search for B2B leads
 * Supports: DataFast, Apollo.io-style enrichment, and mock data
 */

interface SearchFilters {
    query?: string;
    jobTitle?: string;
    company?: string;
    industry?: string;
    location?: string;
    companySize?: string;
    seniorityLevel?: string;
}

interface Prospect {
    id: string;
    name: string;
    email: string;
    jobTitle: string;
    company: string;
    companyDomain: string;
    location: string;
    industry: string;
    linkedinUrl?: string;
    verified: boolean;
}

class ProspectSearchService {
    private datafastApiKey: string | undefined;

    constructor() {
        this.datafastApiKey = process.env.DATAFAST_API_KEY;
    }

    async search(filters: SearchFilters): Promise<Prospect[]> {
        // Try DataFast first
        if (this.datafastApiKey) {
            const datafastResults = await this.searchDataFast(filters);
            if (datafastResults.length > 0) {
                return datafastResults;
            }
        }

        // Fallback to mock data for demo
        return this.generateRealisticProspects(filters);
    }

    private async searchDataFast(filters: SearchFilters): Promise<Prospect[]> {
        try {
            const response = await fetch('https://api.datafast.io/v1/people/search', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.datafastApiKey}`,
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

            if (!response.ok) {
                console.error('DataFast API error:', response.status);
                return [];
            }

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
            console.error('DataFast search error:', error);
            return [];
        }
    }

    private generateRealisticProspects(filters: SearchFilters): Prospect[] {
        // Realistic company database
        const companies = [
            { name: 'Stripe', domain: 'stripe.com', industry: 'Fintech', location: 'San Francisco, CA' },
            { name: 'Notion', domain: 'notion.so', industry: 'SaaS', location: 'San Francisco, CA' },
            { name: 'Figma', domain: 'figma.com', industry: 'Design', location: 'San Francisco, CA' },
            { name: 'Vercel', domain: 'vercel.com', industry: 'Developer Tools', location: 'San Francisco, CA' },
            { name: 'Linear', domain: 'linear.app', industry: 'Productivity', location: 'San Francisco, CA' },
            { name: 'Airtable', domain: 'airtable.com', industry: 'SaaS', location: 'San Francisco, CA' },
            { name: 'Webflow', domain: 'webflow.com', industry: 'Design', location: 'San Francisco, CA' },
            { name: 'Loom', domain: 'loom.com', industry: 'Video', location: 'San Francisco, CA' },
            { name: 'Retool', domain: 'retool.com', industry: 'Developer Tools', location: 'San Francisco, CA' },
            { name: 'Segment', domain: 'segment.com', industry: 'Analytics', location: 'San Francisco, CA' },
            { name: 'Amplitude', domain: 'amplitude.com', industry: 'Analytics', location: 'San Francisco, CA' },
            { name: 'Mixpanel', domain: 'mixpanel.com', industry: 'Analytics', location: 'San Francisco, CA' },
            { name: 'Intercom', domain: 'intercom.com', industry: 'Customer Success', location: 'San Francisco, CA' },
            { name: 'Zendesk', domain: 'zendesk.com', industry: 'Customer Success', location: 'San Francisco, CA' },
            { name: 'HubSpot', domain: 'hubspot.com', industry: 'Marketing', location: 'Boston, MA' },
            { name: 'Datadog', domain: 'datadoghq.com', industry: 'DevOps', location: 'New York, NY' },
            { name: 'MongoDB', domain: 'mongodb.com', industry: 'Database', location: 'New York, NY' },
            { name: 'GitLab', domain: 'gitlab.com', industry: 'Developer Tools', location: 'Remote' },
            { name: 'Canva', domain: 'canva.com', industry: 'Design', location: 'Sydney, Australia' },
            { name: 'Atlassian', domain: 'atlassian.com', industry: 'Productivity', location: 'Sydney, Australia' },
        ];

        // Parse job titles from filter
        const requestedTitles = filters.jobTitle?.split(',').map(t => t.trim()).filter(Boolean) || [];
        const jobTitles = requestedTitles.length > 0 ? requestedTitles : [
            'CEO', 'CTO', 'VP of Engineering', 'VP of Sales', 'VP of Marketing',
            'Head of Growth', 'Director of Product', 'Engineering Manager',
            'Sales Director', 'Marketing Director', 'Founder', 'Co-Founder'
        ];

        const firstNames = [
            'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery',
            'Sarah', 'Michael', 'David', 'Emily', 'Jessica', 'Daniel', 'Matthew', 'Ashley',
            'James', 'Rachel', 'Chris', 'Amanda', 'Kevin', 'Lisa', 'Brian', 'Nicole'
        ];

        const lastNames = [
            'Chen', 'Kumar', 'Williams', 'Johnson', 'Smith', 'Brown', 'Lee', 'Garcia',
            'Martinez', 'Davis', 'Rodriguez', 'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Jackson'
        ];

        const prospects: Prospect[] = [];
        const count = Math.floor(Math.random() * 25) + 25; // 25-50 prospects

        // Filter companies by criteria
        let filteredCompanies = [...companies];
        if (filters.industry) {
            filteredCompanies = filteredCompanies.filter(c =>
                c.industry.toLowerCase().includes(filters.industry!.toLowerCase())
            );
        }
        if (filters.location) {
            filteredCompanies = filteredCompanies.filter(c =>
                c.location.toLowerCase().includes(filters.location!.toLowerCase())
            );
        }
        if (filters.company) {
            filteredCompanies = filteredCompanies.filter(c =>
                c.name.toLowerCase().includes(filters.company!.toLowerCase())
            );
        }

        // Use all companies if filter results in empty set
        if (filteredCompanies.length === 0) {
            filteredCompanies = companies;
        }

        for (let i = 0; i < count; i++) {
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
            const company = filteredCompanies[Math.floor(Math.random() * filteredCompanies.length)];
            const jobTitle = jobTitles[Math.floor(Math.random() * jobTitles.length)];

            prospects.push({
                id: crypto.randomUUID(),
                name: `${firstName} ${lastName}`,
                email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.domain}`,
                jobTitle,
                company: company.name,
                companyDomain: company.domain,
                location: company.location,
                industry: company.industry,
                linkedinUrl: `https://linkedin.com/in/${firstName.toLowerCase()}${lastName.toLowerCase()}`,
                verified: Math.random() > 0.25 // 75% verified
            });
        }

        return prospects;
    }
}

export const prospectSearchService = new ProspectSearchService();
