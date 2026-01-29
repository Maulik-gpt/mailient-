import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GmailService } from '@/lib/gmail';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.accessToken || !session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email address required' }, { status: 400 });
        }

        const gmailService = new GmailService(session.accessToken);
        const userEmail = session.user.email;

        // Fetch emails with this contact
        const query = `from:${email} OR to:${email}`;
        const messages = await gmailService.listEmails(query, 20);

        if (!messages || messages.length === 0) {
            return NextResponse.json({
                analysis: {
                    relationshipScore: 50,
                    trend: 'stable',
                    sentimentHistory: [50, 50, 50, 50, 50, 50, 50, 50],
                    aiSuggestion: 'No recent email history with this contact.',
                    socialLinks: [],
                    recentTopics: []
                }
            });
        }

        // Get email contents for analysis
        const emailContents: { subject: string; snippet: string; date: string; direction: string }[] = [];
        const socialLinks: { type: string; url: string }[] = [];

        for (const msg of messages.slice(0, 10)) {
            try {
                const details = await gmailService.getEmailDetails(msg.id);
                const parsed = gmailService.parseEmailData(details);

                const isFromContact = parsed.from?.toLowerCase().includes(email.toLowerCase());

                emailContents.push({
                    subject: parsed.subject || '',
                    snippet: parsed.snippet || '',
                    date: parsed.date || '',
                    direction: isFromContact ? 'received' : 'sent'
                });

                // Extract social links from email body/signature
                if (parsed.body) {
                    const linkedinMatch = parsed.body.match(/linkedin\.com\/in\/[\w-]+/gi);
                    const twitterMatch = parsed.body.match(/twitter\.com\/[\w]+/gi) || parsed.body.match(/x\.com\/[\w]+/gi);

                    if (linkedinMatch && !socialLinks.some(l => l.type === 'linkedin')) {
                        socialLinks.push({ type: 'linkedin', url: `https://${linkedinMatch[0]}` });
                    }
                    if (twitterMatch && !socialLinks.some(l => l.type === 'twitter')) {
                        socialLinks.push({ type: 'twitter', url: `https://${twitterMatch[0]}` });
                    }
                }
            } catch (e) {
                console.error('Error fetching email details:', e);
            }
        }

        // Use AI to analyze the relationship
        let relationshipScore = 65;
        let trend: 'up' | 'down' | 'stable' = 'stable';
        let sentimentHistory: number[] = [];
        let aiSuggestion = '';
        let recentTopics: string[] = [];

        if (process.env.OPENAI_API_KEY && emailContents.length > 0) {
            try {
                const prompt = `Analyze the following email conversation between a user and their contact. Return a JSON response with:
1. relationshipScore (0-100): Overall relationship health
2. trend: "up" if improving, "down" if declining, "stable" if neutral
3. sentimentHistory: Array of 8 numbers (50-100) representing sentiment over time (oldest to newest)
4. aiSuggestion: A brief, actionable insight about this relationship (1-2 sentences)
5. recentTopics: Array of 3 main topics discussed

Emails (newest first):
${emailContents.slice(0, 5).map(e => `[${e.direction.toUpperCase()}] Subject: ${e.subject}\nSnippet: ${e.snippet}`).join('\n\n')}

Return only valid JSON, no markdown.`;

                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: 'You are analyzing email relationships. Return only valid JSON.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 500
                });

                const responseText = completion.choices[0]?.message?.content || '';
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);

                if (jsonMatch) {
                    const analysis = JSON.parse(jsonMatch[0]);
                    relationshipScore = analysis.relationshipScore || 65;
                    trend = analysis.trend || 'stable';
                    sentimentHistory = analysis.sentimentHistory || [];
                    aiSuggestion = analysis.aiSuggestion || '';
                    recentTopics = analysis.recentTopics || [];
                }
            } catch (aiError) {
                console.error('AI analysis error:', aiError);
            }
        }

        // Generate fallback sentiment history if not provided
        if (sentimentHistory.length === 0) {
            const baseScore = relationshipScore;
            sentimentHistory = Array.from({ length: 8 }, (_, i) => {
                const variance = Math.random() * 20 - 10;
                const trendAdjust = trend === 'up' ? i * 3 : trend === 'down' ? -i * 3 : 0;
                return Math.min(100, Math.max(30, Math.round(baseScore + variance + trendAdjust)));
            });
        }

        // Generate fallback suggestion if not provided
        if (!aiSuggestion) {
            const emailCount = emailContents.length;
            const receivedCount = emailContents.filter(e => e.direction === 'received').length;
            const sentCount = emailCount - receivedCount;

            if (sentCount > receivedCount * 2) {
                aiSuggestion = 'You\'ve been reaching out more than receiving responses. Consider a different approach or timing.';
            } else if (receivedCount > sentCount * 2) {
                aiSuggestion = 'This contact is quite responsive. Great opportunity to strengthen this relationship.';
            } else {
                aiSuggestion = 'This appears to be a balanced communication pattern. Keep up the consistent engagement.';
            }
        }

        return NextResponse.json({
            analysis: {
                relationshipScore,
                trend,
                sentimentHistory,
                aiSuggestion,
                socialLinks,
                recentTopics
            }
        });

    } catch (error) {
        console.error('Contact analysis error:', error);
        return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
    }
}
