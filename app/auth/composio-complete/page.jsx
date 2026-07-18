'use client';

/**
 * Composio-login completer. The callback route resolved the identity + wrote
 * the Gmail marker row, then bounced here with ?accountId=. NextAuth Credentials
 * providers must be triggered client-side, so this tiny page calls
 * signIn('composio-login', { accountId }) — the provider re-verifies the
 * identity server-side and mints the session, then we land on onboarding.
 */

import { Suspense, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

function Completer() {
  const params = useSearchParams();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    const accountId = params.get('accountId');
    if (!accountId) {
      window.location.href = '/auth/signin?error=composio_login_no_account';
      return;
    }
    signIn('composio-login', { accountId, callbackUrl: '/onboarding', redirect: true }).catch(() => {
      window.location.href = '/auth/signin?error=composio_login_signin';
    });
  }, [params]);

  return (
    <div className="min-h-screen bg-arcus-bg flex flex-col items-center justify-center gap-5">
      <div className="relative">
        <div className="w-12 h-12 border-2 border-neutral-200 dark:border-white/10 rounded-full" />
        <div className="absolute inset-0 w-12 h-12 border-t-2 border-black dark:border-white rounded-full animate-spin" />
      </div>
      <p className="text-[14px] text-black/60 dark:text-white/60">Finishing sign-in…</p>
    </div>
  );
}

export default function ComposioCompletePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-arcus-bg" />}>
      <Completer />
    </Suspense>
  );
}
