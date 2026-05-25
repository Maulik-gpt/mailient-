import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../lib/auth.js';

export const dynamic = 'force-dynamic';

async function getSupabase() {
  const { getSupabaseAdmin } = await import('../../../../lib/supabase.js');
  return getSupabaseAdmin();
}

// ── Supermemory API helpers ────────────────────────────────────────────────────

const SUPERMEMORY_BASE = 'https://api.supermemory.ai';

function getSupermemoryKey(): string | null {
  return process.env.SUPERMEMORY_API_KEY || process.env.DATAFAST_API_KEY || null;
}

async function fetchSupermemoryMemories(userId: string): Promise<any[]> {
  const key = getSupermemoryKey();
  if (!key) return [];

  try {
    // Try v3 endpoint first
    const res = await fetch(`${SUPERMEMORY_BASE}/v3/memories`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filters: { userId }, limit: 100 }),
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const data = await res.json();
      return data.results || data.memories || data.data || [];
    }

    // Fallback: v3 search with broad query
    const searchRes = await fetch(`${SUPERMEMORY_BASE}/v3/memories/search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: '*', limit: 100, filters: { userId } }),
      signal: AbortSignal.timeout(8000),
    });

    if (searchRes.ok) {
      const data = await searchRes.json();
      return data.results || data.memories || data.data || [];
    }

    // Fallback: v1 endpoint
    const v1Res = await fetch(`${SUPERMEMORY_BASE}/v1/memory/search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: '*', filter: { userId }, topK: 100 }),
      signal: AbortSignal.timeout(8000),
    });

    if (v1Res.ok) {
      const data = await v1Res.json();
      return data.results || [];
    }

    return [];
  } catch {
    return [];
  }
}

async function deleteSupermemoryMemory(memoryId: string): Promise<boolean> {
  const key = getSupermemoryKey();
  if (!key) return false;

  try {
    const res = await fetch(`${SUPERMEMORY_BASE}/v3/memories/${memoryId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── GET /api/agent-talk/memory — list memories + status ────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.email.toLowerCase();

  try {
    // Get memory enabled flag
    const supabase = await getSupabase();
    const { data } = await supabase
      .from('user_profiles')
      .select('preferences')
      .ilike('user_id', userId)
      .maybeSingle();

    const prefs = (data?.preferences as Record<string, unknown>) || {};
    const memoryEnabled = prefs.arcus_memory_enabled !== false; // default true

    // Fetch memories from Supermemory
    const rawMemories = await fetchSupermemoryMemories(userId);

    const memories = rawMemories.map((m: any) => ({
      id: m.id || m._id || m.memory_id || Math.random().toString(36).slice(2),
      content: m.content || m.text || m.memory || '',
      createdAt: m.created_at || m.createdAt || m.timestamp || null,
      metadata: m.metadata || {},
    }));

    return NextResponse.json({ memories, memoryEnabled });
  } catch (err: any) {
    console.error('[Memory API] GET error:', err.message);
    return NextResponse.json({ memories: [], memoryEnabled: true });
  }
}

// ── POST /api/agent-talk/memory — toggle memory on/off ─────────────────────────

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.email.toLowerCase();

  try {
    const body = await request.json();
    const memoryEnabled = Boolean(body.memoryEnabled);

    const supabase = await getSupabase();
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('preferences')
      .ilike('user_id', userId)
      .maybeSingle();

    const existingPrefs = (existing?.preferences as Record<string, unknown>) || {};
    const updatedPrefs = { ...existingPrefs, arcus_memory_enabled: memoryEnabled };

    if (existing) {
      await supabase
        .from('user_profiles')
        .update({ preferences: updatedPrefs })
        .ilike('user_id', userId);
    } else {
      await supabase
        .from('user_profiles')
        .insert({ user_id: userId, preferences: updatedPrefs });
    }

    return NextResponse.json({ success: true, memoryEnabled });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── DELETE /api/agent-talk/memory — delete a single memory ─────────────────────

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const memoryId = body.memoryId;
    if (!memoryId) {
      return NextResponse.json({ error: 'memoryId required' }, { status: 400 });
    }

    const deleted = await deleteSupermemoryMemory(memoryId);
    return NextResponse.json({ success: deleted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
