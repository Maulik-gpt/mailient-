import { getSupabaseAdmin } from './supabase.js';
import { VoiceProfiler } from './voice-profiler.js';

// Voice profile analysis model - using a capable model for detailed analysis
const VOICE_ANALYSIS_MODEL = 'qwen/qwen3-coder:free';
const VOICE_PROFILE_API_KEY = process.env.OPENROUTER_API_KEY3;

export class VoiceProfileService {
    constructor() {
        this.baseURL = 'https://openrouter.ai/api/v1';
        this.apiKey = (VOICE_PROFILE_API_KEY || process.env.OPENROUTER_API_KEY || '').trim();
    }

    get supabase() {
        return getSupabaseAdmin();
    }

    /**
     * Fetch user's sent emails for voice analysis
     * @param {Object} gmailService - Initialized Gmail service
     * @param {number} maxEmails - Maximum number of emails to fetch (default: 30)
     * @returns {Promise<Array>} Array of sent email objects
     */
    async fetchSentEmails(gmailService, maxEmails = 30) {
        try {
            console.log('📧 Fetching sent emails for voice analysis...');

            // Query for sent emails
            const sentEmailsResponse = await gmailService.getEmails(
                maxEmails,
                'in:sent', // Only sent emails
                null
            );

            if (!sentEmailsResponse?.messages || sentEmailsResponse.messages.length === 0) {
                console.log('⚠️ No sent emails found for voice analysis');
                return [];
            }

            // Fetch full details for each email
            const emailDetails = [];
            const emailsToFetch = sentEmailsResponse.messages.slice(0, maxEmails);

            for (const message of emailsToFetch) {
                try {
                    const details = await gmailService.getEmailDetails(message.id);
                    const parsed = gmailService.parseEmailData(details);

                    // Clean the body text
                    const cleanBody = (parsed.body || '')
                        .replace(/<[^>]*>?/gm, '')
                        .replace(/\s+/g, ' ')
                        .trim();

                    if (cleanBody.length > 30) { // Include short responses too for voice accuracy
                        emailDetails.push({
                            id: message.id,
                            subject: parsed.subject,
                            to: parsed.to,
                            body: cleanBody.substring(0, 2000), // Truncate for efficiency
                            date: parsed.date,
                            snippet: parsed.snippet
                        });
                    }
                } catch (error) {
                    console.warn(`Failed to fetch email ${message.id}:`, error.message);
                }
            }

            console.log(`✅ Fetched ${emailDetails.length} sent emails for analysis`);
            return emailDetails;
        } catch (error) {
            console.error('❌ Error fetching sent emails:', error);
            throw error;
        }
    }

    /**
     * Analyze user's writing style using high-speed signal extraction + optional fuzzy LLM vibe
     * @param {Array} sentEmails - Array of sent email objects
     * @returns {Promise<Object>} Voice profile analysis
     */
    async analyzeVoiceProfile(sentEmails) {
        if (!sentEmails || sentEmails.length === 0) {
            console.log('⚠️ No emails to analyze for voice profile');
            return this.getDefaultVoiceProfile();
        }

        try {
            console.log('🔍 Extracting writing signals from', sentEmails.length, 'emails...');
            
            // 1. HARD SIGNAL EXTRACTION (Fast, Local)
            const bodies = sentEmails.map(e => e.body);
            const signals = VoiceProfiler.extractSignals(bodies);

            // 2. FUZZY VIBE ANALYSIS (Optional LLM call for Slang/Tone)
            let fuzzyVibe = { tone: 'professional', slang: 'none', personality: 'balanced' };
            try {
                console.log('🧠 Performing fuzzy vibe analysis via LLM...');
                const emailSamples = sentEmails.slice(0, 10).map((email, index) => {
                    return `--- Sample ${index + 1} ---
Subject: ${email.subject}
Content: ${email.body.substring(0, 800)}
---`;
                }).join('\n\n');

                const messages = [
                    {
                        role: 'system',
                        content: `You are a writing style analyst. Categorize the user's TONE and SLANG/vocabulary style based on samples.
Respond ONLY with a JSON object: {"tone": "casual/formal/...", "slang": "keywords user likes", "personality": "direct/warm/..."}`
                    },
                    {
                        role: 'user',
                        content: `Analyze these samples:\n\n${emailSamples}`
                    }
                ];

                const response = await this.callOpenRouter(messages, { maxTokens: 150, temperature: 0.1 });
                if (response?.choices?.[0]?.message?.content) {
                    const content = response.choices[0].message.content.trim();
                    fuzzyVibe = JSON.parse(content.replace(/```json|```/g, '').trim());
                }
            } catch (llmError) {
                console.warn('⚠️ Fuzzy LLM analysis failed, using signals only:', llmError.message);
            }

            // 3. MERGE INTO FINAL PROFILE
            const voiceProfile = {
                tone: {
                    primary: fuzzyVibe.tone,
                    warmth_level: signals.vibe.exclamatory ? 8 : 5,
                    description: fuzzyVibe.personality
                },
                greeting_patterns: {
                    preferred_greetings: signals.patterns.greetings,
                    uses_recipient_name: signals.patterns.greetings.some(g => g.includes(' ')),
                    greeting_warmth: signals.vibe.exclamatory ? 'warm' : 'neutral'
                },
                closing_patterns: {
                    preferred_closings: signals.patterns.signOffs,
                    signature_style: signals.replyLength === 'detailed' ? 'detailed' : 'minimal'
                },
                language_patterns: {
                    sentence_length: signals.avgSentenceLength > 15 ? 'long' : 'short',
                    avg_length: signals.avgSentenceLength,
                    uses_contractions: true,
                    uses_exclamations: signals.vibe.exclamatory,
                    uses_emojis: signals.emojis.frequency > 0.1,
                    top_emojis: signals.emojis.top,
                    common_phrases: signals.fillers,
                    style_flags: signals.vibe
                },
                structural_patterns: {
                    typical_email_length: signals.replyLength,
                    structure_preference: fuzzyVibe.personality.includes('direct') ? 'direct' : 'contextual'
                },
                personality_traits: {
                    enthusiastic: signals.vibe.exclamatory,
                    detail_oriented: signals.replyLength === 'detailed'
                },
                prompt_fragment: VoiceProfiler.generatePromptFragment(signals, fuzzyVibe),
                analyzed_at: new Date().toISOString(),
                email_count: sentEmails.length,
                status: 'complete'
            };

            console.log('✅ Lightweight voice profile created');
            return voiceProfile;
        } catch (error) {
            console.error('❌ Error analyzing voice profile:', error);
            return this.getDefaultVoiceProfile();
        }
    }

    /**
     * Get default voice profile when analysis is not possible
     */
    getDefaultVoiceProfile() {
        return {
            tone: {
                primary: 'professional',
                warmth_level: 6,
                assertiveness: 5,
                description: 'Professional and balanced tone'
            },
            greeting_patterns: {
                preferred_greetings: ['Hi', 'Hello'],
                uses_recipient_name: true,
                greeting_warmth: 'warm'
            },
            closing_patterns: {
                preferred_closings: ['Best regards', 'Best'],
                includes_name: true,
                includes_title: false,
                signature_style: 'standard'
            },
            language_patterns: {
                sentence_length: 'medium',
                vocabulary_complexity: 'moderate',
                uses_contractions: true,
                uses_exclamations: false,
                uses_emojis: false,
                common_phrases: [],
                transition_words: ['however', 'also', 'additionally']
            },
            structural_patterns: {
                paragraph_length: 'medium',
                uses_bullet_points: false,
                typical_email_length: 'moderate',
                structure_preference: 'direct'
            },
            personality_traits: {
                enthusiastic: false,
                detail_oriented: true,
                action_focused: true,
                relationship_building: true,
                empathetic: true
            },
            sample_phrases: [],
            analyzed_at: null,
            email_count: 0,
            status: 'default'
        };
    }

    /**
     * Save voice profile to database
     * @param {string} userId - User's email/ID
     * @param {Object} voiceProfile - Voice profile data
     */
    async saveVoiceProfile(userId, voiceProfile) {
        try {
            const normalizedUserId = userId.toLowerCase().trim();

            const { error } = await this.supabase
                .from('user_voice_profiles')
                .upsert({
                    user_id: normalizedUserId,
                    voice_profile: voiceProfile,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                });

            if (error) {
                console.error('❌ Error saving voice profile:', error);
                throw error;
            }

            console.log('✅ Voice profile saved for user:', normalizedUserId);
            return true;
        } catch (error) {
            console.error('❌ Failed to save voice profile:', error);
            throw error;
        }
    }

    /**
     * Incrementally update voice profile with a new email body
     * @param {string} userId - User ID
     * @param {string} emailBody - Body of newly sent email
     */
    async addToProfile(userId, emailBody) {
        try {
            const profile = await this.getVoiceProfile(userId);
            if (!profile) return;

            console.log('📈 Updating voice profile incrementally...');
            const newSignals = VoiceProfiler.extractSignals([emailBody]);
            
            // Moderate blend (EMA - Exponential Moving Average style)
            if (profile.language_patterns?.avg_length) {
                profile.language_patterns.avg_length = Math.round((profile.language_patterns.avg_length * 0.8) + (newSignals.avgSentenceLength * 0.2));
            }
            
            // Add unique emojis to the top list
            if (newSignals.emojis.top.length > 0) {
                const currentEmojis = profile.language_patterns?.top_emojis || [];
                profile.language_patterns.top_emojis = [...new Set([...newSignals.emojis.top, ...currentEmojis])].slice(0, 10);
            }

            profile.email_count = (profile.email_count || 0) + 1;
            profile.analyzed_at = new Date().toISOString();
            
            // Re-generate the prompt fragment to include new learnings
            const fuzzyVibe = { 
                tone: profile.tone?.primary || 'professional', 
                slang: profile.language_patterns?.common_phrases?.[0] || 'none',
                personality: profile.tone?.description || 'balanced'
            };
            profile.prompt_fragment = VoiceProfiler.generatePromptFragment(newSignals, fuzzyVibe);

            await this.saveVoiceProfile(userId, profile);
        } catch (e) {
            console.warn('⚠️ Incremental update failed:', e.message);
        }
    }

    /**
     * Get voice profile from database
     * @param {string} userId - User's email/ID
     * @returns {Promise<Object|null>} Voice profile or null
     */
    async getVoiceProfile(userId) {
        try {
            const normalizedUserId = userId.toLowerCase().trim();

            const { data, error } = await this.supabase
                .from('user_voice_profiles')
                .select('voice_profile, updated_at')
                .eq('user_id', normalizedUserId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No profile found
                    return null;
                }
                console.error('❌ Error fetching voice profile:', error);
                return null;
            }

            return data?.voice_profile || null;
        } catch (error) {
            console.error('❌ Failed to get voice profile:', error);
            return null;
        }
    }

    /**
     * Check if voice profile needs refresh
     * @param {string} userId - User's email/ID
     * @param {number} maxAgeDays - Maximum age in days before refresh (default: 7)
     */
    async needsRefresh(userId, maxAgeDays = 7) {
        try {
            const normalizedUserId = userId.toLowerCase().trim();

            const { data, error } = await this.supabase
                .from('user_voice_profiles')
                .select('updated_at')
                .eq('user_id', normalizedUserId)
                .single();

            if (error || !data) {
                return true; // Needs refresh if not found
            }

            const updatedAt = new Date(data.updated_at);
            const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
            const needsUpdate = (Date.now() - updatedAt.getTime()) > maxAgeMs;

            return needsUpdate;
        } catch (error) {
            return true;
        }
    }

    /**
     * Generate voice-cloned prompt instructions based on profile
     * @param {Object} voiceProfile - User's voice profile
     * @returns {string} Prompt instructions for voice cloning
     */
    generateVoicePrompt(voiceProfile) {
        if (!voiceProfile || voiceProfile.status === 'default') {
            return '';
        }

        // 1. Use high-fidelity prompt fragment if available
        if (voiceProfile.prompt_fragment) {
            return `
**VOICE CLONING INSTRUCTIONS - CRITICAL**
You MUST write in the user's exact voice and style. Follow these patterns precisely:
${voiceProfile.prompt_fragment}

CRITICAL: The email MUST sound like the user wrote it themselves. Match their exact cadence.
            `.trim();
        }

        // 2. Fallback to legacy structure mapping
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

    /**
     * Call OpenRouter API
     */
    async callOpenRouter(messages, options = {}) {
        if (!this.apiKey) {
            throw new Error('OpenRouter API key not configured');
        }

        console.log('🔄 Calling OpenRouter for voice analysis...');

        const response = await fetch(`${this.baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'HTTP-Referer': process.env.HOST || 'https://mailient.xyz',
                'X-Title': 'Mailient Voice Profile'
            },
            body: JSON.stringify({
                model: VOICE_ANALYSIS_MODEL,
                messages,
                temperature: options.temperature || 0.3,
                max_tokens: options.maxTokens || 2000
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ OpenRouter API error:', response.status, errorText);
            throw new Error(`OpenRouter API error: ${response.status}`);
        }

        return await response.json();
    }
}

// Export singleton instance
export const voiceProfileService = new VoiceProfileService();
