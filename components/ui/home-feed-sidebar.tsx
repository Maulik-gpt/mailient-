"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { Mail, Bell, User, MoreHorizontal, LogOut, Settings, CreditCard, UserPlus, NotebookPen, Users, Rocket } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

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
            <div className={`fixed left-0 top-0 h-screen w-16 bg-[#050505] border-r border-white/5 flex flex-col items-center py-8 z-50 ${className}`}>
                {/* Logo Section */}
                <div className="mb-10 group cursor-pointer" onClick={() => router.push('/home-feed')}>
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300 overflow-hidden">
                        <img src="/mailient-logo.png" alt="Mailient" className="w-full h-full object-cover invert" />
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
                                            className={`p-3 transition-all duration-200 flex items-center justify-center w-10 h-10 rounded-xl ${isActive ? 'bg-white text-black' : 'text-white/30 hover:text-white/80 hover:bg-white/5'}`}
                                            aria-label={item.label}
                                        >
                                            <span className={`text-base font-normal ${isActive ? 'text-black' : 'text-white font-serif italic'}`}>A</span>
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="bg-neutral-900 text-white text-[11px] border-white/10 px-3 py-1.5 rounded-md font-normal">
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
                                        className={`p-2.5 transition-all duration-200 rounded-xl ${isActive ? 'bg-white text-black' : 'text-white/30 hover:text-white/80 hover:bg-white/5'}`}
                                        aria-label={item.label}
                                    >
                                        <Icon className="w-5 h-5" strokeWidth={1.5} />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="bg-neutral-900 text-white text-[11px] border-white/10 px-3 py-1.5 rounded-md font-normal">
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
                                className={`w-9 h-9 transition-all duration-200 rounded-full overflow-hidden border flex items-center justify-center ${isMoreOptionsOpen ? 'border-white' : 'border-white/10 hover:border-white/30'}`}
                                aria-label="Account"
                            >
                                <img
                                    src={session?.user?.image || "/user-avatar.png?v=2"}
                                    alt="User"
                                    className="w-full h-full object-cover grayscale opacity-80"
                                />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-neutral-900 text-white text-[11px] border-white/10 px-3 py-1.5 rounded-md font-normal">
                            <p>Account</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* Dropdown Menu */}
                    {isMoreOptionsOpen && (
                        <div className="absolute left-14 bottom-0 z-50 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl p-2 min-w-[180px] animate-in fade-in zoom-in-95 duration-150">
                            <div className="px-3 py-3 mb-2 border-b border-white/5 flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full overflow-hidden bg-white/5 flex-shrink-0">
                                    <img
                                        src={session?.user?.image || "/user-avatar.png?v=2"}
                                        alt="User"
                                        className="w-full h-full object-cover grayscale opacity-80"
                                    />
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-xs font-normal text-neutral-300 truncate">
                                        {session?.user?.name || 'User'}
                                    </span>
                                    <span className="text-[10px] text-neutral-500 truncate font-normal">
                                        {session?.user?.email || ''}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    router.push('/settings');
                                    setIsMoreOptionsOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all text-xs font-normal"
                            >
                                <Settings className="w-4 h-4" strokeWidth={1.5} />
                                <span>Settings</span>
                            </button>
                            <button
                                onClick={() => {
                                    router.push('/pricing');
                                    setIsMoreOptionsOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all text-xs font-normal"
                            >
                                <CreditCard className="w-4 h-4" strokeWidth={1.5} />
                                <span>Upgrade</span>
                            </button>

                            <div className="h-px bg-white/5 my-1.5 mx-2" />

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
