"use client";

import { useState, useEffect } from 'react';
import { HomeFeedSidebar } from '@/components/ui/home-feed-sidebar';
import { User, Lock, Bell, Shield } from 'lucide-react';

export default function SettingsPage() {
    useEffect(() => {
        document.title = 'Settings / Mailient';
    }, []);

    const [activeTab, setActiveTab] = useState('profile');

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'account', label: 'Account', icon: Lock },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'security', label: 'Security', icon: Shield },
    ];

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex" style={{ fontFamily: "'Satoshi', sans-serif" }}>
            <HomeFeedSidebar />
            <div className="flex-1 ml-16">
                <div className="max-w-5xl mx-auto px-8 py-10">
                    <h1 className="text-[#fafafa] text-2xl font-semibold mb-8">Settings</h1>

                    <div className="flex gap-8">
                        {/* Sidebar Navigation */}
                        <div className="w-64 flex-shrink-0 space-y-2">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                                                ? 'bg-neutral-900 text-[#fafafa]'
                                                : 'text-neutral-400 hover:text-[#fafafa] hover:bg-neutral-900/50'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 bg-neutral-900/30 border border-neutral-800/50 rounded-2xl p-8">
                            <h2 className="text-[#fafafa] text-lg font-medium mb-6 capitalize">{activeTab} Settings</h2>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm text-neutral-400">Display Name</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-xl px-4 py-2.5 text-[#fafafa] focus:outline-none focus:border-neutral-600 transition-colors"
                                        placeholder="Your Name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-neutral-400">Email Address</label>
                                    <input
                                        type="email"
                                        className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-xl px-4 py-2.5 text-[#fafafa] focus:outline-none focus:border-neutral-600 transition-colors"
                                        placeholder="your@email.com"
                                        disabled
                                    />
                                </div>
                                <div className="pt-4">
                                    <button className="bg-[#fafafa] text-black px-6 py-2.5 rounded-xl font-medium hover:bg-neutral-200 transition-colors">
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
