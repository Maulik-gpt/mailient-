import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../lib/auth.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

const FREE_MODELS = [
  'google/gemini-2.0-flash-exp:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'qwen/qwen-2-7b-instruct:free',
];

function getKeys(): string[] {
  return [
    process.env.OPENROUTER_API_KEY,
    process.env.OPENROUTER_API_KEY2,
    process.env.OPENROUTER_API_KEY3,
  ].filter(Boolean) as string[];
}

async function tryGenerateTitle(message: string): Promise<string | null> {
  const keys = getKeys();
  if (keys.length === 0) return null;

  for (const model of FREE_MODELS) {
    for (const key of keys) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://mailient.xyz',
          },
          body: JSON.stringify({
            model,
            max_tokens: 15,
            temperature: 0.3,
            messages: [
              {
                role: 'system',
                content: 'Generate a short 3-5 word title for this conversation. Output ONLY the title — no quotes, no punctuation at the end, no explanation. Example inputs and outputs: "analyze my emails" → "Email Inbox Analysis", "draft reply to John" → "Reply to John", "what meetings do I have" → "Upcoming Meeting Check".',
              },
              { role: 'user', content: message.slice(0, 300) },
            ],
          }),
          signal: AbortSignal.timeout(6000),
        });

        if (res.status === 429) continue; // try next key/model
        if (!res.ok) continue;

        const json = await res.json();
        const raw: string = json.choices?.[0]?.message?.content?.trim() || '';
        const title = raw.replace(/^["'`*#]+|["'`*#.!?]+$/g, '').trim();

        if (title && title.length >= 3 && title.length <= 60) {
          return title;
        }
      } catch {
        // try next
      }
    }
  }
  return null;
}

// Smart fallback: extract the meaningful topic from the message
function smartFallback(message: string): string {
  const m = message.trim();

  // Strip common filler prefixes
  const stripped = m
    .replace(/^(hey|hi|hello|please|can you|could you|would you|i need|i want|help me|show me)\s+/i, '')
    .replace(/^(to|with|for|about)\s+/i, '');

  // Take first 6 meaningful words
  const words = stripped.split(/\s+/).filter(w => w.length > 0);
  const meaningful = words.slice(0, 6).join(' ');

  // Capitalize first letter
  return meaningful.charAt(0).toUpperCase() + meaningful.slice(1);
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

  const aiTitle = await tryGenerateTitle(message);
  if (aiTitle) {
    return NextResponse.json({ title: aiTitle });
  }

  // Smart fallback when all models fail
  const fallback = smartFallback(message);
  return NextResponse.json({ title: fallback.length > 50 ? fallback.slice(0, 50) + '…' : fallback });
}
