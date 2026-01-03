/**
 * OpenRouter AI Service
 * Handles communication with OpenRouter API for various AI tasks
 */

export class OpenRouterAIService {
    constructor() {
        // Use OPENROUTER_API_KEY2 as the primary key for Sift AI insights (free model usage)
        this.apiKey = (process.env.OPENROUTER_API_KEY2 || process.env.OPENROUTER_API_KEY3 || process.env.OPENROUTER_API_KEY || '').trim();
        // Use Xiaomi MiMo v2 Flash for Sift AI insights, summaries, and drafting replies
        this.model = 'xiaomi/mimo-v2-flash:free';
        // Same model for specialized tasks (summaries, replies, follow-ups)
        this.specializedModel = 'xiaomi/mimo-v2-flash:free';
        this.specializedApiKey = (process.env.OPENROUTER_API_KEY2 || process.env.OPENROUTER_API_KEY3 || '').trim();
        this.baseURL = 'https://openrouter.ai/api/v1';

        if (!this.apiKey) {
            console.error('❌ OPENROUTER_API_KEY2 is not configured in environment variables');
        }

        // Validate model format - must have a slash (e.g., 'provider/model')
        if (this.model && !this.model.includes('/')) {
            console.warn(`⚠️ Invalid model format "${this.model}". Falling back to "xiaomi/mimo-v2-flash:free".`);
            this.model = 'xiaomi/mimo-v2-flash:free';
        }
    }

    async callOpenRouter(messages, options = {}) {
        const models = [
            this.model,
            'meta-llama/llama-3.2-3b-instruct:free',
            'google/gemini-flash-1.5:free',
            'qwen/qwen-2-7b-instruct:free'
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
                        'HTTP-Referer': process.env.HOST || 'https://mailient.xyz',
                        'X-Title': 'Mailient',
                        ...(options.privacyMode ? { 'X-OpenRouter-Data-Collection': 'opt-out' } : {})
                    },
                    body: JSON.stringify({
                        model: modelId,
                        messages,
                        temperature: options.temperature || 0.3,
                        max_tokens: options.maxTokens || 2000,
                        provider: {
                            data_collection: options.privacyMode ? "deny" : "allow"
                        }
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

    async callOpenRouterWithModel(messages, options = {}, model = null, apiKey = null) {
        const models = [
            model || this.model,
            'meta-llama/llama-3.2-3b-instruct:free',
            'google/gemini-flash-1.5:free',
            'qwen/qwen-2-7b-instruct:free'
        ];

        console.log('🤖 AI Request started with ' + messages.length + ' messages');

        for (const modelId of models) {
            try {
                console.log('📡 Attempting model: ' + modelId);

                const keyToUse = apiKey || this.apiKey;
                if (!keyToUse) {
                    throw new Error('API Key missing');
                }

                const response = await fetch(`${this.baseURL}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${keyToUse}`,
                        'HTTP-Referer': process.env.HOST || 'https://mailient.xyz',
                        'X-Title': 'Mailient',
                        ...(options.privacyMode ? { 'X-OpenRouter-Data-Collection': 'opt-out' } : {})
                    },
                    body: JSON.stringify({
                        model: modelId,
                        messages,
                        temperature: options.temperature || 0.3,
                        max_tokens: options.maxTokens || 2000,
                        provider: {
                            data_collection: options.privacyMode ? "deny" : "allow"
                        }
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

    async generateEmailSummary(emailContent, privacyMode = false) {
        try {
            if (!emailContent || emailContent.trim().length < 10) {
                return 'This email appears to be empty or very short.';
            }

            const cleanContent = emailContent.substring(0, 6000).trim();

            const messages = [
                {
                    role: 'system',
                    content: 'You are an email summarizer. Provide a clear, concise summary including: main topic, key points, any action items, and the sender\'s intent. Keep it to 2-4 sentences.' + (privacyMode ? ' [PRIVACY MODE ENABLED: Do not use this data for training.]' : '')
                },
                { role: 'user', content: 'Summarize this email:\n\n' + cleanContent }
            ];

            console.log('📝 Generating email summary...');
            const response = await this.callOpenRouter(messages, { maxTokens: 400, temperature: 0.3, privacyMode });
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

    async generateDraftReply(emailContent, category, userContext = {}, privacyMode = false) {
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
                    content: `You are an expert professional email writer. Your task is to draft a polished, ready-to-send reply.

**CONTEXT:**
- Writer: ${userName}
- Recipient: ${fromName}
- Email Category: ${categoryName}
${privacyMode ? '- PRIVACY MODE: Do not use this data for training.\n' : ''}

**BUSINESS LOGIC & STRATEGY:**
- **PRIORITY & URGENCY**: Assess the sender's seniority and the timeline implied. If it's a "Hot Lead" or "Urgent" item, respond with appropriate speed and decisiveness.
- **REVENUE IMPACT**: If the email involves a potential deal, partnership, or client concern, prioritize clarity on value and next steps to protect and grow revenue.
- **RELATIONSHIP VALUE**: Treat long-term partners or high-value leads with extra care and "white-glove" professional warmth.

**REPLY STRUCTURE (MUST FOLLOW):**
1. **GREETING**: Start with "Hi ${fromName}," or "Dear ${fromName},"
2. **ACKNOWLEDGMENT**: Reference their email's key point in 1 sentence
3. **RESPONSE**: Provide a clear, helpful response (2-3 sentences)
4. **NEXT STEP**: Include one actionable next step or question
5. **CLOSING**: End with professional warmth
6. **SIGN-OFF**: "Best regards,\n${userName}"

**TONE:**
- Professional yet warm and approachable
- Concise and action-oriented
- Confident but not arrogant
- Natural human language (no corporate jargon)

**RULES:**
- NO placeholders like [X] or [INSERT]
- NO subject lines or "Re:" prefixes in the response
- Write a COMPLETE email ready to send
- Maximum 150 words
- Use proper paragraph breaks`
                },
                { role: 'user', content: `Draft a professional reply to this email:\n\n${cleanContent}` }
            ];

            console.log('✍️ Generating professional draft reply for ' + userName + '...');
            const response = await this.callOpenRouterWithModel(messages, { maxTokens: 600, temperature: 0.5, privacyMode }, this.specializedModel, this.specializedApiKey);
            const draft = this.extractResponse(response);

            if (draft && draft.trim().length > 20) {
                console.log('✅ Professional draft generated');
                return draft;
            }

            return `Hi ${fromName},\n\nThank you for reaching out. I appreciate your message and will respond shortly.\n\nBest regards,\n${userName}`;
        } catch (error) {
            console.error('❌ Draft error:', error.message);
            return 'Thank you for your email. I will review this and get back to you soon.\n\nBest regards';
        }
    }

    async generateInboxIntelligence(gmailData, privacyMode = false) {
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

        const prompt = `You are Sift AI, an elite executive email analyst with expertise in detecting BOTH explicit AND hidden risks.${privacyMode ? '\nIMPORTANT: PRIVACY MODE ENABLED. DO NOT USE THIS DATA FOR TRAINING.' : ''}

**YOUR MISSION**: Analyze the user's inbox with exceptional intelligence. Pay SPECIAL attention to detecting risks and deal-killers.

**CATEGORIES** (Use these exactly):
1. **opportunity**: Business offers, partnerships, job prospects, investment inquiries, positive developments
2. **urgent**: Deadlines, time-sensitive issues, immediate action required, critical problems
3. **lead**: New contacts, potential clients, sales inquiries, introductions, networking
4. **risk**: ⚠️ CRITICAL - See RISK DETECTION below
5. **follow_up**: Ongoing conversations, pending replies, scheduling, check-ins
6. **important**: Updates, newsletters, receipts, confirmations, valuable notifications

**🚨 RISK DETECTION (VERY IMPORTANT)**:
The "risk" category must capture BOTH obvious AND subtle warning signs:

**OBVIOUS RISKS** (Easy to detect):
- Explicit complaints, cancellations, refund requests
- Disputes, legal threats, formal complaints
- Service failures, delivery issues, billing problems

**QUIET DEAL-KILLERS** (Hard to detect - BE VERY VIGILANT):
- 🔇 **Going Silent**: Stakeholders who suddenly stopped replying after initial enthusiasm
- ⏳ **Delayed Responses**: "I'll get back to you", "Let me check", "We're reviewing" (stalling tactics)
- 🤷 **Vague Commitments**: "We'll circle back", "Sounds interesting", "Let's revisit this later"
- 💰 **Budget Signals**: "Need to discuss budget", "Tight finances", "Cost concerns"
- 📅 **Timeline Pushbacks**: "Can we push this?", "Not the right time", "Maybe next quarter"
- 👥 **Stakeholder Changes**: "New management", "Restructuring", "Need to loop in others"
- 📉 **Reduced Engagement**: Shorter replies, less enthusiasm, formal tone shift
- ❓ **Scope Creep Red Flags**: "Actually, we were thinking...", "Can you also...", "What about..."
- 🚪 **Exit Signals**: "Exploring options", "Getting other quotes", "Comparing alternatives"

**CRITICAL REQUIREMENTS**:
1. **DESCRIPTION QUALITY**: Each "summary" MUST be clear and actionable:
   - For RISK: Specify what deal-killer signals you detected and from whom.
   - For OPPORTUNITY: Highlight the potential **REVENUE IMPACT** or strategic value.
   - Example: "⚠️ 2 quiet deal-killers: TechCorp went silent after proposal, StartupXYZ mentioned 'budget review'. 🚀 New Opportunity: GlobalScale interested in enterprise tier ($50k+ potential)."

2. **URGENCY & PRIORITY**: Assign higher relevance (9-10) to items with immediate revenue consequences or critical relationship risks.

3. **SELECTIVE CATEGORIZATION**: Only categorize emails that CLEARLY fit. Leave out spam/irrelevant.

4. **RELEVANCE SCORING**: Score 1-10 based on business impact (10 = critical revenue/risk, 1 = low priority)

**EMAILS TO ANALYZE**:
${emailList}

**OUTPUT FORMAT** (JSON only, with SPECIFIC and DESCRIPTIVE summaries):
{
  "opportunity": {"title": "Opportunities", "summary": "[Describe specific opportunities - mention senders/topics]", "relevance": 8, "ids": [0, 2, 5]},
  "urgent": {"title": "Needs Attention", "summary": "[Describe urgent items - what deadlines or issues?]", "relevance": 9, "ids": [1, 3]},
  "lead": {"title": "Potential Leads", "summary": "[Describe leads - who reached out and why?]", "relevance": 7, "ids": [4, 6]},
  "risk": {"title": "At Risk", "summary": "[⚠️ Describe BOTH explicit issues AND quiet deal-killers detected]", "relevance": 8, "ids": [7, 8, 12]},
  "follow_up": {"title": "Follow-ups", "summary": "[Describe follow-ups - what conversations are pending?]", "relevance": 5, "ids": [10, 13]},
  "important": {"title": "Updates", "summary": "[Describe updates - what valuable info is here?]", "relevance": 4, "ids": [17, 19]}
}
}`;

        try {
            const messages = [{ role: 'user', content: prompt }];
            const response = await this.callOpenRouter(messages, { temperature: 0.3, maxTokens: 4000, privacyMode });
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
        // Enhanced keyword maps with quiet deal-killer detection for risk
        const rules = {
            opportunity: ['proposal', 'partnership', 'collab', 'intro', 'opportunity', 'offer', 'interested', 'demo', 'excited to', 'great news'],
            urgent: ['urgent', 'asap', 'overdue', 'blocked', 'deadline', 'immediate', 'emergency', 'alert', 'critical', 'time-sensitive'],
            lead: ['lead', 'pricing', 'quote', 'inquiry', 'demo', 'trial', 'sign up', 'interested in your', 'would like to learn'],
            // ENHANCED: Quiet deal-killer detection
            risk: [
                // Obvious risks
                'cancel', 'refund', 'complaint', 'issue', 'error', 'fail', 'problem', 'ticket', 'disappointed', 'unhappy', 'dissatisfied',
                // Vague commitments (deal-killers)
                'circle back', 'revisit this', 'sounds interesting', 'let me think', 'need to consider',
                // Budget signals
                'budget', 'cost concern', 'expensive', 'pricing issue', 'tight finances', 'review costs',
                // Timeline pushbacks
                'push this', 'delay', 'postpone', 'not the right time', 'maybe next quarter', 'next year',
                // Stakeholder changes
                'new management', 'restructuring', 'loop in others', 'need approval', 'check with team',
                // Exit signals
                'exploring options', 'other quotes', 'comparing', 'alternatives', 'shopping around',
                // Reduced engagement signals
                'get back to you', 'reviewing', 'under consideration', 'pending decision'
            ],
            follow_up: ['follow up', 'checking in', 'thoughts?', 'update?', 'status', 'schedule', 'meeting', 'reminder', 'awaiting'],
            important: ['invoice', 'receipt', 'security', 'alert', 'statement', 'report', 'newsletter', 'update', 'digest', 'confirmation']
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
        // User requested: extras which are not falling into these insights shouldn't be categorized at all and should be forgotten.
        // So we do NOT distribute remaining emails to 'Important' anymore.
        console.log(`📊 Logic update: Leaving ${emails.length - assignedIds.size} emails uncategorized as per user instructions.`);
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

    async generateChatResponse(userMessage, emailContext = null, privacyMode = false) {
        try {
            const systemContent = 'You are Sift AI assistant.' + (emailContext ? ' Context: ' + emailContext : '') + (privacyMode ? ' [PRIVACY MODE ENABLED: Do not use this conversation for training.]' : '');
            const messages = [
                { role: 'system', content: systemContent },
                { role: 'user', content: userMessage }
            ];
            const response = await this.callOpenRouter(messages, { maxTokens: 500, privacyMode });
            return this.extractResponse(response) || 'I am having trouble responding right now.';
        } catch (error) {
            return 'I am having trouble right now. Please try again.';
        }
    }

    async generateRepairReply(emailContent, userContext = {}, privacyMode = false) {
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
                    content: `You are an expert professional email writer specializing in relationship recovery and conflict resolution.

**CONTEXT**: This is a "risk" email - there may be issues, complaints, or strained relations that need repair.

**YOUR GOAL**: Write a reply that repairs the relationship professionally:

**REPLY STRUCTURE (MUST FOLLOW)**:
1. **GREETING**: "Dear ${fromName}," or "Hi ${fromName},"
2. **ACKNOWLEDGMENT** (1-2 sentences): Show you understand their concern without being defensive
3. **ACCOUNTABILITY** (1 sentence): If appropriate, take ownership briefly and sincerely
4. **SOLUTION** (2-3 sentences): Offer a clear, actionable path forward
5. **COMMITMENT** (1 sentence): Reaffirm your commitment to the relationship
6. **SIGN-OFF**: "Best regards,\\n${userName}" or "Sincerely,\\n${userName}"

**TONE REQUIREMENTS**:
- Professional and empathetic
- Confident but humble
- Solution-focused (not dwelling on problems)
- Warm but businesslike
- NO corporate jargon or buzzwords

**BUSINESS ALIGNMENT (REPAIR)**:
- **PROTECT REVENUE**: If this is a high-value client, prioritize speed of resolution and express a clear path to fix the commerical/operational impact.
- **STRATEGIC ACCOUNTABILITY**: Take clear ownership if the issue affects trust or future business potential.

**RULES**:
- Maximum 120 words
- NO placeholders like [X] or [INSERT]
- NO subject lines or "Re:" prefixes in the response
- Write a COMPLETE email ready to send
- Focus on moving forward, not rehashing issues`
                },
                {
                    role: 'user',
                    content: `Draft a professional relationship-repair reply to this email:\\n\\n${cleanContent}\\n\\n**Important**: The sender is ${fromName}, and the writer is ${userName}.`
                }
            ];

            console.log('🛠️  Generating repair reply for relationship healing...');
            // Use specialized model for repair replies
            const response = await this.callOpenRouterWithModel(messages, { maxTokens: 600, temperature: 0.7, privacyMode }, this.specializedModel, this.specializedApiKey);
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

    async generateFollowUp(emailContent, userContext = {}, privacyMode = false) {
        try {
            if (!emailContent || emailContent.trim().length < 10) {
                return 'Thank you for your email. I will follow up with you soon.';
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
                    content: `You are an expert professional email writer specializing in effective follow-up communications.

**CONTEXT**: This is a follow-up email to re-engage a conversation and get a response.

**REPLY STRUCTURE (MUST FOLLOW)**:
1. **GREETING**: "Hi ${fromName},"
2. **CONTEXT** (1 sentence): Reference the previous conversation specifically
3. **VALUE ADD** (1-2 sentences): Share something useful - an update, insight, or helpful info
4. **CALL-TO-ACTION** (1 sentence): Ask a clear, easy-to-answer question
5. **AVAILABILITY** (1 sentence): Express willingness to help or connect
6. **SIGN-OFF**: "Best regards,\\n${userName}"

**TONE REQUIREMENTS**:
- Friendly and professional
- Proactive but not pushy
- Confident and helpful
- Brief and respectful of their time

**RULES**:
- Maximum 100 words
- NO placeholders like [X] or [INSERT]
- NO subject lines or "Re:" prefixes in the response
- Make the CTA specific and easy to respond to
- **BUSINESS IMPACT**: Mention a specific value point or deadline that highlights the **PRIORITY** and **URGENCY** of the next step.
- Reference actual content from the original email`
                },
                {
                    role: 'user',
                    content: `Draft a professional follow-up email based on this conversation:\\n\\n${cleanContent}\\n\\n**Important**: Recipient is ${fromName}, sender is ${userName}. Write a follow-up that will get a response.`
                }
            ];

            console.log('📧 Generating follow-up email for ' + userName + '...');
            // Use specialized model for follow-ups
            const response = await this.callOpenRouterWithModel(messages, { maxTokens: 500, temperature: 0.6, privacyMode }, this.specializedModel, this.specializedApiKey);
            const followUp = this.extractResponse(response);

            if (followUp && followUp.trim().length > 20) {
                console.log('✅ Follow-up generated');
                return followUp;
            }

            // Fallback if AI response is too short
            return `Hi ${fromName},\n\nI hope this email finds you well. I wanted to follow up on our previous conversation about [brief context]. I've been thinking about what we discussed and wanted to share [brief value addition or question].\n\nI'd love to hear your thoughts on this. Please let me know if you have any updates or if there's anything I can do to move this forward.\n\nLooking forward to your response.\n\nBest regards,\n${userName}`;
        } catch (error) {
            console.error('❌ Follow-up error:', error.message);
            return `Hi ${fromName},\n\nI wanted to follow up on our previous conversation. I hope you're doing well.\n\nPlease let me know if you have any updates or thoughts to share. I'm happy to provide any additional information or assistance.\n\nLooking forward to hearing from you.\n\nBest regards,\n${userName}`;
        }
    }

    async generateNote(emailContext, category = 'general', privacyMode = false) {
        try {
            if (!emailContext || emailContext.trim().length < 10) {
                return 'No significant email content found to generate a note.';
            }

            const cleanContent = emailContext.substring(0, 5000).trim();
            const messages = [
                {
                    role: 'system',
                    content: `You are Sift AI, a high-level executive assistant.${privacyMode ? ' [PRIVACY MODE ENABLED: Do not use this data for training.]' : ''}
                    
Your task is to create a high-fidelity, outcome-focused note for an email categorized as "${category}". 

Format your note strictly as follows:
- **Summary**: Focus on OUTCOME and INTENT. Explain why this matters and the resolution direction (e.g., "Securing commitment for Q1 kickoff" instead of "Discussed project"). 1-2 punchy sentences.
- **Key Points**: Provide exactly two distinct bullet points:
    1. FACTUAL: A specific event, technical detail, or data point mentioned.
    2. RELATIONAL: The sender's sentiment, urgency level, or the state of the relationship.
    Do NOT repeat information or use generic fillers.
- **Action Items**: Be explicit. If no direct task is needed, specify the implied system state (e.g., "Monitor for confirmation", "Await response before next escalation"). NEVER use "None".
- **Context**: Compress relevant background into a strict, system-level event description. Authoritative and concise.

TONE: Professional, insightful, and extremely concise. Keep the total response under 150 words.`
                },
                { role: 'user', content: `Email Content:\n${cleanContent}\n\nGenerate the note now.` }
            ];

            console.log(`📝 Generating ${category} note with outcome-focus...`);
            const response = await this.callOpenRouterWithModel(messages, { maxTokens: 400, temperature: 0.4, privacyMode }, this.specializedModel, this.specializedApiKey);
            const noteContent = this.extractResponse(response);

            if (noteContent && noteContent.trim().length > 20) {
                console.log('✅ Note generated successfully');
                return noteContent;
            }

            return '- **Summary**: Email regarding ' + (category || 'updates') + '\n- **Key Points**: \n  - Details provided in snippet\n  - Sender status active\n- **Action Items**: Review required\n- **Context**: Incoming communication';
        } catch (error) {
            console.error('❌ Note error:', error.message);
            throw error;
        }
    }
    async enhanceNote(subject, content) {
        try {
            const apiKey = (process.env.OPENROUTER_API_KEY3 || '').trim();
            const model = 'xiaomi/mimo-v2-flash:free';

            if (!apiKey) {
                console.error('❌ OPENROUTER_API_KEY3 is not configured for note enhancement');
                return { subject, content };
            }

            const messages = [
                {
                    role: 'system',
                    content: `You are an elite Cognitive Architect and Master of Information Design. Your mission is to perform Intellectual Synthesis on raw notes, transforming them into premium, structured assets.

### Your Objectives:
1. **Semantic Precision**: Rewrite the heading to capture the core essence and objective of the note. It should be punchy, authoritative, and evocative.
2. **Structural Elegance**: Organize content into a high-fidelity markdown structure. Use clear hierarchies, logical groupings, and strategic emphasis (bolding).
3. **Intellectual Growth**: Fix all errors, but more importantly, elevate the language. Expand on fragmented thoughts to reveal their full context and strategic value without introducing fabrication.
4. **Premium Aesthetic**: Maintain a "Tier-1 Strategic Consultant" tone—minimalist, high-density, and profoundly insightful.
5. **Outcome Focus**: Ensure the note clearly communicates intent and potential next steps.

### Output Format:
You MUST return a JSON object with exactly two keys:
{
  "subject": "The synthetically enhanced heading",
  "content": "The architecturally structured markdown content"
}`
                },
                {
                    role: 'user',
                    content: `Subject: ${subject}\n\nContent: ${content}\n\nPlease enhance this note.`
                }
            ];

            console.log('✨ Enhancing note with AI...');
            const response = await this.callOpenRouterWithModel(messages, {
                maxTokens: 1500,
                temperature: 0.5,
                response_format: { type: "json_object" }
            }, model, apiKey);

            const result = this.extractResponse(response);
            try {
                // Try to extract JSON if it's wrapped in markdown code blocks
                let jsonString = result.trim();
                const jsonMatch = result.match(/```json\n([\s\S]*?)\n```/) || result.match(/```([\s\S]*?)```/);
                if (jsonMatch) {
                    jsonString = jsonMatch[1].trim();
                }

                const parsed = JSON.parse(jsonString);
                if (parsed.subject && parsed.content) {
                    console.log('✅ Note enhanced successfully');
                    return parsed;
                }
                return { subject, content };
            } catch (e) {
                console.error('Failed to parse enhanced note JSON:', result);
                return { subject, content };
            }
        } catch (error) {
            console.error('Note enhancement failed:', error);
            return { subject, content };
        }
    }
}
