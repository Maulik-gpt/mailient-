import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { businessProfile, prospects, batchSize = 50 } = await req.json();

        if (!businessProfile || !prospects?.length) {
            return NextResponse.json({ error: 'Business profile and prospects required' }, { status: 400 });
        }

        console.log(`Starting mass email generation for ${prospects.length} prospects`);

        const personalizedEmails = await generateMassPersonalizedEmails(businessProfile, prospects, batchSize);
        
        return NextResponse.json({
            success: true,
            totalEmails: personalizedEmails.length,
            emails: personalizedEmails,
            message: `Successfully generated ${personalizedEmails.length} personalized emails`
        });
    } catch (error) {
        console.error('Mass email generation error:', error);
        return NextResponse.json({ 
            error: 'Failed to generate mass emails',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

async function generateMassPersonalizedEmails(businessProfile: any, prospects: any[], batchSize: number): Promise<{
    prospectId: string;
    to: string;
    subject: string;
    body: string;
    name: string;
    company: string;
    jobTitle: string;
}[]> {
    const apiKeys: string[] = [
        process.env.OPENROUTER_API_KEY,
        process.env.OPENROUTER_API_KEY2,
        process.env.OPENROUTER_API_KEY3
    ].filter((key): key is string => !!key);

    if (apiKeys.length === 0) {
        throw new Error('No OpenRouter API keys available');
    }

    const allEmails = [];
    const totalProspects = prospects.length;
    
    console.log(`Processing ${totalProspects} prospects in batches of ${batchSize}`);

    for (let i = 0; i < totalProspects; i += batchSize) {
        const batch = prospects.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(totalProspects/batchSize)} (${batch.length} prospects)`);
        
        try {
            const batchEmails = await processBatch(batch, businessProfile, apiKeys);
            allEmails.push(...batchEmails);
            
            // Add delay between batches to avoid rate limiting
            if (i + batchSize < totalProspects) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } catch (batchError) {
            console.error(`Batch ${Math.floor(i/batchSize) + 1} failed:`, batchError);
            // Generate fallback emails for this batch
            const fallbackEmails = generateFallbackEmails(batch, businessProfile);
            allEmails.push(...fallbackEmails);
        }
    }

    return allEmails;
}

async function processBatch(prospects: any[], businessProfile: any, apiKeys: string[]): Promise<{
    prospectId: string;
    to: string;
    subject: string;
    body: string;
    name: string;
    company: string;
    jobTitle: string;
}[]> {
    const apiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];
    
    const prospectContext = prospects.map(p => 
        `${p.name} - ${p.jobTitle} at ${p.company} (${p.email})`
    ).join('\n');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://mailient.xyz',
            'X-Title': 'Mailient Mass Email Generator'
        },
        body: JSON.stringify({
            model: 'meta-llama/llama-3.1-8b-instruct:free',
            messages: [
                {
                    role: 'system',
                    content: `You are an expert cold email copywriter. Generate highly personalized emails for each prospect.
                    
Rules:
- Each email must be unique and personalized
- Keep emails under 150 words
- Use {{name}}, {{company}}, {{jobTitle}} as personalization variables
- Be specific about value, not generic
- Include a clear, low-friction CTA
- Tone: ${businessProfile.tone || 'professional'}
- Reference their specific role, company, or industry when possible

Return JSON array format:
[
  {
    "to": "email@example.com",
    "subject": "personalized subject",
    "body": "personalized email body"
  }
]`
                },
                {
                    role: 'user',
                    content: `Business: ${businessProfile.name}
Value Prop: ${businessProfile.valueProposition}
Target Audience: ${businessProfile.targetAudience}

Prospects to personalize for:
${prospectContext}

Generate personalized emails for each prospect.`
                }
            ],
            max_tokens: 4000,
            temperature: 0.7
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenRouter API error:', errorText);
        throw new Error(`AI generation failed: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    
    if (!text) {
        throw new Error('AI returned empty response');
    }

    // Try to parse JSON array
    let emails;
    try {
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
            emails = JSON.parse(match[0]);
        } else {
            throw new Error('No JSON array found in response');
        }
    } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        throw new Error('Invalid AI response format');
    }

    // Ensure we have emails for all prospects
    if (emails.length !== prospects.length) {
        console.warn(`AI generated ${emails.length} emails for ${prospects.length} prospects, filling gaps with fallbacks`);
        
        const fallbackEmails = generateFallbackEmails(prospects.slice(emails.length), businessProfile);
        emails.push(...fallbackEmails);
    }

    // Map emails to prospects
    return prospects.map((prospect, index) => ({
        prospectId: prospect.id,
        to: prospect.email,
        subject: emails[index]?.subject || generateFallbackSubject(prospect, businessProfile),
        body: emails[index]?.body || generateFallbackBody(prospect, businessProfile),
        name: prospect.name,
        company: prospect.company,
        jobTitle: prospect.jobTitle
    }));
}

function generateFallbackEmails(prospects: any[], businessProfile: any): {
    prospectId: string;
    to: string;
    subject: string;
    body: string;
    name: string;
    company: string;
    jobTitle: string;
}[] {
    return prospects.map(prospect => ({
        prospectId: prospect.id,
        to: prospect.email,
        subject: generateFallbackSubject(prospect, businessProfile),
        body: generateFallbackBody(prospect, businessProfile),
        name: prospect.name,
        company: prospect.company,
        jobTitle: prospect.jobTitle
    }));
}

function generateFallbackSubject(prospect: any, businessProfile: any) {
    const subjects = [
        `Quick question about ${prospect.company}`,
        `Regarding your role as ${prospect.jobTitle} at ${prospect.company}`,
        `Opportunity for ${prospect.company}`,
        `Thoughts on ${prospect.company}'s growth`,
        `Connecting about ${prospect.company}`
    ];
    return subjects[Math.floor(Math.random() * subjects.length)];
}

function generateFallbackBody(prospect: any, businessProfile: any) {
    const firstName = prospect.name.split(' ')[0];
    
    const templates = [
        `Hi ${firstName},

I came across ${prospect.company} and was impressed by your work as a ${prospect.jobTitle}. 

${businessProfile.valueProposition || 'We help companies like yours achieve their goals more efficiently.'}

Would you be open to a brief conversation next week to explore how we might be able to help ${prospect.company}?

Best regards`,
        
        `Hi ${firstName},

As a ${prospect.jobTitle} at ${prospect.company}, you're likely focused on growth and efficiency.

${businessProfile.valueProposition || 'Our solution has helped similar companies achieve significant improvements.'}

I'd love to share some insights specific to ${prospect.company}. Are you available for a quick call?

Best regards`,
        
        `Hi ${firstName},

I've been following ${prospect.company}'s progress and I'm impressed by what you're building.

${businessProfile.valueProposition || 'We specialize in helping companies in your space overcome key challenges.'}

Would you be interested in learning how we could potentially help ${prospect.company} scale faster?

Best regards`
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
}
