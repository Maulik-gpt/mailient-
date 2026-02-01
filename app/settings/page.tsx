"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { HomeFeedSidebar } from '@/components/ui/home-feed-sidebar';
import {
    User,
    Lock,
    Shield,
    Mail,
    Zap,
    Link as LinkIcon,
    Activity,
    Loader2,
    CheckCircle2,
    Database,
    Clock,
    ShieldCheck,
    LockIcon,
    AlertCircle,
    FileText,
    ExternalLink,
    ChevronRight,
    Scale,
    Camera,
    MapPin,
    Twitter,
    Instagram,
    Linkedin,
    Github,
    Globe,
    Sparkles,
    LogOut,
    Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SettingsPage() {
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState('profile');
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Encryption Simulation State
    const [isEncrypting, setIsEncrypting] = useState(false);
    const [encryptionProgress, setEncryptionProgress] = useState(0);
    const [encryptionStep, setEncryptionStep] = useState('');
    const [showSecuritySuccess, setShowSecuritySuccess] = useState(false);

    // Form states
    const [displayName, setDisplayName] = useState('');
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [location, setLocation] = useState('');
    const [website, setWebsite] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [bannerUrl, setBannerUrl] = useState('');
    const [profileMode, setProfileMode] = useState<'view' | 'edit'>('view');
    const [socialLinks, setSocialLinks] = useState({
        twitter: '',
        instagram: '',
        linkedin: '',
        github: ''
    });

    useEffect(() => {
        document.title = 'Settings / Mailient';
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/profile');
            if (response.ok) {
                const data = await response.json();
                setProfile(data);
                setDisplayName(data.name || session?.user?.name || '');
                setUsername(data.username || '');
                setBio(data.bio || '');
                setLocation(data.location || '');
                setWebsite(data.website || '');
                setAvatarUrl(data.avatar_url || session?.user?.image || '');
                setBannerUrl(data.banner_url || '');
                setSocialLinks({
                    twitter: data.preferences?.social_links?.twitter || '',
                    instagram: data.preferences?.social_links?.instagram || '',
                    linkedin: data.preferences?.social_links?.linkedin || '',
                    github: data.preferences?.social_links?.github || ''
                });
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (silent = false) => {
        if (!silent) setSaving(true);
        try {
            const response = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: displayName,
                    username: username,
                    bio: bio,
                    location: location,
                    website: website,
                    avatar_url: avatarUrl,
                    banner_url: bannerUrl,
                    preferences: {
                        ...(profile?.preferences || {}),
                        social_links: socialLinks
                    }
                })
            });

            if (response.ok) {
                const data = await response.json();
                setProfile(data);
                if (!silent) {
                    setSaveSuccess(true);
                    setTimeout(() => setSaveSuccess(false), 3000);
                }
            }
        } catch (error) {
            console.error("Error saving profile:", error);
        } finally {
            if (!silent) setSaving(false);
        }
    };

    const handleEnableEncryption = async () => {
        setIsEncrypting(true);
        setEncryptionProgress(0);

        const steps = [
            'Generating RSA Keypairs...',
            'Initializing AES-256-GCM cipher...',
            'Encrypting metadata indices...',
            'Securing signal pulses...',
            'Verifying database integrity...',
            'Advanced Encryption Active.'
        ];

        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                finalizeEncryption();
            }
            setEncryptionProgress(progress);
            setEncryptionStep(steps[Math.floor((progress / 101) * steps.length)]);
        }, 300);
    };

    const togglePrivacyMode = async () => {
        const currentMode = profile?.preferences?.ai_privacy_mode === 'enabled';
        const updatedPrefs = {
            ...(profile?.preferences || {}),
            ai_privacy_mode: currentMode ? 'disabled' : 'enabled'
        };

        try {
            const response = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    preferences: updatedPrefs
                })
            });

            if (response.ok) {
                const data = await response.json();
                setProfile(data);
            }
        } catch (error) {
            console.error("Failed to toggle privacy mode:", error);
        }
    };

    const finalizeEncryption = async () => {
        try {
            setEncryptionStep('Finalizing encryption migration...');
            setEncryptionProgress(95);

            const response = await fetch('/api/profile/security/encrypt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const data = await response.json();
                setEncryptionProgress(100);
                setEncryptionStep('Advanced Encryption Active.');

                // Refresh profile to get updated preferences
                await fetchProfile();

                setShowSecuritySuccess(true);
                setTimeout(() => {
                    setIsEncrypting(false);
                    setShowSecuritySuccess(false);
                }, 3000);
            } else {
                const errorData = await response.json();
                console.error("Encryption migration failed:", errorData.error);
                setIsEncrypting(false);
                alert("Encryption migration failed: " + errorData.error);
            }
        } catch (error) {
            console.error("Encryption failed:", error);
            setIsEncrypting(false);
            alert("Encryption failed. Please check your connection and try again.");
        }
    };

    const handleDeleteAccount = async () => {
        if (confirm("WARNING: This action is irreversible. All your email signals, metadata, AI chats, notes, and insights will be permanently deleted from Mailient servers. Proceed?")) {
            try {
                const response = await fetch('/api/profile', {
                    method: 'DELETE',
                });

                if (response.ok) {
                    alert("Account and all associated data have been permanently deleted. You will be logged out now.");
                    window.location.href = '/api/auth/signout';
                } else {
                    const data = await response.json();
                    alert("Failed to delete account: " + (data.error || "Unknown error"));
                }
            } catch (error) {
                console.error("Error deleting account:", error);
                alert("An error occurred while deleting your account. Please try again.");
            }
        }
    };

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'account', label: 'Account', icon: Lock },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'legal', label: 'Legal', icon: Scale },
    ];

    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
                </div>
            );
        }

        switch (activeTab) {
            case 'profile':
                return (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-12"
                    >
                        {profileMode === 'view' ? (
                            /* Display Profile State */
                            <div className="space-y-12">
                                <div className="relative rounded-[40px] overflow-hidden bg-white/[0.02] border border-white/5 shadow-2xl">
                                    <div className="h-60 bg-neutral-900 overflow-hidden relative">
                                        {bannerUrl ? (
                                            <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-black flex items-center justify-center">
                                                <div className="text-white/[0.02] text-8xl font-black italic tracking-tighter">PREVIEW</div>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/20" />
                                    </div>
                                    <div className="px-12 pb-12 pt-20 relative">
                                        <div className="absolute -top-16 left-12">
                                            <div className="w-32 h-32 rounded-full border-4 border-[#050505] bg-neutral-900 overflow-hidden shadow-2xl ring-1 ring-white/10">
                                                {avatarUrl ? (
                                                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-3xl font-light text-white/10">U</div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-2">
                                                <h2 className="text-4xl font-black tracking-tighter flex items-center gap-2">
                                                    {displayName || 'Identity Name'}
                                                    <Sparkles className="w-5 h-5 text-amber-500" />
                                                </h2>
                                                <p className="text-xl text-white/30 font-medium">@{username || 'handle'}</p>
                                            </div>
                                            <button
                                                onClick={() => setProfileMode('edit')}
                                                className="px-8 py-3 rounded-full bg-white text-black font-black text-sm hover:scale-105 transition-all active:scale-95 shadow-xl"
                                            >
                                                Edit Identity
                                            </button>
                                        </div>
                                        <div className="mt-8 space-y-6">
                                            {bio && (
                                                <p className="text-lg text-white/70 leading-relaxed max-w-xl font-medium">{bio}</p>
                                            )}
                                            <div className="flex flex-wrap gap-8 text-sm text-white/30 font-bold uppercase tracking-widest">
                                                <div className="flex items-center gap-2"><MapPin className="w-4 h-4" />{location || 'Global'}</div>
                                                <div className="flex items-center gap-2"><Globe className="w-4 h-4" />{website || 'No Link'}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-10 rounded-[32px] bg-white/[0.02] border border-white/5 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <Shield className="w-5 h-5 text-blue-500" />
                                        <span className="text-xs font-black uppercase tracking-widest text-white/40">Privacy Protocol</span>
                                    </div>
                                    <p className="text-sm text-white/60 leading-relaxed font-medium">
                                        Your profile is visible to connected network nodes. You can manage data sovereignty in the <span className="text-blue-400">Security</span> tab.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            /* Edit Identity State - PURE VERTICALITY */
                            <div className="space-y-16 max-w-2xl">
                                <div className="flex items-center justify-between border-b border-white/5 pb-8">
                                    <div>
                                        <h3 className="text-2xl font-black tracking-tight">Identity Configuration</h3>
                                        <p className="text-xs text-white/30 font-bold uppercase tracking-widest mt-2">Adjust your signal presence</p>
                                    </div>
                                    <button
                                        onClick={() => setProfileMode('view')}
                                        className="text-xs font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                                    >
                                        Back to View
                                    </button>
                                </div>

                                <div className="space-y-12">
                                    {/* Vertical Fields */}
                                    <div className="space-y-4">
                                        <label className="text-[11px] font-black uppercase tracking-[0.3em] text-white/20 ml-2">Signature Name</label>
                                        <input
                                            type="text"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            className="w-full bg-white/[0.03] border border-white/5 rounded-[24px] px-8 py-6 text-xl text-white font-black focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all placeholder:text-white/5"
                                            placeholder="Display Name"
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-[11px] font-black uppercase tracking-[0.3em] text-white/20 ml-2">Unique Identifier</label>
                                        <div className="relative group">
                                            <span className="absolute left-8 top-1/2 -translate-y-1/2 text-white/10 text-xl font-bold group-focus-within:text-white transition-colors">@</span>
                                            <input
                                                type="text"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                className="w-full bg-white/[0.03] border border-white/5 rounded-[24px] pl-14 pr-8 py-6 text-xl text-white font-black focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all placeholder:text-white/5"
                                                placeholder="handle"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-[11px] font-black uppercase tracking-[0.3em] text-white/20 ml-2">Digital Manifesto</label>
                                        <textarea
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            maxLength={180}
                                            className="w-full bg-white/[0.03] border border-white/5 rounded-[32px] px-8 py-8 text-xl text-white font-medium min-h-[160px] resize-none leading-relaxed focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all placeholder:text-white/5"
                                            placeholder="Tell the nodes about yourself..."
                                        />
                                        <p className="text-right text-[10px] text-white/20 font-black uppercase tracking-widest">{bio.length} / 180</p>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-[11px] font-black uppercase tracking-[0.3em] text-white/20 ml-2">Physical Location</label>
                                        <input
                                            type="text"
                                            value={location}
                                            onChange={(e) => setLocation(e.target.value)}
                                            className="w-full bg-white/[0.03] border border-white/5 rounded-[24px] px-8 py-6 text-xl text-white font-black focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all placeholder:text-white/5"
                                            placeholder="e.g. Earth, Sol System"
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-[11px] font-black uppercase tracking-[0.3em] text-white/20 ml-2">Central Node Link</label>
                                        <input
                                            type="text"
                                            value={website}
                                            onChange={(e) => setWebsite(e.target.value)}
                                            className="w-full bg-white/[0.03] border border-white/5 rounded-[24px] px-8 py-6 text-xl text-white font-black focus:outline-none focus:bg-white/[0.05] focus:border-white/10 transition-all placeholder:text-white/5"
                                            placeholder="yourweb.site"
                                        />
                                    </div>
                                </div>

                                <div className="pt-8 border-t border-white/5 flex flex-col gap-6">
                                    <button
                                        onClick={async () => {
                                            await handleSave();
                                            setProfileMode('view');
                                        }}
                                        disabled={saving}
                                        className="w-full bg-white text-black h-20 rounded-[32px] font-black text-xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4"
                                    >
                                        {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
                                        Override Settings
                                    </button>
                                    <button
                                        onClick={() => setProfileMode('view')}
                                        className="w-full h-16 rounded-[24px] text-white/20 font-black uppercase tracking-[0.1em] hover:text-white transition-colors"
                                    >
                                        Abort Revision
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                );
            case 'account':
                return (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-[#0a0a0a] border border-neutral-800 p-5 rounded-2xl space-y-3">
                                <div className="flex items-center gap-3 text-neutral-400">
                                    <Zap className="w-4 h-4 text-blue-500" />
                                    <span className="text-sm font-medium">Processing Efficiency</span>
                                </div>
                                <div className="text-2xl font-semibold text-[#fafafa]">{profile?.emails_processed || 0} Emails</div>
                                <p className="text-xs text-neutral-500">Intelligent signals extracted from your inbox</p>
                            </div>
                            <div className="bg-[#0a0a0a] border border-neutral-800 p-5 rounded-2xl space-y-3">
                                <div className="flex items-center gap-3 text-neutral-400">
                                    <LinkIcon className="w-4 h-4 text-purple-500" />
                                    <span className="text-sm font-medium">Connections</span>
                                </div>
                                <div className="text-2xl font-semibold text-[#fafafa]">{profile?.email_accounts_connected || 1} Connected</div>
                                <p className="text-xs text-neutral-500">Google accounts syncing with Mailient</p>
                            </div>
                            <div className="bg-[#0a0a0a] border border-neutral-800 p-5 rounded-2xl space-y-3">
                                <div className="flex items-center gap-3 text-neutral-400">
                                    <Database className="w-4 h-4 text-green-500" />
                                    <span className="text-sm font-medium">Storage Usage</span>
                                </div>
                                <div className="text-2xl font-semibold text-[#fafafa]">{profile?.storage_used || '0 MB'}</div>
                                <p className="text-xs text-neutral-500">Metadata and signal index footprint</p>
                            </div>
                            <div className="bg-[#0a0a0a] border border-neutral-800 p-5 rounded-2xl space-y-3">
                                <div className="flex items-center gap-3 text-neutral-400">
                                    <Clock className="w-4 h-4 text-orange-500" />
                                    <span className="text-sm font-medium">Last Activity</span>
                                </div>
                                <div className="text-2xl font-semibold text-[#fafafa]">
                                    {profile?.last_email_activity
                                        ? new Date(profile.last_email_activity).toLocaleString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })
                                        : 'Active Now'}
                                </div>
                                <p className="text-xs text-neutral-500">Latest Gmail synchronization pulse</p>
                            </div>
                        </div>

                        <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 space-y-4">
                            <h3 className="text-[#fafafa] font-medium">Subscription Plan</h3>
                            <div className="flex items-center justify-between p-4 bg-[#0a0a0a] border border-neutral-800 rounded-xl">
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm font-semibold text-[#fafafa] uppercase tracking-wider">
                                        {profile?.plan === 'starter' ? 'Starter Plan $7.99' : profile?.plan === 'pro' ? 'Pro Plan $29.99' : 'Free Plan'}
                                    </span>
                                    <span className="text-xs text-neutral-500">
                                        {profile?.plan === 'pro'
                                            ? 'Full intelligence access with priority execution'
                                            : profile?.plan === 'starter'
                                                ? 'Standard signal intelligence and growth tools'
                                                : 'Basic signal intelligence and 100 emails/day limit'}
                                    </span>
                                </div>
                                {profile?.plan === 'pro' ? (
                                    <button
                                        onClick={() => window.open('https://x.com/@Maulik_055', '_blank')}
                                        className="text-xs font-semibold px-4 py-2 bg-white text-black rounded-lg hover:bg-neutral-200 transition-all flex items-center gap-2"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                        Talk to Founder
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => window.location.href = '/pricing'}
                                        className="text-xs font-semibold px-4 py-2 bg-neutral-900 text-[#fafafa] border border-neutral-800 rounded-lg hover:bg-neutral-800 transition-all"
                                    >
                                        Upgrade
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            case 'security':
                return (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 space-y-5">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-[#fafafa] font-medium flex items-center gap-2">
                                        Advanced Encryption
                                        {profile?.preferences?.advanced_security === 'active' && (
                                            <ShieldCheck className="w-4 h-4 text-green-500" />
                                        )}
                                    </h3>
                                    <p className="text-sm text-neutral-500">Your email data is encrypted with AES-256 at rest.</p>
                                </div>
                                {profile?.preferences?.advanced_security === 'active' ? (
                                    <div className="px-3 py-1 bg-green-500/10 text-green-500 text-[10px] font-bold rounded-lg border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                                        ACTIVE
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleEnableEncryption}
                                        disabled={isEncrypting}
                                        className="text-xs font-bold px-4 py-2 bg-[#fafafa] text-black rounded-lg hover:bg-neutral-200 transition-all uppercase tracking-widest disabled:opacity-50"
                                    >
                                        {isEncrypting ? 'Processing' : 'Initialize'}
                                    </button>
                                )}
                            </div>

                            {isEncrypting && (
                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                                        <span>{encryptionStep}</span>
                                        <span>{Math.round(encryptionProgress)}%</span>
                                    </div>
                                    <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 transition-all duration-300"
                                            style={{ width: `${encryptionProgress}%` }}
                                        />
                                    </div>
                                    {showSecuritySuccess && (
                                        <div className="flex items-center gap-2 text-green-500 text-[10px] font-bold animate-in fade-in slide-in-from-top-1">
                                            <CheckCircle2 className="w-3 h-3" />
                                            ENCRYPTION SEQUENCE COMPLETED PERFECTLY
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="h-px bg-neutral-800/50" />
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-[#fafafa] font-medium">AI Privacy Mode</h3>
                                    <p className="text-sm text-neutral-500">Signals are processed locally whenever possible. AI training is disabled.</p>
                                </div>
                                <button
                                    onClick={togglePrivacyMode}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${profile?.preferences?.ai_privacy_mode === 'enabled' ? 'bg-blue-600' : 'bg-neutral-800'
                                        }`}
                                >
                                    <div
                                        className={`h-4 w-4 rounded-full bg-white transition-transform duration-200 ${profile?.preferences?.ai_privacy_mode === 'enabled' ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                            </div>
                        </div>

                        <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-blue-500/10 rounded-xl">
                                    <LockIcon className="w-5 h-5 text-blue-500" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-[#fafafa] font-medium">Data Sovereignty</h3>
                                    <p className="text-sm text-neutral-500 leading-relaxed">
                                        Your encryption keys are managed via hardware security modules.
                                        Mailient personnel have zero access to your decrypted email content.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <AlertCircle className="w-4 h-4 text-red-500" />
                                <h3 className="text-red-500 font-medium">Danger Zone</h3>
                            </div>
                            <p className="text-sm text-neutral-500 mb-4">Permanently delete your account and all associated email signals.</p>
                            <button
                                onClick={handleDeleteAccount}
                                className="text-xs font-bold px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all uppercase tracking-widest"
                            >
                                Delete Account
                            </button>
                        </div>
                    </div>
                );
            case 'legal':
                return (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <p className="text-sm text-neutral-500 mb-2">Review our legal documents and usage policies</p>

                        <div className="grid grid-cols-1 gap-4">
                            {/* Terms & Conditions Card */}
                            <button
                                onClick={() => window.location.href = '/terms-of-service'}
                                className="group flex items-center justify-between p-6 rounded-2xl bg-neutral-900/30 border border-neutral-800 hover:border-neutral-600 hover:bg-neutral-900/50 transition-all duration-300 text-left"
                            >
                                <div className="flex items-center gap-5">
                                    <div className="p-4 bg-blue-500/10 rounded-xl group-hover:scale-110 transition-transform duration-500">
                                        <Scale className="w-6 h-6 text-blue-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-[#fafafa] font-semibold text-lg">Terms & Conditions</h3>
                                        <p className="text-sm text-neutral-500">Our rules and guidelines for using Mailient</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-600 group-hover:text-blue-500 transition-colors">VIEW</span>
                                    <div className="p-2 rounded-lg bg-neutral-800 group-hover:bg-blue-500/20 transition-colors">
                                        <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-blue-500" />
                                    </div>
                                </div>
                            </button>

                            {/* Privacy Policy Card */}
                            <button
                                onClick={() => window.location.href = '/privacy-policy'}
                                className="group flex items-center justify-between p-6 rounded-2xl bg-neutral-900/30 border border-neutral-800 hover:border-neutral-600 hover:bg-neutral-900/50 transition-all duration-300 text-left"
                            >
                                <div className="flex items-center gap-5">
                                    <div className="p-4 bg-purple-500/10 rounded-xl group-hover:scale-110 transition-transform duration-500">
                                        <ShieldCheck className="w-6 h-6 text-purple-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-[#fafafa] font-semibold text-lg">Privacy Policy</h3>
                                        <p className="text-sm text-neutral-500">How we protect and manage your data</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-600 group-hover:text-purple-500 transition-colors">VIEW</span>
                                    <div className="p-2 rounded-lg bg-neutral-800 group-hover:bg-purple-500/20 transition-colors">
                                        <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-purple-500" />
                                    </div>
                                </div>
                            </button>
                        </div>

                        {/* Security Badge Panel */}
                        <div className="bg-[#0a0a0a] border border-neutral-800 p-8 rounded-3xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-1000">
                                <Shield className="w-32 h-32 text-blue-500" />
                            </div>
                            <div className="relative z-10 space-y-4 max-w-lg">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-500 text-[10px] font-bold rounded-full border border-green-500/20 uppercase tracking-widest">
                                    Secure Platform
                                </div>
                                <h4 className="text-xl font-bold text-[#fafafa]">Committed to your privacy</h4>
                                <p className="text-sm text-neutral-500 leading-relaxed">
                                    We believe in data sovereignty. All policies are designed to give you ultimate control over your information. We never sell your data or use it for AI training without explicit consent.
                                </p>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-[#fafafa] flex overflow-hidden selection:bg-white selection:text-black" style={{ fontFamily: "'Satoshi', sans-serif" }}>
            {/* Background Decorative Elements */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <HomeFeedSidebar />
            <div className="flex-1 ml-16 relative overflow-y-auto custom-scrollbar">
                <div className="max-w-5xl mx-auto px-8 py-20 relative z-10">
                    <div className="flex items-end justify-between mb-16 px-2">
                        <div className="space-y-2">
                            <h1 className="text-5xl font-black tracking-tighter text-white">Settings</h1>
                            <p className="text-white/30 font-medium flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                Manage your premium identity & preferences
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-16">
                        {/* Sidebar Navigation - Glassmorphism */}
                        <div className="w-full lg:w-64 flex-shrink-0">
                            <div className="flex lg:flex-col gap-1.5 p-1.5 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-3xl sticky top-8 overflow-x-auto lg:overflow-visible scrollbar-hide">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = activeTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap relative group ${isActive
                                                ? 'text-white'
                                                : 'text-white/30 hover:text-white/60'
                                                }`}
                                        >
                                            <Icon className={`w-4 h-4 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                                            {tab.label}
                                            {isActive && (
                                                <motion.div
                                                    layoutId="activeTab"
                                                    className="absolute inset-0 bg-white/[0.05] border border-white/10 rounded-xl z-[-1]"
                                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                />
                                            )}
                                        </button>
                                    );
                                })}
                                <div className="mt-4 pt-4 border-t border-white/5 lg:block hidden px-4">
                                    <button
                                        onClick={() => window.location.href = '/api/auth/signout'}
                                        className="flex items-center gap-3 text-red-400/50 hover:text-red-400 text-xs font-bold transition-colors"
                                    >
                                        <LogOut className="w-3.5 h-3.5" />
                                        Log Out
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 min-w-0">
                            <AnimatePresence mode="wait">
                                {renderContent()}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
