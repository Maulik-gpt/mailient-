import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isOwnerEmail } from '@/lib/subscription-service';

/**
 * Server-side paywall gate. Call from Server Components / layouts.
 * Redirects to /auth/signin if unauthenticated, /onboarding?step=13 if unpaid.
 * Fails CLOSED: any error → redirect to paywall.
 */
export async function requirePaidSubscription() {
  let session: any;
  try {
    // @ts-ignore — auth() is the NextAuth v5 server helper
    session = await auth();
  } catch {
    redirect('/auth/signin');
  }

  if (!session?.user?.email) {
    redirect('/auth/signin');
  }

  const userEmail = session.user.email.toLowerCase();

  // Owner emails always have Pro access — no DB round-trip needed.
  if (isOwnerEmail(userEmail)) return true;

  try {
    const supabase = getSupabaseAdmin();

    const { data: rows, error } = await supabase
      .from('user_subscriptions')
      .select('status, plan_type, subscription_ends_at')
      .ilike('user_id', userEmail)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    const sub = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    if (!sub) {
      redirect('/onboarding?step=13');
    }

    const now = new Date();
    const endDate = sub.subscription_ends_at ? new Date(sub.subscription_ends_at) : null;
    const notExpired = !endDate || endDate > now;

    // Valid statuses: active, trialing, or cancelled-but-still-in-paid-period
    const validStatus = sub.status === 'active' || sub.status === 'trialing' ||
      (sub.status === 'cancelled' && notExpired);

    const isPaid = validStatus &&
      sub.plan_type &&
      sub.plan_type !== 'free' &&
      sub.plan_type !== 'none' &&
      notExpired;

    if (!isPaid) {
      redirect('/onboarding?step=13');
    }

    return true;
  } catch (err: any) {
    // If this IS a Next.js redirect, re-throw it so Next.js handles it.
    if (err?.digest?.startsWith?.('NEXT_REDIRECT')) throw err;
    console.error('[AccessGate] DB error — failing closed:', err?.message);
    redirect('/onboarding?step=13');
  }
}
