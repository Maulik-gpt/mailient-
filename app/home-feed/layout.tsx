import { requirePaidSubscription } from '@/lib/access-gate';

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
