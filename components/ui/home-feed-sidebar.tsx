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
        { id: 'profile', icon: User, label: 'Profile', route: '/dashboard/profile-bubble', isProfile: true },
    ];

    return (
        <TooltipProvider>
            <div className={`fixed left-0 top-0 h-screen w-16 bg-[#0a0a0a] border-r border-neutral-800/50 flex flex-col items-center py-8 z-50 ${className}`}>
                <div className="flex flex-col items-center gap-6 w-full">
                    {navItems.map((item) => {
                        const isActive = pathname === item.route;

                        if (item.isArcus) {
                            return (
                                <Tooltip key={item.id} delayDuration={100}>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={() => router.push(item.route)}
                                            className={`p-3 transition-all duration-300 hover:scale-105 flex items-center justify-center w-10 h-10 rounded-xl ${isActive ? 'bg-neutral-800' : 'hover:bg-neutral-900'}`}
                                            aria-label={item.label}
                                        >
                                            <span className="text-[#fafafa] font-serif italic text-xl">A</span>
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                        <p>{item.label}</p>
                                    </TooltipContent>
                                </Tooltip>
                            );
                        }

                        if (item.isProfile) {
                            return (
                                <Tooltip key={item.id} delayDuration={100}>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={() => router.push(item.route)}
                                            className={`p-2 transition-all duration-300 hover:scale-105 rounded-xl ${isActive ? 'bg-neutral-800' : 'hover:bg-neutral-900'}`}
                                            aria-label={item.label}
                                        >
                                            <User className={`w-5 h-5 ${isActive ? 'text-[#fafafa]' : 'text-neutral-500'}`} strokeWidth={1.5} />
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
                                        className={`p-2 transition-all duration-300 hover:scale-105 rounded-xl ${isActive ? 'bg-neutral-800' : 'hover:bg-neutral-900'}`}
                                        aria-label={item.label}
                                    >
                                        {item.isCustomIcon ? (
                                            <NotificationIcon iconClassName={`w-5 h-5 ${isActive ? 'text-[#fafafa]' : 'text-neutral-500'}`} />
                                        ) : (
                                            // @ts-ignore
                                            <Icon className={`w-5 h-5 ${isActive ? 'text-[#fafafa]' : 'text-neutral-500'}`} strokeWidth={1.5} />
                                        )}
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                    <p>{item.label}</p>
                                </TooltipContent>
                            </Tooltip>
                        );
                    })}

                    {/* More Options */}
                    <div className="relative" ref={moreMenuRef}>
                        <Tooltip delayDuration={100}>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => setIsMoreOptionsOpen(!isMoreOptionsOpen)}
                                    className={`p-2 transition-all duration-300 hover:scale-105 rounded-xl ${isMoreOptionsOpen ? 'bg-neutral-800' : 'hover:bg-neutral-900'}`}
                                    aria-label="More Options"
                                >
                                    <MoreHorizontal className={`w-5 h-5 ${isMoreOptionsOpen ? 'text-[#fafafa]' : 'text-neutral-500'}`} strokeWidth={1.5} />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                                <p>More Options</p>
                            </TooltipContent>
                        </Tooltip>

                        {/* Dropdown Menu */}
                        {isMoreOptionsOpen && (
                            <div className="absolute left-14 bottom-0 z-50 bg-[#0a0a0a] border border-neutral-800 rounded-xl shadow-2xl p-1.5 min-w-48 animate-in fade-in zoom-in-95 duration-200">
                                <div className="px-2 py-2 mb-1 border-b border-neutral-800/50 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-800 flex-shrink-0 relative">
                                        {session?.user?.image ? (
                                            <img
                                                src={session.user.image}
                                                alt={session.user.name || "Profile"}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    e.currentTarget.parentElement?.querySelector('.initials')?.classList.remove('hidden');
                                                }}
                                            />
                                        ) : (
                                            <span className="w-full h-full flex items-center justify-center text-xs font-medium text-neutral-300">
                                                {getInitials(session?.user?.name || session?.user?.email || "?")}
                                            </span>
                                        )}
                                        <span className="initials hidden absolute inset-0 flex items-center justify-center text-xs font-medium text-neutral-300 bg-neutral-800">
                                            {getInitials(session?.user?.name || session?.user?.email || "?")}
                                        </span>
                                    </div>
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="text-sm font-medium text-[#fafafa] truncate">
                                            {session?.user?.name || 'User'}
                                        </span>
                                        <span className="text-xs text-neutral-500 truncate">
                                            {session?.user?.email || ''}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        router.push('/settings');
                                        setIsMoreOptionsOpen(false);
                                    }}
                                    className="w-full flex items-center gap-2 px-2 py-2 text-neutral-400 hover:text-[#fafafa] hover:bg-neutral-900 rounded-lg transition-colors"
                                >
                                    <Settings className="w-4 h-4" strokeWidth={1.5} />
                                    <span className="text-sm">Settings</span>
                                </button>
                                <button
                                    onClick={() => {
                                        router.push('/pricing');
                                        setIsMoreOptionsOpen(false);
                                    }}
                                    className="w-full flex items-center gap-2 px-2 py-2 text-neutral-400 hover:text-[#fafafa] hover:bg-neutral-900 rounded-lg transition-colors"
                                >
                                    <CreditCard className="w-4 h-4" strokeWidth={1.5} />
                                    <span className="text-sm">Upgrade Plan</span>
                                </button>
                                <div className="h-px bg-neutral-800/50 my-1" />
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
            </div>
        </TooltipProvider>
    );
}
