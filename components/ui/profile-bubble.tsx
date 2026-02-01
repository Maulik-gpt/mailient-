"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  User,
  Settings,
  LogOut,
  HelpCircle,
  UserCircle,
  Shield,
  CreditCard,
  Users,
  FileText,
  Moon,
  Sun,
  Monitor,
  ChevronDown,
  Bell,
  Activity,
  Trash2,
  ExternalLink,
  Camera,
  X,
  Calendar,
  Globe,
  MapPin
} from "lucide-react";
import { WebsiteLink } from "./website-link";

type UserStatus = 'online' | 'away' | 'offline';

type UserProfile = {
  id?: string;
  user_id?: string;
  email: string;
  name?: string | null;
  picture?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  status?: string;
  preferences?: {
    theme?: string;
    language?: string;
    notifications?: boolean;
    email_frequency?: string;
    timezone?: string;
  };
  birthdate?: string | null;
  gender?: string | null;
  work_status?: string | null;
  interests?: string[] | null;
  last_synced_at?: string | null;
  created_at?: string;
  updated_at?: string;
  email_accounts_connected?: number;
  emails_processed?: number;
  plan?: string;
  storage_used?: string;
  last_email_activity?: string | null;
};

export default function ProfileBubble() {
  const { data: session, status } = useSession();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userStatus, setUserStatus] = useState<UserStatus>('online');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    bio: '',
    location: '',
    website: '',
    birthdate: '',
    gender: '',
    work_status: '',
    interests: ''
  });
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // List of countries for autocomplete
  const countries = [
    'United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands',
    'Belgium', 'Switzerland', 'Austria', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Ireland', 'Portugal',
    'Australia', 'New Zealand', 'Japan', 'South Korea', 'Singapore', 'India', 'China', 'Brazil',
    'Mexico', 'Argentina', 'Chile', 'South Africa', 'Egypt', 'Israel', 'Turkey', 'Russia', 'Poland',
    'Czech Republic', 'Hungary', 'Greece', 'Thailand', 'Malaysia', 'Indonesia', 'Philippines', 'Vietnam'
  ];

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isDropdownOpen) return;

      switch (event.key) {
        case 'Escape':
          setIsDropdownOpen(false);
          break;
        case 'Tab':
          // Allow natural tab navigation but prevent default if needed
          break;
        case 'ArrowDown':
          event.preventDefault();
          // Focus management for menu items would go here
          break;
        case 'ArrowUp':
          event.preventDefault();
          // Focus management for menu items would go here
          break;
        case 'Enter':
        case ' ':
          // Handle activation of focused menu item
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDropdownOpen]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setShowLocationSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch user profile and status from backend
  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        setUserProfile(data);
        setUserStatus(data.status || 'online');
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchUserStatus = async () => {
      try {
        const response = await fetch('/api/profile/status');
        if (response.ok && isMounted) {
          const data = await response.json();
          setUserStatus(data.status);
        }
      } catch (error) {
        console.error('Failed to fetch user status:', error);
      }
    };

    const updateUserStatus = async (status: UserStatus) => {
      try {
        const response = await fetch('/api/profile/status', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status }),
        });

        if (response.ok && isMounted) {
          const data = await response.json();
          setUserStatus(data.status);
        }
      } catch (error) {
        console.error('Failed to update user status:', error);
      }
    };

    // Fetch initial profile and status
    fetchUserProfile();
    fetchUserStatus();

    // Set up activity listeners for auto status management
    let lastActivity = Date.now();
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

    const handleActivity = () => {
      lastActivity = Date.now();
      if (userStatus === 'offline' || userStatus === 'away') {
        updateUserStatus('online');
      }
    };

    const handleInactivity = () => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivity;

      if (timeSinceActivity > 300000 && userStatus === 'online') { // 5 minutes
        updateUserStatus('away');
      } else if (timeSinceActivity > 1800000) { // 30 minutes
        updateUserStatus('offline');
      }
    };

    // Add activity listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Set up inactivity checker
    const inactivityInterval = setInterval(handleInactivity, 60000); // Check every minute

    return () => {
      isMounted = false;
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      clearInterval(inactivityInterval);
    };
  }, [session]);

  // Refetch profile on window focus
  useEffect(() => {
    const handleFocus = () => {
      fetchUserProfile();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Get the best available profile image
  const getProfileImage = () => {
    return userProfile?.avatar_url || user.image || '';
  };

  const hasProfileImage = () => {
    return !!(userProfile?.avatar_url || user.image);
  };

  if (status === "loading") {
    return (
      <div className="w-10 h-10 rounded-full bg-gray-700 animate-pulse" role="status" aria-label="Loading profile"></div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const user = session.user;
  console.log("Profile bubble - user session data:", {
    name: user.name,
    email: user.email,
    image: user.image,
    id: user.id
  });

  const initials = user.name
    ? user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
    : user.email?.[0]?.toUpperCase() || "U";

  const getStatusColor = (status: UserStatus) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
    }
  };

  const getStatusText = (status: UserStatus) => {
    switch (status) {
      case 'online': return 'Online';
      case 'away': return 'Away';
      case 'offline': return 'Offline';
    }
  };

  const handleLogout = () => {
    signOut();
    router.push("/");
  };

  const handleProfileClick = () => {
    router.push("/i/profile");
    setIsDropdownOpen(false);
  };

  const updateUserStatus = async (status: UserStatus) => {
    try {
      const response = await fetch('/api/profile/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        const data = await response.json();
        setUserStatus(data.status);
      }
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    setIsDropdownOpen(false);
  };

  const handleSaveProfile = async () => {
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editForm.name,
          bio: editForm.bio,
          location: editForm.location,
          website: editForm.website,
          birthdate: editForm.birthdate,
          gender: editForm.gender,
          work_status: editForm.work_status,
          interests: editForm.interests.split(',').map(i => i.trim()).filter(i => i)
        }),
      });

      if (response.ok) {
        await fetchUserProfile();
        setIsEditModalOpen(false);
      } else {
        console.error('Failed to save profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const handleLocationChange = (value: string) => {
    setEditForm({ ...editForm, location: value });

    if (value.length > 0) {
      const filtered = countries.filter(country =>
        country.toLowerCase().includes(value.toLowerCase())
      );
      setLocationSuggestions(filtered.slice(0, 5)); // Limit to 5 suggestions
      setShowLocationSuggestions(true);
    } else {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
    }
  };

  const selectLocationSuggestion = (country: string) => {
    setEditForm({ ...editForm, location: country });
    setLocationSuggestions([]);
    setShowLocationSuggestions(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Bubble */}
      <button
        id="profile-button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="group relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#1A1A1A] border border-[#444444] flex items-center justify-center text-white font-semibold text-sm hover:bg-[#2A2A2A] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#121212] focus-visible:ring-2 focus-visible:ring-blue-500"
        style={{ fontFamily: "'Stack Sans Notch', ui-sans-serif, system-ui, sans-serif" }}
        aria-label={`Profile menu for ${user.name || user.email}, status: ${getStatusText(userStatus)}`}
        aria-expanded={isDropdownOpen}
        aria-haspopup="menu"
        aria-controls="profile-dropdown mobile-profile-dropdown"
        role="button"
      >
        {hasProfileImage() ? (
          <img
            src={getProfileImage()}
            alt={`${user.name || 'User'} profile picture`}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span className="text-white group-hover:text-gray-200 transition-colors">{initials}</span>
        )}

        {/* Status Indicator */}
        <div
          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 ${getStatusColor(userStatus)} rounded-full border-2 border-[#121212] transition-colors duration-200`}
          title={`Status: ${getStatusText(userStatus)}`}
          aria-label={`Current status: ${getStatusText(userStatus)}`}
        ></div>

        {/* Dropdown Arrow Indicator */}
        <ChevronDown className={`absolute -top-1 -right-1 w-3 h-3 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Enhanced Dropdown */}
      {isDropdownOpen && (
        <>
          {/* Mobile Backdrop */}
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsDropdownOpen(false)} />

          {/* Desktop Dropdown */}
          <div
            id="profile-dropdown"
            className="hidden md:block absolute right-0 mt-2 w-80 bg-[#121212] border border-[#333333] rounded-lg shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-200"
            role="menu"
            aria-label="Profile menu"
            aria-labelledby="profile-button"
          >
            {/* User Info Section */}
            <div className="p-4 border-b border-[#333333]">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-[#1A1A1A] border border-[#444444] flex items-center justify-center text-white font-semibold text-base">
                    {hasProfileImage() ? (
                      <img
                        src={getProfileImage()}
                        alt={`${user.name || 'User'} profile picture`}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 ${getStatusColor(userStatus)} rounded-full border-2 border-[#121212]`}
                    aria-label={`Status: ${getStatusText(userStatus)}`}
                  ></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{user.name || "User"}</p>
                  <p className="text-gray-400 text-sm truncate">{user.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500 bg-[#1A1A1A] px-2 py-0.5 rounded-full">99+ emails</span>
                    <span className="text-xs text-gray-500">Admin</span>
                  </div>
                  {/* Personal Information */}
                  <div className="mt-3 relative">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-white">Personal Information</h4>
                      <button
                        onClick={() => {
                          router.push("/i/profile?edit=true");
                          setIsDropdownOpen(false);
                        }}
                        className="text-gray-400 hover:text-white transition-colors p-1 rounded-md hover:bg-[#2A2A2A]"
                        aria-label="Edit personal information"
                      >
                        <UserCircle className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-1 text-xs text-gray-500">
                      <p>Email: {user.email}</p>
                      <p>Bio: {userProfile?.bio || 'Not set'}</p>
                      <p>Location: {userProfile?.location || 'Not set'}</p>
                      <p><Globe className="w-3 h-3 inline mr-1" />Website: <WebsiteLink url={userProfile?.website} variant="compact" showExternalIcon={false} /></p>
                      <p>Birthdate: {userProfile?.birthdate ? new Date(userProfile.birthdate).toLocaleDateString() : 'Not set'}</p>
                      <p>Gender: {userProfile?.gender || 'Not set'}</p>
                      <p>Work Status: {userProfile?.work_status || 'Not set'}</p>
                      <p>Interests: {userProfile?.interests?.join(', ') || 'None'}</p>
                      <div className="flex gap-2">
                        <span>Theme: {userProfile?.preferences?.theme || 'dark'}</span>
                        <span>Lang: {userProfile?.preferences?.language || 'en'}</span>
                        <span>Notif: {userProfile?.preferences?.notifications ? 'On' : 'Off'}</span>
                        <span>Freq: {userProfile?.preferences?.email_frequency || 'daily'}</span>
                        <span>TZ: {userProfile?.preferences?.timezone || 'UTC'}</span>
                      </div>
                      <p>Emails Processed: {userProfile?.emails_processed || '0'}</p>
                      <p>Last Activity: {userProfile?.last_email_activity ? new Date(userProfile.last_email_activity).toLocaleDateString() : 'Never'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Menu Sections */}
            <div className="p-3">
              {/* Status Management */}
              <div className="mb-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Status</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => updateUserStatus('online')}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-colors ${userStatus === 'online'
                      ? 'bg-green-500/20 text-green-400'
                      : 'text-white hover:bg-[#2A2A2A]'
                      }`}
                    role="menuitem"
                  >
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    Online
                  </button>
                  <button
                    onClick={() => updateUserStatus('away')}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-colors ${userStatus === 'away'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'text-white hover:bg-[#2A2A2A]'
                      }`}
                    role="menuitem"
                  >
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    Away
                  </button>
                  <button
                    onClick={() => updateUserStatus('offline')}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-colors ${userStatus === 'offline'
                      ? 'bg-gray-500/20 text-gray-400'
                      : 'text-white hover:bg-[#2A2A2A]'
                      }`}
                    role="menuitem"
                  >
                    <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                    Offline
                  </button>
                </div>
              </div>

              {/* Account Actions */}
              <div className="mb-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Account</h3>
                <div className="space-y-1">
                  <button
                    onClick={handleProfileClick}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left text-white hover:bg-[#2A2A2A] rounded-md transition-colors"
                    role="menuitem"
                  >
                    <UserCircle className="w-4 h-4" />
                    View Profile
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-white hover:bg-[#2A2A2A] rounded-md transition-colors" role="menuitem">
                    <Camera className="w-4 h-4" />
                    Change Avatar
                  </button>
                  <button
                    onClick={() => {
                      router.push("/i/profile?edit=true");
                      setIsDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left text-white hover:bg-[#2A2A2A] rounded-md transition-colors"
                    role="menuitem"
                  >
                    <UserCircle className="w-4 h-4" />
                    Edit Profile
                  </button>
                  <button
                    onClick={() => {
                      router.push("/settings");
                      setIsDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left text-white hover:bg-[#2A2A2A] rounded-md transition-colors"
                    role="menuitem"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                </div>
              </div>

              {/* Workspace & Collaboration */}
              <div className="mb-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Workspace</h3>
                <div className="space-y-1">
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-white hover:bg-[#2A2A2A] rounded-md transition-colors" role="menuitem">
                    <Users className="w-4 h-4" />
                    Team Management
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-white hover:bg-[#2A2A2A] rounded-md transition-colors" role="menuitem">
                    <User className="w-4 h-4" />
                    Invite Members
                  </button>
                </div>
              </div>

              {/* Security & Privacy */}
              <div className="mb-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Security</h3>
                <div className="space-y-1">
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-white hover:bg-[#2A2A2A] rounded-md transition-colors" role="menuitem">
                    <Shield className="w-4 h-4" />
                    Two-Factor Auth
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-white hover:bg-[#2A2A2A] rounded-md transition-colors" role="menuitem">
                    <Activity className="w-4 h-4" />
                    Active Sessions
                  </button>
                </div>
              </div>

              {/* Billing & Usage */}
              <div className="mb-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Billing</h3>
                <div className="space-y-1">
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-white hover:bg-[#2A2A2A] rounded-md transition-colors" role="menuitem">
                    <CreditCard className="w-4 h-4" />
                    Billing & Plans
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-white hover:bg-[#2A2A2A] rounded-md transition-colors" role="menuitem">
                    <Activity className="w-4 h-4" />
                    Usage Dashboard
                  </button>
                </div>
              </div>

              {/* Help & Support */}
              <div className="mb-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Support</h3>
                <div className="space-y-1">
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-white hover:bg-[#2A2A2A] rounded-md transition-colors" role="menuitem">
                    <HelpCircle className="w-4 h-4" />
                    Help Center
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-white hover:bg-[#2A2A2A] rounded-md transition-colors" role="menuitem">
                    <ExternalLink className="w-4 h-4" />
                    Contact Support
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-white hover:bg-[#2A2A2A] rounded-md transition-colors" role="menuitem">
                    <Bell className="w-4 h-4" />
                    What's New
                  </button>
                </div>
              </div>

              {/* Legal & Compliance */}
              <div className="mb-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Legal</h3>
                <div className="space-y-1">
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-white hover:bg-[#2A2A2A] rounded-md transition-colors" role="menuitem">
                    <FileText className="w-4 h-4" />
                    Terms of Service
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-white hover:bg-[#2A2A2A] rounded-md transition-colors" role="menuitem">
                    <FileText className="w-4 h-4" />
                    Privacy Policy
                  </button>
                </div>
              </div>

              {/* Theme Switch */}
              <div className="mb-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Appearance</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-colors ${theme === 'dark'
                      ? 'bg-[#2A2A2A] text-white'
                      : 'text-white hover:bg-[#2A2A2A]'
                      }`}
                    role="menuitem"
                  >
                    <Moon className="w-4 h-4" />
                    Dark Theme
                  </button>
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-colors ${theme === 'light'
                      ? 'bg-[#2A2A2A] text-white'
                      : 'text-white hover:bg-[#2A2A2A]'
                      }`}
                    role="menuitem"
                  >
                    <Sun className="w-4 h-4" />
                    Light Theme
                  </button>
                  <button
                    onClick={() => handleThemeChange('system')}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-colors ${theme === 'system'
                      ? 'bg-[#2A2A2A] text-white'
                      : 'text-white hover:bg-[#2A2A2A]'
                      }`}
                    role="menuitem"
                  >
                    <Monitor className="w-4 h-4" />
                    System Theme
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-[#333333] my-3"></div>

              {/* Danger Zone */}
              <div className="mb-3">
                <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Danger Zone</h3>
                <div className="space-y-1">
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-red-400 hover:bg-red-500/10 rounded-md transition-colors" role="menuitem">
                    <Trash2 className="w-4 h-4" />
                    Delete Account
                  </button>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 text-left text-red-400 hover:bg-red-500/10 rounded-md transition-colors border border-red-500/20"
                role="menuitem"
              >
                <LogOut className="w-4 h-4" />
                Log Out
              </button>
            </div>
          </div>

          {/* Mobile Bottom Sheet */}
          <div
            id="mobile-profile-dropdown"
            className="md:hidden fixed bottom-0 left-0 right-0 bg-[#121212] border-t border-[#333333] rounded-t-lg shadow-2xl z-50 animate-in slide-in-from-bottom-2 duration-200 max-h-[80vh] overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-profile-title"
            aria-describedby="mobile-profile-description"
          >
            {/* Mobile Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#333333]">
              <h2 id="mobile-profile-title" className="text-white font-medium">Profile Menu</h2>
              <button
                onClick={() => setIsDropdownOpen(false)}
                className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-1"
                aria-label="Close profile menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Mobile Scrollable Content */}
            <div className="overflow-y-auto max-h-[calc(80vh-80px)] p-4">
              {/* User Info Section - Mobile */}
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-[#1A1A1A] border border-[#444444] flex items-center justify-center text-white font-semibold text-base">
                      {hasProfileImage() ? (
                        <img
                          src={getProfileImage()}
                          alt={`${user.name || 'User'} profile picture`}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 ${getStatusColor(userStatus)} rounded-full border-2 border-[#121212]`}
                      aria-label={`Status: ${getStatusText(userStatus)}`}
                    ></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{user.name || "User"}</p>
                    <p className="text-gray-400 text-sm truncate">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500 bg-[#1A1A1A] px-2 py-0.5 rounded-full">99+ emails</span>
                      <span className="text-xs text-gray-500">Admin</span>
                    </div>
                    {/* Personal Information - Mobile */}
                    <div className="mt-3 relative">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-white">Personal Information</h4>
                        <button
                          onClick={() => {
                            router.push("/i/profile?edit=true");
                            setIsDropdownOpen(false);
                          }}
                          className="text-gray-400 hover:text-white transition-colors p-1 rounded-md hover:bg-[#2A2A2A]"
                          aria-label="Edit personal information"
                        >
                          <UserCircle className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-1 text-xs text-gray-500">
                        <p>Email: {user.email}</p>
                        <p>Bio: {userProfile?.bio || 'Not set'}</p>
                        <p>Location: {userProfile?.location || 'Not set'}</p>
                        <p><Globe className="w-3 h-3 inline mr-1" />Website: <WebsiteLink url={userProfile?.website} variant="compact" showExternalIcon={false} /></p>
                        <p>Birthdate: {userProfile?.birthdate ? new Date(userProfile.birthdate).toLocaleDateString() : 'Not set'}</p>
                        <p>Gender: {userProfile?.gender || 'Not set'}</p>
                        <p>Work Status: {userProfile?.work_status || 'Not set'}</p>
                        <p>Interests: {userProfile?.interests?.join(', ') || 'None'}</p>
                        <div className="flex gap-2">
                          <span>Theme: {userProfile?.preferences?.theme || 'dark'}</span>
                          <span>Lang: {userProfile?.preferences?.language || 'en'}</span>
                          <span>Notif: {userProfile?.preferences?.notifications ? 'On' : 'Off'}</span>
                          <span>Freq: {userProfile?.preferences?.email_frequency || 'daily'}</span>
                          <span>TZ: {userProfile?.preferences?.timezone || 'UTC'}</span>
                        </div>
                        <p>Emails Processed: {userProfile?.emails_processed || '0'}</p>
                        <p>Last Activity: {userProfile?.last_email_activity ? new Date(userProfile.last_email_activity).toLocaleDateString() : 'Never'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Menu Sections - Condensed for mobile */}
              <div className="space-y-4">
                {/* Status Management - Mobile */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Status</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => updateUserStatus('online')}
                      className={`flex flex-col items-center gap-2 p-3 rounded-md transition-colors ${userStatus === 'online'
                        ? 'bg-green-500/20 text-green-400'
                        : 'text-white hover:bg-[#2A2A2A]'
                        }`}
                      role="menuitem"
                    >
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-xs">Online</span>
                    </button>
                    <button
                      onClick={() => updateUserStatus('away')}
                      className={`flex flex-col items-center gap-2 p-3 rounded-md transition-colors ${userStatus === 'away'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'text-white hover:bg-[#2A2A2A]'
                        }`}
                      role="menuitem"
                    >
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-xs">Away</span>
                    </button>
                    <button
                      onClick={() => updateUserStatus('offline')}
                      className={`flex flex-col items-center gap-2 p-3 rounded-md transition-colors ${userStatus === 'offline'
                        ? 'bg-gray-500/20 text-gray-400'
                        : 'text-white hover:bg-[#2A2A2A]'
                        }`}
                      role="menuitem"
                    >
                      <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                      <span className="text-xs">Offline</span>
                    </button>
                  </div>
                </div>

                {/* Quick Actions */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleProfileClick}
                      className="flex flex-col items-center gap-2 p-3 text-white hover:bg-[#2A2A2A] rounded-md transition-colors"
                      role="menuitem"
                    >
                      <UserCircle className="w-5 h-5" />
                      <span className="text-xs">Profile</span>
                    </button>
                    <button className="flex flex-col items-center gap-2 p-3 text-white hover:bg-[#2A2A2A] rounded-md transition-colors" role="menuitem">
                      <Settings className="w-5 h-5" />
                      <span className="text-xs">Settings</span>
                    </button>
                    <button className="flex flex-col items-center gap-2 p-3 text-white hover:bg-[#2A2A2A] rounded-md transition-colors" role="menuitem">
                      <Users className="w-5 h-5" />
                      <span className="text-xs">Team</span>
                    </button>
                    <button className="flex flex-col items-center gap-2 p-3 text-white hover:bg-[#2A2A2A] rounded-md transition-colors" role="menuitem">
                      <HelpCircle className="w-5 h-5" />
                      <span className="text-xs">Help</span>
                    </button>
                  </div>
                </div>

                {/* Account & Security */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Account & Security</h3>
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        router.push("/i/profile?edit=true");
                        setIsDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left text-white hover:bg-[#2A2A2A] rounded-md transition-colors"
                      role="menuitem"
                    >
                      <UserCircle className="w-4 h-4" />
                      Edit Profile
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-white hover:bg-[#2A2A2A] rounded-md transition-colors" role="menuitem">
                      <Shield className="w-4 h-4" />
                      Two-Factor Auth
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-white hover:bg-[#2A2A2A] rounded-md transition-colors" role="menuitem">
                      <CreditCard className="w-4 h-4" />
                      Billing
                    </button>
                  </div>
                </div>

                {/* Theme Selection - Mobile */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Theme</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleThemeChange('dark')}
                      className={`flex flex-col items-center gap-2 p-3 rounded-md transition-colors ${theme === 'dark'
                        ? 'bg-[#2A2A2A] text-white'
                        : 'text-white hover:bg-[#2A2A2A]'
                        }`}
                      role="menuitem"
                    >
                      <Moon className="w-5 h-5" />
                      <span className="text-xs">Dark</span>
                    </button>
                    <button
                      onClick={() => handleThemeChange('light')}
                      className={`flex flex-col items-center gap-2 p-3 rounded-md transition-colors ${theme === 'light'
                        ? 'bg-[#2A2A2A] text-white'
                        : 'text-white hover:bg-[#2A2A2A]'
                        }`}
                      role="menuitem"
                    >
                      <Sun className="w-5 h-5" />
                      <span className="text-xs">Light</span>
                    </button>
                    <button
                      onClick={() => handleThemeChange('system')}
                      className={`flex flex-col items-center gap-2 p-3 rounded-md transition-colors ${theme === 'system'
                        ? 'bg-[#2A2A2A] text-white'
                        : 'text-white hover:bg-[#2A2A2A]'
                        }`}
                      role="menuitem"
                    >
                      <Monitor className="w-5 h-5" />
                      <span className="text-xs">System</span>
                    </button>
                  </div>
                </div>

                {/* Legal Links */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Legal</h3>
                  <div className="space-y-1">
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-white hover:bg-[#2A2A2A] rounded-md transition-colors" role="menuitem">
                      <FileText className="w-4 h-4" />
                      Terms of Service
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-white hover:bg-[#2A2A2A] rounded-md transition-colors" role="menuitem">
                      <FileText className="w-4 h-4" />
                      Privacy Policy
                    </button>
                  </div>
                </div>

                {/* Logout Button - Mobile */}
                <div className="pt-4 border-t border-[#333333]">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-3 text-left text-red-400 hover:bg-red-500/10 rounded-md transition-colors border border-red-500/20"
                    role="menuitem"
                  >
                    <LogOut className="w-4 h-4" />
                    Log Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Enhanced Edit Profile Modal - Replaced with new dialog component */}

    </div>
  );
}
