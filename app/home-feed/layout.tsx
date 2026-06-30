import { requirePaidSubscription } from '@/lib/access-gate';

// Force per-request execution. Without this, Next.js may statically prerender
// the layout at build time, which would run the auth/subscription check ONCE
// (with no real user) and cache the result — letting everyone past. This makes
// the paywall run on every single request, for every user.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Server-side paywall for every route under /home-feed.
 * Runs BEFORE any client JavaScript — free/unauthenticated users are
 * redirected to /onboarding?step=13 at the server level and never see
 * the page source. Fails closed: any DB or auth error → redirect.
 */
export default async function HomeFeedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePaidSubscription();
  return <>{children}</>;
}
