import React from 'react';
import { HomeFeedSidebar } from '@/components/ui/home-feed-sidebar';

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-[#F9F8F6] dark:bg-[#0c0c0c] flex overflow-hidden">
            <HomeFeedSidebar />
            <div className="flex-1 p-10 md:p-20 overflow-y-auto">
                <div className="max-w-4xl mx-auto bg-white dark:bg-[#111111] rounded-[2.5rem] p-10 md:p-16 shadow-xl border border-neutral-200 dark:border-white/5">
                    <h1 className="text-4xl font-bold text-black dark:text-white mb-8">Privacy Policy</h1>
                    <div className="prose dark:prose-invert max-w-none space-y-6 text-neutral-600 dark:text-neutral-400">
                        <p>Last updated: April 11, 2026</p>
                        <p>Welcome to Mailient. Your privacy is critically important to us.</p>
                        <section>
                            <h2 className="text-2xl font-bold text-black dark:text-white mt-8 mb-4">1. Information We Collect</h2>
                            <p>We only collect information about you if we have a reason to do so—for example, to provide our services, to communicate with you, or to make our services better.</p>
                        </section>
                        <section>
                            <h2 className="text-2xl font-bold text-black dark:text-white mt-8 mb-4">2. Access to Your Data</h2>
                            <p>Mailient utilizes Arcus AI to analyze your emails and provide intelligent insights. All data processing is performed securely and your raw email content is never stored permanently on our servers beyond what is necessary for immediate analysis.</p>
                        </section>
                        <section>
                            <h2 className="text-2xl font-bold text-black dark:text-white mt-8 mb-4">3. Security</h2>
                            <p>We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable.</p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
