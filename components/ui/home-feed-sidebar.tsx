"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { 
    LayoutGrid, 
    BookOpen, 
    Code2, 
    Palette, 
    FileText, 
    Users2, 
    Gift, 
    Settings2, 
    HelpCircle,
    ChevronRight,
    Sparkles,
    LogOut,
    User,
    CreditCard
} from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';

interface HomeFeedSidebarProps {
    className?: string;
    onPeopleClick?: () => void;
    activeView?: 'home' | 'people';
}

export function HomeFeedSidebar({ className = '', onPeopleClick, activeView = 'home' }: HomeFeedSidebarProps) {
    const { data: session } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState(false);
    const moreMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
                setIsMoreOptionsOpen(false);
            }
        }
        if (isMoreOptionsOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMoreOptionsOpen]);

    const handleLogout = async () => {
        setIsMoreOptionsOpen(false);
        await signOut({ redirect: false });
        router.push("/");
    };

    const mainNavItems = [
        { id: 'home', icon: LayoutGrid, label: 'Home', route: '/home-feed' },
        { id: 'dictionary', icon: BookOpen, label: 'Dictionary', route: '/dictionary' },
        { id: 'snippets', icon: Code2, label: 'Snippets', route: '/snippets' },
        { id: 'style', icon: Palette, label: 'Style', route: '/style' },
        { id: 'scratchpad', icon: FileText, label: 'Scratchpad', route: '/scratchpad' },
    ];

    const bottomNavItems = [
        { id: 'invite', icon: Users2, label: 'Invite your team', route: '/invite' },
        { id: 'gift', icon: Gift, label: 'Get a free month', route: '/referral' },
        { id: 'settings', icon: Settings2, label: 'Settings', route: '/settings' },
        { id: 'help', icon: HelpCircle, label: 'Help', route: '/help' },
    ];

    return (
        <TooltipProvider>
            <div className={`fixed left-0 top-0 h-screen w-64 bg-[#F9F8F6] dark:bg-[#0c0c0c] border-r border-[#EBE9E2] dark:border-white/5 flex flex-col z-50 ${className}`} style={{ fontFamily: "'Inter', sans-serif" }}>
                
                {/* Logo & Plan Header */}
                <div className="px-6 py-8 flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer group" onClick={() => router.push('/home-feed')}>
                        <div className="w-8 h-8 relative flex items-center justify-center">
                            <img src="/mailient-logo.png" alt="Mailient" className="w-full h-full object-contain dark:invert" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-[#1A1A1A] dark:text-white">Mailient</span>
                    </div>
                    <div className="px-2 py-0.5 rounded-md border border-[#EBE9E2] dark:border-white/10 bg-white dark:bg-white/5 text-[10px] font-medium text-[#1A1A1A] dark:text-neutral-400">
                        Basic
                    </div>
                </div>

                {/* Sidebar Scroll Area */}
                <div className="flex-1 px-3 py-2 space-y-8 overflow-y-auto custom-scrollbar pt-2">
                    {/* General Section */}
                    <div className="space-y-1">
                        <h3 className="px-3 mb-2 text-[10px] font-bold tracking-[0.2em] text-neutral-400 dark:text-neutral-600 uppercase">
                            General
                        </h3>
                        {mainNavItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.route || (item.id === 'home' && pathname === '/home-feed');
                            
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => router.push(item.route)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 group relative ${
                                        isActive 
                                        ? 'bg-white dark:bg-white/[0.05] text-[#1A1A1A] dark:text-white font-semibold shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] border border-[#EBE9E2] dark:border-white/10' 
                                        : 'text-[#666666] dark:text-neutral-500 hover:text-[#1A1A1A] dark:hover:text-neutral-300'
                                    }`}
                                >
                                    <Icon className={`w-4 h-4 transition-colors duration-300 ${isActive ? 'text-amber-500' : 'text-[#666666] dark:text-neutral-500 group-hover:text-[#1A1A1A] dark:group-hover:text-neutral-300'}`} strokeWidth={ isActive ? 2 : 1.5} />
                                    <span className="text-[13px] tracking-tight">{item.label}</span>
                                    {isActive && (
                                        <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Workspace Section */}
                    <div className="space-y-1">
                        <h3 className="px-3 mb-2 text-[10px] font-bold tracking-[0.2em] text-neutral-400 dark:text-neutral-600 uppercase">
                            Workspace
                        </h3>
                        {bottomNavItems.slice(0, 2).map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.route;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => router.push(item.route)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 group ${
                                        isActive 
                                        ? 'bg-white dark:bg-white/[0.05] text-[#1A1A1A] dark:text-white font-semibold shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] border border-[#EBE9E2] dark:border-white/10' 
                                        : 'text-[#666666] dark:text-neutral-500 hover:text-[#1A1A1A] dark:hover:text-neutral-300'
                                    }`}
                                >
                                    <Icon className={`w-4 h-4 transition-colors duration-300 ${isActive ? 'text-[#1A1A1A] dark:text-white' : 'text-[#666666] dark:text-neutral-500 group-hover:text-[#1A1A1A] dark:group-hover:text-neutral-300'}`} strokeWidth={1.5} />
                                    <span className="text-[13px] tracking-tight">{item.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Support Section */}
                    <div className="space-y-1">
                        <h3 className="px-3 mb-2 text-[10px] font-bold tracking-[0.2em] text-neutral-400 dark:text-neutral-600 uppercase">
                            Support
                        </h3>
                        {bottomNavItems.slice(2).map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.route;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => router.push(item.route)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 group ${
                                        isActive 
                                        ? 'bg-white dark:bg-white/[0.05] text-[#1A1A1A] dark:text-white font-semibold shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] border border-[#EBE9E2] dark:border-white/10' 
                                        : 'text-[#666666] dark:text-neutral-500 hover:text-[#1A1A1A] dark:hover:text-neutral-300'
                                    }`}
                                >
                                    <Icon className={`w-4 h-4 transition-colors duration-300 ${isActive ? 'text-[#1A1A1A] dark:text-white' : 'text-[#666666] dark:text-neutral-500 group-hover:text-[#1A1A1A] dark:group-hover:text-neutral-300'}`} strokeWidth={1.5} />
                                    <span className="text-[13px] tracking-tight">{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Pro Upgrade Card - Optional, keeping it subtle at the bottom if needed but removed for a cleaner look as requested */}

                {/* User Profile */}
                <div className="px-3 pb-6 space-y-1">
                    <div className="pt-4 border-t border-[#EBE9E2] dark:border-white/5 relative" ref={moreMenuRef}>
                        <button
                            onClick={() => setIsMoreOptionsOpen(!isMoreOptionsOpen)}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white dark:hover:bg-white/[0.05] transition-all group"
                        >
                            <div className="w-6 h-6 rounded-full overflow-hidden border border-[#EBE9E2] dark:border-white/10">
                                <img
                                    src={session?.user?.image || "/user-avatar.png?v=2"}
                                    alt="User"
                                    className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all"
                                />
                            </div>
                            <span className="text-sm text-[#666666] dark:text-neutral-400 group-hover:text-[#1A1A1A] dark:group-hover:text-white truncate">
                                {session?.user?.name || 'Account'}
                            </span>
                            <ChevronRight className={`ml-auto w-4 h-4 text-[#666666] dark:text-neutral-600 transition-transform ${isMoreOptionsOpen ? 'rotate-90' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        <AnimatePresence>
                            {isMoreOptionsOpen && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute left-0 bottom-full mb-2 z-50 bg-white dark:bg-[#0a0a0a] border border-[#EBE9E2] dark:border-white/10 rounded-2xl shadow-2xl p-2 min-w-[220px] backdrop-blur-xl"
                                >
                                    <div className="px-3 py-3 mb-2 border-b border-[#EBE9E2] dark:border-white/5 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-[#EBE9E2] dark:bg-white/5">
                                            <img
                                                src={session?.user?.image || "/user-avatar.png?v=2"}
                                                alt="User"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="text-sm font-semibold text-[#1A1A1A] dark:text-white truncate">
                                                {session?.user?.name || 'User'}
                                            </span>
                                            <span className="text-[10px] text-[#666666] dark:text-neutral-500 truncate font-light">
                                                {session?.user?.email || ''}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            router.push('/settings');
                                            setIsMoreOptionsOpen(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-[#666666] dark:text-neutral-400 hover:text-[#1A1A1A] dark:hover:text-white hover:bg-[#EBE9E2]/50 dark:hover:bg-white/5 rounded-lg transition-all text-sm"
                                    >
                                        <Settings2 className="w-4 h-4" />
                                        <span>Settings</span>
                                    </button>
                                    
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-red-500/80 hover:bg-red-500/5 rounded-lg transition-all text-sm"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        <span>Logout</span>
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}

const MoreHorizontal = ({ className }: { className?: string }) => (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
    </svg>
);
