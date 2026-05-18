import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../lib/auth.js';
import { getSupabaseAdmin } from '../../../../../lib/supabase.js';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.email.toLowerCase();

  let timezone = '';
  try {
    const body = await request.json();
    timezone = body.timezone?.trim() || '';
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!timezone) return NextResponse.json({ error: 'timezone required' }, { status: 400 });

  // Validate it's a real IANA timezone
  try { Intl.DateTimeFormat(undefined, { timeZone: timezone }); } catch {
    return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('preferences')
      .ilike('user_id', userId)
      .maybeSingle();

    const prefs = ((existing?.preferences as Record<string, unknown>) || {});
    const updated = { ...prefs, timezone };

    if (existing) {
      await supabase.from('user_profiles').update({ preferences: updated }).ilike('user_id', userId);
    } else {
      await supabase.from('user_profiles').insert({ user_id: userId, preferences: updated });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
