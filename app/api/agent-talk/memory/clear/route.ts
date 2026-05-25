import { NextResponse } from 'next/server';
import { auth } from '../../../../../lib/auth.js';

export const dynamic = 'force-dynamic';

const SUPERMEMORY_BASE = 'https://api.supermemory.ai';

function getSupermemoryKey(): string | null {
  return process.env.SUPERMEMORY_API_KEY || process.env.DATAFAST_API_KEY || null;
}

/**
 * POST /api/agent-talk/memory/clear
 * Clears ALL memories for the authenticated user from Supermemory.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.email.toLowerCase();
  const key = getSupermemoryKey();

  if (!key) {
    return NextResponse.json({ error: 'Memory service not configured' }, { status: 503 });
  }

  try {
    // Try v3 bulk delete by user
    const res = await fetch(`${SUPERMEMORY_BASE}/v3/memories/delete`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filters: { userId } }),
      signal: AbortSignal.timeout(15000),
    });

    if (res.ok) {
      return NextResponse.json({ success: true, cleared: true });
    }

    // Fallback: fetch all then delete one-by-one
    const searchRes = await fetch(`${SUPERMEMORY_BASE}/v3/memories/search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: '*', limit: 200, filters: { userId } }),
      signal: AbortSignal.timeout(10000),
    });

    if (searchRes.ok) {
      const data = await searchRes.json();
      const memories = data.results || data.memories || data.data || [];
      const deletePromises = memories.map((m: any) => {
        const id = m.id || m._id || m.memory_id;
        if (!id) return Promise.resolve();
        return fetch(`${SUPERMEMORY_BASE}/v3/memories/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${key}` },
          signal: AbortSignal.timeout(5000),
        }).catch(() => {});
      });

      await Promise.allSettled(deletePromises);
      return NextResponse.json({ success: true, cleared: true, count: memories.length });
    }

    return NextResponse.json({ success: false, error: 'Could not clear memories' }, { status: 500 });
  } catch (err: any) {
    console.error('[Memory Clear] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
