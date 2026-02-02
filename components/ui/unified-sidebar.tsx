"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Mail,
  Send,
  Archive,
  Trash2,
  Star,
  Settings,
  Plus,
  ChevronRight,
  Bot,
  Brain,
  Plug,
  MessageCircle,
  User,
  Bell,
  Shield,
  Palette,
  Key,
  Users,
  Clock,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  MoreHorizontal,
  LogOut,
  Rocket
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

interface SidebarItem {
  id: string;
  name: string;
  icon: any;
  count?: number;
  isRoute?: boolean;
  route?: string;
  badge?: string;
  isActive?: boolean;
  onClick?: () => void;
}

interface UnifiedSidebarProps {
  variant?: 'home-feed' | 'dashboard' | 'universal' | 'settings';
  activeItem?: string;
  onItemClick?: (itemId: string) => void;
  onCompose?: () => void;
  onIntegrationsClick?: () => void;
  showUniversalNav?: boolean;
  labelCounts?: Record<string, number>;
  teamMembers?: Array<{
    id: string;
    name: string;
    email: string;
    avatar: string;
    status: 'online' | 'away' | 'offline';
  }>;
  className?: string;
}

export function UnifiedSidebar({
  variant = 'universal',
  activeItem = '',
  onItemClick,
  onCompose,
  onIntegrationsClick,
  showUniversalNav = true,
  labelCounts = {},
  teamMembers = [],
  className = ''
}: UnifiedSidebarProps) {
  const [aiFeaturesExpanded, setAiFeaturesExpanded] = useState(false);
  const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const router = useRouter();
  const { data: session } = useSession();

  // Fetch profile picture when session is available
  useEffect(() => {
    if (session?.user?.email && variant === 'settings') {
      fetch(`/api/gmail/profile-picture?email=${encodeURIComponent(session.user.email)}`)
        .then(response => response.json())
        .then(data => {
          if (data.profilePicture) {
            setProfilePicture(data.profilePicture);
          }
        })
        .catch(error => {
          console.error('Error fetching profile picture:', error);
        });
    }
  }, [session?.user?.email, variant]);

  // Home Feed specific items
  const homeFeedItems: SidebarItem[] = [
    { id: 'all', name: 'All', icon: Mail, count: 0, isActive: activeItem === 'all' },
    { id: 'priority', name: 'Priority', icon: Star, count: 0, isActive: activeItem === 'priority' },
    { id: 'opportunities', name: 'Opportunities', icon: TrendingUp, count: 0, isActive: activeItem === 'opportunities' },
    { id: 'needs-reply', name: 'Needs Reply', icon: Clock, count: 0, isActive: activeItem === 'needs-reply' },
    { id: 'at-risk', name: 'At Risk', icon: AlertTriangle, count: 0, isActive: activeItem === 'at-risk' },
  ];

  // Dashboard specific items
  const dashboardItems: SidebarItem[] = [
    { id: 'INBOX', name: 'Inbox', icon: Mail, count: labelCounts.INBOX || 12, isActive: activeItem === 'INBOX' },
    { id: 'CHATS', name: 'Chat', icon: MessageCircle, count: 0, isRoute: true, route: '/dashboard/chats', isActive: activeItem === 'CHATS' },
    { id: 'SENT', name: 'Sent', icon: Send, count: 0, isActive: activeItem === 'SENT' },
    { id: 'ARCHIVE', name: 'Archive', icon: Archive, count: 0, isActive: activeItem === 'ARCHIVE' },
    { id: 'TRASH', name: 'Trash', icon: Trash2, count: 3, isActive: activeItem === 'TRASH' },
  ];

  const aiFeatures: SidebarItem[] = [
    { id: 'REPLY_ASSISTANT', name: 'Reply Assistant', icon: Bot, isActive: activeItem === 'REPLY_ASSISTANT' },
    { id: 'CONTEXT_MEMORY', name: 'Context Memory', icon: Brain, isActive: activeItem === 'CONTEXT_MEMORY' },
  ];

  // Universal navigation items
  const universalNavItems: SidebarItem[] = [
    { id: 'home-feed', name: 'Feed', icon: Mail, isRoute: true, route: '/home-feed' },
    { id: 'notifications', name: 'Notifications', icon: Bell, isRoute: true, route: '/notifications' },
    { id: 'agent-talk', name: 'Arcus', icon: Sparkles, isRoute: true, route: '/dashboard/agent-talk' },
    { id: 'outreach', name: 'Outreach', icon: Rocket, isRoute: true, route: '/dashboard/outreach' },
  ];

  const handleLogout = async () => {
    setIsMoreOptionsOpen(false);
    await signOut({ redirect: false });
    router.push("/");
  };

  const handleItemClick = (item: SidebarItem) => {
    if (item.isRoute && item.route) {
      router.push(item.route);
    } else if (item.onClick) {
      item.onClick();
    } else if (onItemClick) {
      onItemClick(item.id);
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'home-feed':
        return {
          container: "w-80 bg-black border-r border-[#525252] flex flex-col",
          header: "p-6 border-b border-[#525252]",
          title: "text-xl font-semibold text-white satoshi",
          subtitle: "text-sm text-gray-400 mt-1",
          composeButton: "w-full bg-white hover:bg-gray-200 text-black font-medium py-3 px-4 rounded-lg transition-colors",
          nav: "flex-1 px-4 py-2",
          navItem: "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
          navItemActive: "bg-white text-black shadow-sm",
          navItemInactive: "text-gray-300 hover:text-white hover:bg-[#1a1a1a]",
          navIcon: "w-4 h-4 mr-3",
          navIconActive: "text-black",
          navIconInactive: "text-gray-400",
          badge: "text-xs transition-colors",
          badgeActive: "bg-black/10 text-black border-black/20",
          badgeInactive: "bg-[#1a1a1a] text-gray-300 border-[#525252]",
          sectionTitle: "text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider",
          teamMember: "flex items-center space-x-3 p-2 rounded-lg hover:bg-[#1a1a1a] transition-colors",
          teamMemberAvatar: "w-7 h-7",
          teamMemberName: "text-sm text-gray-300 truncate font-medium",
          teamMemberStatus: "text-xs text-gray-500 capitalize"
        };
      case 'dashboard':
        return {
          container: "w-80 bg-black flex flex-col",
          header: "p-3 border-b border-gray-700",
          title: "",
          subtitle: "",
          composeButton: "w-full bg-white hover:bg-gray-200 text-black font-medium py-2 px-4 rounded-lg transition-colors",
          nav: "flex-1 overflow-y-auto py-2",
          navItem: "flex items-center justify-between w-full p-2 text-sm rounded-lg transition-colors",
          navItemActive: "bg-white text-black",
          navItemInactive: "text-gray-300 hover:text-white hover:bg-gray-800",
          navIcon: "w-4 h-4 mr-3",
          navIconActive: "",
          navIconInactive: "",
          badge: "text-xs bg-gray-700 text-gray-200 hover:bg-gray-600",
          badgeActive: "",
          badgeInactive: "",
          sectionTitle: "flex items-center justify-between w-full p-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-white transition-colors",
          teamMember: "",
          teamMemberAvatar: "",
          teamMemberName: "",
          teamMemberStatus: ""
        };
      case 'settings':
        return {
          container: "fixed left-0 top-0 h-screen w-20 bg-[#0a0a0a]/50 backdrop-blur-sm border-r border-[#525252] flex flex-col z-20",
          header: "",
          title: "",
          subtitle: "",
          composeButton: "",
          nav: "flex flex-col items-end py-20 gap-6 pr-4",
          navItem: "p-2 hover:bg-[#1a1a1a] rounded-full transition-all duration-300 hover:scale-105",
          navItemActive: "bg-[#2a2a2a] rounded-full",
          navItemInactive: "",
          navIcon: "w-6 h-6 text-[#fcfcfc]",
          navIconActive: "",
          navIconInactive: "",
          badge: "",
          badgeActive: "",
          badgeInactive: "",
          sectionTitle: "",
          teamMember: "",
          teamMemberAvatar: "",
          teamMemberName: "",
          teamMemberStatus: ""
        };
      default:
        return {
          container: "w-80 bg-black border-r border-[#525252] flex flex-col",
          header: "p-6 border-b border-[#525252]",
          title: "text-xl font-semibold text-white",
          subtitle: "text-sm text-gray-400 mt-1",
          composeButton: "w-full bg-white hover:bg-gray-200 text-black font-medium py-3 px-4 rounded-lg transition-colors",
          nav: "flex-1 px-4 py-2",
          navItem: "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
          navItemActive: "bg-white text-black shadow-sm",
          navItemInactive: "text-gray-300 hover:text-white hover:bg-[#1a1a1a]",
          navIcon: "w-4 h-4 mr-3",
          navIconActive: "text-black",
          navIconInactive: "text-gray-400",
          badge: "text-xs transition-colors",
          badgeActive: "bg-black/10 text-black border-black/20",
          badgeInactive: "bg-[#1a1a1a] text-gray-300 border-[#525252]",
          sectionTitle: "text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider",
          teamMember: "flex items-center space-x-3 p-2 rounded-lg hover:bg-[#1a1a1a] transition-colors",
          teamMemberAvatar: "w-7 h-7",
          teamMemberName: "text-sm text-gray-300 truncate font-medium",
          teamMemberStatus: "text-xs text-gray-500 capitalize"
        };
    }
  };

  const styles = getVariantStyles();

  // Render universal navigation for settings variant
  if (variant === 'settings' && showUniversalNav) {
    return (
      <TooltipProvider>
        <div className={styles.container}>
          <div className="flex flex-col items-center py-6 border-b border-[#525252] mb-4">
            <div
              className="w-10 h-10 bg-black rounded-xl border border-white/10 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform duration-500 overflow-hidden shadow-xl"
              onClick={() => router.push('/home-feed')}
            >
              <img src="/mailient-logo.png" alt="Mailient" className="w-full h-full object-cover scale-110" />
            </div>
          </div>
          <div className={styles.nav}>
            {universalNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeItem === item.id;

              // Special handling for Arcus "A" symbol
              if (item.id === 'agent-talk') {
                return (
                  <Tooltip delayDuration={100} key={item.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleItemClick(item)}
                        className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                        aria-label={item.name}
                      >
                        <span className="text-[#fcfcfc] oleo-script-regular text-2xl">A</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{item.name}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              }



              return (
                <Tooltip delayDuration={100} key={item.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleItemClick(item)}
                      className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                      aria-label={item.name}
                    >
                      <Icon className={styles.navIcon} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{item.name}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}

            {/* More Options Icon */}
            <div className="relative">
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setIsMoreOptionsOpen(!isMoreOptionsOpen)}
                    className={`${styles.navItem} ${isMoreOptionsOpen ? styles.navItemActive : ''}`}
                    aria-label="More Options"
                  >
                    <MoreHorizontal className="w-6 h-6 text-[#fcfcfc]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>More Options</p>
                </TooltipContent>
              </Tooltip>

              {/* Dialog Box */}
              {isMoreOptionsOpen && (
                <div className="absolute left-20 top-0 z-50 bg-[#000] border border-[#2a2a2a] rounded-lg shadow-xl p-2 min-w-48 animate-fadeIn">
                  <button
                    onClick={() => {
                      window.location.href = '/settings';
                      setIsMoreOptionsOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-[#fcfcfc] hover:bg-[#2a2a2a] rounded-md transition-all duration-200"
                  >
                    <div className="font-medium">Settings & Privacy</div>
                  </button>
                  <button
                    onClick={() => {
                      window.location.href = '/pricing';
                      setIsMoreOptionsOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-[#fcfcfc] hover:bg-[#2a2a2a] rounded-md transition-all duration-200"
                  >
                    <div className="font-medium">Upgrade Plan</div>
                  </button>
                  <div className="border-t border-[#2a2a2a] my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all duration-300 group relative overflow-hidden"
                  >
                    <LogOut className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-0.5" />
                    <span className="font-medium">Log Out</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/20 to-red-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  const getItems = () => {
    switch (variant) {
      case 'home-feed': return homeFeedItems;
      case 'dashboard': return dashboardItems;
      default: return homeFeedItems;
    }
  };

  const items = getItems();

  return (
    <div className={`${styles.container} ${className}`}>
      {/* Header - Only for functional variants */}
      {variant !== 'settings' && (
        <div className={styles.header}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-black rounded-lg border border-white/10 flex items-center justify-center overflow-hidden">
              <img src="/mailient-logo.png" alt="Mailient" className="w-full h-full object-cover scale-110" />
            </div>
            <h1 className={styles.title}>
              MAILIENT
            </h1>
          </div>
          {variant === 'home-feed' && (
            <p className={styles.subtitle}>Unified Intelligence Layer</p>
          )}
        </div>
      )}

      {/* Compose Button - Only for functional variants */}
      {variant !== 'settings' && onCompose && (
        <div className="p-4">
          <Button
            onClick={onCompose}
            className={styles.composeButton}
          >
            <Plus className="w-4 h-4 mr-2" />
            Compose
          </Button>
        </div>
      )}

      {/* Navigation Items */}
      <nav className={styles.nav}>
        <div className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = item.isActive;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : styles.navItemInactive
                  }`}
                aria-label={`View ${item.name}`}
              >
                <div className="flex items-center">
                  <Icon className={`${styles.navIcon} ${isActive ? styles.navIconActive : styles.navIconInactive
                    }`} />
                  <span className="font-medium">{item.name}</span>
                </div>
                {item.count && item.count > 0 && (
                  <Badge
                    variant="secondary"
                    className={`${styles.badge} ${isActive ? styles.badgeActive : styles.badgeInactive
                      }`}
                  >
                    {item.count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* AI Features Section - Only for dashboard */}
        {variant === 'dashboard' && (
          <div className="px-3 mt-6">
            <button
              onClick={() => setAiFeaturesExpanded(!aiFeaturesExpanded)}
              className={styles.sectionTitle}
            >
              <span>AI FEATURES</span>
              <ChevronRight className={`w-3 h-3 transition-transform ${aiFeaturesExpanded ? 'rotate-90' : ''
                }`} />
            </button>

            {aiFeaturesExpanded && (
              <div className="mt-2 space-y-1">
                {aiFeatures.map((feature) => {
                  const Icon = feature.icon;
                  const isActive = feature.isActive;

                  return (
                    <button
                      key={feature.id}
                      onClick={() => handleItemClick(feature)}
                      className={`flex items-center w-full p-2 text-sm rounded-lg transition-colors ${isActive ? styles.navItemActive : 'text-gray-300 hover:text-white hover:bg-gray-800'
                        }`}
                    >
                      <Icon className="w-4 h-4 mr-3" />
                      <span className="font-medium">{feature.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Team Members - Only for home-feed */}
      {variant === 'home-feed' && teamMembers.length > 0 && (
        <div className="p-4 border-t border-[#525252]">
          <h3 className={styles.sectionTitle}>Team</h3>
          <div className="space-y-2">
            {teamMembers.map((member) => (
              <div key={member.id} className={styles.teamMember}>
                <div className="relative">
                  <Avatar className={styles.teamMemberAvatar}>
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback className="text-white bg-[#525252] text-sm">
                      {member.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-black ${member.status === 'online' ? 'bg-green-500' :
                    member.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
                    }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={styles.teamMemberName}>{member.name}</p>
                  <p className={styles.teamMemberStatus}>{member.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer - Only for dashboard */}
      {variant === 'dashboard' && (
        <div className="p-3 border-t border-gray-700 space-y-1">
          <button
            onClick={() => router.push('/settings')}
            className="flex items-center w-full p-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4 mr-3" />
            <span>Settings</span>
          </button>
          {onIntegrationsClick && (
            <button
              onClick={onIntegrationsClick}
              className="flex items-center w-full p-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Plug className="w-4 h-4 mr-3" />
              <span>Integrations</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
