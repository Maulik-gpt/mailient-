import { auth } from '@/lib/auth.js';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Arcus | Mailient',
  description: 'Chat with your AI email agent for email agentic performance.',
};

// This layout wraps ALL dashboard routes but doesn't enforce authentication
// Authentication is enforced in the specific pages that need it
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
