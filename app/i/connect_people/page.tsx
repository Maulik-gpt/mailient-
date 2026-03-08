"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Settings } from 'lucide-react';
import { HomeFeedSidebar } from '@/components/ui/home-feed-sidebar';
import { MightConnectWith } from '@/components/ui/might-connect-with';

export default function ConnectPeoplePage() {
  const router = useRouter();

  // Set page title
  useEffect(() => {
    document.title = 'Connect / Mailient';
  }, []);

  // Extended profile suggestions for the full page
  const suggestedProfiles = [
    {
      id: '1',
      name: 'Ryan Hoover',
      username: 'rrhoover',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ryan',
      isVerified: true,
    },
    {
      id: '2',
      name: 'Jacky',
      username: 'imbktan',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jacky',
      isVerified: true,
    },
    {
      id: '3',
      name: 'Jon Yongfook',
      username: 'yongfook',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jon',
      isVerified: true,
    },
    {
      id: '4',
      name: 'QuakeyArT',
      username: 'quakey007',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=quakey',
      bio: 'QUAKEY is a next-gen meme coin blending fun with real-world utility. Backed by BlockQuake, it powers merch, gaming, n a thriving community, offering credibility',
    },
    {
      id: '5',
      name: 'decapitare',
      username: 'decapitare1488',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=decapitare',
      bio: 'Unvaxed, Pureblood Ethnic-European fighting to secure a future for the white race or die trying. Victory or Valhalla!',
    },
    {
      id: '6',
      name: 'Chris Ikeri',
      username: 'Chrismercy2003',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=chris',
      bio: 'The Joy of the Living Christ is my Strength. Hence, the Glory of God is People Fully Alive; and For this We must Work.',
    },
    {
      id: '7',
      name: 'Damon Chen',
      username: 'damengchen',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=damon',
      bio: 'Founder of Testimonial.to and PDF.ai',
      isVerified: true,
    },
    {
      id: '8',
      name: 'Danny Postma',
      username: 'dannypostmaa',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=danny',
      isVerified: true,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex" style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Sidebar */}
      <HomeFeedSidebar />

      {/* Main Content */}
      <div className="flex-1 ml-16">
        {/* Header Bar */}
        <div className="w-full bg-[#0a0a0a] py-4 px-8 border-b border-neutral-800/50 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-neutral-900 rounded-full transition-all duration-200 text-neutral-400 hover:text-[#fafafa]"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
              </button>
              <h1 className="text-[#fafafa] text-xl font-medium">Connect</h1>
            </div>
            <button
              className="p-2 hover:bg-neutral-900 rounded-full transition-all duration-200 text-neutral-400 hover:text-[#fafafa]"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="max-w-2xl mx-auto py-8 px-8">
          <div className="mb-6">
            <h2 className="text-[#fafafa] text-lg font-medium mb-1">Suggested for you</h2>
            <p className="text-neutral-500 text-sm font-light">People you might want to connect with based on your interests.</p>
          </div>

          {/* Profile Suggestions */}
          <div className="space-y-0">
            <MightConnectWith profiles={suggestedProfiles} compact={false} />
          </div>
        </div>
      </div>
    </div>
  );
}
