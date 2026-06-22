/**
 * Durable Today dismissals.
 *
 *   POST   /api/home-feed/dismiss   { itemId, itemType? }  → dismiss (persist)
 *   DELETE /api/home-feed/dismiss   { itemId }             → undo a dismissal
 *
 * The Today route filters these out server-side, so a dismissed item never comes
 * back from the API — and it syncs across devices (was localStorage-only).
 */
import { NextResponse } from 'next/server';
// @ts-ignore
import { auth } from '@/lib/auth.js';
// @ts-ignore
import { getSupabaseAdmin } from '@/lib/supabase.js';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // @ts-ignore
  const session = await (auth as any)();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user.email as string).toLowerCase();

  const body = await req.json().catch(() => ({}));
  const itemId = String(body.itemId || '').trim();
  if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 });
  const itemType = typeof body.itemType === 'string' ? body.itemType : null;

  try {
    const supabase = getSupabaseAdmin();
    await supabase
      .from('arcus_today_dismissals')
      .upsert({ user_id: userId, item_id: itemId, item_type: itemType }, { onConflict: 'user_id,item_id' });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // Non-fatal — the client still hides it optimistically this session.
    console.warn('[home-feed/dismiss] failed:', e?.message);
    return NextResponse.json({ ok: false, error: 'persist_failed' }, { status: 200 });
  }
}

export async function DELETE(req: Request) {
  // @ts-ignore
  const session = await (auth as any)();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user.email as string).toLowerCase();

  const body = await req.json().catch(() => ({}));
  const itemId = String(body.itemId || '').trim();
  if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 });

  try {
    const supabase = getSupabaseAdmin();
    await supabase.from('arcus_today_dismissals').delete().eq('user_id', userId).eq('item_id', itemId);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'delete_failed' }, { status: 200 });
  }
}
