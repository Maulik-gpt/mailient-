import { auth } from '@/lib/auth.js';
import { redirect } from 'next/navigation';
import { DatabaseService } from '@/lib/supabase.js';

// Server-side component that handles authentication
export default async function DashboardPage() {
  // Server-side authentication check
  const session = await auth();

  // If no session exists, redirect to home page
  if (!session) {
    redirect('/');
  }

  // Check onboarding status
  if (session.user?.email) {
    try {
      const db = new DatabaseService();
      const profile = await db.getUserProfile(session.user.email);

      // If onboarding is not completed, redirect to onboarding
      if (!profile || !profile.onboarding_completed) {
        redirect('/onboarding');
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      // On error, redirect to onboarding to be safe
      redirect('/onboarding');
    }
  }

  // If authenticated, render the dashboard content
  return (
    <div className="min-h-screen bg-black text-white flex" style={{ fontFamily: 'Satoshi, sans-serif' }}>
      <div className="flex-1 flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold mb-4">Dashboard</h1>
        <p className="text-gray-400 mb-8">Welcome to your Mailient dashboard!</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl">
          <div className="bg-[#1a1a1a] rounded-lg p-6 border border-[#2a2a2a] hover:border-[#525252] transition-colors">
            <h3 className="text-lg font-semibold mb-2">Email Management</h3>
            <p className="text-gray-400 mb-4">Manage your emails with AI-powered insights</p>
            <a href="/dashboard/agent-talk" className="inline-flex items-center px-4 py-2 bg-[#2a2a2a] text-white rounded-md hover:bg-[#525252] transition-colors">
              Go to Agent Talk
            </a>
          </div>
          <div className="bg-[#1a1a1a] rounded-lg p-6 border border-[#2a2a2a] hover:border-[#525252] transition-colors">
            <h3 className="text-lg font-semibold mb-2">Account</h3>
            <p className="text-gray-400 mb-4">Manage your profile and settings</p>
            <a href="/settings" className="inline-flex items-center px-4 py-2 bg-[#2a2a2a] text-white rounded-md hover:bg-[#525252] transition-colors">
              Go to Settings
            </a>
          </div>
        </div>
        <div className="mt-8">
          <a href="/api/auth/signout" className="inline-flex items-center px-4 py-2 border border-[#2a2a2a] text-gray-400 rounded-md hover:border-[#525252] hover:text-gray-300 transition-colors">
            Sign Out
          </a>
        </div>
      </div>
    </div>
  );
}
