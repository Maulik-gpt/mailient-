'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
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
    TrendingUp,
    Camera,
    Check,
    X as CloseIcon,
    Globe,
    Plus,
    UserCircle,
    Shield,
    Pencil
} from 'lucide-react';
import { HomeFeedSidebar } from '@/components/ui/home-feed-sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

function ProfileContent() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('insights');
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    // Edit form states
    const [editForm, setEditForm] = useState({
        name: '',
        username: '',
        bio: '',
        location: '',
        website: '',
        avatar_url: '',
        banner_url: '',
        socials: {
            twitter: '',
            instagram: '',
            linkedin: '',
            github: ''
        }
    });

    const fetchProfile = async () => {
        try {
            const response = await fetch('/api/profile');
            if (response.ok) {
                const data = await response.json();
                setProfile(data);
                setEditForm({
                    name: data.name || '',
                    username: data.username || '',
                    bio: data.bio || '',
                    location: data.location || '',
                    website: data.website || '',
                    avatar_url: data.avatar_url || '',
                    banner_url: data.banner_url || '',
                    socials: {
                        twitter: data.preferences?.social_links?.twitter || '',
                        instagram: data.preferences?.social_links?.instagram || '',
                        linkedin: data.preferences?.social_links?.linkedin || '',
                        github: data.preferences?.social_links?.github || ''
                    }
                });
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const searchParams = useSearchParams();

    useEffect(() => {
        if (status === 'authenticated') {
            fetchProfile();
            if (searchParams.get('edit') === 'true') {
                setIsEditing(true);
            }
        } else if (status === 'unauthenticated') {
            router.push('/auth/signin');
        }
    }, [status, router, searchParams]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editForm.name,
                    username: editForm.username,
                    bio: editForm.bio,
                    location: editForm.location,
                    website: editForm.website,
                    avatar_url: editForm.avatar_url,
                    banner_url: editForm.banner_url,
                    preferences: {
                        ...profile?.preferences,
                        social_links: editForm.socials
                    }
                })
            });

            if (response.ok) {
                await fetchProfile();
                setIsEditing(false);
                toast.success('Profile updated successfully');
            } else {
                toast.error('Failed to update profile');
            }
        } catch (error) {
            toast.error('An error occurred');
        } finally {
            setSaving(false);
        }
    };

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
        { id: 'posts', label: 'Posts' },
        { id: 'replies', label: 'Replies' },
        { id: 'highlights', label: 'Highlights' },
        { id: 'media', label: 'Media' },
        { id: 'likes', label: 'Likes' },
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
                {/* Header/Top Nav */}
                <div className="sticky top-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/10 px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button onClick={() => router.back()} className="p-2 hover:bg-neutral-800 rounded-full transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">{profile?.name || session?.user?.name}</h1>
                            <p className="text-xs text-neutral-500">Posts</p>
                        </div>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto pb-20">
                    {/* Header Section */}
                    <div className="relative">
                        {/* Banner */}
                        <div className="h-52 w-full overflow-hidden bg-neutral-900 rounded-3xl mt-4">
                            {profile?.banner_url ? (
                                <img src={profile.banner_url} alt="Banner" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-black" />
                            )}
                        </div>

                        {/* Profile Info Section */}
                        <div className="px-5 relative">
                            {/* Avatar */}
                            <div className="absolute -top-[75px] left-5">
                                <div className="p-1 rounded-full bg-black">
                                    <div className="w-[140px] h-[140px] rounded-full border-4 border-black bg-neutral-900 overflow-hidden shadow-xl">
                                        <img
                                            src={profile?.avatar_url || session?.user?.image || ''}
                                            alt="Avatar"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between pt-4 items-start">
                                <div className="mt-16">
                                    <div className="flex items-center gap-4">
                                        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                                            {profile?.name || session?.user?.name} ✨
                                        </h2>
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="px-4 py-2 rounded-xl bg-white text-black hover:bg-neutral-200 transition-all text-sm font-semibold flex items-center gap-2"
                                        >
                                            <Pencil className="w-4 h-4" />
                                            Edit Profile
                                        </button>
                                    </div>
                                    <p className="text-neutral-500 text-lg mt-0.5">@{profile?.username || (session?.user?.email?.split('@')[0])}</p>
                                </div>
                            </div>

                            {/* Bio and metadata */}
                            <div className="mt-4 space-y-3">
                                <p className="text-base text-neutral-200 leading-normal max-w-2xl">
                                    {profile?.bio || "No bio yet."}
                                </p>

                                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-neutral-500">
                                    {profile?.location && (
                                        <div className="flex items-center gap-1">
                                            <MapPin className="w-4 h-4" />
                                            {profile.location}
                                        </div>
                                    )}
                                    {profile?.website && (
                                        <a href={profile.website} target="_blank" className="flex items-center gap-1 text-blue-400 hover:underline">
                                            <LinkIcon className="w-4 h-4" />
                                            {profile.website.replace(/^https?:\/\//, '')}
                                        </a>
                                    )}
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        Joined {formatDate(profile?.created_at).replace('Since ', '')}
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-1">
                                    <div className="flex items-center gap-1 text-sm">
                                        <span className="font-bold text-white">4</span>
                                        <span className="text-neutral-500">followers</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-sm">
                                        <span className="font-bold text-white">3</span>
                                        <span className="text-neutral-500">following</span>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-2">
                                    {editForm.socials.twitter && (
                                        <a href={`https://x.com/${editForm.socials.twitter}`} target="_blank" className="text-white hover:opacity-70 transition-opacity">
                                            <Twitter className="w-5 h-5" />
                                        </a>
                                    )}
                                    {editForm.socials.instagram && (
                                        <a href={`https://instagram.com/${editForm.socials.instagram}`} target="_blank" className="text-white hover:opacity-70 transition-opacity">
                                            <Instagram className="w-5 h-5" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-white/10 mt-4 overflow-x-auto no-scrollbar">
                            {tabs.map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`px-8 py-4 relative group shrink-0`}
                                    >
                                        <span className={`text-sm ${isActive ? 'text-white font-medium' : 'text-neutral-500 hover:text-neutral-300'} transition-colors`}>
                                            {tab.label}
                                        </span>
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeProfileTab"
                                                className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-500 rounded-full"
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Content Area */}
                        <div className="p-10">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {activeTab === 'insights' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="p-8 rounded-[40px] bg-white/[0.02] border border-white/5 space-y-6 hover:bg-white/[0.04] transition-all group">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-2xl bg-green-500/10 flex items-center justify-center">
                                                            <TrendingUp className="w-5 h-5 text-green-400" />
                                                        </div>
                                                        <span className="text-[11px] font-black text-white/40 uppercase tracking-widest">Growth Analytics</span>
                                                    </div>
                                                    <span className="text-green-400 text-sm font-black">+12%</span>
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="text-4xl font-black tracking-tighter group-hover:scale-105 origin-left transition-transform">94.2%</p>
                                                    <p className="text-xs text-white/20 font-bold uppercase tracking-wider">Efficiency score across channels</p>
                                                </div>
                                            </div>
                                            <div className="p-8 rounded-[40px] bg-white/[0.02] border border-white/5 space-y-6 hover:bg-white/[0.04] transition-all group">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                                                            <Zap className="w-5 h-5 text-blue-400" />
                                                        </div>
                                                        <span className="text-[11px] font-black text-white/40 uppercase tracking-widest">Active Velocity</span>
                                                    </div>
                                                    <span className="text-blue-400 text-sm font-black">FAST</span>
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="text-4xl font-black tracking-tighter group-hover:scale-105 origin-left transition-transform">MEDIUM</p>
                                                    <p className="text-xs text-white/20 font-bold uppercase tracking-wider">Interaction frequency (7D)</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {activeTab === 'activity' && (
                                        <div className="space-y-8">
                                            {[1, 2, 3].map((i) => (
                                                <div key={i} className="flex gap-6 p-8 rounded-[32px] hover:bg-white/[0.02] transition-colors group border border-transparent hover:border-white/5">
                                                    <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                                        <Clock className="w-6 h-6 text-white/20" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <p className="text-lg font-medium leading-tight">
                                                            <span className="font-black">Identity</span> processed <span className="text-blue-400 font-black">42 new signals</span> via Arcus
                                                        </p>
                                                        <p className="text-xs text-white/20 font-bold uppercase tracking-widest">{i * 2} hours ago • System Protocol</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {activeTab === 'network' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {[1, 2, 3, 4].map((i) => (
                                                <div key={i} className="p-6 rounded-3xl border border-white/5 bg-white/[0.01] flex items-center gap-6 hover:bg-white/[0.03] transition-all group">
                                                    <div className="w-16 h-16 rounded-2xl bg-neutral-800 shrink-0 group-hover:rotate-6 transition-transform" />
                                                    <div>
                                                        <p className="text-lg font-black tracking-tight">System Node {i}</p>
                                                        <p className="text-[10px] text-white/20 uppercase font-black tracking-widest mt-1">High Interaction</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Profile Modal */}
            <AnimatePresence>
                {isEditing && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsEditing(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-xl max-h-[90vh] overflow-hidden bg-black border border-white/10 rounded-2xl shadow-2xl flex flex-col"
                        >
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-white/10 flex items-center gap-6 bg-black">
                                <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-neutral-800 rounded-full transition-colors">
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <h2 className="text-xl font-bold">Edit Profile</h2>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                                {/* Avatar Section */}
                                <div className="flex items-center gap-6">
                                    <div className="relative group">
                                        <div className="w-24 h-24 rounded-full bg-neutral-900 border border-white/10 overflow-hidden">
                                            <img
                                                src={editForm.avatar_url || profile?.avatar_url || session?.user?.image || ''}
                                                alt="Avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <button
                                            onClick={() => {
                                                const url = prompt("Enter Profile Photo URL:", editForm.avatar_url);
                                                if (url !== null) setEditForm(prev => ({ ...prev, avatar_url: url }));
                                            }}
                                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                                        >
                                            <Camera className="w-6 h-6 text-white" />
                                        </button>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-neutral-400">Recommended size:</p>
                                        <p className="text-sm text-neutral-400">400x400px</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-neutral-300">Full name <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            value={editForm.name}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                            className="w-full h-11 bg-black border border-white/10 rounded-xl px-4 text-neutral-200 text-sm focus:outline-none focus:border-white/30 transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-neutral-300">Username <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            value={editForm.username}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                                            className="w-full h-11 bg-black border border-white/10 rounded-xl px-4 text-neutral-200 text-sm focus:outline-none focus:border-white/30 transition-colors"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-medium text-neutral-300">Brief bio</label>
                                        <span className="text-xs text-neutral-500">{editForm.bio.length}/120</span>
                                    </div>
                                    <textarea
                                        value={editForm.bio}
                                        maxLength={120}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                                        className="w-full h-24 bg-black border border-white/10 rounded-xl p-4 text-neutral-200 text-sm resize-none focus:outline-none focus:border-white/30 transition-colors"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-neutral-300">Location</label>
                                        <input
                                            type="text"
                                            value={editForm.location}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                                            className="w-full h-11 bg-black border border-white/10 rounded-xl px-4 text-neutral-200 text-sm focus:outline-none focus:border-white/30 transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-neutral-300">Website</label>
                                        <input
                                            type="text"
                                            value={editForm.website}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, website: e.target.value }))}
                                            className="w-full h-11 bg-black border border-white/10 rounded-xl px-4 text-neutral-200 text-sm focus:outline-none focus:border-white/30 transition-colors"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 space-y-4">
                                    <p className="text-sm text-neutral-400">Note: You only need to add your <span className="font-bold">username</span>.</p>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                                                <Twitter className="w-4 h-4 text-white" />
                                                <span className="text-sm text-neutral-500">x.com/</span>
                                            </div>
                                            <input
                                                type="text"
                                                value={editForm.socials.twitter}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, socials: { ...prev.socials, twitter: e.target.value } }))}
                                                className="w-full h-11 bg-black border border-white/10 rounded-xl pl-[74px] pr-4 text-neutral-200 text-sm focus:outline-none focus:border-white/30 transition-colors"
                                            />
                                        </div>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                                                <Linkedin className="w-4 h-4 text-[#0077b5]" />
                                                <span className="text-sm text-neutral-500">linkedin.com/in/</span>
                                            </div>
                                            <input
                                                type="text"
                                                value={editForm.socials.linkedin}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, socials: { ...prev.socials, linkedin: e.target.value } }))}
                                                className="w-full h-11 bg-black border border-white/10 rounded-xl pl-[124px] pr-4 text-neutral-200 text-sm focus:outline-none focus:border-white/30 transition-colors"
                                            />
                                        </div>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                                                <Instagram className="w-4 h-4 text-[#e4405f]" />
                                                <span className="text-sm text-neutral-500">instagram.com/</span>
                                            </div>
                                            <input
                                                type="text"
                                                value={editForm.socials.instagram}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, socials: { ...prev.socials, instagram: e.target.value } }))}
                                                className="w-full h-11 bg-black border border-white/10 rounded-xl pl-[124px] pr-4 text-neutral-200 text-sm focus:outline-none focus:border-white/30 transition-colors"
                                            />
                                        </div>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                                                <Github className="w-4 h-4 text-white" />
                                                <span className="text-sm text-neutral-500">github.com/</span>
                                            </div>
                                            <input
                                                type="text"
                                                value={editForm.socials.github}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, socials: { ...prev.socials, github: e.target.value } }))}
                                                className="w-full h-11 bg-black border border-white/10 rounded-xl pl-[104px] pr-4 text-neutral-200 text-sm focus:outline-none focus:border-white/30 transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3 bg-black">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-6 py-2 rounded-full border border-white/20 hover:bg-white/5 transition-colors text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-6 py-2 rounded-full bg-white text-black hover:bg-neutral-200 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                                >
                                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Save Changes
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function UserProfilePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
            </div>
        }>
            <ProfileContent />
        </Suspense>
    );
}
