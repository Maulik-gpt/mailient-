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
    Shield
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
                    <button onClick={() => router.back()} className="p-2 hover:bg-white/5 rounded-full transition-all active:scale-90">
                        <ArrowLeft className="w-5 h-5 text-white/60" />
                    </button>
                    <div>
                        <h1 className="text-lg font-black tracking-tight leading-none">{profile?.name || session?.user?.name}</h1>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em] mt-1">Verified Experience</p>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto pb-20">
                    {/* Header Section */}
                    <div className="relative">
                        {/* Banner */}
                        <div className="h-72 w-full overflow-hidden bg-neutral-900 border-b border-white/5">
                            {profile?.banner_url ? (
                                <img src={profile.banner_url} alt="Banner" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-black flex items-center justify-center">
                                    <div className="text-white/[0.02] text-[12rem] font-black italic select-none tracking-tighter">MAILIENT</div>
                                </div>
                            )}
                        </div>

                        {/* Profile Info Section */}
                        <div className="px-10 relative">
                            {/* Avatar */}
                            <div className="absolute -top-24 left-10">
                                <div className="p-2 rounded-full bg-[#050505]">
                                    <div className="w-44 h-44 rounded-full border-4 border-[#050505] bg-neutral-900 overflow-hidden shadow-2xl ring-1 ring-white/10">
                                        <img
                                            src={profile?.avatar_url || session?.user?.image || ''}
                                            alt="Avatar"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-8 gap-4">
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="px-10 py-3.5 rounded-full bg-white text-black font-black text-sm hover:scale-105 transition-all active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                                >
                                    Edit Profile
                                </button>
                                <button className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all text-white/40 hover:text-white">
                                    <MessageCircle className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Info Blocks - High Vertical Spacing */}
                            <div className="mt-12 space-y-8">
                                <div>
                                    <h2 className="text-4xl font-black tracking-tighter flex items-center gap-3">
                                        {profile?.name || session?.user?.name}
                                        <div className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20">
                                            <Shield className="w-5 h-5 text-blue-400 fill-blue-400/20" />
                                        </div>
                                    </h2>
                                    <p className="text-lg text-white/40 font-medium tracking-tight mt-1">@{profile?.username || (session?.user?.email?.split('@')[0])}</p>
                                </div>

                                {profile?.bio && (
                                    <p className="text-xl text-white/80 leading-relaxed max-w-2xl font-medium tracking-tight">
                                        {profile.bio}
                                    </p>
                                )}

                                <div className="flex flex-wrap gap-x-10 gap-y-4 text-sm text-white/40 font-bold uppercase tracking-widest">
                                    {profile?.location && (
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-white/20" />
                                            {profile.location}
                                        </div>
                                    )}
                                    {profile?.website && (
                                        <a href={profile.website} target="_blank" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                                            <Globe className="w-4 h-4 text-white/20" />
                                            Site
                                        </a>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-white/20" />
                                        Since {formatDate(profile?.created_at)}
                                    </div>
                                </div>

                                <div className="flex gap-10 pt-4 border-t border-white/5">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-2xl font-black text-white tracking-tighter">420</span>
                                        <span className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em]">Network</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-2xl font-black text-white tracking-tighter">1.2k</span>
                                        <span className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em]">Signals</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-2xl font-black text-white tracking-tighter">14</span>
                                        <span className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em]">Insights</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tabs - Sparse Layout */}
                        <div className="flex border-b border-white/5 mt-16 px-6">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex-1 flex flex-col items-center gap-3 py-6 relative group`}
                                    >
                                        <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-white/20 group-hover:text-white/40'} transition-all ${isActive ? 'scale-110' : ''}`} />
                                        <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${isActive ? 'text-white' : 'text-white/20 group-hover:text-white/40'} transition-colors`}>
                                            {tab.label}
                                        </span>
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeProfileTab"
                                                className="absolute bottom-0 left-4 right-4 h-1 bg-white rounded-t-full shadow-[0_0_20px_rgba(255,255,255,0.4)]"
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

            {/* Edit Profile Modal - PREMIUM FLOW */}
            <AnimatePresence>
                {isEditing && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsEditing(false)}
                            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-neutral-950 border border-white/10 rounded-[48px] shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] no-scrollbar"
                        >
                            <div className="sticky top-0 z-20 bg-neutral-950/80 backdrop-blur-3xl border-b border-white/5 px-12 py-10 flex items-center justify-between">
                                <div>
                                    <h2 className="text-3xl font-black tracking-tighter">Edit Identity</h2>
                                    <p className="text-xs text-white/30 font-bold uppercase tracking-[0.3em] mt-2">Personalize your digital presence</p>
                                </div>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="p-4 rounded-full bg-white/5 hover:bg-white/10 transition-all text-white/40 hover:text-white group"
                                >
                                    <CloseIcon className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                                </button>
                            </div>

                            <div className="p-12 space-y-16">
                                {/* Media Section */}
                                <div className="space-y-10">
                                    <div className="space-y-4">
                                        <label className="text-xs font-black uppercase tracking-[0.3em] text-white/20 ml-2">Header Signature</label>
                                        <div className="h-48 relative rounded-[32px] overflow-hidden bg-neutral-900 border border-white/5 group">
                                            {editForm.banner_url ? (
                                                <img src={editForm.banner_url} alt="Banner" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Camera className="w-8 h-8 text-white/10" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        const url = prompt("Enter Cover Image URL:", editForm.banner_url);
                                                        if (url !== null) setEditForm(prev => ({ ...prev, banner_url: url }));
                                                    }}
                                                    className="px-8 py-3 rounded-full bg-white text-black font-black text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all"
                                                >
                                                    Change Image
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-10 bg-white/[0.02] p-8 rounded-[32px] border border-white/5">
                                        <div className="relative">
                                            <div className="w-28 h-28 rounded-full bg-neutral-900 border-2 border-white/10 overflow-hidden shadow-2xl">
                                                {editForm.avatar_url ? (
                                                    <img src={editForm.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <UserCircle className="w-12 h-12 text-white/10" />
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const url = prompt("Enter Profile Photo URL:", editForm.avatar_url);
                                                    if (url !== null) setEditForm(prev => ({ ...prev, avatar_url: url }));
                                                }}
                                                className="absolute -bottom-2 -right-2 p-3 rounded-full bg-blue-500 text-white shadow-[0_10px_20px_rgba(59,130,246,0.3)] hover:scale-110 active:scale-95 transition-all border-4 border-neutral-950"
                                            >
                                                <Plus className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="text-lg font-black tracking-tight">Profile Photo</h4>
                                            <p className="text-sm text-white/20 font-medium">Click to upload or provide a URL</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Form Section - PURE VERTICALITY */}
                                <div className="space-y-12">
                                    <div className="space-y-4">
                                        <label className="text-xs font-black uppercase tracking-[0.3em] text-white/20 ml-2">Formal Recognition</label>
                                        <input
                                            type="text"
                                            value={editForm.name}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="Display Name"
                                            className="w-full bg-white/[0.03] border border-white/5 rounded-[24px] px-8 py-6 text-lg text-white font-bold focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all placeholder:text-white/5"
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-xs font-black uppercase tracking-[0.3em] text-white/20 ml-2">Handle Identification</label>
                                        <div className="relative group">
                                            <span className="absolute left-8 top-1/2 -translate-y-1/2 text-white/10 text-xl font-bold group-focus-within:text-blue-500 transition-colors">@</span>
                                            <input
                                                type="text"
                                                value={editForm.username}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                                                placeholder="username"
                                                className="w-full bg-white/[0.03] border border-white/5 rounded-[24px] pl-14 pr-8 py-6 text-lg text-white font-bold focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all placeholder:text-white/5"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-xs font-black uppercase tracking-[0.3em] text-white/20 ml-2">Personal Manifesto</label>
                                        <textarea
                                            value={editForm.bio}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                                            placeholder="Elevator pitch..."
                                            className="w-full bg-white/[0.03] border border-white/5 rounded-[32px] px-8 py-8 text-lg text-white font-medium min-h-[180px] resize-none leading-relaxed focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all placeholder:text-white/5"
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-xs font-black uppercase tracking-[0.3em] text-white/20 ml-2">Global Position</label>
                                        <div className="relative group">
                                            <MapPin className="absolute left-8 top-1/2 -translate-y-1/2 w-6 h-6 text-white/10 group-focus-within:text-red-500/50 transition-colors" />
                                            <input
                                                type="text"
                                                value={editForm.location}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                                                placeholder="Location (e.g. London, UK)"
                                                className="w-full bg-white/[0.03] border border-white/5 rounded-[24px] pl-18 pr-8 py-6 text-lg text-white font-bold focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all placeholder:text-white/5"
                                                style={{ paddingLeft: '4.5rem' }}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-xs font-black uppercase tracking-[0.3em] text-white/20 ml-2">Digital Hub</label>
                                        <div className="relative group">
                                            <Globe className="absolute left-8 top-1/2 -translate-y-1/2 w-6 h-6 text-white/10 group-focus-within:text-green-500/50 transition-colors" />
                                            <input
                                                type="text"
                                                value={editForm.website}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, website: e.target.value }))}
                                                placeholder="Website URL"
                                                className="w-full bg-white/[0.03] border border-white/5 rounded-[24px] pl-18 pr-8 py-6 text-lg text-white font-bold focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all placeholder:text-white/5"
                                                style={{ paddingLeft: '4.5rem' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="pt-10 flex flex-col gap-4">
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="w-full bg-white text-black h-20 rounded-[32px] font-black text-xl shadow-[0_20px_40px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Check className="w-6 h-6" />}
                                        Initialize Updates
                                    </button>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="w-full h-16 rounded-[24px] text-white/30 font-bold uppercase tracking-widest hover:text-white transition-colors"
                                    >
                                        Cancel Protocol
                                    </button>
                                </div>
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
