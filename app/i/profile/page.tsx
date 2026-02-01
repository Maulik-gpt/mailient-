'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    Calendar,
    MapPin,
    Link as LinkIcon,
    Twitter,
    Instagram,
    Linkedin,
    Github,
    Mail,
    Sparkles,
    ChevronRight,
    Users,
    MessageCircle,
    Activity,
    Loader2,
    ArrowLeft,
    Clock,
    Zap,
    Trophy,
    TrendingUp
} from 'lucide-react';
import { HomeFeedSidebar } from '@/components/ui/home-feed-sidebar';
import { motion } from 'framer-motion';

export default function UserProfilePage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('insights');

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch('/api/profile');
                if (response.ok) {
                    const data = await response.json();
                    setProfile(data);
                }
            } catch (error) {
                console.error("Error fetching profile:", error);
            } finally {
                setLoading(false);
            }
        };

        if (status === 'authenticated') {
            fetchProfile();
        } else if (status === 'unauthenticated') {
            router.push('/auth/signin');
        }
    }, [status, router]);

    if (loading || status === 'loading') {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
            </div>
        );
    }

    const formatDate = (dateString: string) => {
        if (!dateString) return 'Member';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    const tabs = [
        { id: 'insights', label: 'Insights', icon: Sparkles },
        { id: 'activity', label: 'Activity', icon: Activity },
        { id: 'network', label: 'Network', icon: Users },
        { id: 'more', label: 'More', icon: ChevronRight },
    ];

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-white selection:text-black" style={{ fontFamily: "'Satoshi', sans-serif" }}>
            {/* Background Mesh */}
            <div className="fixed inset-0 pointer-events-none opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
            </div>

            <HomeFeedSidebar />

            <div className="ml-16 min-h-screen relative z-10">
                {/* Top Nav */}
                <div className="sticky top-0 z-50 bg-[#050505]/60 backdrop-blur-xl border-b border-white/5 px-8 h-16 flex items-center gap-6">
                    <button onClick={() => router.back()} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold tracking-tight leading-none">{profile?.name || session?.user?.name}</h1>
                        <p className="text-[11px] text-white/40 font-medium uppercase tracking-widest mt-1">Verified Account</p>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto pb-20">
                    {/* Header Card */}
                    <div className="relative">
                        {/* Banner */}
                        <div className="h-60 w-full overflow-hidden bg-neutral-900 border-b border-white/5">
                            {profile?.banner_url ? (
                                <img src={profile.banner_url} alt="Banner" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-black flex items-center justify-center">
                                    <div className="text-white/[0.02] text-[10rem] font-black italic select-none tracking-tighter">MAILIENT</div>
                                </div>
                            )}
                        </div>

                        {/* Profile Info Section */}
                        <div className="px-8 pt-4 relative">
                            {/* Avatar */}
                            <div className="absolute -top-20 left-8">
                                <div className="p-1 rounded-full bg-[#050505]">
                                    <div className="w-36 h-36 rounded-full border-4 border-[#050505] bg-neutral-900 overflow-hidden shadow-2xl ring-1 ring-white/10">
                                        <img
                                            src={profile?.avatar_url || session?.user?.image || ''}
                                            alt="Avatar"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 gap-3">
                                <button
                                    onClick={() => router.push('/settings')}
                                    className="px-6 py-2 rounded-full border border-white/10 hover:bg-white/5 font-bold text-sm transition-all active:scale-95"
                                >
                                    Edit Profile
                                </button>
                                <button className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all">
                                    <MessageCircle className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Text Info */}
                            <div className="mt-8 space-y-4">
                                <div>
                                    <h2 className="text-3xl font-black tracking-tight flex items-center gap-2">
                                        {profile?.name || session?.user?.name}
                                        <Sparkles className="w-6 h-6 text-amber-400 fill-amber-400" />
                                    </h2>
                                    <p className="text-white/40 font-medium tracking-tight mt-0.5">@{profile?.username || (session?.user?.email?.split('@')[0])}</p>
                                </div>

                                {profile?.bio && (
                                    <p className="text-base text-white/80 leading-relaxed max-w-2xl font-medium">
                                        {profile.bio}
                                    </p>
                                )}

                                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/40 font-medium tracking-tight">
                                    {profile?.location && (
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="w-4 h-4" />
                                            {profile.location}
                                        </div>
                                    )}
                                    {profile?.website && (
                                        <div className="flex items-center gap-1.5 text-blue-400 hover:underline cursor-pointer">
                                            <LinkIcon className="w-4 h-4" />
                                            {profile.website}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="w-4 h-4" />
                                        Joined {formatDate(profile?.created_at)}
                                    </div>
                                </div>

                                <div className="flex gap-6 pt-2">
                                    <div className="flex items-center gap-1 text-sm">
                                        <span className="font-bold text-white">420</span>
                                        <span className="text-white/40 font-medium">Network</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-sm">
                                        <span className="font-bold text-white">1.2k</span>
                                        <span className="text-white/40 font-medium">Signals</span>
                                    </div>
                                </div>

                                {/* Social Links */}
                                <div className="flex gap-3 pt-4">
                                    {profile?.preferences?.social_links?.twitter && (
                                        <a href={profile.preferences.social_links.twitter} target="_blank" className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/10 transition-all text-white/60 hover:text-white">
                                            <Twitter className="w-5 h-5" />
                                        </a>
                                    )}
                                    {profile?.preferences?.social_links?.instagram && (
                                        <a href={profile.preferences.social_links.instagram} target="_blank" className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/10 transition-all text-white/60 hover:text-white">
                                            <Instagram className="w-5 h-5" />
                                        </a>
                                    )}
                                    {profile?.preferences?.social_links?.linkedin && (
                                        <a href={profile.preferences.social_links.linkedin} target="_blank" className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/10 transition-all text-white/60 hover:text-white">
                                            <Linkedin className="w-5 h-5" />
                                        </a>
                                    )}
                                    {profile?.preferences?.social_links?.github && (
                                        <a href={profile.preferences.social_links.github} target="_blank" className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/10 transition-all text-white/60 hover:text-white">
                                            <Github className="w-5 h-5" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="flex border-b border-white/5 mt-10 px-4">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex-1 flex flex-col items-center gap-2 py-4 relative group`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-white/40 group-hover:text-white/60'} transition-colors`} />
                                            <span className={`text-sm font-bold ${isActive ? 'text-white' : 'text-white/40 group-hover:text-white/60'} transition-colors`}>
                                                {tab.label}
                                            </span>
                                        </div>
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeProfileTab"
                                                className="absolute bottom-0 left-0 right-0 h-1 bg-white rounded-t-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Tab Content */}
                        <div className="p-8">
                            {activeTab === 'insights' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                                                    <TrendingUp className="w-4 h-4 text-green-400" />
                                                </div>
                                                <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Growth Analytics</span>
                                            </div>
                                            <span className="text-green-400 text-sm font-bold">+12%</span>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-2xl font-black">94.2%</p>
                                            <p className="text-xs text-white/20 font-medium">Efficiency score across all connected channels</p>
                                        </div>
                                    </div>
                                    <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                                    <Zap className="w-4 h-4 text-blue-400" />
                                                </div>
                                                <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Active Velocity</span>
                                            </div>
                                            <span className="text-blue-400 text-sm font-bold">Fast</span>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-2xl font-black">Medium</p>
                                            <p className="text-xs text-white/20 font-medium">Current interaction frequency in the last 7 days</p>
                                        </div>
                                    </div>
                                    <div className="md:col-span-2 p-8 rounded-[32px] bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5">
                                        <div className="flex items-center gap-3 mb-6">
                                            <Trophy className="w-6 h-6 text-amber-500" />
                                            <div>
                                                <h3 className="text-lg font-bold">Signal Excellence</h3>
                                                <p className="text-xs text-white/30">Achieved for superior AI-driven communication</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {['Top Communicator', 'AI Power User', 'Identity Verified', 'Founder'].map((badge) => (
                                                <span key={badge} className="px-4 py-1.5 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold text-white/40">
                                                    {badge}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {activeTab === 'activity' && (
                                <div className="space-y-6">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex gap-4 p-4 rounded-2xl hover:bg-white/[0.02] transition-colors group">
                                            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                                                <Clock className="w-4 h-4 text-white/30" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm">
                                                    <span className="font-bold">You</span> processed <span className="text-blue-400">42 signals</span> using Arcus AI
                                                </p>
                                                <p className="text-xs text-white/20">{i} hours ago • Home Feed</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {activeTab === 'network' && (
                                <div className="grid grid-cols-2 gap-4">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div key={i} className="p-4 rounded-2xl border border-white/5 bg-white/[0.01] flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-neutral-800" />
                                            <div>
                                                <p className="text-sm font-bold">Contact Name {i}</p>
                                                <p className="text-[10px] text-white/20 uppercase font-bold tracking-tight">Active Relationship</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
