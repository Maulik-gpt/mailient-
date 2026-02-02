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

        // Try multiple approaches to fetch website content
        const fetchOptions = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1'
            },
            next: { revalidate: 0 } // Don't cache for analysis
        };

        let response;
        try {
            response = await fetch(fullUrl, fetchOptions);
        } catch (fetchError) {
            console.error(`Direct fetch failed for ${fullUrl}:`, fetchError);
            
            // Try with CORS proxy as fallback
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(fullUrl)}`;
            console.log(`Trying CORS proxy: ${proxyUrl}`);
            
            const proxyResponse = await fetch(proxyUrl, {
                headers: { 'Origin': 'https://mailient.xyz' }
            });
            
            if (proxyResponse.ok) {
                const proxyData = await proxyResponse.json();
                if (proxyData.contents) {
                    console.log('Successfully fetched via CORS proxy');
                    return processHtmlContent(proxyData.contents);
                }
            }
            
            throw new Error('Both direct fetch and proxy failed');
        }

        if (!response.ok) {
            console.error(`Failed to fetch website: ${response.status} ${response.statusText}`);
            throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();
        return processHtmlContent(html);

    } catch (error) {
        console.error('Website fetch critical failure:', error);
        return null;
    }
}

function processHtmlContent(html: string): string {
    // Enhanced content extraction
    let text = html;

    // Remove scripts, styles, and unwanted elements
    text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    text = text.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
    text = text.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
    text = text.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
    text = text.replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');
    text = text.replace(/<!--[\s\S]*?-->/g, ''); // Remove comments

    // Extract meaningful content
    const contentSelectors = [
        'main', 'article', '[role="main"]', '.content', '.main-content',
        'h1', 'h2', 'h3', 'p', 'li', 'span', 'div'
    ];

    let extractedContent = '';
    contentSelectors.forEach(selector => {
        const regex = new RegExp(`<${selector}[^>]*>([\\s\\S]*?)<\/${selector}>`, 'gi');
        const matches = text.match(regex);
        if (matches) {
            extractedContent += matches.join(' ') + ' ';
        }
    });

    // If no structured content found, use the entire text
    if (extractedContent.trim().length < 100) {
        extractedContent = text;
    }

    // Convert to plain text
    extractedContent = extractedContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    // Clean up common patterns
    extractedContent = extractedContent
        .replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, '') // Remove dates
        .replace(/\b\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\b/g, '') // Remove times
        .replace(/\b\$\d+(?:,\d{3})*(?:\.\d{2})?\b/g, '') // Remove prices
        .replace(/\s+/g, ' ')
        .trim();

    if (extractedContent.length < 100) {
        console.warn('Extracted website content seems too thin.');
    }

    return extractedContent.slice(0, 20000); // Increased context window
}

async function analyzeBusinessWithAI(content: string, url: string) {
    // First try AI analysis
    const aiResult = await tryAIAnalysis(content, url);
    if (aiResult) {
        return aiResult;
    }

    // Fallback to intelligent local analysis
    console.log('AI analysis failed, using intelligent local analysis...');
    return performLocalAnalysis(content, url);
}

async function tryAIAnalysis(content: string, url: string) {
    // Try multiple API keys in case one is rate limited
    const apiKeys = [
        process.env.OPENROUTER_API_KEY,
        process.env.OPENROUTER_API_KEY2,
        process.env.OPENROUTER_API_KEY3
    ].filter(key => !!key);

    if (apiKeys.length === 0) {
        console.log('No OpenRouter API keys available');
        return null;
    }

    for (let i = 0; i < apiKeys.length; i++) {
        const apiKey = apiKeys[i];
        console.log(`Trying AI analysis with API key ${i + 1}/${apiKeys.length}...`);
        
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
                    // Use a more reliable model with better availability
                    model: 'meta-llama/llama-3.1-8b-instruct:free',
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

            if (!response.ok) {
                let errorData;
                try {
                    const errorText = await response.text();
                    console.error('OpenRouter API error (raw):', errorText);
                    
                    try {
                        errorData = JSON.parse(errorText);
                    } catch (jsonParseError) {
                        errorData = { error: errorText, raw: true };
                    }
                } catch (textError) {
                    errorData = { error: 'Failed to read error response' };
                }
                console.error('OpenRouter API error:', errorData);
                
                if (i < apiKeys.length - 1) {
                    console.log(`API key ${i + 1} failed, trying next key...`);
                    continue;
                }
                
                return null;
            }

            const data = await response.json();
            const text = data.choices?.[0]?.message?.content;

            if (!text) {
                console.log('AI returned empty response');
                if (i < apiKeys.length - 1) continue;
                return null;
            }

            const match = text.match(/\{[\s\S]*\}/);
            if (!match) {
                console.log('AI failed to return valid JSON context');
                if (i < apiKeys.length - 1) continue;
                return null;
            }

            const analysis = JSON.parse(match[0]);
            console.log('Successfully generated business analysis via AI.');
            return analysis;
            
        } catch (error) {
            console.error(`API key ${i + 1} failed:`, error);
            
            if (i < apiKeys.length - 1) {
                console.log(`API key ${i + 1} failed, trying next key...`);
                continue;
            }
            
            return null;
        }
    }
    
    return null;
}

function performLocalAnalysis(content: string, url: string) {
    console.log('Performing intelligent local analysis...');
    
    // Extract business name from URL or content
    const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace('www.', '');
    const businessName = extractBusinessName(content, domain);
    
    // Extract industry from content
    const industry = extractIndustry(content);
    
    // Generate description based on content analysis
    const description = generateDescription(content, businessName);
    
    // Extract value proposition
    const valueProposition = extractValueProposition(content);
    
    // Determine target audience
    const targetAudience = determineTargetAudience(content, industry);
    
    // Generate suggested filters based on analysis
    const suggestedFilters = generateSuggestedFilters(industry, targetAudience);
    
    // Generate email template
    const emailTemplate = generateEmailTemplate(businessName, valueProposition, targetAudience);
    
    // Generate subject lines
    const subjectLines = generateSubjectLines(businessName, industry);

    return {
        businessName,
        description,
        valueProposition,
        targetAudience,
        industry,
        suggestedFilters,
        emailTemplate,
        subjectLines
    };
}

function extractBusinessName(content: string, domain: string): string {
    // Try to find company name in content
    const namePatterns = [
        /<title>([^<]+)<\/title>/gi,
        /<h1[^>]*>([^<]+)<\/h1>/gi,
        /<meta[^>]+name="(?:title|site_name|application-name)"[^>]+content="([^"]+)"/gi,
        /(?:about|company|we are|welcome to)\s+([A-Z][a-zA-Z\s&]+?)(?:\.|,|\n|$)/gi,
        /(?:powered by|developed by|created by)\s+([A-Z][a-zA-Z\s&]+?)(?:\.|,|\n|$)/gi
    ];

    for (const pattern of namePatterns) {
        const matches = content.match(pattern);
        if (matches) {
            for (const match of matches) {
                let name = match.replace(/<[^>]+>/g, '').replace(/^(?:about|company|we are|welcome to|powered by|developed by|created by)\s+/i, '').trim();
                
                // Clean up common patterns
                name = name.replace(/\s+(?:-\s*|–\s*|—\s*).*$/, ''); // Remove subtitle after dash
                name = name.replace(/\s*\|\s*.*$/, ''); // Remove subtitle after pipe
                name = name.replace(/\s*:\s*.*$/, ''); // Remove subtitle after colon
                
                if (name.length > 2 && name.length < 50 && /^[A-Za-z\s&.-]+$/.test(name)) {
                    return name;
                }
            }
        }
    }

    // Fallback to domain name
    const domainName = domain.split('.')[0];
    return domainName.charAt(0).toUpperCase() + domainName.slice(1);
}

function extractIndustry(content: string): string {
    const industryKeywords = {
        'SaaS': /(?:software as a service|saas|subscription|cloud software|web application)/gi,
        'FinTech': /(?:fintech|financial technology|banking|payments|finance|investment)/gi,
        'E-commerce': /(?:ecommerce|e-commerce|online store|shopping cart|marketplace|retail)/gi,
        'Healthcare': /(?:healthcare|medical|health|hospital|clinic|pharmaceutical)/gi,
        'Education': /(?:education|learning|training|courses|school|university)/gi,
        'Marketing': /(?:marketing|advertising|digital marketing|seo|social media)/gi,
        'Real Estate': /(?:real estate|property|housing|rental|construction)/gi,
        'Technology': /(?:technology|tech|software|development|programming|IT)/gi,
        'Consulting': /(?:consulting|consultancy|advisory|business consulting)/gi,
        'Manufacturing': /(?:manufacturing|production|factory|industrial)/gi
    };

    for (const [industry, pattern] of Object.entries(industryKeywords)) {
        if (pattern.test(content)) {
            return industry;
        }
    }

    return 'Technology';
}

function generateDescription(content: string, businessName: string): string {
    // Extract key phrases that describe what the business does
    const servicePatterns = [
        /(?:we help|we provide|we offer|we specialize in)\s+([^.\n]+)/gi,
        /(?:our service|our product|our platform)\s+([^.\n]+)/gi,
        /(?:helps|enables|allows|provides)\s+([^.\n]+)/gi
    ];

    let services = [];
    for (const pattern of servicePatterns) {
        const matches = content.match(pattern);
        if (matches) {
            services.push(...matches.map(m => m.replace(/^(?:we help|we provide|we offer|we specialize in|our service|our product|our platform|helps|enables|allows|provides)\s+/i, '').trim()));
        }
    }

    if (services.length > 0) {
        const primaryService = services[0].substring(0, 100);
        return `${businessName} ${primaryService}. We help businesses achieve their goals through innovative solutions and exceptional service.`;
    }

    return `${businessName} provides professional services and solutions to help businesses grow and succeed in their industry.`;
}

function extractValueProposition(content: string): string {
    const valuePatterns = [
        /(?:unique|special|different|better|superior)\s+([^.\n]+)/gi,
        /(?:advantage|benefit|feature)\s+(?:is|are)\s+([^.\n]+)/gi,
        /(?:why choose|benefits|advantages)\s*:?([^.\n]+)/gi
    ];

    for (const pattern of valuePatterns) {
        const matches = content.match(pattern);
        if (matches && matches.length > 0) {
            const value = matches[0].replace(/^(?:unique|special|different|better|superior|advantage|benefit|feature|why choose|benefits|advantages)\s*(?:is|are)?\s*:?\s*/i, '').trim();
            if (value.length > 10 && value.length < 200) {
                return value;
            }
        }
    }

    return 'We deliver exceptional value through innovative solutions, expert team, and commitment to customer success.';
}

function determineTargetAudience(content: string, industry: string): string {
    const audienceKeywords: Record<string, string> = {
        'SaaS': 'Business owners, CTOs, VPs of Engineering, IT managers, and technology leaders looking to streamline operations',
        'FinTech': 'CFOs, financial managers, banking executives, and fintech innovators seeking modern financial solutions',
        'E-commerce': 'E-commerce managers, marketing directors, retail executives, and business owners looking to grow online sales',
        'Healthcare': 'Healthcare administrators, medical directors, clinic managers, and healthcare professionals seeking efficiency',
        'Education': 'Educational institutions, school administrators, teachers, and education technology leaders',
        'Marketing': 'Marketing directors, CMOs, brand managers, and marketing professionals seeking growth',
        'Technology': 'CTOs, VPs of Engineering, software developers, IT managers, and technology decision-makers',
        'Consulting': 'Business executives, managers, consultants, and organizations seeking strategic guidance'
    };

    return audienceKeywords[industry] || 'Business leaders, managers, and decision-makers looking to improve their operations';
}

function generateSuggestedFilters(industry: string, targetAudience: string): {
    jobTitle: string;
    industry: string;
    companySize: string;
    seniorityLevel: string;
} {
    const industryFilters: Record<string, {
        jobTitle: string;
        industry: string;
        companySize: string;
        seniorityLevel: string;
    }> = {
        'SaaS': {
            jobTitle: 'CEO,CTO,CPO,VP Engineering,Head of Product',
            industry: 'Software,Technology,SaaS',
            companySize: '11-50,51-200',
            seniorityLevel: 'director,c-level'
        },
        'FinTech': {
            jobTitle: 'CEO,CFO,CTO,VP Finance,Head of Banking',
            industry: 'Finance,FinTech,Banking',
            companySize: '51-200,201-500',
            seniorityLevel: 'director,c-level'
        },
        'E-commerce': {
            jobTitle: 'CEO,CMO,VP Marketing,E-commerce Manager,Head of Sales',
            industry: 'Retail,E-commerce,Consumer Goods',
            companySize: '11-50,51-200',
            seniorityLevel: 'manager,director'
        },
        'Healthcare': {
            jobTitle: 'CEO,CMO,Medical Director,Healthcare Administrator,VP Operations',
            industry: 'Healthcare,Medical,Pharmaceutical',
            companySize: '51-200,201-500',
            seniorityLevel: 'director,c-level'
        },
        'Technology': {
            jobTitle: 'CEO,CTO,VP Engineering,Head of Technology,Software Architect',
            industry: 'Technology,Software,IT Services',
            companySize: '11-50,51-200',
            seniorityLevel: 'director,c-level'
        }
    };

    return industryFilters[industry] || {
        jobTitle: 'CEO,CTO,Founder,Manager,Director',
        industry: 'Technology,SaaS,Software',
        companySize: '11-50,51-200',
        seniorityLevel: 'director,c-level'
    };
}

function generateEmailTemplate(businessName: string, valueProposition: string, targetAudience: string): string {
    return `Hi {{name}},

I came across {{company}} and was impressed by your work as a {{jobTitle}}.

${valueProposition}

Given your role at {{company}}, I thought you might be interested in how ${businessName} is helping ${targetAudience.toLowerCase()} achieve their goals.

Would you be open to a brief conversation next week to explore how we could help {{company}}?

Best regards`;
}

function generateSubjectLines(businessName: string, industry: string): string[] {
    return [
        `Quick question about {{company}}`,
        `Regarding your role as {{jobTitle}} at {{company}}`,
        `Opportunity for {{company}} in ${industry}`,
        `Connecting about {{company}}'s growth`,
        `${businessName} + {{company}}`
    ];
}
