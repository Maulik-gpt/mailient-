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
        if (!websiteContent) {
            return NextResponse.json({ error: 'Failed to fetch website' }, { status: 400 });
        }

        const analysis = await analyzeBusinessWithAI(websiteContent, url);
        return NextResponse.json(analysis);
    } catch (error) {
        console.error('Business analysis error:', error);
        return NextResponse.json({ error: 'Failed to analyze business' }, { status: 500 });
    }
}

async function fetchWebsiteContent(url: string): Promise<string | null> {
    try {
        const fullUrl = url.startsWith('http') ? url : `https://${url}`;
        const response = await fetch(fullUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Mailient/1.0)' },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();
        let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        text = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        return text.slice(0, 12000);
    } catch (error) {
        console.error('Fetch error:', error);
        return null;
    }
}

async function analyzeBusinessWithAI(content: string, url: string) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return generateMockAnalysis(url);

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-001',
                messages: [
                    { role: 'system', content: 'Analyze website and return JSON: {businessName, description, valueProposition, targetAudience, industry, suggestedFilters: {jobTitle, industry, companySize, seniorityLevel}, emailTemplate, subjectLines: []}' },
                    { role: 'user', content: `URL: ${url}\nContent: ${content}` }
                ],
                max_tokens: 1500
            })
        });
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        const match = text?.match(/\{[\s\S]*\}/);
        return match ? JSON.parse(match[0]) : generateMockAnalysis(url);
    } catch {
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
