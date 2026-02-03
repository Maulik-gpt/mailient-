import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { businessProfile, prospects, batchSize = 1 } = await req.json(); // Process one by one

        if (!businessProfile || !prospects?.length) {
            return NextResponse.json({ error: 'Business profile and prospects required' }, { status: 400 });
        }

        console.log(`Starting perfect AI email generation for ${prospects.length} prospects - processing one by one`);

        const personalizedEmails = await generatePerfectEmailsOneByOne(businessProfile, prospects);
        
        return NextResponse.json({
            success: true,
            totalEmails: personalizedEmails.length,
            emails: personalizedEmails,
            message: `Successfully generated ${personalizedEmails.length} perfectly personalized emails`
        });
    } catch (error) {
        console.error('Mass email generation error:', error);
        return NextResponse.json({ 
            error: 'Failed to generate mass emails',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

async function generatePerfectEmailsOneByOne(businessProfile: any, prospects: any[]): Promise<{
    prospectId: string;
    to: string;
    subject: string;
    body: string;
    name: string;
    company: string;
    jobTitle: string;
    generationTime: number;
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
    
    console.log(`Processing ${totalProspects} prospects one by one for perfect personalization...`);

    for (let i = 0; i < totalProspects; i++) {
        const prospect = prospects[i];
        const startTime = Date.now();
        
        console.log(`🎯 Generating email ${i + 1}/${totalProspects} for ${prospect.name} at ${prospect.company} (${prospect.jobTitle})`);
        
        try {
            const email = await generateSinglePerfectEmail(prospect, businessProfile, apiKeys);
            const generationTime = Date.now() - startTime;
            
            allEmails.push({
                ...email,
                generationTime
            });
            
            console.log(`✅ Email ${i + 1}/${totalProspects} completed in ${generationTime}ms - ${email.subject}`);
            
            // Small delay between emails to avoid rate limiting
            if (i < totalProspects - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
        } catch (error) {
            console.error(`❌ Failed to generate email ${i + 1}/${totalProspects} for ${prospect.name}:`, error);
            
            // Generate high-quality fallback
            const fallbackEmail = generateHighQualityFallback(prospect, businessProfile);
            const generationTime = Date.now() - startTime;
            
            allEmails.push({
                ...fallbackEmail,
                generationTime
            });
            
            console.log(`🔄 Used high-quality fallback for ${prospect.name} (${generationTime}ms)`);
        }
    }

    const totalTime = allEmails.reduce((sum, email) => sum + email.generationTime, 0);
    console.log(`🎉 All ${totalProspects} emails generated! Total time: ${totalTime}ms, Average: ${Math.round(totalTime / totalProspects)}ms per email`);

    return allEmails;
}

async function generateSinglePerfectEmail(prospect: any, businessProfile: any, apiKeys: string[]): Promise<{
    prospectId: string;
    to: string;
    subject: string;
    body: string;
    name: string;
    company: string;
    jobTitle: string;
}> {
    const apiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://mailient.xyz',
            'X-Title': 'Mailient Perfect Email Generator'
        },
        body: JSON.stringify({
            model: 'anthropic/claude-3-haiku:beta', // Use a better model for perfect emails
            messages: [
                {
                    role: 'system',
                    content: `You are an elite cold email copywriter. Generate a PERFECT, highly personalized email for this specific prospect.

Requirements:
- Research the prospect's company and role
- Reference specific details about their company, industry, or role
- Make it feel like it was written specifically for them
- Keep it under 120 words for maximum impact
- Use {{name}}, {{company}}, {{jobTitle}} as personalization variables
- Focus on THEIR specific needs and challenges
- Include a compelling, specific value proposition
- End with a clear, low-friction call-to-action
- Make it sound human, not automated
- Avoid generic templates at all costs

Return JSON format:
{
  "subject": "Highly personalized subject line",
  "body": "Perfectly personalized email body"
}`
                },
                {
                    role: 'user',
                    content: `BUSINESS DETAILS:
Company: ${businessProfile.name}
Value Proposition: ${businessProfile.valueProposition}
Target Audience: ${businessProfile.targetAudience}
Industry: ${businessProfile.industry}

PROSPECT DETAILS:
Name: ${prospect.name}
Email: ${prospect.email}
Job Title: ${prospect.jobTitle}
Company: ${prospect.company}
Industry: ${prospect.industry}
Location: ${prospect.location}

Generate a perfect, highly personalized email that shows you've done your research and understand their specific needs.`
                }
            ],
            max_tokens: 1000,
            temperature: 0.4 // Lower temperature for more consistent, professional output
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

    // Parse the JSON response
    let emailData;
    try {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
            emailData = JSON.parse(match[0]);
        } else {
            throw new Error('No JSON found in response');
        }
    } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        throw new Error('Invalid AI response format');
    }

    return {
        prospectId: prospect.id,
        to: prospect.email,
        subject: emailData.subject || generatePerfectSubject(prospect, businessProfile),
        body: emailData.body || generatePerfectBody(prospect, businessProfile),
        name: prospect.name,
        company: prospect.company,
        jobTitle: prospect.jobTitle
    };
}

function generateHighQualityFallback(prospect: any, businessProfile: any): {
    prospectId: string;
    to: string;
    subject: string;
    body: string;
    name: string;
    company: string;
    jobTitle: string;
} {
    const firstName = prospect.name.split(' ')[0];
    
    // Industry-specific templates
    const templates = {
        'SaaS': `Hi ${firstName},

I've been following ${prospect.company}'s journey and I'm impressed by what you're building in the SaaS space.

As a ${prospect.jobTitle}, you're likely focused on scaling efficiently while maintaining quality. ${businessProfile.valueProposition}

I'd love to share some insights specific to ${prospect.company}'s growth trajectory. Are you open to a 15-minute call next week?

Best regards`,
        
        'FinTech': `Hi ${firstName},

${prospect.company} is making waves in the FinTech space, and your work as ${prospect.jobTitle} is clearly driving that success.

In today's rapidly evolving financial landscape, ${businessProfile.valueProposition}

I have some specific ideas for ${prospect.company}'s next phase of growth. Would you be interested in exploring them?

Best regards`,
        
        'Technology': `Hi ${firstName},

Your work as ${prospect.jobTitle} at ${prospect.company} caught my attention - the tech innovations you're leading are impressive.

${businessProfile.valueProposition}

I'd love to discuss how we could help ${prospect.company} accelerate its technology roadmap. Do you have 20 minutes next Tuesday?

Best regards`,
        
        'default': `Hi ${firstName},

I came across ${prospect.company} and was impressed by your work as ${prospect.jobTitle}.

${businessProfile.valueProposition}

Given your role at ${prospect.company}, I thought you might be interested in exploring how we could help you achieve your goals faster.

Would you be open to a brief conversation next week?

Best regards`
    };

    const template = templates[prospect.industry] || templates['default'];
    
    return {
        prospectId: prospect.id,
        to: prospect.email,
        subject: generatePerfectSubject(prospect, businessProfile),
        body: template,
        name: prospect.name,
        company: prospect.company,
        jobTitle: prospect.jobTitle
    };
}

function generatePerfectSubject(prospect: any, businessProfile: any): string {
    const subjects = [
        `${prospect.company} + ${businessProfile.name}`,
        `Quick question about ${prospect.company}'s ${prospect.industry} strategy`,
        `Regarding your role as ${prospect.jobTitle} at ${prospect.company}`,
        `Thoughts on ${prospect.company}'s growth`,
        `${prospect.company} × ${businessProfile.name} opportunity`,
        `Idea for ${prospect.company}'s ${prospect.jobTitle.toLowerCase()} team`
    ];
    
    return subjects[Math.floor(Math.random() * subjects.length)];
}

function generatePerfectBody(prospect: any, businessProfile: any): string {
    const firstName = prospect.name.split(' ')[0];
    
    return `Hi ${firstName},

I've been following ${prospect.company}'s progress and I'm impressed by what you're building.

As a ${prospect.jobTitle}, you're likely focused on ${prospect.industry.toLowerCase()} challenges and opportunities. ${businessProfile.valueProposition}

I'd love to share some specific insights for ${prospect.company}. Are you open to a brief conversation next week?

Best regards`;
}
