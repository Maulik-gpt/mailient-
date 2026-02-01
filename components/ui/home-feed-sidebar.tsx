"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { Mail, Bell, User, MoreHorizontal, LogOut, Settings, CreditCard, UserPlus, NotebookPen, Users } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

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

    const navItems = [
        { id: 'home', icon: Mail, label: 'Home', route: '/home-feed' },
        { id: 'notifications', icon: Bell, label: 'Notifications', route: '/notifications' },
        { id: 'notes', icon: NotebookPen, label: 'Notes', route: '/i/notes' },
        { id: 'arcus', icon: null, label: 'Arcus', route: '/dashboard/agent-talk', isArcus: true },
    ];

    return (
        <TooltipProvider>
            <div className={`fixed left-0 top-0 h-screen w-16 bg-[var(--sidebar)] border-r border-[var(--sidebar-border)] flex flex-col items-center py-8 z-50 transition-colors duration-300 ${className}`}>
                {/* Logo Section */}
                <div className="mb-10 group cursor-pointer" onClick={() => router.push('/home-feed')}>
                    <div className="w-10 h-10 bg-[var(--sidebar-foreground)] rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300 overflow-hidden">
                        <img src="/mailient-logo.png" alt="Mailient" className="w-full h-full object-cover dark:invert" />
                    </div>
                </div>

                {/* Primary Nav Section */}
                <div className="flex flex-col items-center gap-6 w-full">
                    {navItems.map((item) => {
                        const isActive = (pathname === item.route || (item.id === 'home' && activeView === 'home')) && activeView !== 'people';

                        if (item.isArcus) {
                            return (
                                <Tooltip key={item.id} delayDuration={100}>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={() => router.push(item.route)}
                                            className={cn(
                                                "p-3 transition-all duration-200 flex items-center justify-center w-10 h-10 rounded-xl",
                                                isActive
                                                    ? 'bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)]'
                                                    : 'text-[var(--sidebar-foreground)] opacity-30 hover:opacity-80 hover:bg-[var(--sidebar-accent)]'
                                            )}
                                            aria-label={item.label}
                                        >
                                            <span className={cn(
                                                "text-base font-normal",
                                                isActive ? 'text-[var(--sidebar-primary-foreground)]' : 'text-[var(--sidebar-foreground)] font-serif italic'
                                            )}>A</span>
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="bg-[var(--popover)] text-[var(--popover-foreground)] text-[11px] border border-[var(--sidebar-border)] px-3 py-1.5 rounded-md font-normal shadow-xl">
                                        <p>{item.label}</p>
                                    </TooltipContent>
                                </Tooltip>
                            );
                        }

                        const Icon = item.icon as any;

                        return (
                            <Tooltip key={item.id} delayDuration={100}>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => router.push(item.route)}
                                        className={cn(
                                            "p-2.5 transition-all duration-200 rounded-xl",
                                            isActive
                                                ? 'bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] shadow-lg'
                                                : 'text-[var(--sidebar-foreground)] opacity-30 hover:opacity-80 hover:bg-[var(--sidebar-accent)]'
                                        )}
                                        aria-label={item.label}
                                    >
                                        <Icon className="w-5 h-5" strokeWidth={1.5} />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="bg-[var(--popover)] text-[var(--popover-foreground)] text-[11px] border border-[var(--sidebar-border)] px-3 py-1.5 rounded-md font-normal shadow-xl">
                                    <p>{item.label}</p>
                                </TooltipContent>
                            </Tooltip>
                        );
                    })}
                </div>

                {/* Account Section at Bottom */}
                <div className="mt-auto relative" ref={moreMenuRef}>
                    <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => setIsMoreOptionsOpen(!isMoreOptionsOpen)}
                                className={cn(
                                    "w-9 h-9 transition-all duration-200 rounded-full overflow-hidden border flex items-center justify-center translate-y-0 active:translate-y-px",
                                    isMoreOptionsOpen
                                        ? 'border-[var(--sidebar-primary)] ring-2 ring-[var(--sidebar-primary)]/20'
                                        : 'border-[var(--sidebar-border)] hover:border-[var(--sidebar-foreground)]/30'
                                )}
                                aria-label="Account"
                            >
                                <img
                                    src={session?.user?.image || "/user-avatar.png?v=2"}
                                    alt="User"
                                    className="w-full h-full object-cover grayscale opacity-80 transition-all hover:grayscale-0 hover:opacity-100"
                                />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-[var(--popover)] text-[var(--popover-foreground)] text-[11px] border border-[var(--sidebar-border)] px-3 py-1.5 rounded-md font-normal shadow-xl">
                            <p>Account</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* Dropdown Menu */}
                    {isMoreOptionsOpen && (
                        <div className="absolute left-14 bottom-0 z-50 bg-[var(--popover)] border border-[var(--sidebar-border)] rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)] p-2 min-w-[200px] animate-in fade-in zoom-in-95 duration-200 slide-in-from-left-2">
                            <div className="px-4 py-4 mb-2 border-b border-[var(--sidebar-border)] flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-[var(--sidebar-accent)] flex-shrink-0 border border-[var(--sidebar-border)]">
                                    <img
                                        src={session?.user?.image || "/user-avatar.png?v=2"}
                                        alt="User"
                                        className="w-full h-full object-cover grayscale opacity-80"
                                    />
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-[13px] font-medium text-[var(--foreground)] truncate">
                                        {session?.user?.name || 'User'}
                                    </span>
                                    <span className="text-[11px] text-[var(--muted-foreground)] truncate font-normal">
                                        {session?.user?.email || ''}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    router.push('/settings');
                                    setIsMoreOptionsOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-[var(--foreground)] opacity-50 hover:opacity-100 hover:bg-[var(--sidebar-accent)] rounded-xl transition-all text-xs font-medium"
                            >
                                <Settings className="w-4 h-4" strokeWidth={1.5} />
                                <span>Settings</span>
                            </button>
                            <button
                                onClick={() => {
                                    router.push('/pricing');
                                    setIsMoreOptionsOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-[var(--foreground)] opacity-50 hover:opacity-100 hover:bg-[var(--sidebar-accent)] rounded-xl transition-all text-xs font-medium"
                            >
                                <CreditCard className="w-4 h-4" strokeWidth={1.5} />
                                <span>Upgrade</span>
                            </button>

                            <div className="h-px bg-[var(--sidebar-border)] my-2 mx-2" />

                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-3 py-2 text-red-400/80 hover:bg-red-400/5 rounded-lg transition-all text-xs font-normal"
                            >
                                <LogOut className="w-4 h-4" strokeWidth={1.5} />
                                <span>Logout</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </TooltipProvider>
    );
}
