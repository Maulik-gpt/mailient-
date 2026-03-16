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
            return await this.searchDataFast(filters);
        }

        // Mock data removed. In a real integration, this should require a valid DataFast or Apollo API key.
        return [];
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


}

export const prospectSearchService = new ProspectSearchService();
