import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.js';
import { GmailService } from '@/lib/gmail';
import { DatabaseService } from '@/lib/supabase.js';
import { decrypt } from '@/lib/crypto.js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const session = await auth();

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email address required' }, { status: 400 });
        }

        const userEmail = session.user.email;

        // Get tokens from database
        const db = new DatabaseService();
        const tokens = await db.getUserTokens(userEmail);

        if (!tokens?.access_token) {
            return NextResponse.json({ error: 'No access token' }, { status: 401 });
        }

        const accessToken = decrypt(tokens.access_token);
        const gmailService = new GmailService(accessToken);

        // Fetch last 100 emails with this contact
        const query = `from:${email} OR to:${email}`;
        const emailsResponse = await gmailService.getEmails(100, query);
        const messages = emailsResponse?.messages || [];

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
        const emailContents = [];
        const socialLinks = [];

        // Process up to 20 emails for detailed analysis
        for (const msg of messages.slice(0, 20)) {
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
        let trend = 'stable';
        let sentimentHistory = [];
        let aiSuggestion = '';
        let recentTopics = [];

        const openRouterKey = process.env.OPENROUTERAPI_KEY2;

        if (openRouterKey && emailContents.length > 0) {
            try {
                const prompt = `Analyze the following email conversation between a user and their contact. Return a JSON response with:
1. relationshipScore (0-100): Overall relationship health
2. trend: "up" if improving, "down" if declining, "stable" if neutral
3. sentimentHistory: Array of 8 numbers (50-100) representing sentiment over time (oldest to newest)
4. aiSuggestion: A brief, actionable insight about this relationship (1-2 sentences)
5. recentTopics: Array of 3 main topics discussed

Emails (newest first):
${emailContents.slice(0, 10).map(e => `[${e.direction.toUpperCase()}] Subject: ${e.subject}\nSnippet: ${e.snippet}`).join('\n\n')}

Return only valid JSON, no markdown.`;

                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${openRouterKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://mailient.xyz',
                        'X-Title': 'Mailient'
                    },
                    body: JSON.stringify({
                        model: 'google/gemini-2.0-flash-001',
                        messages: [
                            { role: 'system', content: 'You are analyzing email relationships. Return only valid JSON.' },
                            { role: 'user', content: prompt }
                        ],
                        temperature: 0.7,
                        max_tokens: 500
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const responseText = data.choices?.[0]?.message?.content || '';
                    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

                    if (jsonMatch) {
                        const analysis = JSON.parse(jsonMatch[0]);
                        relationshipScore = analysis.relationshipScore || 65;
                        trend = analysis.trend || 'stable';
                        sentimentHistory = analysis.sentimentHistory || [];
                        aiSuggestion = analysis.aiSuggestion || '';
                        recentTopics = analysis.recentTopics || [];
                    }
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
