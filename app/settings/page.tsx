"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mail,
    ChevronRight,
    Loader2,
    CheckCircle2,
    ArrowLeft,
    Sparkles,
    ExternalLink
} from 'lucide-react';
import {
    UserIcon,
    LockIcon,
    Shield01Icon,
    FlashIcon,
    Database01Icon,
    Clock01Icon,
    ShieldKeyIcon,
    InformationCircleIcon,
    Agreement01Icon,
    CreditCardIcon,
    Link01Icon
} from 'hugeicons-react';
import { HomeFeedSidebar } from '@/components/ui/home-feed-sidebar';
import { ProfileView } from '@/components/ui/profile/profile-view';
import { EditProfileForm } from '@/components/ui/profile/edit-profile-form';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState('profile');
    const [isEditing, setIsEditing] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Encryption Simulation State
    const [isEncrypting, setIsEncrypting] = useState(false);
    const [encryptionProgress, setEncryptionProgress] = useState(0);
    const [encryptionStep, setEncryptionStep] = useState('');
    const [showSecuritySuccess, setShowSecuritySuccess] = useState(false);

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
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async (updatedData: any) => {
        try {
            const response = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });

            if (response.ok) {
                const data = await response.json();
                setProfile(data);
                setIsEditing(false);
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
            }
        } catch (error) {
            console.error("Error saving profile:", error);
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

    const finalizeEncryption = async () => {
        setIsEncrypting(false);
        setShowSecuritySuccess(true);
        setTimeout(() => setShowSecuritySuccess(false), 3000);
        // Realistic update
        if (profile) {
            const newProfile = { ...profile, preferences: { ...profile.preferences, advanced_security: 'active' } };
            setProfile(newProfile);
        }
    };

    const tabs = [
        { id: 'profile', label: 'Profile', icon: UserIcon },
        { id: 'account', label: 'Account', icon: LockIcon },
        { id: 'security', label: 'Security', icon: Shield01Icon },
        { id: 'legal', label: 'Legal', icon: Agreement01Icon },
    ];

    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 text-white/20 animate-spin" />
                </div>
            );
        }

        switch (activeTab) {
            case 'profile':
                return (
                    <AnimatePresence mode="wait">
                        {isEditing ? (
                            <motion.div
                                key="edit"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex justify-center"
                            >
                                <EditProfileForm
                                    profile={profile}
                                    onClose={() => setIsEditing(false)}
                                    onSave={handleSaveProfile}
                                />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="view"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                <ProfileView profile={profile} onEdit={() => setIsEditing(true)} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                );
            case 'account':
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-10"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                                { label: 'Processing Efficiency', value: `${profile?.emails_processed || 0} Emails`, sub: 'Intelligent signals extracted', icon: FlashIcon, color: 'text-blue-500' },
                                { label: 'Connections', value: `${profile?.email_accounts_connected || 1} Connected`, sub: 'Google accounts syncing', icon: Link01Icon, color: 'text-purple-500' },
                                { label: 'Storage Usage', value: profile?.storage_used || '0 MB', sub: 'Metadata footprint', icon: Database01Icon, color: 'text-green-500' },
                                { label: 'Last Activity', value: 'Active Now', sub: 'Latest sync pulse', icon: Clock01Icon, color: 'text-orange-500' }
                            ].map((stat, i) => (
                                <div key={i} className="glass-card apple-border p-6 rounded-[2rem] space-y-4 hover:bg-white/[0.05] transition-all group">
                                    <div className="flex items-center gap-3 text-neutral-400">
                                        <stat.icon className={`w-5 h-5 ${stat.color} group-hover:scale-110 transition-transform`} />
                                        <span className="text-sm font-semibold tracking-wider uppercase">{stat.label}</span>
                                    </div>
                                    <div className="text-3xl font-bold text-white">{stat.value}</div>
                                    <p className="text-sm text-neutral-500">{stat.sub}</p>
                                </div>
                            ))}
                        </div>

                        <div className="glass-panel apple-border rounded-[2.5rem] p-8 space-y-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <CreditCardIcon className="w-5 h-5 text-blue-400" />
                                Subscription Plan
                            </h3>
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 glass-card rounded-3xl apple-border">
                                <div className="space-y-2 text-center md:text-left">
                                    <span className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">
                                        {profile?.plan?.includes('Pro') ? 'PRO EXECUTION active' : 'FREE TIER'}
                                    </span>
                                    <h4 className="text-2xl font-bold text-white">
                                        {profile?.plan || 'Free Plan'}
                                    </h4>
                                    <p className="text-neutral-500 max-w-md">
                                        {profile?.plan?.includes('Pro')
                                            ? 'Full intelligence access with priority execution and unlimited signal analysis.'
                                            : 'Basic signal intelligence and 100 emails/day limit. Upgrade for priority AI processing.'}
                                    </p>
                                </div>
                                <Button className="h-14 px-10 rounded-full bg-white text-black hover:bg-neutral-200 font-bold shadow-xl transition-all group">
                                    {profile?.plan?.includes('Pro') ? "Managed Subscription" : "Upgrade to Pro"}
                                    <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                );
            case 'security':
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-8"
                    >
                        <div className="glass-panel apple-border rounded-[2.5rem] p-8 space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        Advanced Encryption
                                        {profile?.preferences?.advanced_security === 'active' && <ShieldKeyIcon className="w-5 h-5 text-green-500" />}
                                    </h3>
                                    <p className="text-neutral-500 leading-relaxed max-w-sm">
                                        Your email data is encrypted with military-grade AES-256 at rest. Keys are rotated bi-weekly.
                                    </p>
                                </div>
                                {profile?.preferences?.advanced_security === 'active' ? (
                                    <div className="px-6 py-2 bg-green-500/10 text-green-500 text-xs font-black rounded-full border border-green-500/20 shadow-glow">
                                        SECURITY ACTIVE
                                    </div>
                                ) : (
                                    <Button
                                        onClick={handleEnableEncryption}
                                        disabled={isEncrypting}
                                        className="h-12 px-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg"
                                    >
                                        {isEncrypting ? "Processing..." : "Initialize Security"}
                                    </Button>
                                )}
                            </div>

                            {isEncrypting && (
                                <div className="space-y-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex justify-between text-[10px] font-black tracking-widest text-blue-400">
                                        <span>{encryptionStep.toUpperCase()}</span>
                                        <span>{Math.round(encryptionProgress)}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                                            animate={{ width: `${encryptionProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="h-px bg-white/5" />

                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-lg font-bold text-white">AI Privacy Mode</h3>
                                    <p className="text-neutral-500">Local processing only. Neural training is disabled for your signals.</p>
                                </div>
                                <div className="relative inline-flex h-7 w-12 items-center rounded-full bg-white/10 cursor-pointer p-1 transition-colors hover:bg-white/20">
                                    <div className="h-5 w-5 bg-white rounded-full transition-transform translate-x-5" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-red-500/[0.03] border border-red-500/10 rounded-[2.5rem] p-8 space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-lg bg-red-500/10">
                                    <InformationCircleIcon className="w-5 h-5 text-red-500" />
                                </div>
                                <h3 className="text-red-500 font-bold text-lg">Danger Zone</h3>
                            </div>
                            <p className="text-neutral-500 max-w-md">Permanently wipe your account data, signals, and associated metadata from Mailient servers.</p>
                            <Button variant="ghost" className="text-red-500 hover:bg-red-500/10 hover:text-red-400 font-bold px-8 rounded-full border border-red-500/10 transition-all">
                                Delete My Account
                            </Button>
                        </div>
                    </motion.div>
                );
            case 'legal':
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        <div className="grid grid-cols-1 gap-4">
                            {[
                                { title: 'Terms & Conditions', sub: 'Rules and usage guidelines', icon: Agreement01Icon, color: 'text-blue-400' },
                                { title: 'Privacy Policy', sub: 'Data management & protection', icon: ShieldKeyIcon, color: 'text-purple-400' }
                            ].map((item, i) => (
                                <button key={i} className="group glass-card apple-border p-8 rounded-[2rem] flex items-center justify-between hover:bg-white/[0.05] transition-all text-left">
                                    <div className="flex items-center gap-6">
                                        <div className={`p-5 rounded-2xl glass-panel ${item.color.replace('text', 'bg').replace('400', '400/10')} group-hover:scale-110 transition-transform duration-500`}>
                                            <item.icon className={`w-8 h-8 ${item.color}`} />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-xl font-bold text-white uppercase tracking-tight">{item.title}</h3>
                                            <p className="text-neutral-500 font-medium">{item.sub}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-[10px] font-black tracking-[0.2em] text-neutral-600 group-hover:text-white transition-colors">VIEW DOC</span>
                                        <div className="p-3 rounded-xl bg-white/5 group-hover:bg-white/10 transition-all">
                                            <ChevronRight className="w-5 h-5 text-neutral-500 group-hover:text-white" />
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="glass-panel apple-border rounded-[3rem] p-10 relative overflow-hidden group">
                            <div className="absolute -top-10 -right-10 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000">
                                <Shield01Icon className="w-64 h-64 text-white" />
                            </div>
                            <div className="relative z-10 space-y-6 max-w-xl">
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card apple-border bg-green-500/10">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-green-500">Verified Protocol</span>
                                </div>
                                <h4 className="text-3xl font-bold text-white tracking-tight">Committed to your sovereignty</h4>
                                <p className="text-lg text-neutral-400 leading-relaxed font-medium">
                                    We believe your data belongs to you. No hidden training, no data selling, no compromises. Our architecture is built to ensure only you can access your insights.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white flex overflow-hidden selection:bg-white selection:text-black">
            <HomeFeedSidebar />

            <div className="flex-1 flex flex-col h-screen relative">
                {/* mesh background */}
                <div className="absolute inset-0 bg-mesh-dark pointer-events-none opacity-40"></div>

                {/* Header */}
                <header className="h-24 flex items-center justify-between px-12 z-10">
                    <div className="flex items-center gap-6">
                        <Button
                            variant="ghost"
                            className="p-3 rounded-full hover:bg-white/5 text-neutral-400 hover:text-white transition-colors"
                            onClick={() => window.history.back()}
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </Button>
                        <div className="h-8 w-px bg-white/10 mx-2"></div>
                        <h1 className="text-2xl font-bold tracking-tight">System Configuration</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        {saveSuccess && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-500 text-xs font-bold border border-green-500/20"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                CONFIG UPDATED
                            </motion.div>
                        )}
                        <div className="flex items-center gap-4 glass-card apple-border px-4 py-2 rounded-full">
                            <Clock01Icon className="w-4 h-4 text-neutral-500" />
                            <span className="text-xs font-mono text-neutral-300">v0.1.0-alpha.refine</span>
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 flex overflow-hidden px-12 pb-12 z-10 gap-12">
                    {/* Navigation Sidebar */}
                    <aside className="w-72 flex flex-col gap-2">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveTab(tab.id);
                                        setIsEditing(false);
                                    }}
                                    className={`relative flex items-center gap-4 px-6 py-5 rounded-[1.5rem] text-sm font-bold transition-all group overflow-hidden ${isActive
                                        ? 'bg-white text-black shadow-2xl shadow-white/10 scale-[1.02]'
                                        : 'text-neutral-500 hover:text-white hover:bg-white/[0.03]'
                                        }`}
                                >
                                    <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-black' : 'text-neutral-500 group-hover:text-white'}`} />
                                    <span className="tracking-wide uppercase text-xs">{tab.label}</span>
                                    {isActive && (
                                        <motion.div
                                            layoutId="active-pill"
                                            className="absolute left-0 w-1 h-6 bg-black rounded-full"
                                        />
                                    )}
                                </button>
                            );
                        })}

                        <div className="mt-auto p-8 rounded-[2rem] glass-morphic apple-border space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/10">
                                    <Sparkles className="w-4 h-4 text-blue-400" />
                                </div>
                                <span className="text-[10px] font-black tracking-widest text-neutral-400 uppercase">AI Status</span>
                            </div>
                            <p className="text-xs text-neutral-500 font-medium leading-relaxed">
                                System intelligence is operating at peak capacity. 42 signals synced today.
                            </p>
                        </div>
                    </aside>

                    {/* Content Section */}
                    <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                        <div className="max-w-4xl">
                            {renderContent()}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
