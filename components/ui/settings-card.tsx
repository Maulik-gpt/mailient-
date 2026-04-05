'use client';

import React, { useState, useEffect, useRef } from 'react';
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
    Volume2,
    Sparkles,
    HelpCircle,
    ChevronLeft,
    Download,
    Edit3,
    Camera,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { ToggleSwitch } from './toggle-switch';
import { Button } from './button';
import { DropdownMenu } from './dropdown-menu';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useDashboardSettings } from '@/lib/DashboardSettingsContext';
import { toast } from 'sonner';
import { 
    Info, 
    ArrowRight, 
    ExternalLink, 
    History
} from 'lucide-react';
import { VerificationCard } from './verification-card';
import { CancellationFlow } from './cancellation-flow';
import { ThemeToggle } from './theme-toggle';

interface SettingsCardProps {
    onClose: () => void;
}

type SettingsSection = 'general' | 'system' | 'account' | 'team' | 'subscription' | 'usage' | 'privacy';

export function SettingsCard({ onClose }: SettingsCardProps) {
    const { data: session, update: updateSession } = useSession();
    const router = useRouter();
    const { settings, updateSetting, resetCache, relaunchApp, subscriptionData, setSubscriptionData } = useDashboardSettings();
    const [activeSection, setActiveSection] = useState<SettingsSection>('general');
    const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);
    const [subView, setSubView] = useState<'summary' | 'manage'>('summary');
    const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);

    const isPro = subscriptionData?.planType?.toLowerCase() === 'pro';
    const isStarter = subscriptionData?.planType?.toLowerCase() === 'starter';
    const isFree = !isPro && !isStarter;

    useEffect(() => {
        const fetchSubscription = async () => {
            if (activeSection === 'subscription' || activeSection === 'usage') {
                // Only show loading if we don't have data yet
                if (!subscriptionData) {
                    setIsLoadingSubscription(true);
                }
                
                try {
                    const response = await fetch('/api/subscription/usage');
                    if (response.ok) {
                        const data = await response.json();
                        setSubscriptionData(data);
                    }
                } catch (error) {
                    console.error('Error fetching subscription data:', error);
                } finally {
                    setIsLoadingSubscription(false);
                }
            }
        };

        fetchSubscription();
    }, [activeSection, setSubscriptionData]);

    const [accountInfo, setAccountInfo] = useState({
        firstName: '',
        lastName: '',
        email: '',
        username: '',
        picture: '/arcus-ai-icon.jpg'
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch('/api/user/profile');
                if (response.ok) {
                    const data = await response.json();
                    setAccountInfo({
                        firstName: data.name?.split(' ')[0] || '',
                        lastName: data.name?.split(' ').slice(1).join(' ') || '',
                        email: data.email || '',
                        username: data.username || '',
                        picture: data.picture || '/arcus-ai-icon.jpg'
                    });
                } else {
                    console.error('Failed to fetch profile:', response.status, response.statusText);
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            }
        };
        fetchProfile();
    }, []);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePhotoClick = () => {
        fileInputRef.current?.click();
    };

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Visual feedback immediately
        const reader = new FileReader();
        reader.onload = (event) => {
            setAccountInfo(prev => ({ ...prev, picture: event.target?.result as string }));
        };
        reader.readAsDataURL(file);

        // Upload to server
        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const response = await fetch('/api/profile/avatar', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                setAccountInfo(prev => ({ ...prev, picture: data.url }));
                toast.success('Photo uploaded!');
            } else {
                toast.error('Failed to upload photo');
            }
        } catch (error) {
            console.error('Photo upload error:', error);
            toast.error('Error uploading photo');
        }
    };

    const [isSaving, setIsSaving] = useState(false);

    const handleSaveAccount = async () => {
        if (!accountInfo.firstName?.trim()) {
            toast.error('First Name is required');
            return;
        }
        setIsSaving(true);
        try {
            const response = await fetch('/api/user/update-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: `${accountInfo.firstName} ${accountInfo.lastName}`,
                    username: accountInfo.username,
                    picture: accountInfo.picture
                }),
            });

            if (response.ok) {
                toast.success('Profile updated successfully');
                // Force a session update to refresh components globally
                await updateSession();
            } else {
                const errorData = await response.json();
                console.error('Profile update failed:', errorData);
                toast.error(errorData.error || 'Failed to update profile');
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
                    <span className="text-[10px] font-bold tracking-[0.15em] text-neutral-500 dark:text-neutral-400 uppercase">
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
                        ? 'bg-black/[0.05] dark:bg-white/[0.1] text-black dark:text-white font-serif tracking-tight shadow-sm'
                        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:text-neutral-200 hover:bg-neutral-50 dark:bg-white/5'
                    }`}
            >
                {Icon && <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-black dark:text-white' : 'text-neutral-500 dark:text-neutral-400 group-hover:text-black dark:group-hover:text-white'}`} strokeWidth={isActive ? 2 : 1.5} />}
                <span className="text-[14px] leading-tight">{label}</span>
            </button>
        );
    };



    return (
        <>
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/10 dark:bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full max-w-[1020px] h-[600px] bg-black dark:bg-[#1a1a1a] rounded-[16px] overflow-hidden flex shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] border border-neutral-200 dark:border-white/5"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Sidebar */}
                <div className="w-[240px] bg-neutral-50 dark:bg-[#141414] border-r border-neutral-200 dark:border-white/5 p-3 flex flex-col">
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                        <MenuButton label="Settings" category />
                        <MenuButton id="general" icon={Settings2} label="General" />
                        <MenuButton id="system" icon={Monitor} label="System" />

                        <div className="my-2 h-px bg-neutral-200 dark:bg-white/5" />

                        <MenuButton label="Account" category />
                        <MenuButton id="account" icon={User} label="Account" />
                        <MenuButton id="team" icon={Users} label="Team" />
                        <MenuButton id="subscription" icon={CreditCard} label="Subscription" />
                        <MenuButton id="usage" icon={Zap} label="Usage" />
                        <MenuButton id="privacy" icon={Shield} label="Data and Privacy" />

                        <div className="my-2 h-px bg-neutral-200 dark:bg-white/5" />
                        
                        <button
                            onClick={() => router.push('/help')}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-black dark:bg-white/5"
                        >
                            <HelpCircle className="w-4 h-4 text-neutral-500 dark:text-neutral-400" strokeWidth={1.5} />
                            <span className="text-[14px] leading-tight">Help Center</span>
                        </button>
                    </div>

                    {/* Footer Info */}
                    <div className="px-4 py-4 flex items-center justify-between mt-auto">
                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">Mailient v1.0.1</span>
                        <div className="w-4 h-4 rounded-full bg-neutral-200 dark:bg-white/5 flex items-center justify-center">
                            <Cloud className="w-2.5 h-2.5 text-neutral-500 dark:text-neutral-400" />
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
                            className="text-4xl font-serif text-black dark:text-white capitalize tracking-tight"
                        >
                            {activeSection === 'subscription' ? 'Subscription' : activeSection === 'usage' ? 'Usage' : activeSection === 'privacy' ? 'Data and Privacy' : activeSection.replace('-', ' ')}
                        </motion.h1>

                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-50 dark:bg-white/5 transition-colors group absolute top-6 right-6"
                        >
                            <X className="w-5 h-5 text-neutral-600 group-hover:text-black dark:group-hover:text-white" />
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
                                    <div className="bg-neutral-50 dark:bg-white/5 rounded-3xl p-8 border border-neutral-200 dark:border-white/5 space-y-8">
                                        <div className="flex items-center justify-between group">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Moon className="w-4 h-4 text-purple-500" />
                                                    <h3 className="text-[15px] font-semibold text-black dark:text-white">Appearance</h3>
                                                </div>
                                                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                                    Toggle between Light, Dark, or System mode.
                                                </p>
                                            </div>
                                            <ThemeToggle />
                                        </div>
                                        <div className="h-px bg-neutral-50 dark:bg-white/5" />
                                        <div className="flex items-center justify-between group">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Sparkles className="w-4 h-4 text-amber-500" />
                                                    <h3 className="text-[15px] font-semibold text-black dark:text-white">Smart Nudges</h3>
                                                </div>
                                                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                                    AI-powered reminders for emails you might have forgotten to reply to.
                                                </p>
                                            </div>
                                            <ToggleSwitch checked={settings.smartNudges} onChange={(v) => updateSetting('smartNudges', v)} />
                                        </div>
                                        <div className="h-px bg-neutral-50 dark:bg-white/5" />
                                        <div className="flex items-center justify-between group">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Keyboard className="w-4 h-4 text-blue-500" />
                                                    <h3 className="text-[15px] font-semibold text-black dark:text-white">Default Draft Tone</h3>
                                                </div>
                                                <p className="text-sm text-neutral-600 dark:text-neutral-500">Current: <span className="text-black dark:text-white capitalize">{settings.aiTone}</span></p>
                                            </div>
                                            <DropdownMenu
                                                options={[
                                                    { 
                                                        label: "Professional", 
                                                        onClick: () => updateSetting('aiTone', 'professional'),
                                                        Icon: <Shield className="w-4 h-4" />,
                                                        active: settings.aiTone === 'professional'
                                                    },
                                                    { 
                                                        label: "Friendly", 
                                                        onClick: () => updateSetting('aiTone', 'friendly'),
                                                        Icon: <Users className="w-4 h-4" />,
                                                        active: settings.aiTone === 'friendly'
                                                    },
                                                    { 
                                                        label: "Concise", 
                                                        onClick: () => updateSetting('aiTone', 'concise'),
                                                        Icon: <Zap className="w-4 h-4" />,
                                                        active: settings.aiTone === 'concise'
                                                    },
                                                    { 
                                                        label: "Humorous", 
                                                        onClick: () => updateSetting('aiTone', 'humorous'),
                                                        Icon: <Sparkles className="w-4 h-4" />,
                                                        active: settings.aiTone === 'humorous'
                                                    },
                                                    { 
                                                        label: "Mimic My Style", 
                                                        onClick: () => updateSetting('aiTone', 'mimic'),
                                                        Icon: <Cpu className="w-4 h-4" />,
                                                        active: settings.aiTone === 'mimic'
                                                    },
                                                ]}
                                                align="right"
                                            >
                                                {settings.aiTone === 'professional' ? 'Professional' : 
                                                 settings.aiTone === 'friendly' ? 'Friendly' :
                                                 settings.aiTone === 'concise' ? 'Concise' :
                                                 settings.aiTone === 'humorous' ? 'Humorous' :
                                                 settings.aiTone === 'mimic' ? 'Mimic (AI)' : 'Select Tone'}
                                            </DropdownMenu>
                                        </div>
                                        {settings.aiTone === 'mimic' && (
                                            <div className="bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-yellow-500/5 border border-amber-400/25 rounded-2xl p-4 mt-2">
                                                <p className="text-[13px] text-black dark:text-white/90 leading-relaxed">
                                                    <Sparkles className="w-3.5 h-3.5 inline mr-1.5 mb-0.5 text-amber-400" />
                                                    <strong className="text-black dark:text-white font-semibold">AI Voice Cloning:</strong>{' '}
                                                    <span className="text-neutral-900 dark:text-neutral-300">Mailient will analyze your sent emails to perfectly replicate your writing style. This process happens automatically when drafting.</span>
                                                </p>
                                            </div>
                                        )}
                                        <div className="h-px bg-neutral-50 dark:bg-white/5" />
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <MousePointer2 className="w-4 h-4 text-emerald-500" />
                                                    <h3 className="text-[15px] font-semibold text-black dark:text-white">Smart Thread Grouping</h3>
                                                </div>
                                                <p className="text-sm text-neutral-500 dark:text-neutral-400">Automatically group related emails using Sift AI.</p>
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
                                        <h2 className="text-[13px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400 uppercase px-1">Display & Notifications</h2>
                                        <div className="bg-neutral-50 dark:bg-white/5 rounded-3xl p-8 border border-neutral-200 dark:border-white/5 space-y-8">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Bell className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                                                    <span className="text-[15px] font-medium text-black dark:text-white">Desktop Notifications</span>
                                                </div>
                                                <ToggleSwitch checked={settings.notifications} onChange={(v) => updateSetting('notifications', v)} />
                                            </div>
                                            <div className="h-px bg-neutral-50 dark:bg-white/5" />
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Volume2 className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                                                    <span className="text-[15px] font-medium text-black dark:text-white">Email Sound Effects</span>
                                                </div>
                                                <ToggleSwitch checked={settings.soundEffects} onChange={(v) => updateSetting('soundEffects', v)} />
                                            </div>
                                            <div className="h-px bg-neutral-50 dark:bg-white/5" />
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Monitor className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                                                    <span className="text-[15px] font-medium text-black dark:text-white">Compact UI Mode</span>
                                                </div>
                                                <ToggleSwitch checked={settings.compactMode} onChange={(v) => updateSetting('compactMode', v)} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h2 className="text-[13px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400 uppercase px-1">App Maintenance</h2>
                                        <div className="bg-neutral-50 dark:bg-white/5 rounded-[24px] p-6 border border-neutral-200 dark:border-white/5 flex items-center justify-center gap-4">
                                            <Button
                                                variant="outline"
                                                onClick={resetCache}
                                                className="border-neutral-200 dark:border-white/10 hover:bg-neutral-50 dark:bg-white/5 text-neutral-600 hover:text-black dark:text-white px-8 h-12 rounded-2xl flex items-center gap-2"
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                                Reset Local Cache
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={relaunchApp}
                                                className="border-neutral-200 dark:border-white/10 hover:bg-neutral-50 dark:bg-white/5 text-neutral-600 hover:text-black dark:text-white px-8 h-12 rounded-2xl flex items-center gap-2"
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
                                    <div className="bg-neutral-50 dark:bg-white/5 rounded-[16px] p-1 border border-neutral-200 dark:border-white/5 overflow-hidden">
                                    <div className="p-8 space-y-10">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[15px] font-medium text-neutral-500 dark:text-neutral-400">First name</span>
                                                <input
                                                    type="text"
                                                    value={accountInfo.firstName}
                                                    onChange={(e) => setAccountInfo(p => ({ ...p, firstName: e.target.value }))}
                                                    className="bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl px-4 py-2 text-[15px] text-black dark:text-white w-64 focus:ring-2 focus:ring-white transition-all outline-none"
                                                />
                                            </div>
                                            <div className="h-px bg-neutral-50 dark:bg-white/5" />
                                            <div className="flex items-center justify-between">
                                                <span className="text-[15px] font-medium text-neutral-500 dark:text-neutral-400">Last name</span>
                                                <input
                                                    type="text"
                                                    value={accountInfo.lastName}
                                                    onChange={(e) => setAccountInfo(p => ({ ...p, lastName: e.target.value }))}
                                                    className="bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl px-4 py-2 text-[15px] text-black dark:text-white w-64 focus:ring-2 focus:ring-white transition-all outline-none"
                                                />
                                            </div>
                                            <div className="h-px bg-neutral-50 dark:bg-white/5" />
                                            <div className="flex items-center justify-between">
                                                <span className="text-[15px] font-medium text-neutral-500 dark:text-neutral-400">Email</span>
                                                <span className="text-[15px] text-neutral-900 dark:text-neutral-300 font-medium">{accountInfo.email}</span>
                                            </div>
                                            <div className="h-px bg-neutral-50 dark:bg-white/5" />
                                            <div className="flex items-center justify-between">
                                                <span className="text-[15px] font-medium text-neutral-500 dark:text-neutral-400">Username</span>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 dark:text-neutral-500">@</span>
                                                    <input
                                                        type="text"
                                                        value={accountInfo.username}
                                                        onChange={(e) => setAccountInfo(p => ({ ...p, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') }))}
                                                        className="bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl pl-8 pr-4 py-2 text-[15px] text-black dark:text-white w-64 focus:ring-2 focus:ring-white transition-all outline-none"
                                                        placeholder="username"
                                                    />
                                                </div>
                                            </div>
                                            <div className="h-px bg-neutral-50 dark:bg-white/5" />
                                             <div className="flex items-center justify-between">
                                                <span className="text-[15px] font-medium text-neutral-500 dark:text-neutral-400">Profile picture</span>
                                                <div 
                                                    onClick={handlePhotoClick}
                                                    className="w-14 h-14 rounded-full overflow-hidden border-2 border-neutral-200 dark:border-white/10 group cursor-pointer relative shadow-lg hover:border-white/30 transition-all"
                                                >
                                                    <img
                                                        src={accountInfo.picture}
                                                        alt="Profile"
                                                        className="w-full h-full object-cover group-hover:opacity-40 transition-all duration-300"
                                                    />
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                                                        <Camera className="w-5 h-5 text-black dark:text-white mb-0.5" />
                                                        <span className="text-[8px] font-bold text-black dark:text-white uppercase tracking-tighter">Change</span>
                                                    </div>
                                                    <input 
                                                        type="file" 
                                                        ref={fileInputRef}
                                                        onChange={handlePhotoChange}
                                                        accept="image/*"
                                                        className="hidden" 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between px-2">
                                        <div className="flex gap-4">
                                            <Button
                                                variant="ghost"
                                                onClick={() => signOut()}
                                                className="bg-black/5 hover:bg-black/10 dark:bg-white/10 text-neutral-900 dark:text-neutral-300 px-6 h-12 rounded-2xl flex items-center gap-2 font-medium"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                Sign out
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                onClick={handleDeleteAccount}
                                                className="text-neutral-500 dark:text-neutral-400 hover:text-red-500 transition-colors flex items-center gap-2 font-medium"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Delete account
                                            </Button>
                                        </div>
                                        <Button 
                                            onClick={handleSaveAccount}
                                            disabled={isSaving}
                                            className="bg-neutral-800 dark:bg-white text-black px-10 h-12 rounded-2xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                                        >
                                            {isSaving ? 'Saving...' : 'Save'}
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {activeSection === 'subscription' && (
                                <motion.div
                                    key="subscription"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-8"
                                >
                                    {isLoadingSubscription ? (
                                        <div className="flex items-center justify-center py-20">
                                            <RefreshCw className="w-8 h-8 text-neutral-600 dark:text-neutral-500 animate-spin" />
                                        </div>
                                    ) : subView === 'summary' ? (
                                        <div className="bg-neutral-50 dark:bg-white/5 rounded-[16px] p-8 border border-neutral-200 dark:border-white/5 space-y-10">
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-1">
                                                    <p className="text-[11px] text-neutral-600 dark:text-neutral-500 font-bold tracking-wider uppercase">Current Plan</p>
                                                    <h3 className="text-4xl font-serif text-black dark:text-white capitalize">{subscriptionData?.planType || 'Free'}</h3>
                                                </div>
                                                <Button 
                                                    onClick={() => setSubView('manage')}
                                                    className="bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-200 px-8 h-12 rounded-2xl font-bold transition-all"
                                                >
                                                    Manage Subscription
                                                </Button>
                                            </div>

                                            <div className="h-px bg-neutral-50 dark:bg-white/5" />

                                            <div className="grid grid-cols-2 gap-10">
                                                <div className="space-y-1">
                                                    <p className="text-[11px] text-neutral-600 dark:text-neutral-500 font-bold tracking-wider uppercase">Status</p>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${
                                                            subscriptionData?.hasActiveSubscription || subscriptionData?.planType === 'free' 
                                                                ? 'bg-emerald-500' 
                                                                : subscriptionData?.planType !== 'free' && subscriptionData?.subscriptionEndsAt && new Date(subscriptionData.subscriptionEndsAt) < new Date()
                                                                    ? 'bg-red-500'
                                                                    : 'bg-neutral-500'
                                                        }`} />
                                                        <p className="text-[15px] font-medium text-black dark:text-white">
                                                            {subscriptionData?.hasActiveSubscription || subscriptionData?.planType === 'free' 
                                                                ? 'Active' 
                                                                : subscriptionData?.planType !== 'free' && subscriptionData?.subscriptionEndsAt && new Date(subscriptionData.subscriptionEndsAt) < new Date()
                                                                    ? 'Expired'
                                                                    : 'Inactive'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[11px] text-neutral-600 dark:text-neutral-500 font-bold tracking-wider uppercase">
                                                        {subscriptionData?.subscriptionEndsAt && new Date(subscriptionData.subscriptionEndsAt) < new Date() ? 'Expiraton date' : 'Billing cycle'}
                                                    </p>
                                                    <p className="text-[15px] font-medium text-black dark:text-white">
                                                        {subscriptionData?.subscriptionEndsAt 
                                                            ? `${new Date(subscriptionData.subscriptionEndsAt) < new Date() ? 'Expired on' : 'Renews on'} ${new Date(subscriptionData.subscriptionEndsAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}`
                                                            : subscriptionData?.planType === 'free' ? 'Lifetime access' : 'No active billing cycle'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="h-px bg-neutral-50 dark:bg-white/5" />

                                            <div className="space-y-6">
                                                <p className="text-[11px] text-neutral-600 dark:text-neutral-500 font-bold tracking-wider uppercase">Active Payment Method</p>
                                                <div className="flex justify-center">
                                                    <VerificationCard 
                                                        idNumber={(() => {
                                                            if (isFree) {
                                                                const stableId = subscriptionData?.subscriptionId || session?.user?.email || "GUEST";
                                                                // Generate a cleaner 4-char suffix from the hash of the ID to avoid ".COM" issues
                                                                const hash = (stableId || "").split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
                                                                const suffix = (hash % 10000).toString().padStart(4, '0');
                                                                return `ML-${suffix}`;
                                                            }
                                                            // Priority 1: Direct last4 from subscription record (set by Polar webhook)
                                                            if (subscriptionData?.paymentMethodLast4) {
                                                                return `**** **** **** ${subscriptionData.paymentMethodLast4}`;
                                                            }
                                                            // Priority 2: Parse from payment method string in payments array
                                                            const latestPayment = subscriptionData?.payments?.[0];
                                                            if (latestPayment?.last4) {
                                                                return `**** **** **** ${latestPayment.last4}`;
                                                            }
                                                            if (latestPayment?.method) {
                                                                const parts = latestPayment.method.split(' ');
                                                                const lastPart = parts[parts.length - 1];
                                                                if (lastPart.match(/^\d{4}$/)) {
                                                                    return `**** **** **** ${lastPart}`;
                                                                }
                                                                return latestPayment.method;
                                                            }
                                                            return "CARD PENDING";
                                                        })()}
                                                        name={(session?.user?.name || "").toUpperCase()}
                                                        validThru={subscriptionData?.subscriptionEndsAt ? new Date(subscriptionData.subscriptionEndsAt).toLocaleDateString(undefined, { month: '2-digit', year: '2-digit' }) : "—"}
                                                        label={isFree ? "MEMBER CARD" : `${subscriptionData?.planType?.toUpperCase()} MEMBER`}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                            <div className="space-y-8">
                                                <div className="flex items-center justify-between">
                                                    <Button 
                                                        variant="ghost" 
                                                        onClick={() => setSubView('summary')}
                                                        className="text-neutral-600 hover:text-black dark:text-white flex items-center gap-2 group"
                                                    >
                                                        <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                                                        Back to overview
                                                    </Button>
                                                    <Button 
                                                        variant="outline"
                                                        onClick={() => window.open('https://polar.sh/mailient/portal', '_blank')}
                                                        className="border-neutral-200 dark:border-white/10 text-black dark:text-white hover:bg-neutral-50 dark:bg-white/5 rounded-xl h-10 px-4 flex items-center gap-2"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                        Polar Portal
                                                    </Button>
                                                </div>

                                                <div className="space-y-2">
                                                    <h3 className="text-2xl font-serif text-black dark:text-white">Billing Management</h3>
                                                    <p className="text-sm text-neutral-500 dark:text-neutral-400">View your payment history and manage your active plan.</p>
                                                </div>

                                                <div className="space-y-6 pt-4">
                                                    <h4 className="text-xl font-serif text-black dark:text-white">Payment History</h4>
                                                    <div className="bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/5 rounded-3xl overflow-hidden">
                                                        <table className="w-full text-left">
                                                            <thead className="bg-black/[0.02] dark:bg-white/[0.02] border-b border-neutral-200 dark:border-white/5">
                                                                <tr>
                                                                    <th className="px-6 py-4 text-xs font-bold text-neutral-600 dark:text-neutral-500 uppercase tracking-wider">Invoice</th>
                                                                    <th className="px-6 py-4 text-xs font-bold text-neutral-600 dark:text-neutral-500 uppercase tracking-wider">Date</th>
                                                                    <th className="px-6 py-4 text-xs font-bold text-neutral-600 dark:text-neutral-500 uppercase tracking-wider">Amount</th>
                                                                    <th className="px-6 py-4 text-xs font-bold text-neutral-600 dark:text-neutral-500 uppercase tracking-wider"></th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-white/5">
                                                                {(subscriptionData?.invoices || []).map((invoice: any) => (
                                                                    <tr key={invoice.id} className="hover:bg-black/[0.02] dark:bg-white/[0.02] transition-colors">
                                                                        <td className="px-6 py-4 font-mono text-[13px] text-black dark:text-white">{invoice.number}</td>
                                                                        <td className="px-6 py-4 text-[13px] text-neutral-500 dark:text-neutral-400">{new Date(invoice.date).toLocaleDateString()}</td>
                                                                        <td className="px-6 py-4 text-[13px] text-black dark:text-white">${invoice.amount}</td>
                                                                        <td className="px-6 py-4 text-right">
                                                                            <button 
                                                                                onClick={() => {
                                                                                    // Generate a simple text blob as a placeholder "PDF"
                                                                                    const content = `Mailient Invoice ${invoice.number}\nDate: ${new Date(invoice.date).toLocaleDateString()}\nAmount: $${invoice.amount}\nStatus: PAID\n\nThank you for choosing Mailient.`;
                                                                                    const blob = new Blob([content], { type: 'text/plain' });
                                                                                    const url = window.URL.createObjectURL(blob);
                                                                                    const link = document.createElement('a');
                                                                                    link.href = url;
                                                                                    link.download = `invoice-${invoice.number}.txt`;
                                                                                    document.body.appendChild(link);
                                                                                    link.click();
                                                                                    document.body.removeChild(link);
                                                                                    window.URL.revokeObjectURL(url);
                                                                                    toast.success('Invoice downloaded successfully');
                                                                                }}
                                                                                className="p-2 hover:bg-neutral-50 dark:bg-white/5 rounded-lg text-neutral-600 hover:text-black dark:text-white"
                                                                            >
                                                                                <Download className="w-4 h-4" />
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>

                                                {/* Cancellation Section - Moved below payment history per request */}
                                                {!isFree && (
                                                    <div className="pt-8 border-t border-neutral-200 dark:border-white/5">
                                                        {!isConfirmingCancel ? (
                                                            <div className="bg-red-500/5 border border-red-500/10 rounded-3xl p-8 space-y-4">
                                                                <div className="flex items-center gap-3 text-red-500">
                                                                    <AlertCircle className="w-5 h-5" />
                                                                    <h4 className="text-lg font-serif">Cancel Subscription</h4>
                                                                </div>
                                                                <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-lg leading-relaxed">
                                                                    We're sorry to see you go. If you cancel, you will maintain your {isPro ? 'Pro' : 'Starter'} features until the end of your current billing period on <strong>{subscriptionData?.subscriptionEndsAt ? new Date(subscriptionData.subscriptionEndsAt).toLocaleDateString() : 'the end of the month'}</strong>.
                                                                </p>
                                                                <Button 
                                                                    onClick={() => setIsConfirmingCancel(true)}
                                                                    variant="ghost" 
                                                                    className="bg-red-500/10 text-red-500 hover:text-red-400 hover:bg-red-500/20 px-6 h-11 rounded-2xl font-medium flex items-center gap-2 transition-all mt-2"
                                                                >
                                                                    Yes, I want to cancel my plan
                                                                    <ArrowRight className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <CancellationFlow
                                                                isOpen={isConfirmingCancel}
                                                                onClose={() => setIsConfirmingCancel(false)}
                                                                subscriptionEndsAt={subscriptionData?.subscriptionEndsAt}
                                                                onConfirm={async (reasons, feedback) => {
                                                                    const response = await fetch('/api/subscription/cancel', { 
                                                                        method: 'POST',
                                                                        headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({ reasons, feedback })
                                                                    });
                                                                    
                                                                    if (response.ok) {
                                                                        toast.success('Subscription revoked. Access remains valid until period end.');
                                                                        setIsConfirmingCancel(false);
                                                                        // Refresh subscription data
                                                                        const refresh = await fetch('/api/subscription/usage');
                                                                        if (refresh.ok) setSubscriptionData(await refresh.json());
                                                                    } else {
                                                                        toast.error('Failed to revoke subscription. Please contact support.');
                                                                    }
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                    )}
                                </motion.div>
                            )}

                            {activeSection === 'usage' && (
                                <motion.div
                                    key="usage"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-6"
                                >
                                    {isLoadingSubscription ? (
                                        <div className="flex items-center justify-center py-20">
                                            <RefreshCw className="w-8 h-8 text-neutral-600 dark:text-neutral-500 animate-spin" />
                                        </div>
                                    ) : (
                                        <div className="bg-neutral-50 dark:bg-[#141414] rounded-[16px] p-8 border border-neutral-200 dark:border-white/5">
                                            <div className="flex items-center justify-between mb-8">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] text-neutral-600 dark:text-neutral-500 font-bold uppercase tracking-widest">Active Tier</p>
                                                    <h3 className="text-2xl font-serif text-black dark:text-white capitalize">{subscriptionData?.planType || 'Free'}</h3>
                                                </div>
                                                <Button 
                                                    className="bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-200 px-6 h-9 rounded-full text-[13px] font-bold shadow-sm"
                                                    onClick={() => setActiveSection('subscription')}
                                                >
                                                    {isFree ? 'Upgrade' : 'Manage'}
                                                </Button>
                                            </div>

                                            <div className="border-t border-dashed border-neutral-200 dark:border-white/10 mb-8" />

                                            <div className="space-y-8">
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <Sparkles className="w-4 h-4 text-neutral-500 dark:text-neutral-400" strokeWidth={1.5} />
                                                            <div className="flex items-center gap-1.5">
                                                                 <span className="text-[15px] font-medium text-black dark:text-white">Credits</span>
                                                                 <HelpCircle className="w-3.5 h-3.5 text-neutral-600 cursor-help" />
                                                            </div>
                                                        </div>
                                                        <span className="text-[15px] font-medium text-black dark:text-white">{(subscriptionData?.features?.arcus_ai?.remaining || 0) + (subscriptionData?.features?.sift_analysis?.remaining || 0)}</span>
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <RefreshCw className="w-4 h-4 text-neutral-500 dark:text-neutral-400" strokeWidth={1.5} />
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[15px] font-medium text-black dark:text-white">Daily refresh credits</span>
                                                                <HelpCircle className="w-3.5 h-3.5 text-neutral-600 cursor-help" />
                                                            </div>
                                                        </div>
                                                        <span className="text-[15px] font-medium text-black dark:text-white">{subscriptionData?.features?.arcus_ai?.remaining || 0}</span>
                                                    </div>
                                                    <p className="text-[11px] text-neutral-600 pl-7">
                                                        Refresh to {subscriptionData?.features?.arcus_ai?.limit || 50} at 00:00 every day
                                                    </p>
                                                </div>
                                                
                                                <div className="pt-6 border-t border-neutral-200 dark:border-white/5 grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <span className="text-[11px] text-neutral-600 dark:text-neutral-500 uppercase font-bold tracking-wider">Sift AI</span>
                                                        <p className="text-black dark:text-white text-[14px]">{subscriptionData?.features?.sift_analysis?.remaining} / {subscriptionData?.features?.sift_analysis?.limit}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-[11px] text-neutral-600 dark:text-neutral-500 uppercase font-bold tracking-wider">Summaries</span>
                                                        <p className="text-black dark:text-white text-[14px]">{subscriptionData?.features?.email_summary?.remaining} / {subscriptionData?.features?.email_summary?.limit}</p>
                                                    </div>
                                                </div>

                                                <div className="pt-6 border-t border-neutral-200 dark:border-white/5 space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <Cpu className="w-4 h-4 text-neutral-500 dark:text-neutral-400" strokeWidth={1.5} />
                                                            <span className="text-[15px] font-medium text-black dark:text-white">Token Credits Consumed</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-[17px] font-serif text-black dark:text-white">{(subscriptionData?.features?.openai_tokens?.usage || 0).toLocaleString()}</span>
                                                            <span className="text-[11px] text-neutral-600 dark:text-neutral-500 font-sans ml-1.5 uppercase tracking-wider">tokens</span>
                                                        </div>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-neutral-50 dark:bg-white/5 rounded-full overflow-hidden">
                                                        <motion.div 
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${Math.min(100, ((subscriptionData?.features?.openai_tokens?.usage || 0) / (subscriptionData?.features?.openai_tokens?.limit || 50000)) * 100)}%` }}
                                                            className="h-full bg-black dark:bg-white" 
                                                        />
                                                    </div>
                                                    <div className="flex justify-between items-center text-[10px] text-neutral-600 dark:text-neutral-500 font-bold uppercase tracking-widest pl-1">
                                                        <span>OpenRouter Cluster Usage</span>
                                                        <span>{isPro ? 'Unlimited' : `${Math.round(((subscriptionData?.features?.openai_tokens?.usage || 0) / (subscriptionData?.features?.openai_tokens?.limit || 50000)) * 100)}% of quota`}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {activeSection === 'privacy' && (
                                <motion.div
                                    key="privacy"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="space-y-8"
                                >
                                    <div className="bg-neutral-50 dark:bg-white/5 rounded-[16px] p-8 border border-neutral-200 dark:border-white/5 space-y-10">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1 max-w-[480px]">
                                                <h3 className="text-[17px] font-bold text-black dark:text-white">Enhanced Privacy Mode</h3>
                                                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                                    When active, Mailient does not store your conversation history on our cloud. Everything stays local to your browser.
                                                </p>
                                            </div>
                                            <ToggleSwitch checked={settings.privacyMode} onChange={(v) => updateSetting('privacyMode', v)} />
                                        </div>

                                        <div className="h-px bg-neutral-50 dark:bg-white/5" />

                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1 max-w-[480px]">
                                                <h3 className="text-[17px] font-bold text-black dark:text-white">AI Protection Guard</h3>
                                                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                                    Prevents prompt injection attacks and exfiltration attempts from your email data.
                                                </p>
                                            </div>
                                            <ToggleSwitch checked={settings.aiProtection} onChange={(v) => updateSetting('aiProtection', v)} />
                                        </div>

                                        <div className="h-px bg-neutral-50 dark:bg-white/5" />

                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1 max-w-[480px]">
                                                <h3 className="text-[17px] font-bold text-black dark:text-white">Local AES-256 Storage</h3>
                                                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                                    Encrypts all locally cached emails and drafts before saving them to IndexedDB.
                                                </p>
                                            </div>
                                            <ToggleSwitch checked={settings.aesEncryption} onChange={(v) => updateSetting('aesEncryption', v)} />
                                        </div>

                                        <div className="h-px bg-neutral-50 dark:bg-white/5" />

                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1 max-w-[480px]">
                                                <h3 className="text-[17px] font-bold text-black dark:text-white">Training Contribution</h3>
                                                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                                    Allow Mailient to use anonymized feedback to improve its email composition models.
                                                </p>
                                            </div>
                                            <ToggleSwitch checked={settings.trainingData} onChange={(v) => updateSetting('trainingData', v)} />
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center gap-4 py-8 border border-emerald-500/20 bg-emerald-500/[0.02] rounded-[16px] relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                                            <ShieldCheck className="w-8 h-8 text-emerald-500" />
                                        </div>
                                        <div className="text-center relative z-10">
                                            <h4 className="text-black dark:text-white text-lg font-bold mb-1 tracking-tight">Mailient Shield Active</h4>
                                            <p className="text-neutral-600 dark:text-neutral-500 text-sm max-w-[320px] mx-auto">Your identity and inbox are protected by state-of-the-art encryption.</p>
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
                                    <Users className="w-12 h-12 text-neutral-500 dark:text-neutral-400 mb-4 animate-pulse-slow" />
                                    <p className="text-neutral-500 dark:text-neutral-400 font-medium">Coming soon</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </motion.div>
        </>
    );
}

const Edit = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
);
