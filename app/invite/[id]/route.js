import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

/**
 * /invite/<code> — the link people actually paste into WhatsApp.
 *
 * Two things changed from the original:
 *
 * 1. It used to redirect to `/`. Someone who clicked a friend's invite landed on
 *    the marketing homepage and had to find the signup button themselves — the
 *    highest-intent moment in the whole funnel, spent on a scroll. It now goes
 *    straight to signup with the offer carried through.
 *
 * 2. The cookie was httpOnly:false, so any page script could set its own
 *    referral code before signing up. Attribution is read server-side in the
 *    auth callback, so the browser never needs to see it.
 *
 * The code is deliberately NOT validated against the database here: a lookup on
 * every click turns this route into a free oracle for guessing valid codes. An
 * unknown code simply fails attribution later, silently, which is correct.
 */
export async function GET(request, { params }) {
  let code = '';
  try {
    const { id } = await params;
    // Codes are 6 chars from a fixed alphabet. Anything else is noise or an
    // injection attempt — drop it rather than store it.
    code = String(id || '').trim().toUpperCase().slice(0, 12);
    if (!/^[A-Z0-9]{4,12}$/.test(code)) code = '';

    if (code) {
      const cookieStore = await cookies();
      cookieStore.set('mailient_referral', code, {
        maxAge: 30 * 24 * 60 * 60, // 30 days — a friend rarely signs up the same hour
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        httpOnly: true,
      });
    }
  } catch (error) {
    console.error('[invite] failed to set referral cookie:', error?.message);
  }

  // redirect() throws internally, so it must sit OUTSIDE the try above —
  // inside, the catch would swallow it and the route would return nothing.
  redirect(code ? `/auth/signup?ref=${encodeURIComponent(code)}` : '/auth/signup');
}
