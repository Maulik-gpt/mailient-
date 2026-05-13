/**
 * Arcus V3 — Preferences API
 * POST /api/arcus/v3/preferences
 *
 * Updates user preferences in their profile.
 */

import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import { auth } from '../../../../../lib/auth.js';
import { getSupabaseAdmin } from '../../../../../lib/supabase.js';

export async function POST(request: NextRequest) {
  try {
    const session = await (auth as any)();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.email.toLowerCase();
    const { preferences } = await request.json();

    const supabase = getSupabaseAdmin();
    
    // Fetch existing profile to merge preferences
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('preferences')
      .eq('user_id', userId)
      .single();

    const mergedPreferences = {
      ...(profile?.preferences as object || {}),
      ...preferences,
    };

    const { error } = await supabase
      .from('user_profiles')
      .update({ preferences: mergedPreferences })
      .eq('user_id', userId);

    if (error) throw error;

    return NextResponse.json({ status: 'updated' });
  } catch (error) {
    console.error('[Arcus V3] Preferences API error:', (error as Error).message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
