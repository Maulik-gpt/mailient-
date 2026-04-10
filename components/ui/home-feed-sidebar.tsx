"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { 
    LayoutGrid, 
    FileText, 
    Settings2, 
    ChevronRight,
    Sparkles,
    LogOut,
    Gift,
    HelpCircle,
    PanelLeft,
    MessageCircle
} from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { FeedbackDialog } from './feedback-dialog';

interface HomeFeedSidebarProps {
    className?: string;
    onPeopleClick?: () => void;
    onOpenSettings?: () => void;
    onOpenHelp?: () => void;
    onOpenRewards?: () => void;
    activeView?: 'home' | 'people';
    onCollapse?: (collapsed: boolean) => void;
    isOpen?: boolean;
    onClose?: () => void;
}

export function HomeFeedSidebar({ 
    className = '', 
    onPeopleClick, 
    onOpenSettings, 
    onOpenHelp,
    onOpenRewards,
    activeView = 'home', 
    onCollapse,
    isOpen = false,
    onClose
}: HomeFeedSidebarProps) {
    const { data: session } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [userHandle, setUserHandle] = useState<string>('');
    const moreMenuRef = useRef<HTMLDivElement>(null);

    // Fetch user handle for logout button
    useEffect(() => {
        if (session?.user?.email) {
            const emailPart = session.user.email.split('@')[0];
            setUserHandle(emailPart); // Default to email part
            
            // Try to fetch profile for actual username
            fetch('/api/profile')
                .then(res => res.json())
                .then(data => {
                    const username = data?.preferences?.username || data?.username;
                    if (username) setUserHandle(username);
                })
                .catch(err => console.error('Failed to fetch profile for handle:', err));
        }
    }, [session?.user?.email]);

    useEffect(() => {
        if (onCollapse) onCollapse(isCollapsed);
    }, [isCollapsed, onCollapse]);

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
        { id: 'notes', icon: FileText, label: 'Notes', route: '/i/notes' },
        { id: 'arcus', icon: Sparkles, label: 'Arcus', route: '/dashboard/agent-talk' },
    ];

    const bottomNavItems = [
        { id: 'gift', icon: Gift, label: 'Rewards', onClick: onOpenRewards, route: '' },
        { id: 'settings', icon: Settings2, label: 'Settings', onClick: onOpenSettings, route: '' },
        { id: 'help', icon: HelpCircle, label: 'Help', onClick: onOpenHelp, route: '' },
    ];

    return (
        <TooltipProvider>
            <motion.div 
                initial={false}
                animate={{ 
                    width: isCollapsed ? 80 : 256,
                    x: typeof window !== 'undefined' && window.innerWidth < 768 
                        ? (isOpen ? 0 : -256) 
                        : 0
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={`fixed left-0 top-0 h-screen bg-[#F9F8F6] dark:bg-[#0c0c0c] border-r border-[#EBE9E2] dark:border-white/5 flex flex-col z-[100] md:z-50 ${className} ${!isOpen ? 'pointer-events-none md:pointer-events-auto' : 'pointer-events-auto'}`}
            >
                {/* Mobile Close Button */}
                <div className="md:hidden absolute top-6 right-4">
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-neutral-600 dark:text-neutral-400"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="pt-6" />

                {/* Logo & App Name */}
                <div className={`px-6 mb-8 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} transition-all duration-300`}>
                    <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => router.push('/home-feed')}>
                        <div className="w-11 h-11 relative flex items-center justify-center rounded-[16px] overflow-hidden bg-black shadow-lg group-hover:scale-105 transition-transform">
                            <img src="/mailient-logo-v3.png" alt="Mailient" className="w-full h-full object-cover" />
                        </div>
                        {!isCollapsed && (
                            <motion.span 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="text-xl font-bold tracking-tight text-[#1A1A1A] dark:text-white"
                            >
                                Mailient
                            </motion.span>
                        )}
                    </div>
                    {!isCollapsed && (
                        <button 
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white border border-transparent hover:border-[#EBE9E2] dark:hover:border-white/10"
                        >
                            <PanelLeft className={`w-5 h-5 transition-transform duration-500 ${isCollapsed ? 'rotate-180' : ''}`} />
                        </button>
                    )}
                    {isCollapsed && (
                         <button 
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-[#0c0c0c] border border-[#EBE9E2] dark:border-white/10 rounded-full flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white shadow-sm z-50 hover:scale-110 transition-all"
                         >
                            <PanelLeft className="w-3.5 h-3.5 rotate-180" />
                         </button>
                    )}
                </div>

                {/* Sidebar Scroll Area */}
                <div className="flex-1 px-3 py-2 space-y-8 overflow-y-auto custom-scrollbar pt-2">
                    {/* Top Navigation */}
                    <div className="space-y-1">
                        {mainNavItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.route || (item.id === 'home' && pathname === '/home-feed');
                            
                            return (
                                <Tooltip key={item.id} delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <motion.button
                                            whileHover={{ x: isCollapsed ? 0 : 4 }}
                                            whileTap={{ scale: 0.97 }}
                                            onClick={() => router.push(item.route)}
                                            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-xl transition-all duration-300 group relative ${
                                                isActive 
                                                ? 'bg-white/[0.05] text-[#1A1A1A] dark:text-white font-semibold shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] border border-[#EBE9E2] dark:border-white/10' 
                                                : 'text-[#666666] dark:text-neutral-400 hover:text-[#1A1A1A] dark:hover:text-white'
                                            }`}
                                        >
                                            <Icon size={20} className={`transition-colors duration-300 ${isActive ? 'text-amber-500' : 'text-[#666666] dark:text-neutral-500 group-hover:text-black dark:group-hover:text-white'}`} strokeWidth={ isActive ? 2 : 1.5} />
                                            {!isCollapsed && <span className="text-[14px] tracking-tight">{item.label}</span>}
                                            {isActive && !isCollapsed && (
                                                <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                                            )}
                                        </motion.button>
                                    </TooltipTrigger>
                                    {isCollapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
                                </Tooltip>
                            );
                        })}
                    </div>

                </div>

                {/* Support Navigation (Pinned at bottom) */}
                <div className="px-3 pb-8 space-y-1.5 pt-12">
                    {bottomNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.route;

                        return (
                            <Tooltip key={item.id} delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <motion.button
                                        whileHover={{ x: isCollapsed ? 0 : 4 }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => {
                                            if (item.onClick) {
                                                item.onClick();
                                            } else if (item.route) {
                                                router.push(item.route);
                                            }
                                        }}
                                        className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-xl transition-all duration-300 group ${
                                            isActive 
                                            ? 'bg-white/[0.05] text-[#1A1A1A] dark:text-white font-semibold shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] border border-[#EBE9E2] dark:border-white/10' 
                                            : 'text-[#666666] dark:text-neutral-400 hover:text-[#1A1A1A] dark:hover:text-white'
                                        }`}
                                    >
                                        <Icon size={20} className={`transition-colors duration-300 ${isActive ? 'text-[#1A1A1A] dark:text-white' : 'text-[#666666] dark:text-neutral-500 group-hover:text-black dark:group-hover:text-white'}`} strokeWidth={1.5} />
                                        {!isCollapsed && <span className="text-[14px] tracking-tight">{item.label}</span>}
                                    </motion.button>
                                </TooltipTrigger>
                                {isCollapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
                            </Tooltip>
                        );
                    })}
                </div>

                {/* User Detail (Only shown when expanded) */}
                <div className="px-3 pb-6 border-t border-[#EBE9E2] dark:border-white/5">
                    <AnimatePresence>
                        {!isCollapsed && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="pt-4"
                                ref={moreMenuRef}
                            >
                                <button
                                    onClick={() => setIsMoreOptionsOpen(!isMoreOptionsOpen)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white dark:hover:bg-white/[0.05] transition-all group"
                                >
                                    <div className="w-7 h-7 rounded-full overflow-hidden border border-[#EBE9E2] dark:border-white/10 bg-white dark:bg-black">
                                        <img
                                            src={session?.user?.image || "/user-avatar.png?v=2"}
                                            alt="User"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex flex-col items-start overflow-hidden">
                                        <span className="text-[13px] font-medium text-[#1A1A1A] dark:text-white truncate w-full">
                                            {session?.user?.name || 'Account'}
                                        </span>
                                        <span className="text-[10px] text-[#666666] dark:text-neutral-500 truncate w-full">
                                            Manage Profile
                                        </span>
                                    </div>
                                    <ChevronRight className={`ml-auto w-4 h-4 text-[#666666] dark:text-neutral-600 transition-transform ${isMoreOptionsOpen ? 'rotate-90' : ''}`} />
                                </button>
                                
                                {isMoreOptionsOpen && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-2 space-y-1 px-1"
                                    >
                                        <button
                                            onClick={() => {
                                                setIsFeedbackOpen(true);
                                                setIsMoreOptionsOpen(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-white/60 hover:text-white hover:bg-white/[0.05] rounded-lg transition-all text-sm group"
                                        >
                                            <MessageCircle size={16} className="text-neutral-600 dark:text-neutral-500 group-hover:text-white transition-colors" />
                                            <span>Feedback</span>
                                        </button>
                                        <div className="h-px w-full bg-white/[0.05] my-1" />
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-red-500/80 hover:bg-red-500/5 rounded-lg transition-all text-sm"
                                        >
                                            <LogOut size={16} />
                                            <span>Log out @{userHandle}</span>
                                        </button>
                                    </motion.div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                    {isCollapsed && (
                        <div className="flex justify-center pt-4">
                             <div className="w-8 h-8 rounded-full overflow-hidden border border-[#EBE9E2] dark:border-white/10 bg-white dark:bg-black cursor-pointer" onClick={() => setIsCollapsed(false)}>
                                <img
                                    src={session?.user?.image || "/user-avatar.png?v=2"}
                                    alt="User"
                                    className="w-full h-full object-cover grayscale opacity-80"
                                />
                            </div>
                        </div>
                    )}
                </div>
                <FeedbackDialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen} />
            </motion.div>
            
            {/* Mobile Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[90] md:hidden"
                    />
                )}
            </AnimatePresence>
        </TooltipProvider>
    );
}

const MoreHorizontal = ({ className }: { className?: string }) => (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
    </svg>
);
