import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { businessProfile, prospects } = await req.json();

        if (!businessProfile || !prospects?.length) {
            return NextResponse.json({ error: 'Business profile and prospects required' }, { status: 400 });
        }

        const email = await generateEmailWithAI(businessProfile, prospects);
        return NextResponse.json(email);
    } catch (error) {
        console.error('Generate email error:', error);
        return NextResponse.json({ error: 'Failed to generate email' }, { status: 500 });
    }
}

async function generateEmailWithAI(businessProfile: any, prospects: any[]) {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        return generateFallbackEmail(businessProfile);
    }

    try {
        const prospectContext = prospects.slice(0, 5).map(p =>
            `${p.name} - ${p.jobTitle} at ${p.company}`
        ).join('\n');

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                // Use a high-quality free model from OpenRouter
                model: 'qwen/qwen3-coder:free',
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert cold email copywriter. Write a personalized, high-converting cold email.
            
Rules:
- Keep it under 150 words
- Use {{name}}, {{company}}, {{jobTitle}} as personalization variables
- Be specific about value, not generic
- Include a clear, low-friction CTA
- Tone: ${businessProfile.tone || 'professional'}

Return JSON: { "subject": "email subject", "body": "email body" }`
                    },
                    {
                        role: 'user',
                        content: `Business: ${businessProfile.name}
Value Prop: ${businessProfile.valueProposition}
Target Audience: ${businessProfile.targetAudience}

Sample Prospects:
${prospectContext}

Write a compelling cold email.`
                    }
                ],
                max_tokens: 800,
                temperature: 0.7
            })
        });

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        const match = text?.match(/\{[\s\S]*\}/);

        if (match) {
            return JSON.parse(match[0]);
        }

        return generateFallbackEmail(businessProfile);
    } catch (error) {
        console.error('AI email generation error:', error);
        return generateFallbackEmail(businessProfile);
    }
}

function generateFallbackEmail(businessProfile: any) {
    const businessName = businessProfile.name || 'our company';
    const valueProp = businessProfile.valueProposition || 'help businesses grow faster';

    return {
        subject: `Quick question about {{company}}'s growth, {{name}}`,
        body: `Hi {{name}},

I came across {{company}} and was impressed by what you're building as ${businessProfile.industry || 'a leader'} in the space.

At ${businessName}, we ${valueProp}. We've helped similar companies achieve significant improvements in their key metrics.

I'd love to share a few specific ideas tailored to {{company}}'s current stage.

Would you be open to a quick 15-minute chat this week?

Best regards`
    };
}
