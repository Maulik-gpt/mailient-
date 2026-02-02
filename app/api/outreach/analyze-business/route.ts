import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { url } = await req.json();
        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        const websiteContent = await fetchWebsiteContent(url);

        // Even if the website HTML cannot be fetched (CORS, bot protection, etc.),
        // still generate a useful business profile so the Outreach AI can work.
        const analysis = await analyzeBusinessWithAI(websiteContent || '', url);
        return NextResponse.json(analysis);
    } catch (error) {
        console.error('Business analysis error:', error);
        return NextResponse.json({ error: 'Failed to analyze business' }, { status: 500 });
    }
}

async function fetchWebsiteContent(url: string): Promise<string | null> {
    try {
        const fullUrl = url.startsWith('http') ? url : `https://${url}`;
        console.log(`Fetching website content for: ${fullUrl}`);

        const response = await fetch(fullUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            next: { revalidate: 0 } // Don't cache for analysis
        });

        if (!response.ok) {
            console.error(`Failed to fetch website: ${response.status} ${response.statusText}`);
            throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();

        // Basic noise reduction
        let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        text = text.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
        text = text.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');

        // Extract plain text
        text = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

        if (text.length < 100) {
            console.warn('Extracted website content seems too thin.');
        }

        return text.slice(0, 15000); // Increased context window
    } catch (error) {
        console.error('Website fetch critical failure:', error);
        return null;
    }
}

async function analyzeBusinessWithAI(content: string, url: string) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        console.warn('OPENROUTER_API_KEY missing - falling back to mock analysis.');
        return generateMockAnalysis(url);
    }

    try {
        // If we failed to fetch meaningful HTML, fall back to a robust mock profile
        // so the user can still continue with Outreach setup.
        if (!content || content.trim().length < 100) {
            console.warn(`Website content for ${url} is unavailable or too thin. Falling back to heuristic analysis.`);
            return generateMockAnalysis(url);
        }

        console.log(`Initiating AI analysis for ${url} (Content length: ${content.length})...`);
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://mailient.xyz',
                'X-Title': 'Mailient Business Intelligence'
            },
            body: JSON.stringify({
                // Use a high-quality free model from OpenRouter
                model: 'qwen/qwen3-coder:free',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a professional business strategist. Analyze the provided website content and extract deep business insights. You MUST return a valid JSON object only.'
                    },
                    {
                        role: 'user',
                        content: `Analyze this business from its website content. 
                        Target URL: ${url}
                        
                        Website Content:
                        ${content}
                        
                        Return JSON format:
                        {
                            "businessName": "Official name of the company",
                            "description": "Succinct 2-sentence description of what they do",
                            "valueProposition": "The core problem they solve and why they are better than competitors",
                            "targetAudience": "Specific decision makers and company types they serve",
                            "industry": "The primary industry (e.g., SaaS, FinTech, E-commerce)",
                            "suggestedFilters": {
                                "jobTitle": "Comma separated list of 5 ideal personas (e.g. CEO, Head of Growth, CTO)",
                                "industry": "Ideal target industry to sell to",
                                "companySize": "Ideal company size range (e.g. 11-50, 51-200)",
                                "seniorityLevel": "Ideal seniority level (e.g. director, c-level)"
                            },
                            "emailTemplate": "A high-converting, personalized cold email template using {{name}}, {{company}}, and {{jobTitle}} variables",
                            "subjectLines": ["Subject Line 1", "Subject Line 2", "Subject Line 3"]
                        }`
                    }
                ],
                max_tokens: 2000,
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('OpenRouter API error:', errorData);
            throw new Error(`AI Engine error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;

        if (!text) throw new Error('AI returned an empty response');

        const match = text.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('AI failed to return valid JSON context');

        const analysis = JSON.parse(match[0]);
        console.log('Successfully generated business analysis via AI.');
        return analysis;
    } catch (error) {
        console.error('Business analysis engine failure:', error);
        // Always fall back to a heuristic profile so the user can continue,
        // regardless of environment or transient AI/network issues.
        console.warn('Falling back to heuristic business analysis profile due to AI error.');
        return generateMockAnalysis(url);
    }
}

function generateMockAnalysis(url: string) {
    const domain = url.replace(/https?:\/\//, '').split('/')[0];
    const name = domain.split('.')[0];
    return {
        businessName: name.charAt(0).toUpperCase() + name.slice(1),
        description: 'A modern solution helping businesses streamline operations.',
        valueProposition: 'Saves time and increases efficiency',
        targetAudience: 'Founders and decision-makers at growing companies',
        industry: 'saas',
        suggestedFilters: { jobTitle: 'CEO, Founder, CTO', industry: 'technology', companySize: '11-50', seniorityLevel: 'c-level' },
        emailTemplate: 'Hi {{name}},\n\nI noticed {{company}} is doing great work. We help companies like yours achieve better results.\n\nWould you be open to a quick call?\n\nBest',
        subjectLines: ['Quick question for {{company}}', '{{name}}, idea for you']
    };
}
