import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.js';
import { subscriptionService, FEATURE_TYPES } from '@/lib/subscription-service.js';

/**
 * Generate a concise chat title based on the user's first message
 * Uses OPENROUTER_API_KEY3 with Gemini 2.0 Flash for fast, smart title generation
 */
export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const userId = session.user.email;
        const canUse = await subscriptionService.canUseFeature(userId, FEATURE_TYPES.ARCUS_AI);
        if (!canUse) {
            const usage = await subscriptionService.getFeatureUsage(userId, FEATURE_TYPES.ARCUS_AI);
            return NextResponse.json({
                error: 'limit_reached',
                message: usage.reason === 'subscription_expired'
                    ? 'Your subscription has expired. Please renew to continue.'
                    : usage.reason === 'no_subscription'
                        ? 'You need an active subscription to use this feature.'
                        : `Sorry, but you've exhausted all the credits of ${usage.period === 'daily' ? 'the day' : 'the month'}.`,
                usage: usage.usage,
                limit: usage.limit,
                remaining: usage.remaining,
                period: usage.period,
                planType: usage.planType,
                upgradeUrl: '/pricing'
            }, { status: 403 });
        }

        const { message } = await request.json();

        if (!message || typeof message !== 'string' || message.trim().length < 2) {
            return NextResponse.json(
                { error: 'Message is required for title generation' },
                { status: 400 }
            );
        }

        const apiKey = (process.env.OPENROUTER_API_KEY3 || process.env.OPENROUTER_API_KEY || '').trim();

        if (!apiKey) {
            console.error('❌ No API key available for title generation');
            // Fallback: Use first words of message
            const fallbackTitle = message.trim().split(' ').slice(0, 5).join(' ');
            return NextResponse.json({
                title: fallbackTitle.length > 40 ? fallbackTitle.substring(0, 40) + '...' : fallbackTitle,
                source: 'fallback'
            });
        }

        // Use the requested model chain for title generation (Nano -> Super -> Qwen)
        const models = [
            'nvidia/nemotron-3-nano-30b-a3b:free',      // 1. NVIDIA Nano
            'nvidia/nemotron-3-super-120b-a12b:free',    // 2. NVIDIA Super
            'qwen/qwen3-coder:free'                      // 3. Qwen Coder
        ];

        let generatedTitle = '';
        let lastError = null;

        for (const model of models) {
            try {
                console.log(`🚀 Attempting title generation via ${model}`);
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                        'HTTP-Referer': process.env.HOST || 'https://mailient.xyz',
                        'X-Title': 'Mailient Chat Title Generator'
                    },
                    body: JSON.stringify({
                        model,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: `Generate a short title for a conversation that starts with: "${message}"` }
                        ],
                        temperature: 0.3,
                        max_tokens: 50
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    generatedTitle = data?.choices?.[0]?.message?.content?.trim() || '';
                    if (generatedTitle) {
                        console.log(`✅ Title generation success with ${model}`);
                        break;
                    }
                } else {
                    const errorText = await response.text();
                    console.warn(`⚠️ Title generation failed for ${model}:`, response.status, errorText);
                    lastError = new Error(`Title generation failed: ${response.status}`);
                }
            } catch (err) {
                console.error(`❌ Title generation error with ${model}:`, err.message);
                lastError = err;
            }
        }

        // Clean up the title
        generatedTitle = generatedTitle
            .replace(/^["']|["']$/g, '') // Remove leading/trailing quotes
            .replace(/^Title:\s*/i, '') // Remove "Title:" prefix if present
            .replace(/[:\n]/g, ' ') // Replace colons and newlines with spaces
            .trim();

        // If title is too long, truncate
        if (generatedTitle.length > 50) {
            generatedTitle = generatedTitle.substring(0, 47) + '...';
        }

        // If title generation failed or is empty, use fallback
        if (!generatedTitle || generatedTitle.length < 2) {
            const fallbackTitle = message.trim().split(' ').slice(0, 5).join(' ');
            generatedTitle = fallbackTitle.length > 40 ? fallbackTitle.substring(0, 40) + '...' : fallbackTitle;
        }

        console.log('✅ Generated chat title:', generatedTitle);

        await subscriptionService.incrementFeatureUsage(userId, FEATURE_TYPES.ARCUS_AI);

        return NextResponse.json({
            title: generatedTitle,
            source: 'ai'
        });

    } catch (error) {
        console.error('❌ Title generation error:', error);

        // Fallback: Try to use the message itself
        try {
            const { message } = await request.clone().json();
            const fallbackTitle = (message || 'New Chat').trim().split(' ').slice(0, 5).join(' ');
            return NextResponse.json({
                title: fallbackTitle.length > 40 ? fallbackTitle.substring(0, 40) + '...' : fallbackTitle,
                source: 'fallback'
            });
        } catch {
            return NextResponse.json({
                title: 'New Chat',
                source: 'fallback'
            });
        }
    }
}
