'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Settings,
    Monitor,
    User,
    Users,
    CreditCard,
    Shield,
    RefreshCw,
    Power,
    ChevronRight,
    Command,
    Cloud,
    Moon,
    Keyboard,
    Settings2,
    Check,
    LogOut,
    Trash2,
    Lock,
    Cpu,
    ShieldCheck,
    Zap,
    Bell,
    Languages,
    MousePointer2,
    Volume2
} from 'lucide-react';
import { ToggleSwitch } from './toggle-switch';
import { Button } from './button';
import { useSession, signOut } from 'next-auth/react';
import { useDashboardSettings } from '@/lib/DashboardSettingsContext';
import { toast } from 'sonner';

interface SettingsCardProps {
    onClose: () => void;
}

type SettingsSection = 'general' | 'system' | 'account' | 'team' | 'plans' | 'privacy';

export function SettingsCard({ onClose }: SettingsCardProps) {
    const { data: session } = useSession();
    const { settings, updateSetting, resetCache, relaunchApp } = useDashboardSettings();
    const [activeSection, setActiveSection] = useState<SettingsSection>('general');

    const [accountInfo, setAccountInfo] = useState({
        firstName: session?.user?.name?.split(' ')[0] || '',
        lastName: session?.user?.name?.split(' ').slice(1).join(' ') || '',
        email: session?.user?.email || '',
        username: session?.user?.name?.toLowerCase().replace(/\s/g, '_') || 'user',
    });

    const [isSaving, setIsSaving] = useState(false);

    const handleSaveAccount = async () => {
        setIsSaving(true);
        try {
            const response = await fetch('/api/user/update-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: `${accountInfo.firstName} ${accountInfo.lastName}`,
                    username: accountInfo.username,
                }),
            });

            if (response.ok) {
                toast.success('Profile updated successfully');
            } else {
                toast.error('Failed to update profile');
            }
        } catch (error) {
            toast.error('An error occurred');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (confirm('Are you sure you want to delete your account? This action is permanent and will wipe all your data.')) {
            try {
                const response = await fetch('/api/user/delete-account', { method: 'DELETE' });
                if (response.ok) {
                    signOut({ callbackUrl: '/' });
                } else {
                    toast.error('Failed to delete account');
                }
            } catch (error) {
                toast.error('An error occurred');
            }
        }
    };

    const MenuButton = ({ id, icon: Icon, label, category = false }: { id?: SettingsSection, icon?: any, label: string, category?: boolean }) => {
        if (category) {
            return (
                <div className="px-4 py-3 first:pt-4">
                    <span className="text-[10px] font-bold tracking-[0.15em] text-neutral-400 dark:text-neutral-500 uppercase">
                        {label}
                    </span>
                </div>
            );
        }

        const isActive = activeSection === id;

        return (
            <button
                onClick={() => id && setActiveSection(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ${isActive
                        ? 'bg-white/[0.08] text-white font-medium shadow-sm'
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                    }`}
            >
                {Icon && <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-black dark:text-white' : 'text-neutral-400 group-hover:text-black dark:group-hover:text-white'}`} strokeWidth={isActive ? 2 : 1.5} />}
                <span className="text-[14px] leading-tight">{label}</span>
            </button>
        );
    };

    const PricingCard = ({ title, price, subtitle, features, buttonText, highlighted = false }: any) => (
        <div className={`flex-1 p-6 rounded-[24px] border transition-all duration-300 ${highlighted
                ? 'bg-white/[0.08] border-white/20 shadow-2xl scale-[1.02]'
                : 'bg-white/5 border-white/5 hover:border-white/10'
            }`}>
            <div className="mb-6">
                <p className="text-[11px] text-neutral-500 font-bold tracking-wider uppercase mb-2">{subtitle}</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-serif text-white">{title}</h3>
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-2xl font-semibold text-white">
                        {price === 0 ? 'Free' : price === 7.99 ? '$7.99' : price === 29.99 ? '$29.99' : `₹${price}`}
                    </span>
                    <span className="text-xs text-neutral-500">/month</span>
                </div>
            </div>

            <div className="space-y-4 mb-8">
                {features.map((feature: string, i: number) => (
                    <div key={i} className="flex gap-3 items-start">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-[13px] text-neutral-400 leading-snug">{feature}</span>
                    </div>
                ))}
            </div>

            <Button
                variant={highlighted ? "default" : "outline"}
                className={`w-full py-6 rounded-2xl text-sm font-bold transition-all ${highlighted
                        ? 'bg-white text-black hover:bg-neutral-200'
                        : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                    }`}
            >
                {buttonText}
            </Button>
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full max-w-[1020px] h-[600px] bg-[#1a1a1a] rounded-[32px] overflow-hidden flex shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] border border-white/5"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Sidebar */}
                <div className="w-[240px] bg-[#141414] border-r border-white/5 p-3 flex flex-col">
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                        <MenuButton label="Settings" category />
                        <MenuButton id="general" icon={Settings2} label="General" />
                        <MenuButton id="system" icon={Monitor} label="System" />

                        <div className="my-2 h-px bg-neutral-200 dark:bg-white/5" />

                        <MenuButton label="Account" category />
                        <MenuButton id="account" icon={User} label="Account" />
                        <MenuButton id="team" icon={Users} label="Team" />
                        <MenuButton id="plans" icon={CreditCard} label="Plans and Billing" />
                        <MenuButton id="privacy" icon={Shield} label="Data and Privacy" />
                    </div>

                    {/* Footer Info */}
                    <div className="px-4 py-4 flex items-center justify-between mt-auto">
                        <span className="text-[11px] text-neutral-400 dark:text-neutral-600 font-medium">Mailient v1.0.1</span>
                        <div className="w-4 h-4 rounded-full bg-neutral-200 dark:bg-white/5 flex items-center justify-center">
                            <Cloud className="w-2.5 h-2.5 text-neutral-400 dark:text-neutral-600" />
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col h-full relative">
                    {/* Header Title */}
                    <div className="px-10 pt-12 pb-8 flex items-center justify-between">
                        <motion.h1
                            key={activeSection}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-4xl font-serif text-[#1A1A1A] dark:text-white capitalize tracking-tight"
                        >
                            {activeSection === 'plans' ? 'Plans and Billing' : activeSection === 'privacy' ? 'Data and Privacy' : activeSection.replace('-', ' ')}
                        </motion.h1>

                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors group absolute top-6 right-6"
                        >
                            <X className="w-5 h-5 text-neutral-400 group-hover:text-black dark:group-hover:text-white" />
                        </button>
                    </div>

                    <div className="px-10 pb-12 overflow-y-auto flex-1 custom-scrollbar">
                        <AnimatePresence mode="wait">
                            {activeSection === 'general' && (
                                <motion.div
                                    key="general"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-6"
                                >
                                    <div className="bg-white/5 rounded-3xl p-8 border border-white/5 space-y-8">
                                        <div className="flex items-center justify-between group">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Zap className="w-4 h-4 text-amber-500" />
                                                    <h3 className="text-[15px] font-semibold text-white">Arcus AI Shortcut</h3>
                                                </div>
                                                <p className="text-sm text-neutral-400">
                                                    Default key: <kbd className="bg-white/10 px-1.5 py-0.5 rounded border border-white/10 text-white">Cmd + K</kbd> to summon Arcus anywhere.
                                                </p>
                                            </div>
                                            <Button variant="ghost" className="bg-white/5 hover:bg-white/10 text-neutral-200 px-6 h-10 rounded-xl text-sm font-medium">Rebind</Button>
                                        </div>
                                        <div className="h-px bg-white/5" />
                                        <div className="flex items-center justify-between group">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Keyboard className="w-4 h-4 text-blue-500" />
                                                    <h3 className="text-[15px] font-semibold text-white">Default Draft Tone</h3>
                                                </div>
                                                <p className="text-sm text-neutral-500">Current: <span className="text-white capitalize">{settings.aiTone}</span></p>
                                            </div>
                                            <select
                                                value={settings.aiTone}
                                                onChange={(e) => updateSetting('aiTone', e.target.value)}
                                                className="bg-white/5 text-neutral-200 px-4 h-10 rounded-xl text-sm font-medium outline-none border-none cursor-pointer"
                                            >
                                                <option value="professional">Professional</option>
                                                <option value="friendly">Friendly</option>
                                                <option value="concise">Concise</option>
                                                <option value="humorous">Humorous</option>
                                            </select>
                                        </div>
                                        <div className="h-px bg-white/5" />
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <MousePointer2 className="w-4 h-4 text-emerald-500" />
                                                    <h3 className="text-[15px] font-semibold text-white">Smart Thread Grouping</h3>
                                                </div>
                                                <p className="text-sm text-neutral-400">Automatically group related emails using Sift AI.</p>
                                            </div>
                                            <ToggleSwitch checked={settings.smartGrouping} onChange={(v) => updateSetting('smartGrouping', v)} />
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeSection === 'system' && (
                                <motion.div
                                    key="system"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-8"
                                >
                                    <div className="space-y-4">
                                        <h2 className="text-[13px] font-bold tracking-wider text-neutral-400 dark:text-neutral-500 uppercase px-1">Display & Notifications</h2>
                                        <div className="bg-white/5 rounded-3xl p-8 border border-white/5 space-y-8">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Bell className="w-4 h-4 text-neutral-400" />
                                                    <span className="text-[15px] font-medium text-white">Desktop Notifications</span>
                                                </div>
                                                <ToggleSwitch checked={settings.notifications} onChange={(v) => updateSetting('notifications', v)} />
                                            </div>
                                            <div className="h-px bg-white/5" />
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Volume2 className="w-4 h-4 text-neutral-400" />
                                                    <span className="text-[15px] font-medium text-white">Email Sound Effects</span>
                                                </div>
                                                <ToggleSwitch checked={settings.soundEffects} onChange={(v) => updateSetting('soundEffects', v)} />
                                            </div>
                                            <div className="h-px bg-white/5" />
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Monitor className="w-4 h-4 text-neutral-400" />
                                                    <span className="text-[15px] font-medium text-white">Compact UI Mode</span>
                                                </div>
                                                <ToggleSwitch checked={settings.compactMode} onChange={(v) => updateSetting('compactMode', v)} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h2 className="text-[13px] font-bold tracking-wider text-neutral-400 dark:text-neutral-500 uppercase px-1">App Maintenance</h2>
                                        <div className="bg-white/5 rounded-[24px] p-6 border border-white/5 flex items-center justify-center gap-4">
                                            <Button
                                                variant="outline"
                                                onClick={resetCache}
                                                className="border-white/10 hover:bg-white/5 text-neutral-400 hover:text-white px-8 h-12 rounded-2xl flex items-center gap-2"
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                                Reset Local Cache
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={relaunchApp}
                                                className="border-white/10 hover:bg-white/5 text-neutral-400 hover:text-white px-8 h-12 rounded-2xl flex items-center gap-2"
                                            >
                                                <Power className="w-4 h-4" />
                                                Relaunch App
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeSection === 'account' && (
                                <motion.div
                                    key="account"
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="space-y-10 focus:outline-none"
                                >
                                    <div className="bg-white/5 rounded-[32px] p-1 border border-white/5 overflow-hidden">
                                    <div className="p-8 space-y-10">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[15px] font-medium text-neutral-400">First name</span>
                                                <input
                                                    type="text"
                                                    value={accountInfo.firstName}
                                                    onChange={(e) => setAccountInfo(p => ({ ...p, firstName: e.target.value }))}
                                                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[15px] text-white w-64 focus:ring-2 focus:ring-white transition-all outline-none"
                                                />
                                            </div>
                                            <div className="h-px bg-white/5" />
                                            <div className="flex items-center justify-between">
                                                <span className="text-[15px] font-medium text-neutral-400">Last name</span>
                                                <input
                                                    type="text"
                                                    value={accountInfo.lastName}
                                                    onChange={(e) => setAccountInfo(p => ({ ...p, lastName: e.target.value }))}
                                                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[15px] text-white w-64 focus:ring-2 focus:ring-white transition-all outline-none"
                                                />
                                            </div>
                                            <div className="h-px bg-white/5" />
                                            <div className="flex items-center justify-between">
                                                <span className="text-[15px] font-medium text-neutral-400">Email</span>
                                                <span className="text-[15px] text-neutral-300 font-medium">{accountInfo.email}</span>
                                            </div>
                                            <div className="h-px bg-white/5" />
                                            <div className="flex items-center justify-between">
                                                <span className="text-[15px] font-medium text-neutral-400">Username</span>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">@</span>
                                                    <input
                                                        type="text"
                                                        value={accountInfo.username}
                                                        onChange={(e) => setAccountInfo(p => ({ ...p, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') }))}
                                                        className="bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-2 text-[15px] text-white w-64 focus:ring-2 focus:ring-white transition-all outline-none"
                                                        placeholder="username"
                                                    />
                                                </div>
                                            </div>
                                            <div className="h-px bg-white/5" />
                                            <div className="flex items-center justify-between">
                                                <span className="text-[15px] font-medium text-neutral-400">Profile picture</span>
                                                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/10 group cursor-pointer relative">
                                                    <img
                                                        src={session?.user?.image || "/arcus-ai-icon.jpg"}
                                                        alt="Profile"
                                                        className="w-full h-full object-cover group-hover:opacity-50 transition-opacity"
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Edit className="w-4 h-4 text-white" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between px-2">
                                        <div className="flex gap-4">
                                            <Button
                                                variant="ghost"
                                                onClick={() => signOut()}
                                                className="bg-white/5 hover:bg-white/10 text-neutral-300 px-6 h-12 rounded-2xl flex items-center gap-2 font-medium"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                Sign out
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                onClick={handleDeleteAccount}
                                                className="text-neutral-400 hover:text-red-500 transition-colors flex items-center gap-2 font-medium"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Delete account
                                            </Button>
                                        </div>
                                        <Button 
                                            onClick={handleSaveAccount}
                                            disabled={isSaving}
                                            className="bg-neutral-800 dark:bg-white text-white dark:text-black px-10 h-12 rounded-2xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                                        >
                                            {isSaving ? 'Saving...' : 'Save'}
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {activeSection === 'plans' && (
                                <motion.div
                                    key="plans"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-8"
                                >
                                    <div className="flex gap-6 items-stretch">
                                        <PricingCard
                                            subtitle="The basics"
                                            title="Free"
                                            price={0}
                                            features={[
                                                "1 AI Draft per day",
                                                "1 Sift Analysis per day",
                                                "5 Arcus AI messages per day",
                                                "3 Email Summaries per day",
                                                "Secure Google OAuth"
                                            ]}
                                            buttonText="Start Free"
                                        />
                                        <PricingCard
                                            subtitle="For heavy users"
                                            title="Starter"
                                            price={7.99}
                                            highlighted={true}
                                            features={[
                                                "10 AI Drafts per day",
                                                "10 Sift Analyses per day",
                                                "20 Arcus AI messages per day",
                                                "30 Email Summaries per day",
                                                "30 Scheduled Calls per month"
                                            ]}
                                            buttonText="Get Started"
                                        />
                                        <PricingCard
                                            subtitle="Unlimited Power"
                                            title="Pro"
                                            price={29.99}
                                            features={[
                                                "Everything in Starter",
                                                "Unlimited AI Drafts",
                                                "Unlimited Sift Analyses",
                                                "Unlimited Arcus messages",
                                                "Priority Support"
                                            ]}
                                            buttonText="Level up to Pro"
                                        />
                                    </div>
                                </motion.div>
                            )}

                            {activeSection === 'privacy' && (
                                <motion.div
                                    key="privacy"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="space-y-8"
                                >
                                    <div className="bg-white/5 rounded-[32px] p-8 border border-white/5 space-y-10">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1 max-w-[480px]">
                                                <h3 className="text-[17px] font-bold text-white">Enhanced Privacy Mode</h3>
                                                <p className="text-sm text-neutral-400 leading-relaxed">
                                                    When active, Mailient does not store your conversation history on our cloud. Everything stays local to your browser.
                                                </p>
                                            </div>
                                            <ToggleSwitch checked={settings.privacyMode} onChange={(v) => updateSetting('privacyMode', v)} />
                                        </div>

                                        <div className="h-px bg-white/5" />

                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1 max-w-[480px]">
                                                <h3 className="text-[17px] font-bold text-white">AI Protection Guard</h3>
                                                <p className="text-sm text-neutral-400 leading-relaxed">
                                                    Prevents prompt injection attacks and exfiltration attempts from your email data.
                                                </p>
                                            </div>
                                            <ToggleSwitch checked={settings.aiProtection} onChange={(v) => updateSetting('aiProtection', v)} />
                                        </div>

                                        <div className="h-px bg-white/5" />

                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1 max-w-[480px]">
                                                <h3 className="text-[17px] font-bold text-white">Local AES-256 Storage</h3>
                                                <p className="text-sm text-neutral-400 leading-relaxed">
                                                    Encrypts all locally cached emails and drafts before saving them to IndexedDB.
                                                </p>
                                            </div>
                                            <ToggleSwitch checked={settings.aesEncryption} onChange={(v) => updateSetting('aesEncryption', v)} />
                                        </div>

                                        <div className="h-px bg-white/5" />

                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1 max-w-[480px]">
                                                <h3 className="text-[17px] font-bold text-white">Training Contribution</h3>
                                                <p className="text-sm text-neutral-400 leading-relaxed">
                                                    Allow Mailient to use anonymized feedback to improve its email composition models.
                                                </p>
                                            </div>
                                            <ToggleSwitch checked={settings.trainingData} onChange={(v) => updateSetting('trainingData', v)} />
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center gap-4 py-8 border border-emerald-500/20 bg-emerald-500/[0.02] rounded-[32px] relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                                            <ShieldCheck className="w-8 h-8 text-emerald-500" />
                                        </div>
                                        <div className="text-center relative z-10">
                                            <h4 className="text-white text-lg font-bold mb-1 tracking-tight">Mailient Shield Active</h4>
                                            <p className="text-neutral-500 text-sm max-w-[320px] mx-auto">Your identity and inbox are protected by state-of-the-art encryption.</p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {['team'].includes(activeSection) && (
                                <motion.div
                                    key="placeholder"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex flex-col items-center justify-center py-32 opacity-30"
                                >
                                    <Users className="w-12 h-12 text-neutral-400 mb-4 animate-pulse-slow" />
                                    <p className="text-neutral-400 font-medium">Coming soon</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

const Edit = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
);
