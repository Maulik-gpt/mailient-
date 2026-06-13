import { NextResponse } from 'next/server';
// @ts-ignore
import { auth } from '@/lib/auth';
// @ts-ignore
import { DatabaseService } from '@/lib/supabase';

/**
 * Onboarding state — per-step persistence so the flow resumes exactly where the
 * user left off, on any device, after a refresh. Each step commits as it
 * happens (not batched at the end). Stored under preferences.onboarding.
 *
 *   GET  → { step, state }            resume payload
 *   POST → { step?, patch? }          merge patch into preferences.onboarding,
 *                                      optionally advance the saved step
 */

async function getProfile(db: any, userId: string) {
  return db.getUserProfile(userId);
}

export async function GET() {
  try {
    // @ts-ignore
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ step: 0, state: {} }, { status: 200 });
    }
    const userId = session.user.email.toLowerCase();
    const db = new DatabaseService(true);
    const profile = await getProfile(db, userId);
    const prefs = profile?.preferences || {};
    return NextResponse.json({
      step: prefs.last_onboarding_step ?? 0,
      completed: !!profile?.onboarding_completed,
      state: prefs.onboarding || {},
    });
  } catch (error) {
    console.error('Error reading onboarding state:', error);
    return NextResponse.json({ step: 0, state: {} }, { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    // @ts-ignore
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.email.toLowerCase();

    const body = await request.json().catch(() => ({}));
    const { step, patch } = body || {};

    const db = new DatabaseService(true);
    const profile = await getProfile(db, userId);
    const preferences = profile?.preferences || {};

    if (typeof step === 'number') preferences.last_onboarding_step = step;
    if (patch && typeof patch === 'object') {
      preferences.onboarding = { ...(preferences.onboarding || {}), ...patch };
    }

    const { error } = await db.supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        email: userId,
        preferences,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('Error saving onboarding state:', error);
      return NextResponse.json({ error: 'Failed to save state' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in onboarding state API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
