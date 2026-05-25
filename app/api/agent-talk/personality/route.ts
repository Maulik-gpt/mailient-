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
    return NextResponse.json({
      personality: (prefs.arcus_personality as string) || '',
      instructionsEnabled: prefs.arcus_instructions_enabled !== false,
      memoryEnabled: prefs.arcus_memory_enabled !== false,
    });
  } catch {
    return NextResponse.json({ personality: '', instructionsEnabled: true, memoryEnabled: true });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.email.toLowerCase();

  let personality = '';
  let instructionsEnabled: boolean | undefined;
  try {
    const body = await request.json();
    personality = (body.personality as string) || '';
    if (typeof body.instructionsEnabled === 'boolean') {
      instructionsEnabled = body.instructionsEnabled;
    }
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
    const updatedPrefs: Record<string, unknown> = { ...existingPrefs, arcus_personality: personality };
    if (instructionsEnabled !== undefined) {
      updatedPrefs.arcus_instructions_enabled = instructionsEnabled;
    }

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
