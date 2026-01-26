/**
 * OpenRouter AI Service
 * Handles communication with OpenRouter API for various AI tasks
 */

export class OpenRouterAIService {
    constructor() {
        // IMPROVED: Robust API key fallback chain to ensure service works if any key is set
        this.apiKey = (process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY2 || process.env.OPENROUTER_API_KEY3 || '').trim();

        // Use Gemini 2.0 Flash as primary - much more stable and capable than Xiaomi
        this.model = 'google/gemini-2.0-flash-exp:free';

        // Same fallback for specialized tasks
        this.specializedModel = 'google/gemini-2.0-flash-exp:free';
        this.specializedApiKey = (process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY3 || process.env.OPENROUTER_API_KEY2 || '').trim();
        this.baseURL = 'https://openrouter.ai/api/v1';

        // Voice Cloning Configuration - Robust fallback
        this.voiceCloningApiKey = (process.env.OPENROUTER_API_KEY3 || process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY2 || '').trim();
        this.voiceCloningModel = 'google/gemini-2.0-flash-exp:free';

        if (!this.apiKey) {
            console.error('❌ No OPENROUTER_API_KEY found in environment variables (tried KEY, KEY2, and KEY3)');
        }

        // Validate model format
        if (this.model && !this.model.includes('/')) {
            console.warn(`⚠️ Invalid model format "${this.model}". Falling back to stable Gemini.`);
            this.model = 'google/gemini-2.0-flash-exp:free';
        }
    }

    async callOpenRouter(messages, options = {}) {
        // OPTIMIZED: Prioritize stable and high-quality free models
        const models = [
            'google/gemini-2.0-flash-exp:free',
            'google/gemini-2.0-flash-lite-preview-02-05:free',
            'meta-llama/llama-3.1-8b-instruct:free',
            'meta-llama/llama-3.3-70b-instruct:free',
            'mistralai/mistral-7b-instruct:free',
            'xiaomi/mimo-v2-flash:free' // Last resort
        ];

        console.log('🤖 AI Request started with ' + messages.length + ' messages');
        console.log('🔑 Using API key: ' + (this.apiKey ? 'Present' : 'Missing'));

        for (const modelId of models) {
            try {
                console.log('📡 Attempting model: ' + modelId);

                if (!this.apiKey) {
                    throw new Error('API Key missing - Please set OPENROUTER_API_KEY environment variable');
                }

                const response = await fetch(`${this.baseURL}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`,
                        'HTTP-Referer': process.env.HOST || 'https://mailient.xyz',
                        'X-Title': 'Mailient',
                        'User-Agent': 'Mailient-Compliant/1.0',
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
            'google/gemini-2.0-flash-exp:free',
            'google/gemini-2.0-flash-lite-preview-02-05:free',
            'meta-llama/llama-3.1-8b-instruct:free',
            'meta-llama/llama-3.3-70b-instruct:free',
            'mistralai/mistral-7b-instruct:free'
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

    async generateEmailSummary(emailContent, privacyMode = false, userContext = {}) {
        try {
            if (!emailContent || emailContent.trim().length < 10) {
                return 'This email appears to be empty or very short.';
            }

            const cleanContent = emailContent.substring(0, 6000).trim();
            const roleContext = userContext.role ? `The user's role is ${userContext.role}. ` : '';
            const goalContext = userContext.goals && userContext.goals.length > 0 ? `Their primary goals are: ${userContext.goals.join(', ')}. ` : '';

            const messages = [
                {
                    role: 'system',
                    content: `You are an elite executive email analyst. Your task is to provide a "Cognitive Synthesis" of the email tailored for the user's specific context. ${roleContext}${goalContext}

RULES:
1. Be profoundly insightful and concise.
2. Identify the hidden intent and the REVENUE or STRATEGIC impact relevant to their role/goals.
3. Keep it to 2 sentences that sound human, not like an AI summary.
4. NEVER use em dashes (—).
5. Use a warm, authoritative tone.`
                },
                { role: 'user', content: 'Synthesize this email:\n\n' + cleanContent }
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

            const roleInfo = userContext.role ? `The user is a ${userContext.role}. ` : '';
            const goalsInfo = userContext.goals && userContext.goals.length > 0 ? `Their goal is to fix: ${userContext.goals.join(', ')}. ` : '';

            // Voice Profile Integration - for cloning user's unique voice
            const voiceProfile = userContext.voiceProfile || null;
            const voicePrompt = voiceProfile ? this.generateVoicePrompt(voiceProfile) : '';
            const useVoiceCloning = !!voiceProfile && voiceProfile.status !== 'default';

            let systemPrompt = '';

            if (useVoiceCloning) {
                // Voice-Cloned Draft - matches user's exact writing style
                console.log('🎭 Voice cloning enabled - matching user\'s writing style');
                systemPrompt = `You are writing an email reply on behalf of ${userName}. You PERFECTLY mimic ${userName}'s writing style. ${roleInfo}${goalsInfo}

**CRITICAL IDENTITY CLARIFICATION**:
- YOU ARE WRITING AS: ${userName} (the person replying to the email)
- YOU ARE REPLYING TO: ${fromName} (the person who sent the original email)
- The reply will be SENT BY ${userName} TO ${fromName}

${voicePrompt}

**CRITICAL MISSION**: Write a reply FROM ${userName} TO ${fromName} that is INDISTINGUISHABLE from one ${userName} would write themselves.

**ABSOLUTE RULES**:
1. **YOU ARE ${userName}**: Write in first person as ${userName}. Do NOT write as ${fromName}.
2. **REPLYING TO ${fromName}**: Address ${fromName} as the recipient. Greet them, respond to their message.
3. **MATCH THE VOICE EXACTLY**: Use the greeting/closing patterns, phrases, and tone specified above.
4. **NO AI LANGUAGE**: Never say "I'm here to help", "As an AI", or robotic phrases. 
5. **NO EM DASHES**: NEVER use em dashes (—). Use commas or periods only.
6. **CONCISE**: Maximum 120 words.

**OUTPUT FORMAT**:
- Greeting to ${fromName} (e.g., "Hi ${fromName},")
- Body of the reply (responding to what ${fromName} wrote)
- Sign-off with ${userName}'s name`;
            } else {
                // Standard professional draft (no voice profile available)
                systemPrompt = `You are ARCUS, drafting an email reply on behalf of ${userName}. You write with a "human soul"—thoughtful, warm, and professional. ${roleInfo}${goalsInfo}

**CRITICAL IDENTITY CLARIFICATION**:
- YOU ARE WRITING AS: ${userName} (the person replying to the email)
- YOU ARE REPLYING TO: ${fromName} (the person who sent the original email)
- The reply will be SENT BY ${userName} TO ${fromName}

**YOUR MISSION**: Draft a reply FROM ${userName} TO ${fromName} that sounds natural and human.

**REPLY GUIDELINES**:
1. **YOU ARE ${userName}**: Write in first person as ${userName}. Do NOT confuse identities.
2. **NO AI LANGUAGE**: Avoid "I'm here to help", "As an AI", or robotic structures. 
3. **NO EM DASHES**: NEVER use em dashes (—). Use commas or periods.
4. **STRATEGIC DEPTH**: Prioritize revenue impact and urgent relationship needs. 
5. **HUMAN RHYTHM**: Use natural transitions. Mention a specific detail from ${fromName}'s message.
6. **CONCISE & PUNCHY**: Maximum 120 words. 

**OUTPUT FORMAT**:
- Natural greeting to ${fromName} (e.g., "Hi ${fromName},")
- Strategic response to what ${fromName} wrote
- Clear call-to-action or next step
- Sign-off with ${userName}'s name`;
            }

            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Write a reply FROM ${userName} TO ${fromName}. ${userName} is responding to this email that ${fromName} sent:\n\n${cleanContent}\n\nRemember: You are ${userName} writing TO ${fromName}.` }
            ];

            // Use voice cloning API key and model when voice profile is available
            const apiKey = useVoiceCloning ? this.voiceCloningApiKey : this.specializedApiKey;
            const model = useVoiceCloning ? this.voiceCloningModel : this.specializedModel;

            console.log(`✍️ Generating ${useVoiceCloning ? 'voice-cloned' : 'professional'} draft reply for ${userName}...`);
            const response = await this.callOpenRouterWithModel(messages, { maxTokens: 600, temperature: useVoiceCloning ? 0.4 : 0.5, privacyMode }, model, apiKey);
            const draft = this.extractResponse(response);

            if (draft && draft.trim().length > 20) {
                console.log(`✅ ${useVoiceCloning ? 'Voice-cloned' : 'Professional'} draft generated`);
                return draft;
            }

            return `Hi ${fromName}, \n\nThank you for reaching out. I appreciate your message and will respond shortly.\n\nBest regards, \n${userName}`;
        } catch (error) {
            console.error('❌ Draft error:', error.message);
            return 'Thank you for your email. I will review this and get back to you soon.\n\nBest regards';
        }
    }

    /**
     * Generate voice prompt instructions from voice profile
     * Used for cloning user's unique writing style in drafts
     */
    generateVoicePrompt(voiceProfile) {
        if (!voiceProfile || voiceProfile.status === 'default') {
            return '';
        }

        const { tone, greeting_patterns, closing_patterns, language_patterns, structural_patterns, personality_traits, sample_phrases } = voiceProfile;

        let prompt = `
**VOICE CLONING INSTRUCTIONS - CRITICAL**
You MUST write in the user's exact voice and style. Follow these patterns precisely:

**TONE**:
- Primary style: ${tone?.primary || 'professional'}
- Warmth level: ${tone?.warmth_level || 6}/10
- Assertiveness: ${tone?.assertiveness || 5}/10
${tone?.description ? `- Description: ${tone.description}` : ''}

**GREETINGS**:
- Use these greetings: ${greeting_patterns?.preferred_greetings?.join(', ') || 'Hi, Hello'}
- ${greeting_patterns?.uses_recipient_name ? 'Include recipient\'s first name' : 'Greeting only, no name'}
- Warmth style: ${greeting_patterns?.greeting_warmth || 'warm'}

**CLOSINGS**:
- Use these sign-offs: ${closing_patterns?.preferred_closings?.join(', ') || 'Best regards'}
- ${closing_patterns?.includes_name ? 'Include user\'s name' : 'Sign-off only'}
- Signature style: ${closing_patterns?.signature_style || 'standard'}

**LANGUAGE STYLE**:
- Sentence length: ${language_patterns?.sentence_length || 'medium'}
- Vocabulary: ${language_patterns?.vocabulary_complexity || 'moderate'}
- ${language_patterns?.uses_contractions ? 'Use contractions (don\'t, can\'t, I\'m)' : 'Avoid contractions'}
- ${language_patterns?.uses_exclamations ? 'Can use exclamation marks for emphasis' : 'Avoid exclamation marks'}
- ${language_patterns?.uses_emojis ? 'Can include appropriate emojis' : 'No emojis'}
${language_patterns?.common_phrases?.length > 0 ? `- Incorporate these phrases naturally: ${language_patterns.common_phrases.join(', ')}` : ''}

**STRUCTURE**:
- Email length: ${structural_patterns?.typical_email_length || 'moderate'}
- Paragraph style: ${structural_patterns?.paragraph_length || 'medium'}
- Approach: ${structural_patterns?.structure_preference || 'direct'}
${structural_patterns?.uses_bullet_points ? '- Can use bullet points for lists' : '- Avoid bullet points, use prose'}

**PERSONALITY**:
${personality_traits?.enthusiastic ? '- Show genuine enthusiasm and positivity' : '- Maintain composed, measured tone'}
${personality_traits?.detail_oriented ? '- Include relevant details and specifics' : '- Keep it high-level'}
${personality_traits?.action_focused ? '- Include clear next steps or action items' : ''}
${personality_traits?.relationship_building ? '- Build rapport with personal touches' : ''}
${personality_traits?.empathetic ? '- Show understanding and empathy when appropriate' : ''}

${sample_phrases?.length > 0 ? `**CHARACTERISTIC PHRASES TO USE**:
${sample_phrases.map(p => `"${p}"`).join(', ')}` : ''}

CRITICAL: The email MUST sound like the user wrote it themselves. Match their exact patterns.
`;

        return prompt;
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
            `Email #${idx} \nFrom: ${(e.from || '').substring(0, 80)} \nSubject: ${(e.subject || '').substring(0, 100)} \nPreview: ${(e.snippet || '').substring(0, 200)} \n`
        ).join('\n---\n');

        const prompt = `You are an elite executive email analyst for Sift AI. Your mission is to provide SPECIFIC, ACTIONABLE, and HIGH-VALUE insights from the user's inbox.${privacyMode ? '\nIMPORTANT: PRIVACY MODE ENABLED. DO NOT USE THIS DATA FOR TRAINING.' : ''}

**CRITICAL REQUIREMENTS FOR QUALITY INSIGHTS:**

1. **BE SPECIFIC, NOT GENERIC**: Never say "Failed production deployments" - instead say "GitHub: Deployment failed for main branch due to test failures"
2. **MENTION ACTUAL SENDERS AND SUBJECTS**: Reference real people, companies, and email topics
3. **PROVIDE ACTIONABLE RECOMMENDATIONS**: What should the user DO about this?
4. **QUANTIFY WHEN POSSIBLE**: Mention amounts, deadlines, specific dates
5. **FOCUS ON BUSINESS IMPACT**: Why does this matter to the user's work/goals?

**CATEGORIES** (Use these exactly):
1. **opportunity**: Business offers, partnerships, job prospects, investment inquiries, positive developments
2. **urgent**: Deadlines, time-sensitive issues, immediate action required, critical problems  
3. **lead**: New contacts, potential clients, sales inquiries, introductions, networking
4. **risk**: Issues, complaints, delays, problems that need attention
5. **follow_up**: Ongoing conversations, pending replies, scheduling, check-ins
6. **important**: Updates, newsletters, receipts, confirmations, valuable notifications

**RISK DETECTION - BE SPECIFIC:**
- Instead of: "Failed production deployments"
- Say: "GitHub Alert: Main branch deployment failed at 2:30 PM due to failing unit tests in payment module"
- Instead of: "Budget concerns"  
- Say: "Client XYZ mentioned 'need to review budget allocation' for Q4 project"

**OUTPUT FORMAT** (JSON only - MAKE IT SPECIFIC AND ACTIONABLE):
{
    "opportunity": { 
        "title": "Opportunities", 
        "summary": "[SPECIFIC: Company X wants to discuss $50k partnership - Reply by Friday. Investor Y interested in Series A - Schedule call next week]", 
        "relevance": 8, 
        "ids": [0, 2, 5] 
    },
    "urgent": { 
        "title": "Urgent Actions", 
        "summary": "[SPECIFIC: Client contract expires TOMORROW - Sign immediately. Server downtime reported - Contact IT team ASAP]", 
        "relevance": 9, 
        "ids": [1, 3] 
    },
    "lead": { 
        "title": "New Leads", 
        "summary": "[SPECIFIC: 3 new demo requests from Fortune 500 companies. Startup founder reached out for enterprise pricing]", 
        "relevance": 7, 
        "ids": [4, 6] 
    },
    "risk": { 
        "title": "Issues Requiring Attention", 
        "summary": "[SPECIFIC: Customer complaint about delayed shipment - Offer refund ASAP. Payment gateway integration broken - Fix before billing cycle]", 
        "relevance": 8, 
        "ids": [7, 8, 12] 
    },
    "follow_up": { 
        "title": "Follow-ups Needed", 
        "summary": "[SPECIFIC: Reply to John's proposal questions. Schedule meeting with marketing team about campaign]", 
        "relevance": 5, 
        "ids": [10, 13] 
    },
    "important": { 
        "title": "Important Updates", 
        "summary": "[SPECIFIC: Q3 financial reports available. New team member starts Monday. Office closed for holidays]", 
        "relevance": 4, 
        "ids": [17, 19] 
    }
}

**EMAILS TO ANALYZE:**
${emailList}

Remember: Your insights must be SO SPECIFIC that the user can immediately understand what happened and what action to take. Generic insights will be rejected.`;

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

                    // ENHANCED: Validate and sanitize AI response
                    result = this.validateAndSanitizeAIResponse(result, categories);
                }
            } catch (e) {
                console.error('❌ JSON parse failed:', e.message);
                console.warn('Raw content:', content.substring(0, 100));
                // Fallback to empty response structure
                result = this.createFallbackResponse(categories);
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
            console.log(`📊 AI identified ${totalAI} emails.Running Hybrid Filler...`);

            this.fillGapsWithLocalRules(emails, emailIds, result, categories);

            return this.buildEnhancedResponse(result, emailIds, categories);

        } catch (error) {
            console.error('❌ AI Error:', error.message);
            return this.smartDistribute(emails, emailIds, categories);
        }
    }

    validateAndSanitizeAIResponse(result, categories) {
        // Ensure result is an object
        if (!result || typeof result !== 'object') {
            console.warn('⚠️ AI response is not an object, using fallback');
            return this.createFallbackResponse(categories);
        }

        const sanitized = {};

        categories.forEach(category => {
            const categoryData = result[category] || {};

            // Validate and sanitize each category
            sanitized[category] = {
                title: categoryData.title || category.charAt(0).toUpperCase() + category.slice(1),
                summary: categoryData.summary || 'Identified items',
                relevance: Math.max(0, Math.min(10, parseInt(categoryData.relevance) || 5)),
                ids: Array.isArray(categoryData.ids) ? categoryData.ids : []
            };

            // Validate IDs are within bounds
            sanitized[category].ids = sanitized[category].ids.filter(id =>
                typeof id === 'number' && id >= 0 && id < 50
            );
        });

        return sanitized;
    }

    createFallbackResponse(categories) {
        const fallback = {};
        categories.forEach(category => {
            fallback[category] = {
                title: category.charAt(0).toUpperCase() + category.slice(1),
                summary: 'Analysis unavailable',
                relevance: 3,
                ids: []
            };
        });
        return fallback;
    }

    fillGapsWithLocalRules(emails, emailIds, result, categories) {
        // ENHANCED: Smarter contextual analysis with pattern recognition
        const contextualRules = {
            opportunity: {
                keywords: ['proposal', 'partnership', 'collab', 'intro', 'opportunity', 'offer', 'interested', 'demo', 'excited to', 'great news', 'let\'s work', 'contract', 'agreement'],
                patterns: [
                    /\$\d+k|\d+k\s*dollar/i,  // Money amounts
                    /(interested|excited).*(your|product|service)/i,
                    /(would like|want).*(discuss|talk|meet)/i,
                    /partnership|collaboration|joint venture/i
                ],
                senders: ['hr@', 'recruiting@', 'talent@', 'careers@', 'partnerships@', 'business@']
            },
            urgent: {
                keywords: ['urgent', 'asap', 'overdue', 'blocked', 'deadline', 'immediate', 'emergency', 'alert', 'critical', 'time-sensitive', 'expiring', 'expires'],
                patterns: [
                    /\b(today|tomorrow|now)\b/i,
                    /\d+\s*(hour|hr|day)s?\s*(left|remaining)/i,
                    /expir(s|e|ing)\s+(soon|today|tomorrow)/i,
                    /urgent|immediate|asap|critical/i
                ],
                senders: ['alert@', 'security@', 'billing@', 'support@', 'emergency@']
            },
            lead: {
                keywords: ['lead', 'pricing', 'quote', 'inquiry', 'demo', 'trial', 'sign up', 'interested in your', 'would like to learn', 'new customer', 'potential client'],
                patterns: [
                    /(requesting|interested).*(demo|trial|pricing|quote)/i,
                    /new.*customer|potential.*client/i,
                    /would like.*learn.*more/i,
                    /(sign|get).*(up|started)/i
                ],
                senders: ['info@', 'contact@', 'sales@', 'hello@']
            },
            // ENHANCED: Sophisticated risk detection
            risk: {
                keywords: [
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
                patterns: [
                    // Risk patterns
                    /(cancel|refund|complaint).*(immediately|urgent|asap)/i,
                    /(not.*happy|dissatisfied|disappointed).*(service|product|experience)/i,
                    /(budget|cost).*(concern|issue|problem|high|expensive)/i,
                    /(delay|postpone|push).*(project|meeting|decision)/i,
                    /(exploring|looking|checking).*(other|alternative|different)/i,
                    /(need.*think|consider|review).*(more|carefully)/i
                ],
                senders: ['complaints@', 'legal@', 'billing@', 'support@', 'abuse@']
            },
            follow_up: {
                keywords: ['follow up', 'checking in', 'thoughts?', 'update?', 'status', 'schedule', 'meeting', 'reminder', 'awaiting', 'response', 'reply'],
                patterns: [
                    /(follow|check).*(up|in)/i,
                    /any.*update|status.*update/i,
                    /(awaiting|waiting).*(response|reply|feedback)/i,
                    /(schedule|set).*(meeting|call|time)/i
                ],
                senders: [] // Any sender can be follow-up
            },
            important: {
                keywords: ['invoice', 'receipt', 'security', 'alert', 'statement', 'report', 'newsletter', 'update', 'digest', 'confirmation', 'verification'],
                patterns: [
                    /(invoice|receipt|bill).*(#\d+|\d{4})/i,
                    /security.*alert|verification.*required/i,
                    /(monthly|weekly|daily).*(report|digest|update)/i,
                    /confirmation.*(order|payment|booking)/i
                ],
                senders: ['no-reply@', 'updates@', 'newsletter@', 'alerts@', 'notifications@', 'billing@']
            }
        };

        const assignedIds = new Set();
        categories.forEach(cat => (result[cat]?.ids || []).forEach(id => assignedIds.add(id)));

        // ENHANCED: Score-based categorization
        emails.forEach((email, idx) => {
            const id = emailIds[idx];
            if (assignedIds.has(id)) return; // Already categorized by AI

            const subject = (email.subject || '').toLowerCase();
            const snippet = (email.snippet || '').toLowerCase();
            const from = (email.from || '').toLowerCase();
            const fullText = subject + ' ' + snippet + ' ' + from;

            // Score each category
            const categoryScores = {};

            categories.forEach(cat => {
                let score = 0;
                const rules = contextualRules[cat];

                if (!rules) return;

                // Keyword matching (1 point each)
                rules.keywords.forEach(keyword => {
                    if (fullText.includes(keyword)) {
                        score += 1;
                    }
                });

                // Pattern matching (2 points each - more specific)
                rules.patterns.forEach(pattern => {
                    if (fullText.match(pattern)) {
                        score += 2;
                    }
                });

                // Sender matching (3 points - very specific)
                rules.senders.forEach(senderPattern => {
                    if (from.includes(senderPattern)) {
                        score += 3;
                    }
                });

                categoryScores[cat] = score;
            });

            // Find best category (must have minimum score of 2)
            const bestCategory = Object.entries(categoryScores)
                .filter(([_, score]) => score >= 2)
                .sort(([, a], [, b]) => b - a)[0];

            if (bestCategory) {
                const [cat, score] = bestCategory;
                if (!result[cat]) result[cat] = { ids: [] };
                result[cat].ids.push(id);
                assignedIds.add(id);

                console.log(`📊 Local rule: Email #${idx} assigned to "${cat}" with score ${score}`);
            }
        });

        console.log(`📊 Enhanced categorization: ${assignedIds.size} emails categorized, ${emails.length - assignedIds.size} remaining uncategorized`);
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

            // ENHANCED: Generate much better, more valuable content
            let enhancedContent = data.summary || (ids.length > 0 ? `${ids.length} emails identified` : 'No significant items');

            // If we have AI-generated content but it's too generic, enhance it
            if (data.summary && !data.summary.includes('SPECIFIC:')) {
                enhancedContent = this.enhanceInsightContent(category, data.summary, ids.length, relevance);
            }

            // Add actionable recommendations for high-priority items
            if (priority === 'high' && ids.length > 0) {
                enhancedContent += this.getActionableRecommendation(category);
            }

            return {
                id: 'insight-' + category + '-' + Date.now(),
                type: category,
                title: this.getEnhancedTitle(category, data.title, ids.length, relevance),
                content: enhancedContent,
                timestamp: new Date().toISOString(),
                metadata: {
                    category,
                    priority,
                    relevance_score: relevance,
                    emails_involved: ids,
                    source: 'sift-ai-enhanced-v2'
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
        console.log('✅ Enhanced Final: ' + total + ' emails categorized. (Hybrid Mode v2)');

        return { sift_intelligence_summary: summary, inbox_intelligence: insights };
    }

    enhanceInsightContent(category, originalContent, emailCount, relevance) {
        // Professional business descriptions without emojis or coded language
        const categoryEnhancements = {
            opportunity: {
                valueAdd: "These represent potential revenue opportunities that should be prioritized for business growth."
            },
            urgent: {
                valueAdd: "Time-critical items requiring immediate attention to prevent negative business consequences."
            },
            lead: {
                valueAdd: "New business prospects that could convert to customers with proper follow-up."
            },
            risk: {
                valueAdd: "Issues that could impact business operations if not addressed promptly."
            },
            follow_up: {
                valueAdd: "Ongoing business conversations requiring your response to maintain momentum."
            },
            important: {
                valueAdd: "Key business information that should be reviewed for informed decision-making."
            }
        };

        const enhancement = categoryEnhancements[category];
        if (!enhancement) return originalContent;

        // If content is generic, enhance it with professional business language
        if (originalContent.includes('Auto-categorized') || originalContent.includes('Analysis unavailable')) {
            return `${enhancement.valueAdd}`;
        }

        return originalContent;
    }

    getEnhancedTitle(category, originalTitle, emailCount, relevance) {
        const baseTitle = originalTitle || category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ');

        // Add email count only - remove emojis for professional appearance
        let enhancedTitle = baseTitle;

        if (emailCount > 0) {
            enhancedTitle += ` (${emailCount})`;
        }

        // Add priority indicators without emojis
        if (relevance >= 8) {
            enhancedTitle = "High Priority: " + enhancedTitle;
        } else if (relevance >= 6) {
            enhancedTitle = "Priority: " + enhancedTitle;
        }

        return enhancedTitle;
    }

    getActionableRecommendation(category) {
        const recommendations = {
            opportunity: "\n\nRecommended Action: Prioritize high-value opportunities and respond within 24 hours to maintain momentum.",
            urgent: "\n\nRecommended Action: Address these immediately - delays could result in missed deadlines or lost business.",
            lead: "\n\nRecommended Action: Engage these leads quickly with personalized responses to maximize conversion.",
            risk: "\n\nRecommended Action: Investigate these issues promptly to prevent escalation and protect relationships.",
            follow_up: "\n\nRecommended Action: Respond to keep conversations active and maintain professional relationships.",
            important: "\n\nRecommended Action: Review to stay informed and make timely decisions based on this information."
        };

        return recommendations[category] || "";
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
            console.error('❌ Chat error:', error.message);
            // Better fallback for onboarding if email context is present
            if (emailContext) {
                return "I've analyzed the email context, but I'm having a slight connectivity issue generating a custom response. Based on what I've seen, this looks like an important message that requires your attention. You might want to try one of the draft options below instead!";
            }
            return 'I am having a moment of trouble right now. Please try again in a few seconds.';
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

            // Voice Profile Integration - for cloning user's unique voice
            const voiceProfile = userContext.voiceProfile || null;
            const voicePrompt = voiceProfile ? this.generateVoicePrompt(voiceProfile) : '';
            const useVoiceCloning = !!voiceProfile && voiceProfile.status !== 'default';

            let systemPrompt = '';

            if (useVoiceCloning) {
                // Voice-Cloned Repair Reply - matches user's exact writing style
                console.log('🎭 Voice cloning enabled for repair reply');
                systemPrompt = `You are writing a relationship repair email on behalf of ${userName}. You PERFECTLY mimic ${userName}'s writing style.
This is a RELATIONSHIP REPAIR email - there may be issues, complaints, or strained relations that need repair.

**CRITICAL IDENTITY CLARIFICATION**:
- YOU ARE WRITING AS: ${userName} (the person sending this repair reply)
- YOU ARE REPLYING TO: ${fromName} (the person who sent the original email with concerns)
- The reply will be SENT BY ${userName} TO ${fromName}

${voicePrompt}

**CRITICAL MISSION**: Write a repair reply FROM ${userName} TO ${fromName} that is INDISTINGUISHABLE from one ${userName} would write themselves.

**REPAIR STRATEGY - USE USER'S VOICE**:
1. **YOU ARE ${userName}**: Write in first person as ${userName}. Do NOT write as ${fromName}.
2. **ACKNOWLEDGE ${fromName}'s concerns**: Show understanding of what ${fromName} wrote
3. **ACCOUNTABILITY**: Take ownership sincerely in ${userName}'s voice
4. **SOLUTION**: Offer a clear path forward
5. **COMMITMENT**: Reaffirm relationship using ${userName}'s typical closings

**ABSOLUTE RULES**:
- MATCH THE VOICE EXACTLY using the patterns specified above
- NO AI LANGUAGE - ${fromName} must believe ${userName} wrote this personally
- NO EM DASHES (—) - use commas or periods only
- Maximum 120 words
- Focus on moving forward, not rehashing issues

**OUTPUT FORMAT**:
- Greeting to ${fromName}
- Response addressing ${fromName}'s concerns
- Sign-off with ${userName}'s name`;
            } else {
                // Standard repair reply (no voice profile available)
                systemPrompt = `You are drafting a relationship repair email on behalf of ${userName}.

**CRITICAL IDENTITY CLARIFICATION**:
- YOU ARE WRITING AS: ${userName} (the person sending this repair reply)
- YOU ARE REPLYING TO: ${fromName} (the person who sent the original email with concerns)
- The reply will be SENT BY ${userName} TO ${fromName}

** CONTEXT **: This is a "risk" email - there may be issues, complaints, or strained relations that need repair.

** YOUR GOAL **: Write a reply FROM ${userName} TO ${fromName} that repairs the relationship professionally:

** REPLY STRUCTURE(MUST FOLLOW) **:
    1. ** GREETING **: "Dear ${fromName}," or "Hi ${fromName},"
    2. ** ACKNOWLEDGMENT ** (1 - 2 sentences): Show you understand ${fromName}'s concern
    3. ** ACCOUNTABILITY ** (1 sentence): If appropriate, take ownership briefly and sincerely
    4. ** SOLUTION ** (2 - 3 sentences): Offer a clear, actionable path forward
    5. ** COMMITMENT ** (1 sentence): Reaffirm your commitment to the relationship
    6. ** SIGN - OFF **: "Best regards,\\n${userName}" or "Sincerely,\\n${userName}"

** RULES **:
    - YOU ARE ${userName} writing TO ${fromName}
    - Maximum 120 words
    - NO placeholders like [X] or [INSERT]
    - Write a COMPLETE email ready to send
    - Focus on moving forward, not rehashing issues`;
            }

            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Write a repair reply FROM ${userName} TO ${fromName}. ${userName} is responding to this email that ${fromName} sent:\n\n${cleanContent}\n\nRemember: You are ${userName} writing TO ${fromName} to repair the relationship.` }
            ];

            // Use voice cloning API key and model when voice profile is available
            const apiKey = useVoiceCloning ? this.voiceCloningApiKey : this.specializedApiKey;
            const model = useVoiceCloning ? this.voiceCloningModel : this.specializedModel;

            console.log(`🛠️ Generating ${useVoiceCloning ? 'voice-cloned' : 'standard'} repair reply...`);
            const response = await this.callOpenRouterWithModel(messages, { maxTokens: 600, temperature: useVoiceCloning ? 0.4 : 0.7, privacyMode }, model, apiKey);
            const repairReply = this.extractResponse(response);

            if (repairReply && repairReply.trim().length > 20) {
                console.log(`✅ ${useVoiceCloning ? 'Voice-cloned' : 'Standard'} repair draft generated`);
                return repairReply;
            }

            // Fallback if AI response is too short
            return `Dear ${fromName},

Thank you for sharing your thoughts and concerns with me. I truly appreciate your honesty and the opportunity to understand your perspective better.

I sincerely apologize for any frustration or disappointment you may have experienced. Your satisfaction and our relationship are incredibly important to me.

Let me assure you that I value our connection deeply. I believe we can work together to resolve any issues. Would you be open to discussing this further?

I'm committed to making this right and rebuilding the trust between us. Please let me know a convenient time for you to connect.

Best regards,
${userName}`;
        } catch (error) {
            console.error('❌ Repair reply error:', error.message);
            const userName = userContext.name || 'User';
            return `Dear there,

Thank you for reaching out and sharing your concerns. I truly value our relationship and want to ensure we maintain open communication.

I apologize for any issues you've experienced. Your feedback is incredibly important to me, and I'm committed to addressing your concerns promptly.

Let's work together to resolve this matter. I believe we can find a solution that strengthens our connection.

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

            // Voice Profile Integration - for cloning user's unique voice
            const voiceProfile = userContext.voiceProfile || null;
            const voicePrompt = voiceProfile ? this.generateVoicePrompt(voiceProfile) : '';
            const useVoiceCloning = !!voiceProfile && voiceProfile.status !== 'default';

            let systemPrompt = '';

            if (useVoiceCloning) {
                // Voice-Cloned Follow-Up - matches user's exact writing style
                console.log('🎭 Voice cloning enabled for follow-up');
                systemPrompt = `You are writing a follow-up email on behalf of ${userName}. You PERFECTLY mimic ${userName}'s writing style.
This is a FOLLOW-UP email to re-engage a conversation and get a response.

**CRITICAL IDENTITY CLARIFICATION**:
- YOU ARE WRITING AS: ${userName} (the person sending this follow-up)
- YOU ARE FOLLOWING UP WITH: ${fromName} (the person who will receive this email)
- The email will be SENT BY ${userName} TO ${fromName}

${voicePrompt}

**CRITICAL MISSION**: Write a follow-up FROM ${userName} TO ${fromName} that is INDISTINGUISHABLE from one ${userName} would write themselves.

**FOLLOW-UP STRATEGY - USE USER'S VOICE**:
1. **YOU ARE ${userName}**: Write in first person as ${userName}. Do NOT write as ${fromName}.
2. **CONTEXT**: Reference the previous conversation in ${userName}'s natural voice
3. **VALUE ADD**: Share something useful using ${userName}'s typical language patterns
4. **CALL-TO-ACTION**: Ask a clear question to ${fromName} in ${userName}'s characteristic style
5. **CLOSING**: Use ${userName}'s typical sign-off

**ABSOLUTE RULES**:
- MATCH THE VOICE EXACTLY using the patterns specified above
- NO AI LANGUAGE - ${fromName} must believe ${userName} wrote this personally
- NO EM DASHES (—) - use commas or periods only
- Maximum 100 words

**OUTPUT FORMAT**:
- Greeting to ${fromName}
- Follow-up content referencing the conversation
- Sign-off with ${userName}'s name`;
            } else {
                // Standard follow-up (no voice profile available)
                systemPrompt = `You are drafting a follow-up email on behalf of ${userName}.

**CRITICAL IDENTITY CLARIFICATION**:
- YOU ARE WRITING AS: ${userName} (the person sending this follow-up)
- YOU ARE FOLLOWING UP WITH: ${fromName} (the person who will receive this email)
- The email will be SENT BY ${userName} TO ${fromName}

** CONTEXT **: This is a follow-up email to re-engage a conversation and get a response.

** REPLY STRUCTURE (MUST FOLLOW) **:
    1. ** GREETING **: "Hi ${fromName},"
    2. ** CONTEXT ** (1 sentence): Reference the previous conversation specifically
    3. ** VALUE ADD ** (1-2 sentences): Share something useful - an update, insight, or helpful info
    4. ** CALL-TO-ACTION ** (1 sentence): Ask ${fromName} a clear, easy-to-answer question
    5. ** AVAILABILITY ** (1 sentence): Express willingness to help or connect
    6. ** SIGN-OFF **: "Best regards,\\n${userName}"

** RULES **:
    - YOU ARE ${userName} writing TO ${fromName}
    - Maximum 100 words
    - NO placeholders like [X] or [INSERT]
    - Make the CTA specific and easy for ${fromName} to respond to
    - Reference actual content from the original email`;
            }

            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Write a follow-up email FROM ${userName} TO ${fromName}. ${userName} is following up on this previous conversation:\n\n${cleanContent}\n\nRemember: You are ${userName} writing TO ${fromName} to re-engage the conversation.` }
            ];

            // Use voice cloning API key and model when voice profile is available
            const apiKey = useVoiceCloning ? this.voiceCloningApiKey : this.specializedApiKey;
            const model = useVoiceCloning ? this.voiceCloningModel : this.specializedModel;

            console.log(`📧 Generating ${useVoiceCloning ? 'voice-cloned' : 'standard'} follow-up for ${userName}...`);
            const response = await this.callOpenRouterWithModel(messages, { maxTokens: 500, temperature: useVoiceCloning ? 0.4 : 0.6, privacyMode }, model, apiKey);
            const followUp = this.extractResponse(response);

            if (followUp && followUp.trim().length > 20) {
                console.log(`✅ ${useVoiceCloning ? 'Voice-cloned' : 'Standard'} follow-up generated`);
                return followUp;
            }

            // Fallback if AI response is too short
            return `Hi ${fromName},

I hope this email finds you well. I wanted to follow up on our previous conversation and see if you had any updates.

I'd love to hear your thoughts and am happy to provide any additional information you might need.

Looking forward to your response.

Best regards,
${userName}`;
        } catch (error) {
            console.error('❌ Follow-up error:', error.message);
            const userName = userContext.name || 'User';
            return `Hi there,

I wanted to follow up on our previous conversation. I hope you're doing well.

Please let me know if you have any updates or thoughts to share. I'm happy to provide any additional information.

Looking forward to hearing from you.

Best regards,
${userName}`;
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
