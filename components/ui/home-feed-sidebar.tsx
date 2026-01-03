"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { Mail, Bell, User, MoreHorizontal, LogOut, Settings, CreditCard, UserPlus, NotebookPen } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { NotificationIcon } from '@/components/ui/notification-icon';

interface HomeFeedSidebarProps {
    className?: string;
}

export function HomeFeedSidebar({ className = '' }: HomeFeedSidebarProps) {
    const { data: session } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState(false);
    const [imageError, setImageError] = useState(false);
    const moreMenuRef = useRef<HTMLDivElement>(null);

    // Close more menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
                setIsMoreOptionsOpen(false);
            }
        }

        if (isMoreOptionsOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMoreOptionsOpen]);

    const handleLogout = async () => {
        setIsMoreOptionsOpen(false);
        await signOut({ redirect: false });
        router.push("/");
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const navItems = [
        { id: 'home', icon: Mail, label: 'Home', route: '/home-feed' },
        { id: 'notifications', icon: NotificationIcon, label: 'Notifications', route: '/notifications', isCustomIcon: true },
        { id: 'notes', icon: NotebookPen, label: 'Notes', route: '/i/notes' },
        { id: 'arcus', icon: null, label: 'Arcus', route: '/dashboard/agent-talk', isArcus: true },
    ];

    return (
        <TooltipProvider>
            <div className={`fixed left-0 top-0 h-screen w-16 bg-[#0a0a0a] dark:bg-[#0a0a0a] border-r border-neutral-800/50 dark:border-neutral-800/50 flex flex-col items-center py-6 z-50 ${className}`}>
                <div className="mb-8 group cursor-pointer" onClick={() => router.push('/home-feed')}>
                    <div className="w-12 h-12 bg-black rounded-[35%] border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.08)]">
                        <img src="/mailient-logo.png" alt="Mailient" className="w-full h-full object-cover" />
                    </div>
                </div>
                <div className="flex flex-col items-center gap-6 w-full">
                    {navItems.map((item) => {
                        const isActive = pathname === item.route;

                        if (item.isArcus) {
                            return (
                                <Tooltip key={item.id} delayDuration={100}>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={() => router.push(item.route)}
                                            className={`p-3 transition-all duration-300 hover:scale-105 flex items-center justify-center w-10 h-10 rounded-xl ${isActive ? 'bg-neutral-800 dark:bg-neutral-800' : 'hover:bg-neutral-900 dark:hover:bg-neutral-900'}`}
                                            aria-label={item.label}
                                        >
                                            <span className="text-[#fafafa] dark:text-[#fafafa] font-serif italic text-xl">A</span>
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                        <p>{item.label}</p>
                                    </TooltipContent>
                                </Tooltip>
                            );
                        }

                        const Icon = item.icon;

                        return (
                            <Tooltip key={item.id} delayDuration={100}>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => router.push(item.route)}
                                        className={`p-2 transition-all duration-300 hover:scale-105 rounded-xl ${isActive ? 'bg-neutral-800 dark:bg-neutral-800' : 'hover:bg-neutral-900 dark:hover:bg-neutral-900'}`}
                                        aria-label={item.label}
                                    >
                                        {item.isCustomIcon ? (
                                            <NotificationIcon iconClassName={`w-5 h-5 ${isActive ? 'text-[#fafafa] dark:text-[#fafafa]' : 'text-neutral-500 dark:text-neutral-500'}`} />
                                        ) : (
                                            // @ts-ignore
                                            <Icon className={`w-5 h-5 ${isActive ? 'text-[#fafafa] dark:text-[#fafafa]' : 'text-neutral-500 dark:text-neutral-500'}`} strokeWidth={1.5} />
                                        )}
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                    <p>{item.label}</p>
                                </TooltipContent>
                            </Tooltip>
                        );
                    })}
                </div>

                {/* More Options at the bottom */}
                <div className="mt-auto relative" ref={moreMenuRef}>
                    <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => setIsMoreOptionsOpen(!isMoreOptionsOpen)}
                                className={`w-10 h-10 transition-all duration-300 hover:scale-110 rounded-full overflow-hidden border-2 flex items-center justify-center ${isMoreOptionsOpen ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'border-neutral-800 dark:border-neutral-800 hover:border-neutral-700 dark:hover:border-neutral-700'}`}
                                aria-label="Account Settings"
                            >
                                <img
                                    src="/user-avatar.png?v=2"
                                    alt="User Profile"
                                    className="w-full h-full object-cover"
                                />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                            <p>Account Settings</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* Dropdown Menu */}
                    {isMoreOptionsOpen && (
                        <div className="absolute left-14 bottom-0 z-50 bg-[#0a0a0a] dark:bg-[#0a0a0a] border border-neutral-800 dark:border-neutral-800 rounded-xl shadow-2xl p-1.5 min-w-48 animate-in fade-in zoom-in-95 duration-200">
                            <div className="px-2 py-2 mb-1 border-b border-neutral-800/50 dark:border-neutral-800/50 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-800 dark:bg-neutral-800 flex-shrink-0 relative">
                                    <img
                                        src="/user-avatar.png?v=2"
                                        alt="User Profile"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-sm font-medium text-[#fafafa] dark:text-[#fafafa] truncate">
                                        {session?.user?.name || 'User'}
                                    </span>
                                    <span className="text-[10px] text-neutral-500 dark:text-neutral-500 truncate">
                                        {session?.user?.email || ''}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    router.push('/settings');
                                    setIsMoreOptionsOpen(false);
                                }}
                                className="w-full flex items-center gap-2 px-2 py-2 text-neutral-400 dark:text-neutral-400 hover:text-[#fafafa] dark:hover:text-[#fafafa] hover:bg-neutral-900 dark:hover:bg-neutral-900 rounded-lg transition-colors"
                            >
                                <Settings className="w-4 h-4" strokeWidth={1.5} />
                                <span className="text-sm">Settings</span>
                            </button>
                            <button
                                onClick={() => {
                                    router.push('/pricing');
                                    setIsMoreOptionsOpen(false);
                                }}
                                className="w-full flex items-center gap-2 px-2 py-2 text-neutral-400 dark:text-neutral-400 hover:text-[#fafafa] dark:hover:text-[#fafafa] hover:bg-neutral-900 dark:hover:bg-neutral-900 rounded-lg transition-colors"
                            >
                                <CreditCard className="w-4 h-4" strokeWidth={1.5} />
                                <span className="text-sm">Upgrade Plan</span>
                            </button>
                            <div className="h-px bg-neutral-800/50 dark:bg-neutral-800/50 my-1" />
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-2 px-2 py-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                                <LogOut className="w-4 h-4" strokeWidth={1.5} />
                                <span className="text-sm">Log Out</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </TooltipProvider>
    );
}

