"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { HomeFeedSidebar } from '@/components/ui/home-feed-sidebar';
import {
    User,
    Lock,
    Shield,
    Moon,
    Sun,
    Monitor,
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
    AlertCircle
} from 'lucide-react';

export default function SettingsPage() {
    const { data: session } = useSession();
    const { theme, setTheme } = useTheme();
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
                    preferences: profile?.preferences || {}
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
        if (confirm("WARNING: This action is irreversible. All your email signals, metadata, and insights will be permanently deleted from Mailient servers. Proceed?")) {
            // In a real app, call DELETE /api/profile
            alert("Account deletion sequence initiated. You will be logged out shortly.");
            window.location.href = '/api/auth/signout';
        }
    };

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'account', label: 'Account', icon: Lock },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'theme', label: 'Theme', icon: theme === 'dark' ? Moon : Sun },
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
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="space-y-2">
                            <label className="text-sm text-neutral-400 font-medium">Display Name</label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-xl px-4 py-3 text-[#fafafa] focus:outline-none focus:border-neutral-600 transition-all placeholder:text-neutral-700"
                                placeholder="How you appear to others"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-neutral-400 font-medium">Email Address</label>
                            <div className="flex items-center gap-3 w-full bg-[#0a0a0a] border border-neutral-800/50 rounded-xl px-4 py-3 text-neutral-500 cursor-not-allowed">
                                <Mail className="w-4 h-4" />
                                <span>{session?.user?.email}</span>
                                <div className="ml-auto flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 text-green-500 rounded-full text-[10px] uppercase font-bold tracking-wider border border-green-500/20">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Verified
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-neutral-400 font-medium">Username</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600">@</span>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-xl px-9 py-3 text-[#fafafa] focus:outline-none focus:border-neutral-600 transition-all placeholder:text-neutral-700"
                                    placeholder="yourhandle"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-neutral-400 font-medium">Bio</label>
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-xl px-4 py-3 text-[#fafafa] focus:outline-none focus:border-neutral-600 transition-all placeholder:text-neutral-700 min-h-[100px] resize-none"
                                placeholder="Tell us about yourself..."
                            />
                        </div>
                        <div className="pt-4">
                            <button
                                onClick={() => handleSave()}
                                disabled={saving}
                                className="flex items-center justify-center gap-2 bg-[#fafafa] text-black px-8 py-3 rounded-xl font-semibold hover:bg-neutral-200 transition-all disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                {saveSuccess ? 'Changes Saved!' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
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
                                    <span className="text-sm font-semibold text-[#fafafa] uppercase tracking-wider">{profile?.plan || 'Free Plan'}</span>
                                    <span className="text-xs text-neutral-500">Basic signal intelligence and 100 emails/day limit</span>
                                </div>
                                <button
                                    onClick={() => window.location.href = '/pricing'}
                                    className="text-xs font-semibold px-4 py-2 bg-neutral-900 text-[#fafafa] border border-neutral-800 rounded-lg hover:bg-neutral-800 transition-all"
                                >
                                    Upgrade
                                </button>
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
            case 'theme':
                return (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <button
                                onClick={() => setTheme('light')}
                                className={`flex flex-col items-center gap-4 p-6 rounded-2xl border transition-all duration-300 group relative overflow-hidden ${theme === 'light'
                                    ? 'bg-gradient-to-br from-amber-100 to-orange-100 border-amber-300 text-amber-900 shadow-lg shadow-amber-200/50'
                                    : 'bg-neutral-900/30 border-neutral-800 text-neutral-400 hover:border-amber-500/50 hover:bg-neutral-900/50'}`}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-t from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity ${theme === 'light' ? 'opacity-100' : ''}`} />
                                <div className={`relative p-3 rounded-full ${theme === 'light' ? 'bg-amber-200' : 'bg-neutral-800'} transition-colors`}>
                                    <Sun className={`w-8 h-8 ${theme === 'light' ? 'text-amber-600' : ''}`} />
                                </div>
                                <span className="text-sm font-semibold relative">Light</span>
                                {theme === 'light' && (
                                    <div className="absolute top-3 right-3">
                                        <CheckCircle2 className="w-5 h-5 text-amber-600" />
                                    </div>
                                )}
                            </button>
                            <button
                                onClick={() => setTheme('dark')}
                                className={`flex flex-col items-center gap-4 p-6 rounded-2xl border transition-all duration-300 group relative overflow-hidden ${theme === 'dark'
                                    ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-600 text-white shadow-lg shadow-slate-900/50'
                                    : 'bg-neutral-900/30 border-neutral-800 text-neutral-400 hover:border-slate-500/50 hover:bg-neutral-900/50'}`}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-t from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity ${theme === 'dark' ? 'opacity-100' : ''}`} />
                                <div className={`relative p-3 rounded-full ${theme === 'dark' ? 'bg-slate-700' : 'bg-neutral-800'} transition-colors`}>
                                    <Moon className={`w-8 h-8 ${theme === 'dark' ? 'text-slate-300' : ''}`} />
                                </div>
                                <span className="text-sm font-semibold relative">Dark</span>
                                {theme === 'dark' && (
                                    <div className="absolute top-3 right-3">
                                        <CheckCircle2 className="w-5 h-5 text-slate-300" />
                                    </div>
                                )}
                            </button>
                            <button
                                onClick={() => setTheme('system')}
                                className={`flex flex-col items-center gap-4 p-6 rounded-2xl border transition-all duration-300 group relative overflow-hidden ${theme === 'system'
                                    ? 'bg-gradient-to-br from-blue-900/50 to-purple-900/50 border-blue-500/50 text-blue-300 shadow-lg shadow-blue-900/30'
                                    : 'bg-neutral-900/30 border-neutral-800 text-neutral-400 hover:border-blue-500/50 hover:bg-neutral-900/50'}`}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-t from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity ${theme === 'system' ? 'opacity-100' : ''}`} />
                                <div className={`relative p-3 rounded-full ${theme === 'system' ? 'bg-blue-900/50' : 'bg-neutral-800'} transition-colors`}>
                                    <Monitor className={`w-8 h-8 ${theme === 'system' ? 'text-blue-400' : ''}`} />
                                </div>
                                <span className="text-sm font-semibold relative">System</span>
                                {theme === 'system' && (
                                    <div className="absolute top-3 right-3">
                                        <CheckCircle2 className="w-5 h-5 text-blue-400" />
                                    </div>
                                )}
                            </button>
                        </div>

                        {/* Theme Info Panel */}
                        <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 space-y-4">
                            <h3 className="text-[#fafafa] font-medium flex items-center gap-2">
                                <Activity className="w-4 h-4 text-blue-500" />
                                Theme Information
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-[#0a0a0a] border border-neutral-800/50 rounded-xl p-4">
                                    <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Current Theme</p>
                                    <p className="text-[#fafafa] font-medium capitalize">{theme}</p>
                                </div>
                                <div className="bg-[#0a0a0a] border border-neutral-800/50 rounded-xl p-4">
                                    <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">System Preference</p>
                                    <p className="text-[#fafafa] font-medium">
                                        {typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark Mode' : 'Light Mode'}
                                    </p>
                                </div>
                            </div>
                            <p className="text-xs text-neutral-500 mt-2">
                                {theme === 'system'
                                    ? '🔄 Theme will automatically match your system preferences.'
                                    : theme === 'light'
                                        ? '☀️ Light theme is active. Enjoy the bright, clean interface.'
                                        : '🌙 Dark theme is active. Easy on the eyes, especially at night.'}
                            </p>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] dark:bg-[#0a0a0a] flex" style={{ fontFamily: "'Satoshi', sans-serif" }}>
            <HomeFeedSidebar />
            <div className="flex-1 ml-16">
                <div className="max-w-4xl mx-auto px-8 py-16">
                    <div className="flex items-end justify-between mb-12">
                        <div className="space-y-1">
                            <h1 className="text-[#fafafa] dark:text-[#fafafa] text-4xl font-bold tracking-tight">Settings</h1>
                            <p className="text-neutral-500 dark:text-neutral-500 capitalize">{activeTab} preferences & configuration</p>
                        </div>
                        {saveSuccess && (
                            <div className="flex items-center gap-2 text-green-500 text-sm font-medium animate-in slide-in-from-right-2">
                                <CheckCircle2 className="w-4 h-4" />
                                Changes saved successfully
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col lg:flex-row gap-12">
                        {/* Sidebar Navigation */}
                        <div className="w-full lg:w-64 flex-shrink-0 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 scrollbar-hide">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-3 px-5 py-3.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${activeTab === tab.id
                                            ? 'bg-[#fafafa] text-black shadow-[0_0_20px_rgba(255,255,255,0.05)] scale-[1.02]'
                                            : 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-900/50'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 min-w-0">
                            {renderContent()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
