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
    Scale
} from 'lucide-react';

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
