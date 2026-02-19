/**
 * AI Email Writer Service
 * Generates highly personalized cold emails using AI
 * Features: Multiple templates, A/B testing variants, follow-up sequences
 */

interface BusinessProfile {
    name: string;
    url?: string;
    description: string;
    valueProposition: string;
    targetAudience: string;
    industry: string;
    tone: 'professional' | 'friendly' | 'bold' | 'consultative';
}

interface Prospect {
    name: string;
    email: string;
    jobTitle: string;
    company: string;
    industry?: string;
    location?: string;
}

interface EmailTemplate {
    subject: string;
    body: string;
    followUpSubject?: string;
    followUpBody?: string;
}

interface GeneratedEmail {
    subject: string;
    body: string;
    variants?: {
        subject: string;
        body: string;
    }[];
    followUpSequence?: {
        day: number;
        subject: string;
        body: string;
    }[];
}

const COLD_EMAIL_TEMPLATES = {
    valueFirst: {
        name: 'Value-First Approach',
        description: 'Lead with immediate value and insights',
        template: `Hi {{firstName}},

I noticed that {{company}} is {{observation}}. 

{{valueProposition}}.

We've helped similar companies achieve {{specificBenefit}}.

Would it make sense to explore how we could help {{company}} see similar results?

Best,
{{senderName}}`
    },

    questionBased: {
        name: 'Question-Based',
        description: 'Start with a thought-provoking question',
        template: `Hi {{firstName}},

Quick question: {{relevantQuestion}}

At {{businessName}}, we've found that {{insight}}.

I'd love to share a few ideas that could help {{company}} {{desiredOutcome}}.

Worth a 15-minute chat?

Cheers,
{{senderName}}`
    },

    socialProof: {
        name: 'Social Proof',
        description: 'Lead with credibility and results',
        template: `Hi {{firstName}},

Companies like {{similarCompanies}} have been using {{businessName}} to {{achievement}}.

Given {{company}}'s focus on {{focus}}, I thought you might find our approach interesting.

Here's a quick overview: {{valueProposition}}

Would you be open to seeing how this could work for {{company}}?

Best regards,
{{senderName}}`
    },

    directAsk: {
        name: 'Direct Ask',
        description: 'Straight to the point with a clear CTA',
        template: `{{firstName}},

I help {{targetAudience}} {{achieveGoal}}.

{{oneLinePitch}}

Can I show you how in 15 minutes this week?

{{senderName}}`
    },

    curiosity: {
        name: 'Curiosity Gap',
        description: 'Create intrigue to get a response',
        template: `Hi {{firstName}},

I have an idea that could help {{company}} {{desiredOutcome}}.

It's worked for {{similarCompanies}}, and I think it could work for you too.

Mind if I share the details?

{{senderName}}`
    }
};

const FOLLOW_UP_TEMPLATES = [
    {
        day: 3,
        template: `Hi {{firstName}},

Just following up on my previous email. I know you're busy, so I'll keep this short.

{{quickValue}}

Worth a quick call?

{{senderName}}`
    },
    {
        day: 7,
        template: `{{firstName}},

I wanted to share something interesting: {{newInsight}}.

Given your role at {{company}}, I thought this might be relevant.

Let me know if you'd like to discuss.

{{senderName}}`
    },
    {
        day: 14,
        template: `Hi {{firstName}},

I've been thinking about {{company}} and {{specificChallenge}}.

Here's a quick idea: {{solution}}.

Would love to hear your thoughts.

{{senderName}}`
    }
];

class AIEmailWriterService {
    private apiKey: string | undefined;

    constructor() {
        this.apiKey = process.env.OPENROUTER_API_KEY;
    }

    async generateEmail(
        businessProfile: BusinessProfile,
        prospects: Prospect[],
        templateType?: keyof typeof COLD_EMAIL_TEMPLATES
    ): Promise<GeneratedEmail> {
        // If no API key, use template-based generation
        if (!this.apiKey) {
            return this.generateFromTemplate(businessProfile, templateType);
        }

        try {
            const sampleProspects = prospects.slice(0, 3);

            // Fallback chain of free models
            const models = [
                'arcee-ai/trinity-large-preview:free',
                'qwen/qwen3-coder:free',
                'nvidia/nemotron-nano-9b-v2:free',
                'openai/gpt-oss-20b:free',
            ];

            let data: any = null;
            for (const modelId of models) {
                try {
                    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${this.apiKey}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model: modelId,
                            messages: [
                                {
                                    role: 'system',
                                    content: this.getSystemPrompt(businessProfile.tone)
                                },
                                {
                                    role: 'user',
                                    content: this.getUserPrompt(businessProfile, sampleProspects)
                                }
                            ],
                            max_tokens: 1500,
                            temperature: 0.7
                        })
                    });

                    if (!response.ok) {
                        console.warn(`⚠️ Email writer model ${modelId} failed (${response.status})`);
                        continue;
                    }

                    data = await response.json();
                    if (data.choices?.[0]?.message?.content) {
                        console.log(`✅ Email writer success with ${modelId}`);
                        break;
                    }
                } catch (e: any) {
                    console.warn(`❌ Email writer ${modelId} error: ${e.message}`);
                    continue;
                }
            }

            const text = data?.choices?.[0]?.message?.content;

            // Parse the AI response
            const match = text?.match(/\{[\s\S]*\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                return {
                    subject: parsed.subject || this.getDefaultSubject(businessProfile),
                    body: parsed.body || this.getDefaultBody(businessProfile),
                    variants: parsed.variants || [],
                    followUpSequence: parsed.followUps || this.generateFollowUpSequence(businessProfile)
                };
            }

            return this.generateFromTemplate(businessProfile, templateType);
        } catch (error) {
            console.error('AI email generation error:', error);
            return this.generateFromTemplate(businessProfile, templateType);
        }
    }

    private getSystemPrompt(tone: string): string {
        const toneDescriptions: Record<string, string> = {
            professional: 'formal, polished, and business-appropriate',
            friendly: 'warm, casual, and personable',
            bold: 'confident, direct, and attention-grabbing',
            consultative: 'helpful, advisory, and solution-focused'
        };

        return `You are an expert cold email copywriter. Generate highly converting cold emails.

RULES:
1. Keep emails under 125 words
2. Use {{name}}, {{company}}, {{jobTitle}} as personalization variables
3. Be specific about value - avoid generic claims
4. Include one clear, low-friction call-to-action
5. Tone should be: ${toneDescriptions[tone] || toneDescriptions.professional}
6. Subject lines should be under 50 characters
7. Avoid spam trigger words

Return JSON format:
{
  "subject": "email subject line",
  "body": "email body with personalization variables",
  "variants": [
    {"subject": "A/B variant subject", "body": "A/B variant body"}
  ],
  "followUps": [
    {"day": 3, "subject": "follow-up subject", "body": "follow-up body"}
  ]
}`;
    }

    private getUserPrompt(businessProfile: BusinessProfile, prospects: Prospect[]): string {
        const prospectContext = prospects.map(p =>
            `• ${p.name} - ${p.jobTitle} at ${p.company}`
        ).join('\n');

        return `Generate a cold email for my business:

Business: ${businessProfile.name}
Industry: ${businessProfile.industry}
Value Proposition: ${businessProfile.valueProposition}
Target Audience: ${businessProfile.targetAudience}
Description: ${businessProfile.description}

Sample prospects to personalize for:
${prospectContext}

Generate:
1. A primary email (subject + body)
2. 2 A/B test variants
3. 3 follow-up emails (day 3, 7, 14)

Make it compelling, concise, and highly personalized.`;
    }

    private generateFromTemplate(
        businessProfile: BusinessProfile,
        templateType?: keyof typeof COLD_EMAIL_TEMPLATES
    ): GeneratedEmail {
        const template = templateType
            ? COLD_EMAIL_TEMPLATES[templateType]
            : COLD_EMAIL_TEMPLATES.valueFirst;

        const subject = this.getDefaultSubject(businessProfile);
        const body = this.fillTemplate(template.template, businessProfile);

        return {
            subject,
            body,
            variants: [
                {
                    subject: `Quick question about {{company}}`,
                    body: this.fillTemplate(COLD_EMAIL_TEMPLATES.questionBased.template, businessProfile)
                },
                {
                    subject: `{{name}}, idea for {{company}}`,
                    body: this.fillTemplate(COLD_EMAIL_TEMPLATES.curiosity.template, businessProfile)
                }
            ],
            followUpSequence: this.generateFollowUpSequence(businessProfile)
        };
    }

    private fillTemplate(template: string, profile: BusinessProfile): string {
        return template
            .replace(/\{\{businessName\}\}/g, profile.name)
            .replace(/\{\{valueProposition\}\}/g, profile.valueProposition)
            .replace(/\{\{targetAudience\}\}/g, profile.targetAudience)
            .replace(/\{\{industry\}\}/g, profile.industry)
            .replace(/\{\{observation\}\}/g, 'growing rapidly in the market')
            .replace(/\{\{specificBenefit\}\}/g, 'significant improvements in their key metrics')
            .replace(/\{\{relevantQuestion\}\}/g, `How are you currently handling ${profile.industry.toLowerCase()} challenges?`)
            .replace(/\{\{insight\}\}/g, profile.valueProposition)
            .replace(/\{\{desiredOutcome\}\}/g, 'achieve better results')
            .replace(/\{\{similarCompanies\}\}/g, 'leading companies in your space')
            .replace(/\{\{achievement\}\}/g, 'transform their operations')
            .replace(/\{\{focus\}\}/g, 'growth')
            .replace(/\{\{achieveGoal\}\}/g, 'scale their operations efficiently')
            .replace(/\{\{oneLinePitch\}\}/g, profile.valueProposition)
            .replace(/\{\{senderName\}\}/g, '[Your Name]');
    }

    private generateFollowUpSequence(profile: BusinessProfile) {
        return FOLLOW_UP_TEMPLATES.map(f => ({
            day: f.day,
            subject: `Re: Quick question about {{company}}`,
            body: f.template
                .replace(/\{\{quickValue\}\}/g, profile.valueProposition)
                .replace(/\{\{newInsight\}\}/g, `a new trend in ${profile.industry}`)
                .replace(/\{\{specificChallenge\}\}/g, 'scaling efficiently')
                .replace(/\{\{solution\}\}/g, profile.valueProposition)
                .replace(/\{\{senderName\}\}/g, '[Your Name]')
        }));
    }

    private getDefaultSubject(profile: BusinessProfile): string {
        const subjects = [
            `Quick question for {{company}}`,
            `{{name}}, thought you'd find this interesting`,
            `Idea for {{company}}'s ${profile.industry.toLowerCase()} strategy`,
            `15 mins to discuss {{company}}'s growth?`
        ];
        return subjects[Math.floor(Math.random() * subjects.length)];
    }

    private getDefaultBody(profile: BusinessProfile): string {
        return `Hi {{name}},

I noticed {{company}} is doing impressive work in the ${profile.industry} space.

At ${profile.name}, ${profile.valueProposition}.

We've helped similar companies in your industry achieve significant results.

Would it make sense to explore how we could help {{company}}?

Best regards`;
    }

    getTemplateTypes(): { id: string; name: string; description: string }[] {
        return Object.entries(COLD_EMAIL_TEMPLATES).map(([id, template]) => ({
            id,
            name: template.name,
            description: template.description
        }));
    }
}

export const aiEmailWriter = new AIEmailWriterService();
export { COLD_EMAIL_TEMPLATES, FOLLOW_UP_TEMPLATES };
