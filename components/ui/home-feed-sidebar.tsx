"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { Mail, Bell, User, MoreHorizontal, LogOut, Settings, CreditCard, UserPlus, NotebookPen, Users, Search } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { EmailProfilesSidebar } from '@/components/ui/email-profiles-sidebar';

interface HomeFeedSidebarProps {
    className?: string;
}

export function HomeFeedSidebar({ className = '' }: HomeFeedSidebarProps) {
    const { data: session } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [isEmailProfilesOpen, setIsEmailProfilesOpen] = useState(false);
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
            <div className={`fixed left-0 top-0 h-screen w-16 bg-black border-r border-white/10 flex flex-col items-center py-8 z-50 ${className}`}>
                {/* Logo Section */}
                <div className="mb-10 group cursor-pointer" onClick={() => router.push('/home-feed')}>
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.15)]">
                        <img src="/mailient-logo.png" alt="Mailient" className="w-full h-full object-cover invert" />
                    </div>
                </div>

                {/* Primary Nav Section */}
                <div className="flex flex-col items-center gap-7 w-full">
                    {/* Dedicated Search Icon - Entry to Profiles */}
                    <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => setIsEmailProfilesOpen(true)}
                                className={`p-2.5 transition-all duration-300 hover:scale-110 rounded-xl ${isEmailProfilesOpen ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
                                aria-label="Search"
                            >
                                <Search className="w-5 h-5" strokeWidth={2.5} />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-white text-black font-black uppercase text-[10px] tracking-[0.2em] border-none px-3 py-1.5 rounded-md">
                            <p>Search</p>
                        </TooltipContent>
                    </Tooltip>

                    {navItems.map((item) => {
                        const isActive = pathname === item.route;

                        if (item.isArcus) {
                            return (
                                <Tooltip key={item.id} delayDuration={100}>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={() => router.push(item.route)}
                                            className={`p-3 transition-all duration-300 hover:scale-110 flex items-center justify-center w-10 h-10 rounded-xl ${isActive ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
                                            aria-label={item.label}
                                        >
                                            <span className="font-serif italic text-xl font-black">A</span>
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="bg-white text-black font-black uppercase text-[10px] tracking-[0.2em] border-none px-3 py-1.5 rounded-md">
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
                                        className={`p-2.5 transition-all duration-300 hover:scale-110 rounded-xl ${isActive ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
                                        aria-label={item.label}
                                    >
                                        <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.5} />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="bg-white text-black font-black uppercase text-[10px] tracking-[0.2em] border-none px-3 py-1.5 rounded-md">
                                    <p>{item.label}</p>
                                </TooltipContent>
                            </Tooltip>
                        );
                    })}

                    <div className="w-8 h-px bg-white/5 my-1" />

                    {/* Profiles Icon */}
                    <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => setIsEmailProfilesOpen(true)}
                                className={`p-2.5 transition-all duration-300 hover:scale-110 rounded-xl ${isEmailProfilesOpen ? 'bg-white text-black' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
                                aria-label="Profiles"
                            >
                                <Users className="w-5 h-5" strokeWidth={1.5} />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-white text-black font-black uppercase text-[10px] tracking-[0.2em] border-none px-3 py-1.5 rounded-md">
                            <p>Profiles</p>
                        </TooltipContent>
                    </Tooltip>
                </div>

                {/* Account Section at Bottom */}
                <div className="mt-auto relative" ref={moreMenuRef}>
                    <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => setIsMoreOptionsOpen(!isMoreOptionsOpen)}
                                className={`w-9 h-9 transition-all duration-300 hover:scale-110 rounded-full overflow-hidden border-2 flex items-center justify-center ${isMoreOptionsOpen ? 'border-white shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'border-white/10 hover:border-white/30'}`}
                                aria-label="Account"
                            >
                                <img
                                    src="/user-avatar.png?v=2"
                                    alt="User"
                                    className="w-full h-full object-cover grayscale"
                                />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-white text-black font-black uppercase text-[10px] tracking-[0.2em] border-none px-3 py-1.5 rounded-md">
                            <p>Account</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* Dropdown Menu - B&W Style */}
                    {isMoreOptionsOpen && (
                        <div className="absolute left-14 bottom-0 z-50 bg-black border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-2 min-w-[200px] animate-in fade-in zoom-in-95 duration-200">
                            <div className="px-3 py-3 mb-2 border-b border-white/5 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                                    <img
                                        src="/user-avatar.png?v=2"
                                        alt="User"
                                        className="w-full h-full object-cover grayscale"
                                    />
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-xs font-black text-white truncate uppercase tracking-tight">
                                        {session?.user?.name || 'OPERATOR'}
                                    </span>
                                    <span className="text-[9px] text-white/30 truncate font-bold uppercase tracking-tighter">
                                        {session?.user?.email || ''}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    router.push('/settings');
                                    setIsMoreOptionsOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all uppercase text-[10px] font-black tracking-widest"
                            >
                                <Settings className="w-4 h-4" strokeWidth={2} />
                                <span>Settings</span>
                            </button>
                            <button
                                onClick={() => {
                                    router.push('/pricing');
                                    setIsMoreOptionsOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all uppercase text-[10px] font-black tracking-widest"
                            >
                                <CreditCard className="w-4 h-4" strokeWidth={2} />
                                <span>Upgrade</span>
                            </button>

                            <div className="h-px bg-white/5 my-2 mx-2" />

                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-red-500 hover:bg-red-500/10 rounded-xl transition-all uppercase text-[10px] font-black tracking-widest"
                            >
                                <LogOut className="w-4 h-4" strokeWidth={2.5} />
                                <span>Disconnect</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Email Profiles Sidebar */}
            <EmailProfilesSidebar
                isOpen={isEmailProfilesOpen}
                onClose={() => setIsEmailProfilesOpen(false)}
            />
        </TooltipProvider>
    );
}
