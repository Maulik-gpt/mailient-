"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { GmailInterfaceFixed } from '@/components/ui/gmail-interface-fixed';

export default function HomeFeed() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Check authentication and onboarding status
  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated" && session?.user?.email) {
      const checkOnboarding = async () => {
        try {
          const response = await fetch("/api/onboarding/status");
          if (response.ok) {
            const data = await response.json();
            if (!data.completed) {
              router.push("/onboarding");
            }
          }
        } catch (error) {
          console.error("Error checking onboarding status:", error);
        }
      };
      checkOnboarding();
    }
  }, [status, session, router]);

  // Set page title
  useEffect(() => {
    document.title = 'Mailient Sift AI - Bulk Email Processing';
  }, []);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  return (
    <div className="satoshi-home-feed w-full h-screen bg-black dark:bg-black">
      <GmailInterfaceFixed />
    </div>
  );
}

