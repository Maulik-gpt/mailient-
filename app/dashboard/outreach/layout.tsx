'use client';

import { UnifiedSidebar } from '@/components/ui/unified-sidebar';

export default function OutreachLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-black overflow-hidden">
            {/* Sidebar */}
            <UnifiedSidebar variant="settings" showUniversalNav={true} activeItem="outreach" />

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto ml-20">
                {children}
            </main>
        </div>
    );
}
