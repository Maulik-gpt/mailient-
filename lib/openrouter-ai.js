/**
 * OpenRouter AI Service
 * Handles communication with OpenRouter API for various AI tasks
 */

export class OpenRouterAIService {
    constructor() {
        // Default to OPENROUTER_API_KEY for general use
        this.apiKey = (process.env.OPENROUTER_API_KEY || '').trim();
        // Prefer OpenRouter's free router so the app stays on a real free model path
        this.model = (process.env.OPENROUTER_MODEL || 'openrouter/free').trim();
        this.baseURL = 'https://openrouter.ai/api/v1';

        if (!this.apiKey) {
            console.error('❌ OPENROUTER_API_KEY is not configured in environment variables');
        }
    }

    async callOpenRouter(messages, options = {}) {
        const models = [
            this.model
        ];

        console.log('🤖 AI Request started with ' + messages.length + ' messages');

        for (const modelId of models) {
            try {
                console.log('📡 Attempting model: ' + modelId);

                if (!this.apiKey) {
                    throw new Error('API Key missing');
                }

                const response = await fetch(`${this.baseURL}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`,
                        'HTTP-Referer': process.env.HOST || 'http://localhost:3000',
                        'X-Title': 'Mailient'
                    },
                    body: JSON.stringify({
                        model: modelId,
                        messages,
                        temperature: options.temperature || 0.3, // Slightly higher temp for more creativity in finding links
                        max_tokens: options.maxTokens || 2000
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.warn('⚠️ ' + modelId + ' failed with status ' + response.status + ': ' + errorText.substring(0, 100));
                    continue;
                }

                const data = await response.json();
                if (data?.choices?.[0]?.message?.content) {
                    console.log('✅ AI Success with ' + modelId);
                    return data;
                } else {
                    console.warn('⚠️ ' + modelId + ' returned empty response');
                    continue;
                }
            } catch (error) {
                console.warn('❌ ' + modelId + ' error: ' + error.message);
                continue;
            }
        }
        throw new Error('All OpenRouter models failed or returned empty. Check your API key and credits.');
    }

    extractResponse(data) {
        return data?.choices?.[0]?.message?.content || '';
    }

    async generateEmailSummary(emailContent) {
        try {
            if (!emailContent || emailContent.trim().length < 10) {
                return 'This email appears to be empty or very short.';
            }

            const cleanContent = emailContent.substring(0, 6000).trim();

            const messages = [
                {
                    role: 'system',
                    content: 'You are an email summarizer. Provide a clear, concise summary including: main topic, key points, any action items, and the sender\'s intent. Keep it to 2-4 sentences.'
                },
                { role: 'user', content: 'Summarize this email:\n\n' + cleanContent }
            ];

            console.log('📝 Generating email summary...');
            const response = await this.callOpenRouter(messages, { maxTokens: 400, temperature: 0.3 });
            const summary = this.extractResponse(response);

            if (summary && summary.trim().length > 10) {
                console.log('✅ Summary generated');
                return summary;
            }

            return 'This email contains a message that requires your review.';
        } catch (error) {
            console.error('❌ Summary error:', error.message);
            return 'Could not generate summary. Please read the email directly.';
        }
    }

    async generateDraftReply(emailContent, category, userContext = {}) {
        try {
            if (!emailContent || emailContent.trim().length < 10) {
                return 'Thank you for your email. I will review and get back to you soon.';
            }

            // Extract From Name for better greeting
            let fromName = 'there';
            const fromMatch = emailContent.match(/From:\s*([^<\n]+)/);
            if (fromMatch && fromMatch[1]) {
                fromName = fromMatch[1].trim().replace(/["']/g, '').split(' ')[0]; // First name only
            }

            const cleanContent = emailContent.substring(0, 4000).trim();
            const categoryName = category || 'general';
            const userName = userContext.name || 'User';

            const messages = [
                {
                    role: 'system',
                    content: `You are an AI drafting a professional email reply.
Context:
- You are acting as: ${userName} (The User)
- You are replying to: ${fromName} (The Original Sender)
- Email Category: ${categoryName}

Goal:
- Write a warm, professional, and concise reply.
- **GREETING**: Start with "Hi ${fromName},"
- **SIGN-OFF**: End with "Best regards,\n${userName}"
- Do not add placeholders. Write a complete, ready-to-send draft.`
                },
                { role: 'user', content: 'Draft a reply to this email:\n\n' + cleanContent }
            ];

            console.log('✍️ Generating draft reply for ' + userName + '...');
            const response = await this.callOpenRouter(messages, { maxTokens: 500, temperature: 0.5 });
            const draft = this.extractResponse(response);

            if (draft && draft.trim().length > 20) {
                console.log('✅ Draft generated');
                return draft;
            }

            return `Hi ${fromName},\n\nThank you for reaching out. I appreciate your message and will respond shortly.\n\nBest regards,\n${userName}`;
        } catch (error) {
            console.error('❌ Draft error:', error.message);
            return 'Thank you for your email. I will review this and get back to you soon.\n\nBest regards';
        }
    }

    async generateInboxIntelligence(gmailData) {
        const emails = gmailData.slice(0, 50);
        const emailIds = emails.map(e => e.id);
        const categories = ['opportunity', 'urgent', 'lead', 'risk', 'follow_up', 'important'];

        console.log('🧠 Processing ' + emails.length + ' emails for Intelligence...');

        if (emails.length === 0) {
            return this.createEmptyResponse(categories);
        }

        // OPTIMIZATION: Use simple indices for the AI instead of long IDs to prevent hallucinations
        const emailList = emails.map((e, idx) =>
            `Email #${idx}\nFrom: ${(e.from || '').substring(0, 80)}\nSubject: ${(e.subject || '').substring(0, 100)}\nPreview: ${(e.snippet || '').substring(0, 200)}\n`
        ).join('\n---\n');

        const prompt = `You are Sift AI, an advanced email analyst.
        
Your task is to organize the user's inbox by sorting emails into categories.
**CRITICAL GOAL**: Categorize **AS MANY EMAILS AS POSSIBLE**.
Do NOT filter aggressively. Unless an email is absolute spam/junk (e.g., "Viagra", "You won a lottery"), you MUST categorize it.
The user wants to see their emails organized, not hidden. Empty categories are a failure.

CATEGORIES (Sort every non-spam email into one of these):
1. opportunity: Business/Job offers, partnerships, "wins", side-projects, positive prospects.
2. urgent: Deadlines, problems, time-sensitive requests, immediate action items.
3. lead: New contacts, introductions, potential clients, inquiries.
4. risk: Issues, complaints, cancellations, negative news.
5. follow_up: Ongoing conversations, scheduling, questions (Personal or Professional).
6. important: EVERYTHING ELSE VALUEABLE - Newsletters, updates, notifications, bills, receipts.

INSTRUCTIONS:
- **Bias for Action**: If in doubt, PUT IT IN A CATEGORY. (Use 'Important' or 'Follow-up' as catch-alls).
- **Volume**: I expect to see 20-40 emails categorized if the input has them. 2 emails is unacceptable.
- **Descriptions**: For "summary", write a punchy, 1-sentence description of what's inside.
- **Output**: Return indices of selected emails.

EMAILS TO PROCESS:
${emailList}

RESPOND WITH ONLY THIS JSON (Example - Fill yours with REAL data, aim for 5-10 per category):
{
  "opportunity": {"title": "Opportunities", "summary": "...", "relevance": 8, "ids": [0, 2, 5, 12, 15]},
  "urgent": {"title": "Needs Attention", "summary": "...", "relevance": 9, "ids": [1, 3, 9]},
  "lead": {"title": "Potential Leads", "summary": "...", "relevance": 7, "ids": [4, 6, 11, 14]},
  "risk": {"title": "Risks", "summary": "...", "relevance": 6, "ids": [7, 8]},
  "follow_up": {"title": "Follow-ups", "summary": "...", "relevance": 5, "ids": [10, 13, 16, 18, 20]},
  "important": {"title": "Updates", "summary": "...", "relevance": 4, "ids": [17, 19, 21, 22, 23, 24]}
}`;

        try {
            const messages = [{ role: 'user', content: prompt }];
            const response = await this.callOpenRouter(messages, { temperature: 0.3, maxTokens: 4000 });
            let content = this.extractResponse(response);

            console.log('📥 AI responded. Parsing indices...');

            let result = {};
            try {
                if (content) {
                    content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                    const match = content.match(/\{[\s\S]*\}/);
                    if (match) content = match[0];
                    result = JSON.parse(content || '{}');
                }
            } catch (e) {
                console.error('❌ JSON parse failed:', e.message);
                console.warn('Raw content:', content.substring(0, 100));
            }

            // Compatibility: Handle diverse AI response formats for IDs
            categories.forEach(cat => {
                let ids = result[cat]?.ids || [];

                if (typeof ids === 'string') {
                    ids = ids.replace(/[\[\]]/g, '').split(',').map(s => s.trim()).filter(s => s !== '');
                    ids = ids.map(i => isNaN(parseInt(i)) ? i : parseInt(i));
                }

                const mappedIds = [];
                if (ids && Array.isArray(ids)) {
                    ids.forEach(idx => {
                        if (typeof idx === 'number' && emailIds[idx]) mappedIds.push(emailIds[idx]);
                        else if (typeof idx === 'string' && !isNaN(parseInt(idx)) && emailIds[parseInt(idx)]) mappedIds.push(emailIds[parseInt(idx)]);
                        else if (typeof idx === 'string' && emailIds.includes(idx)) mappedIds.push(idx);
                    });
                }

                // Ensure category object exists
                if (!result[cat]) {
                    result[cat] = { title: cat.charAt(0).toUpperCase() + cat.slice(1), summary: 'Identified items', relevance: 5, ids: [] };
                }
                result[cat].ids = [...new Set(mappedIds)];
            });

            // HYBRID FILLER: If AI returns mostly empty, fill gaps with local keyword rules
            const totalAI = categories.reduce((sum, cat) => sum + (result[cat]?.ids?.length || 0), 0);
            console.log(`📊 AI identified ${totalAI} emails. Running Hybrid Filler...`);

            this.fillGapsWithLocalRules(emails, emailIds, result, categories);

            return this.buildEnhancedResponse(result, emailIds, categories);

        } catch (error) {
            console.error('❌ AI Error:', error.message);
            return this.smartDistribute(emails, emailIds, categories);
        }
    }

    fillGapsWithLocalRules(emails, emailIds, result, categories) {
        // Simple keyword maps 
        const rules = {
            opportunity: ['proposal', 'partnership', 'collab', 'intro', 'opportunity', 'offer', 'interested', 'demo'],
            urgent: ['urgent', 'asap', 'overdue', 'blocked', 'deadline', 'immediate', 'emergency', 'alert'],
            lead: ['lead', 'pricing', 'quote', 'inquiry', 'demo', 'trial', 'sign up'],
            risk: ['cancel', 'refund', 'complaint', 'issue', 'error', 'fail', 'problem', 'ticket'],
            follow_up: ['follow up', 'checking in', 'thoughts?', 'update?', 'status', 'schedule', 'meeting'],
            important: ['invoice', 'receipt', 'security', 'alert', 'statement', 'report', 'newsletter', 'update', 'digest']
        };

        const assignedIds = new Set();
        categories.forEach(cat => (result[cat]?.ids || []).forEach(id => assignedIds.add(id)));

        emails.forEach((email, idx) => {
            const id = emailIds[idx];
            if (assignedIds.has(id)) return; // Already categorized by AI

            const text = (email.subject + ' ' + (email.snippet || '')).toLowerCase();

            for (const cat of categories) {
                if (rules[cat].some(keyword => text.includes(keyword))) {
                    if (!result[cat]) result[cat] = { ids: [] };
                    result[cat].ids.push(id);
                    assignedIds.add(id);
                    return; // Assign to first matching category
                }
            }

            // If still unassigned, maybe put in 'Important' if it looks like a newsletter or meaningful notification
            if (['no-reply', 'updates', 'newsletter'].some(s => (email.from || '').toLowerCase().includes(s))) {
                result['important'].ids.push(id);
                assignedIds.add(id);
            }
        });

        // If STILL unassigned and totally empty, put in follow_up as "Inbox Zero" candidate? No, leave it.
        // Actually, let's distribute remaining "real" emails to 'Important' just to ensure visibility if user asked for volume.
        emails.forEach((email, idx) => {
            const id = emailIds[idx];
            if (!assignedIds.has(id)) {
                // Balanced Fill: Put remaining in 'Important'
                result['important'].ids.push(id);
                assignedIds.add(id);
            }
        });
    }

    smartDistribute(emails, emailIds, categories) {
        console.warn('⚠️ AI Service failed, using pure local distribution.');
        const result = {};
        categories.forEach(c => result[c] = { title: c, summary: 'Auto-categorized', ids: [] });

        this.fillGapsWithLocalRules(emails, emailIds, result, categories);
        return this.buildEnhancedResponse(result, emailIds, categories);
    }

    buildResponse(result, emailIds, categories) {
        return this.buildEnhancedResponse(result, emailIds, categories);
    }

    buildEnhancedResponse(result, emailIds, categories) {
        const insights = categories.map(category => {
            const data = result[category] || {};
            const ids = (data.ids || []).filter(id => emailIds.includes(id));
            let relevance = data.relevance || 5;

            // Enforce relevance clamping
            if (ids.length === 0) relevance = 0;

            // Determine priority based on category and relevance
            let priority = 'low';
            if (['urgent', 'opportunity'].includes(category)) {
                priority = 'high';
            } else if (['lead', 'risk'].includes(category)) {
                priority = 'medium';
            }

            // Adjust priority if relevance is explicitly low
            if (relevance < 4) priority = 'low';
            if (relevance > 8) priority = 'high';

            return {
                id: 'insight-' + category + '-' + Date.now(),
                type: category,
                title: data.title || category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' '),
                content: data.summary || (ids.length > 0 ? ids.length + ' emails identified' : 'No significant items'),
                timestamp: new Date().toISOString(),
                metadata: {
                    category,
                    priority,
                    relevance_score: relevance,
                    emails_involved: ids,
                    source: 'sift-ai-enhanced'
                }
            };
        });

        const summary = {
            opportunities_detected: insights[0].metadata.emails_involved.length,
            urgent_action_required: insights[1].metadata.emails_involved.length,
            hot_leads_heating_up: insights[2].metadata.emails_involved.length,
            conversations_at_risk: insights[3].metadata.emails_involved.length,
            missed_follow_ups: insights[4].metadata.emails_involved.length,
            unread_but_important: insights[5].metadata.emails_involved.length
        };

        const total = Object.values(summary).reduce((a, b) => a + b, 0);
        console.log('✅ Enhanced Final: ' + total + ' emails categorized. (Hybrid Mode)');

        return { sift_intelligence_summary: summary, inbox_intelligence: insights };
    }

    createEmptyResponse(categories) {
        return {
            sift_intelligence_summary: {
                opportunities_detected: 0,
                urgent_action_required: 0,
                hot_leads_heating_up: 0,
                conversations_at_risk: 0,
                missed_follow_ups: 0,
                unread_but_important: 0
            },
            inbox_intelligence: categories.map(c => ({
                id: 'insight-' + c,
                type: c,
                title: c.charAt(0).toUpperCase() + c.slice(1).replace('_', ' '),
                content: 'No emails to analyze',
                timestamp: new Date().toISOString(),
                metadata: { category: c, priority: 'low', emails_involved: [], source: 'empty' }
            }))
        };
    }

    async generateChatResponse(userMessage, emailContext = null) {
        try {
            const systemContent = 'You are Sift AI assistant.' + (emailContext ? ' Context: ' + emailContext : '');
            const messages = [
                { role: 'system', content: systemContent },
                { role: 'user', content: userMessage }
            ];
            const response = await this.callOpenRouter(messages, { maxTokens: 500 });
            return this.extractResponse(response) || 'I am having trouble responding right now.';
        } catch {
            return 'I am having trouble right now. Please try again.';
        }
    }

    async generateRepairReply(emailContent, userContext = {}) {
        try {
            if (!emailContent || emailContent.trim().length < 10) {
                return 'Thank you for reaching out. I appreciate your message and will respond shortly.';
            }

            // Extract sender information
            let fromName = 'there';
            const fromMatch = emailContent.match(/From:\s*([^<\n]+)/);
            if (fromMatch && fromMatch[1]) {
                fromName = fromMatch[1].trim().replace(/["']/g, '').split(' ')[0]; // First name only
            }

            const cleanContent = emailContent.substring(0, 4000).trim();
            const userName = userContext.name || 'User';

            const messages = [
                {
                    role: 'system',
                    content: `You are an AI drafting a professional, polite, and relationship-repairing email reply.
                    
                    **CONTEXT**: This is a "risk" email - there may be issues, complaints, or strained relations.
                    
                    **GOAL**: Write a reply that:
                    1. **ACKNOWLEDGES** the sender's concerns with genuine empathy
                    2. **APOLOGIZES** sincerely if appropriate (without over-apologizing)
                    3. **REPAIRS** the relationship with warmth and professionalism
                    4. **ESTABLISHES** a pure and spiritual connection
                    5. **OFFERS** a constructive path forward
                    
                    **TONE**: Warm, professional, empathetic, and slightly spiritual (but not religious)
                    
                    **STRUCTURE**:
                    - **GREETING**: "Dear [Name]," (use first name only)
                    - **ACKNOWLEDGMENT**: Show you understand their concerns
                    - **APOLOGY**: If appropriate, express sincere regret
                    - **REPAIR**: Reaffirm the relationship and shared goals
                    - **SOLUTION**: Offer a constructive next step
                    - **CLOSING**: End with warmth and connection
                    - **SIGN-OFF**: "With gratitude and respect," + your name
                    
                    **AVOID**: Blame, excuses, defensiveness, or corporate jargon.
                    
                    Write a complete, ready-to-send email. Do not use placeholders.`
                },
                {
                    role: 'user',
                    content: `Draft a relationship-repairing reply to this email. Be warm, professional, and focus on rebuilding trust and connection:

${cleanContent}

**Important**: The sender's name is ${fromName}, and I am ${userName}.`
                }
            ];

            console.log('🛠️  Generating repair reply for relationship healing...');
            const response = await this.callOpenRouter(messages, { maxTokens: 600, temperature: 0.7 });
            const repairReply = this.extractResponse(response);

            if (repairReply && repairReply.trim().length > 20) {
                console.log('✅ Relationship repair draft generated');
                return repairReply;
            }

            // Fallback if AI response is too short
            return `Dear ${fromName},

Thank you for sharing your thoughts and concerns with me. I truly appreciate your honesty and the opportunity to understand your perspective better.

I sincerely apologize for any frustration or disappointment you may have experienced. Your satisfaction and our relationship are incredibly important to me, and I want to ensure we're on the same page moving forward.

Let me assure you that I value our connection deeply. I believe we share common goals and can work together to resolve any issues. Would you be open to discussing this further so we can find a solution that works for both of us?

I'm committed to making this right and rebuilding the trust between us. Please let me know a convenient time for you to connect.

With gratitude and respect,
${userName}`;
        } catch (error) {
            console.error('❌ Repair reply error:', error.message);
            return `Dear ${fromName},

Thank you for reaching out and sharing your concerns. I truly value our relationship and want to ensure we maintain open communication.

I apologize for any issues you've experienced. Your feedback is incredibly important to me, and I'm committed to addressing your concerns promptly and thoroughly.

Let's work together to resolve this matter. I believe we can find a solution that strengthens our connection. Please let me know how you'd like to proceed.

With sincere appreciation,
${userName}`;
        }
    }
}
