"use client";

import { useState, useEffect } from 'react';
import { HomeFeedSidebar } from '@/components/ui/home-feed-sidebar';
import { Bell, Check, Clock } from 'lucide-react';

export default function NotificationsPage() {
    useEffect(() => {
        document.title = 'Notifications / Mailient';
    }, []);

    const notifications = [
        { id: 1, title: 'New Login', message: 'New login detected from Chrome on Windows', time: '2m ago', read: false },
        { id: 2, title: 'Analysis Complete', message: 'Weekly email analysis is ready', time: '1h ago', read: false },
        { id: 3, title: 'Subscription', message: 'Your trial expires in 3 days', time: '1d ago', read: true },
    ];

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex" style={{ fontFamily: "'Satoshi', sans-serif" }}>
            <HomeFeedSidebar />
            <div className="flex-1 ml-64">
                <div className="max-w-4xl mx-auto px-8 py-10">
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="text-[#fafafa] text-2xl font-semibold">Notifications</h1>
                        <button className="text-neutral-400 hover:text-[#fafafa] text-sm transition-colors">
                            Mark all as read
                        </button>
                    </div>

                    <div className="space-y-4">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`p-4 rounded-xl border ${notification.read ? 'border-neutral-900 bg-neutral-900/20' : 'border-neutral-800 bg-neutral-900/50'} transition-all hover:border-neutral-700`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`p-2 rounded-full ${notification.read ? 'bg-neutral-800 text-neutral-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                        <Bell className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className={`font-medium ${notification.read ? 'text-neutral-400' : 'text-[#fafafa]'}`}>
                                                {notification.title}
                                            </h3>
                                            <span className="text-xs text-neutral-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {notification.time}
                                            </span>
                                        </div>
                                        <p className="text-sm text-neutral-500">{notification.message}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
