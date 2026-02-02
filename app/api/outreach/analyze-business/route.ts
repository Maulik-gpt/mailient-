import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let body;
        try {
            body = await req.json();
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
        }
        
        const { url } = body;
        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        const websiteContent = await fetchWebsiteContent(url);
        if (!websiteContent || websiteContent.trim().length < 100) {
            console.error('Website content unavailable or too thin for analysis.');
            return NextResponse.json({ error: 'Failed to fetch website for analysis' }, { status: 400 });
        }

        const analysis = await analyzeBusinessWithAI(websiteContent, url);
        return NextResponse.json(analysis);
    } catch (error) {
        console.error('Business analysis error:', error);
        
        // Check if it's a rate limit or credit issue and provide fallback
        if (error instanceof Error && (
            error.message.includes('402') || 
            error.message.includes('rate limit') || 
            error.message.includes('credit') ||
            error.message.includes('AI Engine error')
        )) {
            console.log('Providing fallback analysis due to API limitations...');
            return NextResponse.json({
                businessName: 'Business Analysis (Limited Mode)',
                description: 'AI analysis temporarily unavailable. Using default business analysis template.',
                valueProposition: 'Our service helps businesses streamline their operations and improve efficiency.',
                targetAudience: 'Business leaders and decision makers looking to optimize their workflows.',
                industry: 'Technology',
                suggestedFilters: {
                    jobTitle: 'CEO,CTO,Founder,Manager,Director',
                    industry: 'Technology,SaaS,Software',
                    companySize: '11-50',
                    seniorityLevel: 'director,c-level'
                },
                emailTemplate: 'Hi {{name}},\n\nI came across {{company}} and was impressed by your work as a {{jobTitle}}. I\'d love to learn more about your current challenges and explore how we might be able to help.\n\nWould you be open to a brief conversation next week?\n\nBest regards',
                subjectLines: ['Quick question about {{company}}', 'Regarding your role at {{company}}', 'Opportunity for {{company}}']
            });
        }
        
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
    // Try multiple API keys in case one is rate limited
    const apiKeys = [
        process.env.OPENROUTER_API_KEY,
        process.env.OPENROUTER_API_KEY2,
        process.env.OPENROUTER_API_KEY3
    ].filter(key => !!key);

    console.log('🔑 OpenRouter API Keys check:', {
        totalKeys: apiKeys.length,
        keyLengths: apiKeys.map(key => key?.length || 0)
    });

    if (apiKeys.length === 0) {
        throw new Error('No OPENROUTER_API_KEY available for outreach analysis');
    }

    for (let i = 0; i < apiKeys.length; i++) {
        const apiKey = apiKeys[i];
        console.log(`Trying API key ${i + 1}/${apiKeys.length}...`);
        
        try {
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
                // Use a more available model
                model: 'anthropic/claude-3-haiku:beta',
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

        console.log('OpenRouter response status:', response.status);
        console.log('OpenRouter response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            let errorData;
            try {
                const errorText = await response.text();
                console.error('OpenRouter API error (raw):', errorText);
                
                // Try to parse as JSON, but if it fails, just use the raw text
                try {
                    errorData = JSON.parse(errorText);
                } catch (jsonParseError) {
                    errorData = { error: errorText, raw: true };
                }
            } catch (textError) {
                errorData = { error: 'Failed to read error response' };
            }
            console.error('OpenRouter API error:', errorData);
            
            // If this is not the last key, try the next one
            if (i < apiKeys.length - 1) {
                console.log(`API key ${i + 1} failed, trying next key...`);
                continue;
            }
            
            const errorMessage = typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error);
            throw new Error(`AI Engine error: ${response.status} - ${errorMessage}`);
        }

        const data = await response.json();
        console.log('OpenRouter response data keys:', Object.keys(data));
        console.log('OpenRouter choices length:', data.choices?.length || 0);
        console.log('OpenRouter first choice:', data.choices?.[0] ? 'present' : 'missing');
        
        const text = data.choices?.[0]?.message?.content;
        console.log('AI response text length:', text?.length || 0);
        console.log('AI response preview:', text?.substring(0, 200) + '...');

        if (!text) throw new Error('AI returned an empty response');

        const match = text.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('AI failed to return valid JSON context');

        const analysis = JSON.parse(match[0]);
        console.log('Successfully generated business analysis via AI.');
        return analysis;
        
        } catch (error) {
            console.error(`API key ${i + 1} failed:`, error);
            
            // If this is not the last key, try the next one
            if (i < apiKeys.length - 1) {
                console.log(`API key ${i + 1} failed, trying next key...`);
                continue;
            }
            
            throw error;
        }
    }
    
    // If all API keys failed, provide a fallback response
    console.log('All AI API keys failed, providing fallback analysis...');
    return {
        businessName: 'Business Analysis Failed',
        description: 'Unable to analyze website due to AI service limitations. Please try again later.',
        valueProposition: 'Analysis service temporarily unavailable.',
        targetAudience: 'Analysis service temporarily unavailable.',
        industry: 'Unknown',
        suggestedFilters: {
            jobTitle: 'CEO,CTO,Founder,Manager,Director',
            industry: 'Technology,SaaS,Software',
            companySize: '11-50',
            seniorityLevel: 'director,c-level'
        },
        emailTemplate: 'Hi {{name}},\n\nI came across {{company}} and was impressed by your work as a {{jobTitle}}. I\'d love to learn more about your current challenges and explore how we might be able to help.\n\nWould you be open to a brief conversation next week?\n\nBest regards',
        subjectLines: ['Quick question about {{company}}', 'Regarding your role at {{company}}', 'Opportunity for {{company}}']
    };
}
