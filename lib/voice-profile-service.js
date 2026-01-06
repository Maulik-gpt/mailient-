/**
 * Voice Profile Service
 * Analyzes user's outgoing emails to learn their unique writing style and voice
 * This enables AI to draft replies that are indistinguishable from the user's own writing
 */

import { getSupabaseAdmin } from './supabase.js';

// Voice profile analysis model - using a capable model for detailed analysis
const VOICE_ANALYSIS_MODEL = 'google/gemini-2.0-flash-exp:free';
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

                    if (cleanBody.length > 50) { // Only include emails with substantial content
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
     * Analyze user's writing style from their sent emails
     * @param {Array} sentEmails - Array of sent email objects
     * @returns {Promise<Object>} Voice profile analysis
     */
    async analyzeVoiceProfile(sentEmails) {
        if (!sentEmails || sentEmails.length === 0) {
            console.log('⚠️ No emails to analyze for voice profile');
            return this.getDefaultVoiceProfile();
        }

        try {
            console.log('🔍 Analyzing voice profile from', sentEmails.length, 'emails...');

            // Prepare email samples for analysis
            const emailSamples = sentEmails.slice(0, 20).map((email, index) => {
                return `--- Email ${index + 1} ---
Subject: ${email.subject}
Content: ${email.body.substring(0, 1500)}
---`;
            }).join('\n\n');

            const messages = [
                {
                    role: 'system',
                    content: `You are an expert writing style analyst. Your task is to analyze a user's email writing patterns and create a detailed voice profile that can be used to generate emails that perfectly match their style.

IMPORTANT: Analyze carefully and provide SPECIFIC observations, not generic descriptions.

Respond in valid JSON format ONLY with this exact structure:
{
    "tone": {
        "primary": "formal|casual|professional|friendly|conversational",
        "warmth_level": 1-10,
        "assertiveness": 1-10,
        "description": "Brief description of overall tone"
    },
    "greeting_patterns": {
        "preferred_greetings": ["array of typical greetings used"],
        "uses_recipient_name": true/false,
        "greeting_warmth": "cold|neutral|warm|very_warm"
    },
    "closing_patterns": {
        "preferred_closings": ["array of typical sign-offs"],
        "includes_name": true/false,
        "includes_title": true/false,
        "signature_style": "minimal|standard|detailed"
    },
    "language_patterns": {
        "sentence_length": "short|medium|long|varied",
        "vocabulary_complexity": "simple|moderate|sophisticated",
        "uses_contractions": true/false,
        "uses_exclamations": true/false,
        "uses_emojis": true/false,
        "common_phrases": ["array of frequently used phrases/expressions"],
        "transition_words": ["commonly used transition words"]
    },
    "structural_patterns": {
        "paragraph_length": "short|medium|long",
        "uses_bullet_points": true/false,
        "typical_email_length": "brief|moderate|detailed",
        "structure_preference": "direct|contextual|storytelling"
    },
    "personality_traits": {
        "enthusiastic": true/false,
        "detail_oriented": true/false,
        "action_focused": true/false,
        "relationship_building": true/false,
        "empathetic": true/false
    },
    "sample_phrases": ["5-10 actual phrases from the emails that are characteristic of this user's voice"]
}`
                },
                {
                    role: 'user',
                    content: `Analyze these ${sentEmails.length} sent emails and create a detailed voice profile:

${emailSamples}

Provide your analysis as valid JSON only, no additional text.`
                }
            ];

            const response = await this.callOpenRouter(messages, {
                maxTokens: 2000,
                temperature: 0.3
            });

            if (response?.choices?.[0]?.message?.content) {
                const content = response.choices[0].message.content.trim();

                // Try to parse JSON from the response
                try {
                    // Handle potential markdown code blocks
                    let jsonStr = content;
                    if (jsonStr.includes('```json')) {
                        jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
                    } else if (jsonStr.includes('```')) {
                        jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
                    }

                    const voiceProfile = JSON.parse(jsonStr);
                    console.log('✅ Voice profile analyzed successfully');

                    return {
                        ...voiceProfile,
                        analyzed_at: new Date().toISOString(),
                        email_count: sentEmails.length,
                        status: 'complete'
                    };
                } catch (parseError) {
                    console.error('❌ Failed to parse voice profile JSON:', parseError.message);
                    console.log('Raw response:', content.substring(0, 500));
                    return this.getDefaultVoiceProfile();
                }
            }

            return this.getDefaultVoiceProfile();
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
