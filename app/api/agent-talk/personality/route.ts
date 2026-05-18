import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../lib/auth.js';

export const dynamic = 'force-dynamic';

async function getSupabase() {
  const { getSupabaseAdmin } = await import('../../../../lib/supabase.js');
  return getSupabaseAdmin();
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.email.toLowerCase();

  try {
    const supabase = await getSupabase();
    const { data } = await supabase
      .from('user_profiles')
      .select('preferences')
      .ilike('user_id', userId)
      .maybeSingle();

    const prefs = (data?.preferences as Record<string, unknown>) || {};
    return NextResponse.json({ personality: (prefs.arcus_personality as string) || '' });
  } catch {
    return NextResponse.json({ personality: '' });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.email.toLowerCase();

  let personality = '';
  try {
    const body = await request.json();
    personality = (body.personality as string) || '';
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const supabase = await getSupabase();

    // Fetch existing preferences to merge (don't overwrite other pref keys)
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('preferences')
      .ilike('user_id', userId)
      .maybeSingle();

    const existingPrefs = (existing?.preferences as Record<string, unknown>) || {};
    const updatedPrefs = { ...existingPrefs, arcus_personality: personality };

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

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
