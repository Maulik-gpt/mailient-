'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Settings, 
  Monitor, 
  Hash, 
  User, 
  Users, 
  CreditCard, 
  Shield, 
  Mic, 
  Globe, 
  Volume2, 
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
  ShieldCheck
} from 'lucide-react';
import { ToggleSwitch } from './toggle-switch';
import { Button } from './button';
import { useSession, signOut } from 'next-auth/react';

interface SettingsCardProps {
    onClose: () => void;
}

type SettingsSection = 'general' | 'system' | 'vibe-coding' | 'account' | 'team' | 'plans' | 'privacy';

export function SettingsCard({ onClose }: SettingsCardProps) {
    const { data: session } = useSession();
    const [activeSection, setActiveSection] = useState<SettingsSection>('general');
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
    
    // Settings state
    const [appSettings, setAppSettings] = useState({
        launchAtLogin: true,
        showFlowBar: false,
        showAppInDock: true,
        dictationSounds: true,
        muteWhileDictating: false,
        privacyMode: true,
        contextAwareness: false,
        aiProtectionMode: true,
        aesProtection: true
    });

    const [accountInfo, setAccountInfo] = useState({
        firstName: session?.user?.name?.split(' ')[0] || '',
        lastName: session?.user?.name?.split(' ').slice(1).join(' ') || '',
        email: session?.user?.email || '',
        username: session?.user?.name?.toLowerCase().replace(/\s/g, '_') || 'user',
        website: 'mailient.xyz'
    });

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
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group ${
                    isActive 
                    ? 'bg-[#EBE9E2] dark:bg-white/[0.08] text-[#1A1A1A] dark:text-white font-medium shadow-sm' 
                    : 'text-[#666666] dark:text-neutral-400 hover:text-[#1A1A1A] dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
            >
                {Icon && <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-black dark:text-white' : 'text-neutral-400 group-hover:text-black dark:group-hover:text-white'}`} strokeWidth={isActive ? 2 : 1.5} />}
                <span className="text-[14px] leading-tight">{label}</span>
            </button>
        );
    };

    const PricingCard = ({ title, price, subtitle, features, buttonText, highlighted = false }: any) => (
        <div className={`flex-1 p-6 rounded-[24px] border transition-all duration-300 ${
            highlighted 
            ? 'bg-white/[0.04] border-white/20 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.5)] scale-[1.02]' 
            : 'bg-transparent border-white/5 hover:border-white/10'
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
                className={`w-full py-6 rounded-2xl text-sm font-bold transition-all ${
                    highlighted 
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
                className="w-full max-w-[920px] h-[680px] apple-glass-liquid-dark rounded-[32px] overflow-hidden flex shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] border border-white/5"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Sidebar */}
                <div className="w-[240px] bg-[#F9F8F6] dark:bg-[#0c0c0c]/80 border-r border-[#EBE9E2] dark:border-white/5 p-3 flex flex-col">
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                        <MenuButton label="Settings" category />
                        <MenuButton id="general" icon={Settings2} label="General" />
                        <MenuButton id="system" icon={Monitor} label="System" />
                        <MenuButton id="vibe-coding" icon={Hash} label="Vibe coding" />
                        
                        <div className="my-2 h-px bg-neutral-200 dark:bg-white/5" />
                        
                        <MenuButton label="Account" category />
                        <MenuButton id="account" icon={User} label="Account" />
                        <MenuButton id="team" icon={Users} label="Team" />
                        <MenuButton id="plans" icon={CreditCard} label="Plans and Billing" />
                        <MenuButton id="privacy" icon={Shield} label="Data and Privacy" />
                    </div>

                    {/* Footer Info */}
                    <div className="px-4 py-4 flex items-center justify-between mt-auto">
                        <span className="text-[11px] text-neutral-400 dark:text-neutral-600 font-medium">Flow v1.4.549</span>
                        <div className="w-4 h-4 rounded-full bg-neutral-200 dark:bg-white/5 flex items-center justify-center">
                            <Cloud className="w-2.5 h-2.5 text-neutral-400 dark:text-neutral-600" />
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 bg-white/5 dark:bg-transparent flex flex-col h-full relative">
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
                                    <div className="bg-[#FAF9F6] dark:bg-white/[0.03] rounded-3xl p-8 border border-[#EBE9E2] dark:border-white/5 space-y-8">
                                        <div className="flex items-center justify-between group">
                                            <div className="space-y-1">
                                                <h3 className="text-[15px] font-semibold text-[#1A1A1A] dark:text-white">Shortcuts</h3>
                                                <p className="text-sm text-neutral-400 dark:text-neutral-500">
                                                    Hold <span className="text-[#1A1A1A] dark:text-white font-medium">Ctrl</span> + <span className="text-[#1A1A1A] dark:text-white font-medium">Win</span> and speak. <span className="text-neutral-400 dark:text-neutral-500 hover:text-black dark:hover:text-white cursor-pointer underline underline-offset-4">Learn more →</span>
                                                </p>
                                            </div>
                                            <Button variant="ghost" className="bg-[#EBE9E2] dark:bg-white/[0.06] hover:bg-[#DEDCD4] dark:hover:bg-white/[0.1] text-neutral-700 dark:text-neutral-200 px-6 h-10 rounded-xl text-sm font-medium">Change</Button>
                                        </div>
                                        <div className="h-px bg-[#EBE9E2] dark:bg-white/5" />
                                        <div className="flex items-center justify-between group">
                                            <div className="space-y-1">
                                                <h3 className="text-[15px] font-semibold text-[#1A1A1A] dark:text-white">Microphone</h3>
                                                <p className="text-sm text-neutral-400 dark:text-neutral-500">Auto-detect (Array)</p>
                                            </div>
                                            <Button variant="ghost" className="bg-[#EBE9E2] dark:bg-white/[0.06] hover:bg-[#DEDCD4] dark:hover:bg-white/[0.1] text-neutral-700 dark:text-neutral-200 px-6 h-10 rounded-xl text-sm font-medium">Change</Button>
                                        </div>
                                        <div className="h-px bg-[#EBE9E2] dark:bg-white/5" />
                                        <div className="flex items-center justify-between group">
                                            <div className="space-y-1">
                                                <h3 className="text-[15px] font-semibold text-[#1A1A1A] dark:text-white">Languages</h3>
                                                <p className="text-sm text-neutral-400 dark:text-neutral-500">English</p>
                                            </div>
                                            <Button variant="ghost" className="bg-[#EBE9E2] dark:bg-white/[0.06] hover:bg-[#DEDCD4] dark:hover:bg-white/[0.1] text-neutral-700 dark:text-neutral-200 px-6 h-10 rounded-xl text-sm font-medium">Change</Button>
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
                                        <h2 className="text-[13px] font-bold tracking-wider text-neutral-400 dark:text-neutral-500 uppercase px-1">App settings</h2>
                                        <div className="bg-[#FAF9F6] dark:bg-white/[0.03] rounded-3xl p-8 border border-[#EBE9E2] dark:border-white/5 space-y-8">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[15px] font-medium text-[#1A1A1A] dark:text-white">Launch app at login</span>
                                                <ToggleSwitch checked={appSettings.launchAtLogin} onChange={(v) => setAppSettings(p => ({...p, launchAtLogin: v}))} />
                                            </div>
                                            <div className="h-px bg-[#EBE9E2] dark:bg-white/5" />
                                            <div className="flex items-center justify-between">
                                                <span className="text-[15px] font-medium text-[#1A1A1A] dark:text-white">Show Arcus bar at all times</span>
                                                <ToggleSwitch checked={appSettings.showFlowBar} onChange={(v) => setAppSettings(p => ({...p, showFlowBar: v}))} />
                                            </div>
                                            <div className="h-px bg-[#EBE9E2] dark:bg-white/5" />
                                            <div className="flex items-center justify-between">
                                                <span className="text-[15px] font-medium text-[#1A1A1A] dark:text-white">Show app in dock</span>
                                                <ToggleSwitch checked={appSettings.showAppInDock} onChange={(v) => setAppSettings(p => ({...p, showAppInDock: v}))} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h2 className="text-[13px] font-bold tracking-wider text-neutral-400 dark:text-neutral-500 uppercase px-1">Sound</h2>
                                        <div className="bg-[#FAF9F6] dark:bg-white/[0.03] rounded-3xl p-8 border border-[#EBE9E2] dark:border-white/5 space-y-8">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[15px] font-medium text-[#1A1A1A] dark:text-white">Dictation sound effects</span>
                                                <ToggleSwitch checked={appSettings.dictationSounds} onChange={(v) => setAppSettings(p => ({...p, dictationSounds: v}))} />
                                            </div>
                                            <div className="h-px bg-[#EBE9E2] dark:bg-white/5" />
                                            <div className="flex items-center justify-between">
                                                <span className="text-[15px] font-medium text-[#1A1A1A] dark:text-white">Mute music while dictating</span>
                                                <ToggleSwitch checked={appSettings.muteWhileDictating} onChange={(v) => setAppSettings(p => ({...p, muteWhileDictating: v}))} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h2 className="text-[13px] font-bold tracking-wider text-neutral-400 dark:text-neutral-500 uppercase px-1">Extras</h2>
                                        <div className="bg-[#FAF9F6] dark:bg-white/[0.03] rounded-[24px] p-6 border border-[#EBE9E2] dark:border-white/5 flex items-center justify-center gap-4">
                                            <Button 
                                                variant="outline" 
                                                className="flex-1 bg-white dark:bg-white/5 border-[#EBE9E2] dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-white/[0.08] text-[#1A1A1A] dark:text-white py-6 rounded-2xl flex items-center justify-center gap-2 group"
                                            >
                                                <RefreshCw className="w-4 h-4 text-neutral-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                                                <span>Reset app</span>
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                className="flex-1 bg-white dark:bg-white/5 border-[#EBE9E2] dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-white/[0.08] text-[#1A1A1A] dark:text-white py-6 rounded-2xl flex items-center justify-center gap-2 group"
                                            >
                                                <Power className="w-4 h-4 text-neutral-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                                                <span>Relaunch app</span>
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
                                    <div className="bg-[#FAF9F6] dark:bg-white/[0.03] rounded-[32px] p-1 border border-[#EBE9E2] dark:border-white/5 overflow-hidden">
                                        <div className="p-8 space-y-10">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[15px] font-medium text-neutral-500 dark:text-neutral-400">First name</span>
                                                <input 
                                                    type="text" 
                                                    value={accountInfo.firstName}
                                                    onChange={(e) => setAccountInfo(p => ({...p, firstName: e.target.value}))}
                                                    className="bg-white dark:bg-white/[0.05] border border-[#EBE9E2] dark:border-white/10 rounded-xl px-4 py-2 text-[15px] text-[#1A1A1A] dark:text-white w-64 focus:ring-2 focus:ring-black dark:focus:ring-white transition-all outline-none"
                                                />
                                            </div>
                                            <div className="h-px bg-[#EBE9E2] dark:bg-white/5" />
                                            <div className="flex items-center justify-between">
                                                <span className="text-[15px] font-medium text-neutral-500 dark:text-neutral-400">Last name</span>
                                                <input 
                                                    type="text" 
                                                    value={accountInfo.lastName}
                                                    onChange={(e) => setAccountInfo(p => ({...p, lastName: e.target.value}))}
                                                    className="bg-white dark:bg-white/[0.05] border border-[#EBE9E2] dark:border-white/10 rounded-xl px-4 py-2 text-[15px] text-[#1A1A1A] dark:text-white w-64 focus:ring-2 focus:ring-black dark:focus:ring-white transition-all outline-none"
                                                />
                                            </div>
                                            <div className="h-px bg-[#EBE9E2] dark:bg-white/5" />
                                            <div className="flex items-center justify-between">
                                                <span className="text-[15px] font-medium text-neutral-500 dark:text-neutral-400">Email</span>
                                                <span className="text-[15px] text-neutral-900 dark:text-neutral-300 font-medium">{accountInfo.email}</span>
                                            </div>
                                            <div className="h-px bg-[#EBE9E2] dark:bg-white/5" />
                                            <div className="flex items-center justify-between">
                                                <span className="text-[15px] font-medium text-neutral-500 dark:text-neutral-400">Username</span>
                                                <span className="text-[15px] text-neutral-900 dark:text-neutral-300 font-medium">{accountInfo.username}</span>
                                            </div>
                                            <div className="h-px bg-[#EBE9E2] dark:bg-white/5" />
                                            <div className="flex items-center justify-between">
                                                <span className="text-[15px] font-medium text-neutral-500 dark:text-neutral-400">Website</span>
                                                <span className="text-[15px] text-neutral-900 dark:text-neutral-300 font-medium">{accountInfo.website}</span>
                                            </div>
                                            <div className="h-px bg-[#EBE9E2] dark:bg-white/5" />
                                            <div className="flex items-center justify-between">
                                                <span className="text-[15px] font-medium text-neutral-500 dark:text-neutral-400">Profile picture</span>
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
                                                className="bg-[#EBE9E2] dark:bg-white/[0.05] hover:bg-neutral-200 dark:hover:bg-white/[0.08] text-neutral-700 dark:text-neutral-300 px-6 h-12 rounded-2xl flex items-center gap-2 font-medium"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                Sign out
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                className="text-neutral-400 hover:text-red-500 transition-colors flex items-center gap-2 font-medium"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Delete account
                                            </Button>
                                        </div>
                                        <Button className="bg-neutral-800 dark:bg-white text-white dark:text-black px-10 h-12 rounded-2xl font-bold hover:opacity-90 transition-opacity">
                                            Save
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
                                                "2 AI Notes per month",
                                                "Secure Google OAuth"
                                            ]}
                                            buttonText="Start Free"
                                        />
                                        <PricingCard 
                                            subtitle="For individual founders"
                                            title="Starter"
                                            price={7.99}
                                            highlighted={true}
                                            features={[
                                                "10 AI Drafts per day",
                                                "10 Sift Analyses per day",
                                                "20 Arcus AI messages per day",
                                                "30 Email Summaries per day",
                                                "50 AI Notes per month",
                                                "30 Scheduled Calls per month"
                                            ]}
                                            buttonText="Get Started"
                                        />
                                        <PricingCard 
                                            subtitle="For power users & teams"
                                            title="Pro"
                                            price={29.99}
                                            features={[
                                                "Everything in Starter",
                                                "Unlimited AI Drafts",
                                                "Unlimited Sift Analyses",
                                                "Unlimited Arcus AI messages",
                                                "Unlimited Email Summaries",
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
                                    <div className="bg-[#FAF9F6] dark:bg-white/[0.03] rounded-[32px] p-8 border border-[#EBE9E2] dark:border-white/5 space-y-10">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1 max-w-[480px]">
                                                <h3 className="text-[17px] font-bold text-[#1A1A1A] dark:text-white">Privacy Mode</h3>
                                                <p className="text-sm text-neutral-400 dark:text-neutral-500 leading-relaxed">
                                                    If enabled, none of your dictation data will be stored or used for model training by us or any third party (zero data retention).
                                                </p>
                                            </div>
                                            <ToggleSwitch checked={appSettings.privacyMode} onChange={(v) => setAppSettings(p => ({...p, privacyMode: v}))} />
                                        </div>

                                        <div className="h-px bg-[#EBE9E2] dark:bg-white/5" />

                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1 max-w-[480px]">
                                                <h3 className="text-[17px] font-bold text-[#1A1A1A] dark:text-white">Context awareness</h3>
                                                <p className="text-sm text-neutral-400 dark:text-neutral-500 leading-relaxed">
                                                    Allow Flow to use limited, relevant text content from the app you're dictating in to spell names correctly and better understand you.
                                                </p>
                                            </div>
                                            <ToggleSwitch checked={appSettings.contextAwareness} onChange={(v) => setAppSettings(p => ({...p, contextAwareness: v}))} />
                                        </div>

                                        <div className="h-px bg-[#EBE9E2] dark:bg-white/5" />

                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1 max-w-[480px]">
                                                <h3 className="text-[17px] font-bold text-[#1A1A1A] dark:text-white">AI Protection Mode</h3>
                                                <p className="text-sm text-neutral-400 dark:text-neutral-500 leading-relaxed">
                                                    Enables advanced heuristic checks to prevent prompt injection and unauthorized data exfiltration during AI processing.
                                                </p>
                                            </div>
                                            <ToggleSwitch checked={appSettings.aiProtectionMode} onChange={(v) => setAppSettings(p => ({...p, aiProtectionMode: v}))} />
                                        </div>

                                        <div className="h-px bg-[#EBE9E2] dark:bg-white/5" />

                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1 max-w-[480px]">
                                                <h3 className="text-[17px] font-bold text-[#1A1A1A] dark:text-white">AES-256 Encryption</h3>
                                                <p className="text-sm text-neutral-400 dark:text-neutral-500 leading-relaxed">
                                                    Ensures all your local and synced data is encrypted with military-grade AES-256 standard before storage.
                                                </p>
                                            </div>
                                            <ToggleSwitch checked={appSettings.aesProtection} onChange={(v) => setAppSettings(p => ({...p, aesProtection: v}))} />
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center gap-4 py-8 border border-emerald-500/20 bg-emerald-500/[0.02] rounded-[32px] relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                                            <ShieldCheck className="w-8 h-8 text-emerald-500" />
                                        </div>
                                        <div className="text-center relative z-10">
                                            <h4 className="text-white text-lg font-bold mb-1 tracking-tight">Enterprise Shield Active</h4>
                                            <p className="text-neutral-500 text-sm max-w-[320px] mx-auto">Your identity and conversations are shielded by private encrypted tunnels.</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 px-4 py-2 opacity-30">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                        <span className="text-[11px] text-neutral-400 font-bold tracking-[0.2em] uppercase">HIPAA COMPLIANCE INFRASTRUCTURE</span>
                                    </div>
                                </motion.div>
                            )}

                            {activeSection === 'vibe-coding' && (
                                <motion.div
                                    key="vibe-coding"
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex flex-col items-center justify-center py-20 bg-[#FAF9F6] dark:bg-white/[0.03] rounded-3xl border border-[#EBE9E2] dark:border-white/5"
                                >
                                    <div className="w-20 h-20 bg-black dark:bg-white rounded-[24px] flex items-center justify-center mb-6 shadow-2xl">
                                        <Hash className="w-10 h-10 text-white dark:text-black" />
                                    </div>
                                    <h2 className="text-2xl font-serif text-[#1A1A1A] dark:text-white mb-2">Vibe Coding</h2>
                                    <p className="text-neutral-400 dark:text-neutral-500 text-center max-w-[320px] mb-8 leading-relaxed">
                                        Configure your coding atmosphere and Arcus AI personality.
                                    </p>
                                    <div className="flex gap-3">
                                        <Button className="rounded-xl px-8 h-11 bg-black dark:bg-white text-white dark:text-black font-medium hover:opacity-90 transition-all">Enable Experimental</Button>
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
