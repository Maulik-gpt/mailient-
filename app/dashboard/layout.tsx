import { auth } from '@/lib/auth.js';
import { redirect } from 'next/navigation';
import { DashboardSettingsProvider } from '@/lib/DashboardSettingsContext';

export const metadata = {
  title: 'Arcus | Mailient',
  description: 'Chat with your AI email agent for email agentic performance.',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardSettingsProvider>
      <div className="min-h-screen">
        {children}
      </div>
    </DashboardSettingsProvider>
  );
}
