import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DatabaseService } from '@/lib/supabase';

// Server-side component that handles authentication
export default async function DashboardPage() {
  // Server-side authentication check
  const session = await auth();

  // If no session exists, redirect to home page
  if (!session) {
    redirect('/');
  }

  // Check onboarding status
  let profile = null;
  if (session.user?.email) {
    try {
      const db = new DatabaseService();
      profile = await db.getUserProfile(session.user.email);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      // Fallback to null profile
    }
  }

  // If onboarding is not completed, redirect to onboarding
  if (!profile || !profile.onboarding_completed) {
    redirect('/onboarding');
  }

  // If authenticated and onboarded, redirect to the main home feed
  // which is the unified interface for the application
  redirect('/home-feed');
}

