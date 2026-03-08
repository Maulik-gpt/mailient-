"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  MapPin,
  Link as LinkIcon,
  Save,
  Loader2,
  ArrowLeft,
  Camera,
  Shield,
  Bell,
  Palette,
  Globe,
  CreditCard,
  FileText,
  Activity,
  Calendar,
  Clock,
  Plug,
  DoorOpen,
  MoreHorizontal,
  LogOut
} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { NotificationIcon } from "@/components/ui/notification-icon";
import AvatarUpload from "../../../components/ui/avatar-upload";
import { IntegrationsModal } from "../../../components/ui/integrations-modal";
import { WebsiteLink } from "../../../components/ui/website-link";

interface UserProfile {
  user_id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  status: 'online' | 'away' | 'offline';
  last_synced_at: string | null;
  email_accounts_connected: number;
  emails_processed: number;
  plan: string;
  storage_used: string;
  last_email_activity: string | null;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    timezone: string;
    date_format: string;
    time_format: string;
    email_notifications: boolean;
    push_notifications: boolean;
    marketing_emails: boolean;
    auto_save: boolean;
    compact_mode: boolean;
  };
  privacy_settings: {
    profile_visibility: 'public' | 'private' | 'contacts';
    show_online_status: boolean;
    allow_direct_messages: boolean;
    data_collection: boolean;
    analytics: boolean;
  };
  notification_settings: {
    email_digest: 'never' | 'daily' | 'weekly' | 'monthly';
    desktop_notifications: boolean;
    sound_enabled: boolean;
    mention_notifications: boolean;
    reply_notifications: boolean;
  };
  created_at: string;
  updated_at: string;
}

export default function ProfileSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'preferences' | 'privacy' | 'notifications' | 'integrations'>('profile');
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false);
  const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState<boolean>(false);

  const handleLogout = async () => {
    setIsMoreOptionsOpen(false);
    await signOut({ redirect: false });
    router.push("/");
  };
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    location: '',
    website: '',
    preferences: {} as UserProfile['preferences'],
    privacy_settings: {} as UserProfile['privacy_settings'],
    notification_settings: {} as UserProfile['notification_settings']
  });

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/profile');
        if (response.ok) {
          const data = await response.json();
          console.log('Profile data received:', data);
          setProfile(data);
          setFormData({
            name: data.name || '',
            bio: data.bio || '',
            location: data.location || '',
            website: data.website || '',
            preferences: data.preferences || formData.preferences,
            privacy_settings: data.privacy_settings || formData.privacy_settings,
            notification_settings: data.notification_settings || formData.notification_settings
          });
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchProfile();
    }
  }, [status]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          bio: formData.bio,
          location: formData.location,
          website: formData.website,
          preferences: formData.preferences,
          privacy_settings: formData.privacy_settings,
          notification_settings: formData.notification_settings
        }),
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setProfile(updatedProfile);
        alert('Profile updated successfully!');
      } else {
        alert('Failed to update profile');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = (avatarUrl: string) => {
    setProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : null);
  };

  const handleSyncProfile = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/profile/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
        alert('Profile synced successfully!');
      } else {
        alert('Failed to sync profile');
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert('Failed to sync profile');
    } finally {
      setSyncing(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#000] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/');
    return null;
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#000] text-white satoshi-profile-settings" style={{ fontFamily: "'Satoshi', ui-sans-serif, system-ui, sans-serif" }}>
        {/* Universal Sidebar - Fixed Position Full Height */}
        <div className="fixed left-0 top-0 h-screen w-20 bg-[#0a0a0a]/50 backdrop-blur-sm border-r border-[#525252] flex flex-col z-20">
          {/* Sidebar Icons */}
          <div className="flex flex-col items-end py-20 gap-6 pr-4">
            {/* Email Icon */}
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    window.location.href = '/home-feed';
                    document.title = 'Home | Mailient';
                  }}
                  className="p-2 hover:bg-[#1a1a1a] rounded-full transition-all duration-300 hover:scale-105"
                  aria-label="Feed"
                >
                  <Mail className="w-6 h-6 text-[#fcfcfc]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Feed</p>
              </TooltipContent>
            </Tooltip>
            
            {/* Notifications Icon */}
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    window.location.href = '/notifications';
                    document.title = 'Notifications | Mailient';
                  }}
                  className="p-2 hover:bg-[#1a1a1a] rounded-full transition-all duration-300 hover:scale-105"
                  aria-label="Notifications"
                >
                  <NotificationIcon iconClassName="w-6 h-6 text-[#fcfcfc]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Notifications</p>
              </TooltipContent>
            </Tooltip>
            

            
            {/* Arcus Symbol */}
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => window.location.href = '/dashboard/agent-talk'}
                  className="p-3 transition-all duration-300 hover:scale-105 flex items-center justify-center w-12 h-12"
                  aria-label="Agent Talk"
                >
                  <span className="text-[#fcfcfc] oleo-script-regular text-2xl ml-2">A</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Arcus</p>
              </TooltipContent>
            </Tooltip>
            
            {/* Profile Icon */}
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => window.location.href = '/dashboard/profile-bubble'}
                  className="p-2 hover:bg-[#1a1a1a] rounded-full transition-all duration-300 hover:scale-105"
                  aria-label="Profile"
                >
                  <User className="w-6 h-6 text-[#fcfcfc]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Profile</p>
              </TooltipContent>
            </Tooltip>
            
            {/* More Options Icon */}
            <div className="relative">
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setIsMoreOptionsOpen(!isMoreOptionsOpen)}
                    className="p-2 hover:bg-[#1a1a1a] rounded-full transition-all duration-300 hover:scale-105"
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

        {/* Main Content with left margin for sidebar */}
        <div className="ml-20">
          {/* Header */}
          <div className="border-b border-[#333333] bg-[#1A1A1A]">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => router.back()}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h1 className="text-xl font-semibold">Profile Settings</h1>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSyncProfile}
                    disabled={syncing}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-md transition-colors"
                  >
                    {syncing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Globe className="w-4 h-4" />
                    )}
                    {syncing ? 'Syncing...' : 'Sync Profile'}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-md transition-colors"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar Tabs */}
          <div className="lg:col-span-1">
            <div className="bg-[#1A1A1A] rounded-lg p-4">
              <nav className="space-y-2">
                {[
                  { id: 'profile', label: 'Profile', icon: User },
                  { id: 'account', label: 'Account', icon: CreditCard },
                  { id: 'preferences', label: 'Preferences', icon: Palette },
                  { id: 'privacy', label: 'Privacy', icon: Shield },
                  { id: 'notifications', label: 'Notifications', icon: Bell },
                  { id: 'integrations', label: 'Integrations', icon: Plug }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-colors ${
                      activeTab === tab.id
                        ? 'bg-[#2e2d2d] text-white'
                        : 'text-gray-300 hover:bg-[#2A2A2A]'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-[#1A1A1A] rounded-lg p-6">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-medium mb-4">Profile Information</h2>

                    {/* Avatar Section */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-300 mb-3">
                        Profile Picture
                      </label>
                      <AvatarUpload
                        currentAvatar={profile?.avatar_url}
                        onAvatarChange={handleAvatarChange}
                        size="lg"
                      />
                    </div>

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Display Name
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full pl-10 pr-3 py-2 bg-[#2A2A2A] border border-[#444444] rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your display name"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="email"
                            value={profile?.email || ''}
                            disabled
                            className="w-full pl-10 pr-3 py-2 bg-[#2A2A2A] border border-[#444444] rounded-md text-gray-400 cursor-not-allowed"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Location
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                            className="w-full pl-10 pr-3 py-2 bg-[#2A2A2A] border border-[#444444] rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="City, Country"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Website
                        </label>
                        <div className="relative">
                          <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="url"
                            value={formData.website}
                            onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                            className="w-full pl-10 pr-3 py-2 bg-[#2A2A2A] border border-[#444444] rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="https://yourwebsite.com"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bio */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Bio
                      </label>
                      <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#444444] rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Tell us about yourself..."
                      />
                    </div>

                    {/* Last Synced */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Last Synced with Google
                      </label>
                      <div className="text-gray-400">
                        {profile?.last_synced_at
                          ? new Date(profile.last_synced_at).toLocaleString()
                          : 'Never synced'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Account Tab */}
              {activeTab === 'account' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-medium mb-4">Account Information</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Account Overview */}
                      <div className="bg-[#1A1A1A] rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <User className="w-5 h-5" />
                          Account Overview
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-400">Email accounts:</span>
                            <span className="text-white">{profile?.email_accounts_connected || 0} connected</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-400">Emails processed:</span>
                            <span className="text-white">99+ total</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <CreditCard className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-400">Plan:</span>
                            <span className="text-white">{profile?.plan || 'Free Plan'}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Activity className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-400">Storage used:</span>
                            <span className="text-white">{profile?.storage_used || '0 MB'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Activity Timeline */}
                      <div className="bg-[#1A1A1A] rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Activity className="w-5 h-5" />
                          Activity Timeline
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-400">Member since:</span>
                            <span className="text-white">
                              {profile?.created_at
                                ? new Date(profile.created_at).toLocaleDateString()
                                : 'Unknown'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-400">Last updated:</span>
                            <span className="text-white">
                              {profile?.updated_at
                                ? new Date(profile.updated_at).toLocaleDateString()
                                : 'Never'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Globe className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-400">Last synced:</span>
                            <span className="text-white">
                              {profile?.last_synced_at
                                ? new Date(profile.last_synced_at).toLocaleDateString()
                                : 'Never synced'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-400">Last email activity:</span>
                            <span className="text-white">
                              {profile?.last_email_activity
                                ? new Date(profile.last_email_activity).toLocaleDateString()
                                : 'No activity'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sync Section */}
                    <div className="bg-[#1A1A1A] rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-4">Data Synchronization</h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">Sync with Google</p>
                          <p className="text-sm text-gray-400">Keep your profile and email data up to date</p>
                        </div>
                        <button
                          onClick={handleSyncProfile}
                          disabled={syncing}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-md transition-colors"
                        >
                          {syncing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Globe className="w-4 h-4" />
                          )}
                          {syncing ? 'Syncing...' : 'Sync Now'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {/* Preferences Tab */}
              {activeTab === 'preferences' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-medium mb-4">Preferences</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Theme
                        </label>
                        <select
                          value={formData.preferences.theme}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            preferences: { ...prev.preferences, theme: e.target.value as any }
                          }))}
                          className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#444444] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#2e2d2d]"
                        >
                          <option value="light">Light</option>
                          <option value="dark">Dark</option>
                          <option value="system">System</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Language
                        </label>
                        <select
                          value={formData.preferences.language}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            preferences: { ...prev.preferences, language: e.target.value }
                          }))}
                          className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#444444] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#2e2d2d]"
                        >
                          <option value="en">English</option>
                          <option value="es">Español</option>
                          <option value="fr">Français</option>
                          <option value="de">Deutsch</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Timezone
                        </label>
                        <select
                          value={formData.preferences.timezone}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            preferences: { ...prev.preferences, timezone: e.target.value }
                          }))}
                          className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#444444] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="UTC">UTC</option>
                          <option value="America/New_York">Eastern Time</option>
                          <option value="America/Chicago">Central Time</option>
                          <option value="America/Denver">Mountain Time</option>
                          <option value="America/Los_Angeles">Pacific Time</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Date Format
                        </label>
                        <select
                          value={formData.preferences.date_format}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            preferences: { ...prev.preferences, date_format: e.target.value }
                          }))}
                          className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#444444] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Privacy Tab */}
              {activeTab === 'privacy' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-medium mb-4">Privacy Settings</h2>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Profile Visibility
                        </label>
                        <select
                          value={formData.privacy_settings.profile_visibility}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            privacy_settings: { ...prev.privacy_settings, profile_visibility: e.target.value as any }
                          }))}
                          className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#444444] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="public">Public</option>
                          <option value="contacts">Contacts Only</option>
                          <option value="private">Private</option>
                        </select>
                      </div>

                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.privacy_settings.show_online_status}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              privacy_settings: { ...prev.privacy_settings, show_online_status: e.target.checked }
                            }))}
                            className="mr-3 w-4 h-4 text-blue-600 bg-[#2A2A2A] border-[#444444] rounded focus:ring-blue-500"
                          />
                          Show online status to other users
                        </label>

                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.privacy_settings.allow_direct_messages}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              privacy_settings: { ...prev.privacy_settings, allow_direct_messages: e.target.checked }
                            }))}
                            className="mr-3 w-4 h-4 text-blue-600 bg-[#2A2A2A] border-[#444444] rounded focus:ring-blue-500"
                          />
                          Allow direct messages from other users
                        </label>

                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.privacy_settings.data_collection}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              privacy_settings: { ...prev.privacy_settings, data_collection: e.target.checked }
                            }))}
                            className="mr-3 w-4 h-4 text-blue-600 bg-[#2A2A2A] border-[#444444] rounded focus:ring-blue-500"
                          />
                          Allow data collection for service improvement
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-medium mb-4">Notification Settings</h2>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Email Digest
                        </label>
                        <select
                          value={formData.notification_settings.email_digest}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            notification_settings: { ...prev.notification_settings, email_digest: e.target.value as any }
                          }))}
                          className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#444444] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="never">Never</option>
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>

                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.notification_settings.desktop_notifications}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              notification_settings: { ...prev.notification_settings, desktop_notifications: e.target.checked }
                            }))}
                            className="mr-3 w-4 h-4 text-blue-600 bg-[#2A2A2A] border-[#444444] rounded focus:ring-blue-500"
                          />
                          Enable desktop notifications
                        </label>

                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.notification_settings.sound_enabled}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              notification_settings: { ...prev.notification_settings, sound_enabled: e.target.checked }
                            }))}
                            className="mr-3 w-4 h-4 text-blue-600 bg-[#2A2A2A] border-[#444444] rounded focus:ring-blue-500"
                          />
                          Play notification sounds
                        </label>

                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.notification_settings.mention_notifications}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              notification_settings: { ...prev.notification_settings, mention_notifications: e.target.checked }
                            }))}
                            className="mr-3 w-4 h-4 text-blue-600 bg-[#2A2A2A] border-[#444444] rounded focus:ring-blue-500"
                          />
                          Notify when mentioned
                        </label>

                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.notification_settings.reply_notifications}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              notification_settings: { ...prev.notification_settings, reply_notifications: e.target.checked }
                            }))}
                            className="mr-3 w-4 h-4 text-blue-600 bg-[#2A2A2A] border-[#444444] rounded focus:ring-blue-500"
                          />
                          Notify on replies
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Integrations Tab */}
              {activeTab === 'integrations' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-medium mb-4">Integrations</h2>
                    <p className="text-gray-400 mb-6">Connect your favorite apps and services to enhance your experience.</p>
                    <button
                      onClick={() => setIsIntegrationsOpen(true)}
                      className="flex items-center gap-3 px-4 py-3 bg-[#2A2A2A] border border-[#444444] rounded-md text-white hover:bg-[#333333] transition-colors"
                    >
                      <Plug className="w-5 h-5" />
                      Manage Integrations
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Integrations Modal */}
      <IntegrationsModal
        isOpen={isIntegrationsOpen}
        onClose={() => setIsIntegrationsOpen(false)}
      />
        </div>
      </div>
    </TooltipProvider>
  );
}