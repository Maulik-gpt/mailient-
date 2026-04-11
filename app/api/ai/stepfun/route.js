import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const STEPFUN_MODEL = 'nvidia/nemotron-3-nano-30b-a3b:free';
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

/**
 * StepFun Step-3.5-Flash Endpoint
 * Direct interface to StepFun's fast flash model via OpenRouter.
 * Used by all Sift AI features: summary, draft reply, notes, intelligence.
 */
export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const apiKey = (
            process.env.OPENROUTER_API_KEY ||
            process.env.OPENROUTER_API_KEY2 ||
            process.env.OPENROUTER_API_KEY3 ||
            ''
        ).trim();

        if (!apiKey) {
            return NextResponse.json(
                { error: 'OpenRouter API key not configured' },
                { status: 500 }
            );
        }

        const body = await request.json();
        const { messages, maxTokens = 800, temperature = 0.3, privacyMode = false } = body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json({ error: 'messages array is required' }, { status: 400 });
        }

        console.log(`🔮 StepFun request: ${messages.length} messages, maxTokens=${maxTokens}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);

        const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': process.env.HOST || 'https://mailient.xyz',
                'X-Title': 'Mailient',
                ...(privacyMode ? { 'X-OpenRouter-Data-Collection': 'opt-out' } : {})
            },
            body: JSON.stringify({
                model: STEPFUN_MODEL,
                messages,
                temperature,
                max_tokens: maxTokens,
                provider: {
                    data_collection: privacyMode ? 'deny' : 'allow'
                }
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ StepFun API error ${response.status}:`, errorText.substring(0, 200));
            return NextResponse.json(
                { error: `Model API error: ${response.status}`, detail: errorText.substring(0, 200) },
                { status: response.status }
            );
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;

        if (!content) {
            console.warn('⚠️ StepFun returned empty content');
            return NextResponse.json({ error: 'Model returned empty response' }, { status: 502 });
        }

        console.log('✅ StepFun response received');

        return NextResponse.json({
            success: true,
            content,
            model: STEPFUN_MODEL,
            usage: data.usage || null
        });

    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('⏱️ StepFun request timed out after 25s');
            return NextResponse.json({ error: 'Request timed out. Please try again.' }, { status: 504 });
        }
        console.error('❌ StepFun endpoint error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * GET /api/ai/stepfun — Health check & model info
 */
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const apiKey = (
            process.env.OPENROUTER_API_KEY ||
            process.env.OPENROUTER_API_KEY2 ||
            process.env.OPENROUTER_API_KEY3 ||
            ''
        ).trim();

        return NextResponse.json({
            model: STEPFUN_MODEL,
            status: apiKey ? 'configured' : 'missing_api_key',
            endpoint: `${OPENROUTER_BASE}/chat/completions`,
            timeout_ms: 25000,
            features: [
                'email_summary',
                'draft_reply',
                'ai_notes',
                'inbox_intelligence',
                'voice_cloning'
            ]
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
