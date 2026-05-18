import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../lib/auth.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

function getKey(): string | undefined {
  return (
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENROUTER_API_KEY2 ||
    process.env.OPENROUTER_API_KEY3
  );
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let message = '';
  try {
    const body = await request.json();
    message = body.message?.trim() || '';
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  const apiKey = getKey();
  if (!apiKey) {
    // Fallback: first 5 words
    const fallback = message.split(' ').slice(0, 5).join(' ');
    return NextResponse.json({ title: fallback });
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://mailient.xyz',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        max_tokens: 20,
        messages: [
          {
            role: 'system',
            content:
              'Generate a short 3-6 word conversation title for the given user message. Output ONLY the title — no punctuation, no quotes, no explanation.',
          },
          { role: 'user', content: message.slice(0, 500) },
        ],
      }),
    });

    if (!res.ok) throw new Error(`OpenRouter ${res.status}`);

    const json = await res.json();
    const raw: string = json.choices?.[0]?.message?.content?.trim() || '';
    const title = raw.replace(/^["'`]+|["'`]+$/g, '').trim();

    if (title && title.length > 0 && title.length <= 80) {
      return NextResponse.json({ title });
    }
  } catch {
    // Fall through to fallback
  }

  // Fallback: first 5 words
  const fallback = message.split(' ').slice(0, 5).join(' ');
  return NextResponse.json({ title: fallback.length > 50 ? fallback.slice(0, 50) + '…' : fallback });
}
