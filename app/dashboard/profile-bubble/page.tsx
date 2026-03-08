"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import AvatarUpload from "../../../components/ui/avatar-upload";
import { WebsiteLink } from "../../../components/ui/website-link";
import { EditProfileDialog } from "../../../components/ui/edit-profile-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../../components/ui/dialog";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { HomeFeedSidebar } from "@/components/ui/home-feed-sidebar";
import { NotificationIcon } from "@/components/ui/notification-icon";
import {
  User,
  Mail,
  Calendar,
  Clock,
  Settings,
  Edit,
  LogOut,
  Save,
  X,
  MapPin,
  Link as LinkIcon,
  CreditCard,
  HelpCircle,
  FileText,
  Moon,
  Sun,
  Monitor,
  Activity,
  Trash2,
  ArrowLeft,
  Globe,
  MessageSquare,
  Timer,
  Hash,
  Users,
  TrendingUp,
  Eye,
  EyeOff,
  Zap,
  CalendarDays,
  Network,
  Upload,
  Image as ImageIcon,
  DoorOpen,
  Bell,
  MoreHorizontal,
  Bookmark
} from "lucide-react";

type UserStatus = 'online' | 'away' | 'offline';

interface UserProfile {
  user_id: string;
  name: string | null;
  username: string | null;
  email: string;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  birthdate: string | null;
  status: UserStatus;
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


export default function EnhancedProfilePage() {
  const { data: session, status } = useSession();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    bio: '',
    location: '',
    website: '',
    birthdate: '',
    banner_url: ''
  });
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [feedbackStep, setFeedbackStep] = useState<'initial' | 'yes' | 'no' | 'complete'>('initial');
  const [usefulFeedback, setUsefulFeedback] = useState('');
  const [wrongFeedback, setWrongFeedback] = useState('');
  const [improvementFeedback, setImprovementFeedback] = useState('');
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState<boolean>(false);
  const [recentSentEmails, setRecentSentEmails] = useState<any[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);

  // Set page title
  useEffect(() => {
    document.title = 'Profile / Mailient';
  }, []);



  // List of countries for autocomplete
  const countries = [
    'United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands',
    'Belgium', 'Switzerland', 'Austria', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Ireland', 'Portugal',
    'Australia', 'New Zealand', 'Japan', 'South Korea', 'Singapore', 'India', 'China', 'Brazil',
    'Mexico', 'Argentina', 'Chile', 'South Africa', 'Egypt', 'Israel', 'Turkey', 'Russia', 'Poland',
    'Czech Republic', 'Hungary', 'Greece', 'Thailand', 'Malaysia', 'Indonesia', 'Philippines', 'Vietnam'
  ];


  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }

    // Check onboarding status
    if (status === "authenticated" && session?.user?.email) {
      const checkOnboarding = async () => {
        try {
          const response = await fetch("/api/onboarding/status");
          if (response.ok) {
            const data = await response.json();
            if (!data.completed) {
              router.push("/onboarding");
              return;
            }
          }
        } catch (error) {
          console.error("Error checking onboarding status:", error);
          router.push("/onboarding");
          return;
        }
        fetchProfile();
        fetchRecentSentEmails();
      };
      checkOnboarding();
    }
  }, [status, session, router]);

  // Handle click outside to close location suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showLocationSuggestions) {
        setShowLocationSuggestions(false);
      }
    };

    if (showLocationSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showLocationSuggestions]);

  const fetchProfile = async () => {
    try {
      setLoading(true);

      // First, ensure we have a valid session
      if (!session?.user) {
        console.error("No valid session found");
        createFallbackProfile();
        return;
      }

      console.log("Fetching profile for user:", session.user.email);

      // Try to fetch existing profile with automatic Gmail sync
      const response = await fetch('/api/profile');
      console.log("Profile API response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Profile API response:", data);

        // Merge with session data for completeness
        const mergedProfile = {
          ...data,
          avatar_url: data.avatar_url || session.user.image || null,
          name: data.name || session.user.name || null,
          email: data.email || session.user.email || '',
          username: data.username || null,
        };

        setProfile(mergedProfile);
      } else {
        console.error("Profile API error:", response.status, response.statusText);

        // If unauthorized, try automatic Gmail sync
        if (response.status === 401) {
          console.log("Attempting automatic Gmail sync...");
          const syncResponse = await fetch('/api/profile/sync', {
            method: 'POST'
          });

          if (syncResponse.ok) {
            console.log("Gmail sync successful, re-fetching profile...");
            // Re-fetch profile after successful sync
            const retryResponse = await fetch('/api/profile');
            if (retryResponse.ok) {
              const syncedData = await retryResponse.json();
              const mergedProfile = {
                ...syncedData,
                avatar_url: syncedData.avatar_url || session.user.image || null,
                name: syncedData.name || session.user.name || null,
                email: syncedData.email || session.user.email || '',
              };
              setProfile(mergedProfile);
            } else {
              createFallbackProfile();
            }
          } else {
            console.error("Gmail sync failed:", syncResponse.status);
            createFallbackProfile();
          }
        } else {
          createFallbackProfile();
        }
      }
    } catch (error) {
      console.error("Error in fetchProfile:", error);
      createFallbackProfile();
    } finally {
      setLoading(false);
    }
  };

  const createDefaultProfile = async () => {
    if (!session?.user) {
      console.error("No session available for profile creation");
      createFallbackProfile();
      return;
    }

    try {
      console.log("Creating default profile for user:", session.user.email);

      const defaultProfile = {
        name: session.user.name || null,
        email: session.user.email || '',
        avatar_url: session.user.image || null,
        bio: null,
        location: null,
        website: null,
        status: 'online' as const,
        last_synced_at: new Date().toISOString(),
        email_accounts_connected: 0,
        emails_processed: 0,
        plan: 'Free Plan',
        storage_used: '0 MB',
        last_email_activity: null,
        preferences: {
          theme: 'dark' as const,
          language: 'en',
          timezone: 'UTC',
          date_format: 'MM/DD/YYYY',
          time_format: '12h',
          email_notifications: true,
          push_notifications: true,
          marketing_emails: false,
          auto_save: true,
          compact_mode: false
        },
        privacy_settings: {
          profile_visibility: 'public' as const,
          show_online_status: true,
          allow_direct_messages: true,
          data_collection: true,
          analytics: false
        },
        notification_settings: {
          email_digest: 'daily' as const,
          desktop_notifications: true,
          sound_enabled: true,
          mention_notifications: true,
          reply_notifications: true
        }
      };

      console.log("Sending profile creation request to /api/profile");

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(defaultProfile),
      });

      console.log("Profile creation response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Profile created successfully:", data);
        setProfile(data);
      } else {
        const errorText = await response.text();
        console.error("Profile creation failed with status:", response.status);
        console.error("Error response:", errorText);
        // Fall back to creating a local profile
        createFallbackProfile();
      }
    } catch (error) {
      console.error("Error creating default profile:", error);
      // Fall back to creating a local profile
      createFallbackProfile();
    }
  };

  const createFallbackProfile = () => {
    if (!session?.user) {
      console.error("No session available for fallback profile");
      setLoading(false);
      return;
    }

    console.log("Creating fallback profile from session data for user:", session.user.email);

    const fallbackProfile: UserProfile = {
      user_id: session.user.id || 'unknown',
      name: session.user.name || null,
      username: null,
      email: session.user.email || '',
      avatar_url: session.user.image || null,
      banner_url: null,
      bio: null,
      location: null,
      website: null,
      birthdate: null,
      status: 'online',
      last_synced_at: null,
      email_accounts_connected: 0,
      emails_processed: 0,
      plan: 'Free Plan',
      storage_used: '0 MB',
      last_email_activity: null,
      preferences: {
        theme: 'dark',
        language: 'en',
        timezone: 'UTC',
        date_format: 'MM/DD/YYYY',
        time_format: '12h',
        email_notifications: true,
        push_notifications: true,
        marketing_emails: false,
        auto_save: true,
        compact_mode: false
      },
      privacy_settings: {
        profile_visibility: 'public',
        show_online_status: true,
        allow_direct_messages: true,
        data_collection: true,
        analytics: false
      },
      notification_settings: {
        email_digest: 'daily',
        desktop_notifications: true,
        sound_enabled: true,
        mention_notifications: true,
        reply_notifications: true
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log("Setting fallback profile:", fallbackProfile);
    setProfile(fallbackProfile);
    setLoading(false); // Ensure loading is set to false
  };

  const fetchRecentSentEmails = async () => {
    try {
      setLoadingEmails(true);
      console.log("Fetching recent sent emails...");

      // Fetch recent sent emails from Gmail API using the correct endpoint
      const response = await fetch('/api/gmail/messages?maxResults=3&query=in:sent');

      if (response.ok) {
        const data = await response.json();
        console.log("Gmail API response:", data);

        // Process the emails from the threads response
        const processedEmails = (data.emails || []).map((email: any) => ({
          id: email.id,
          subject: email.subject || 'No Subject',
          snippet: email.snippet || 'No content available',
          date: email.date || new Date().toISOString(),
          to: email.to || 'Unknown recipient',
        }));

        console.log("Processed sent emails:", processedEmails);
        setRecentSentEmails(processedEmails);
      } else {
        console.error("Failed to fetch sent emails:", response.status);

        // Check if it's an authentication error
        if (response.status === 401) {
          console.log("Authentication error - showing fallback content");
          setRecentSentEmails([
            {
              id: 'demo1',
              subject: 'Welcome to Mailient!',
              snippet: 'This is a demo sent email. Connect your Gmail account to see your actual sent emails.',
              date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
              to: 'demo@example.com'
            },
            {
              id: 'demo2',
              subject: 'Setup Instructions',
              snippet: 'Please connect your Gmail account in settings to start seeing your sent emails here.',
              date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
              to: 'support@example.com'
            },
            {
              id: 'demo3',
              subject: 'Getting Started Guide',
              snippet: 'Learn how to use Mailient to manage your emails effectively.',
              date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
              to: 'help@example.com'
            }
          ]);
        } else {
          // Set empty array for other errors
          setRecentSentEmails([]);
        }
      }
    } catch (error) {
      console.error("Error fetching sent emails:", error);

      // Provide fallback demo content for any errors
      setRecentSentEmails([
        {
          id: 'demo1',
          subject: 'Welcome to Mailient!',
          snippet: 'This is a demo sent email. Connect your Gmail account to see your actual sent emails.',
          date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          to: 'demo@example.com'
        },
        {
          id: 'demo2',
          subject: 'Setup Instructions',
          snippet: 'Please connect your Gmail account in settings to start seeing your sent emails here.',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          to: 'support@example.com'
        },
        {
          id: 'demo3',
          subject: 'Getting Started Guide',
          snippet: 'Learn how to use Mailient to manage your emails effectively.',
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          to: 'help@example.com'
        }
      ]);
    } finally {
      setLoadingEmails(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setProfile(updatedProfile);
        // Show success toast/notification instead of alert
        console.log('Profile updated successfully!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to update profile';
        console.error('API Error:', errorMessage);
        // Show error notification
        console.error(errorMessage);
      }
    } catch (error) {
      console.error('Save error:', error);
      console.error('Network or server error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = (avatarUrl: string) => {
    setProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : null);
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
  };

  const handleLogout = () => {
    signOut();
    router.push("/");
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

  const handleBannerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setBannerFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setBannerPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveBanner = () => {
    setBannerFile(null);
    setBannerPreview('');
    setEditForm({ ...editForm, banner_url: '' });
  };

  const handleSavePersonalInfo = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      let bannerUrl = editForm.banner_url;

      // Handle banner file upload
      if (bannerFile) {
        const formData = new FormData();
        formData.append('banner', bannerFile);

        const uploadResponse = await fetch('/api/profile/avatar', {
          method: 'POST',
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          bannerUrl = uploadData.url;
        }
      }

      console.log('Saving personal info:', {
        bio: editForm.bio,
        location: editForm.location,
        website: editForm.website,
        birthdate: editForm.birthdate,
        banner_url: bannerUrl
      });

      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bio: editForm.bio,
          location: editForm.location,
          website: editForm.website,
          birthdate: editForm.birthdate,
          banner_url: bannerUrl
        }),
      });

      console.log('API response status:', response.status);
      const responseText = await response.text();
      console.log('API response:', responseText);

      if (response.ok) {
        const updatedProfile = JSON.parse(responseText);
        setProfile(updatedProfile);
        setIsEditModalOpen(false);
        setBannerFile(null);
        setBannerPreview('');
        console.log('Personal information updated successfully!');
      } else {
        console.error('API error:', responseText);
        console.error(`Failed to update personal information: ${responseText}`);
      }
    } catch (error) {
      console.error('Save error:', error);
      console.error(`Failed to update personal information: ${String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSendFeedback = async (type: 'yes' | 'no') => {
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          useful: usefulFeedback,
          wrong: wrongFeedback,
          improvement: improvementFeedback
        })
      });
      if (response.ok) {
        setFeedbackStep('complete');
        // Reset form after successful send
        setTimeout(() => {
          setIsFeedbackDialogOpen(false);
          setFeedbackStep('initial');
          setUsefulFeedback('');
          setWrongFeedback('');
          setImprovementFeedback('');
        }, 2000);
      } else {
        alert('Failed to send feedback');
      }
    } catch (error) {
      console.error('Error sending feedback:', error);
      alert('Failed to send feedback');
    }
  };


  // Show loading state while authenticating or loading profile
  if (status === "loading" || (loading && !profile)) {
    return (
      <div className="min-h-screen bg-[#000] flex items-center justify-center" style={{ fontFamily: "'Stack Sans Notch', ui-sans-serif, system-ui, sans-serif" }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto"></div>
          <p className="text-white/60 mt-4">
            {status === "loading" ? "Authenticating..." : "Loading profile..."}
          </p>
          <p className="text-white/40 text-sm mt-2">Setting up your profile</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-[#000] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60">Please sign in to view your profile</p>
        </div>
      </div>
    );
  }

  // If we reach here and still don't have a profile, show helpful message
  if (!profile) {
    return (
      <div className="min-h-screen bg-[#000] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-6">
            <h3 className="text-white text-lg font-semibold mb-4">Database Setup Required</h3>
            <p className="text-white/70 mb-4">
              The user profiles database table hasn't been set up yet. This needs to be done once to enable profile functionality.
            </p>
            <div className="text-left text-sm text-white/60 mb-4 space-y-2">
              <p><strong>Quick Setup:</strong></p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Go to your Supabase dashboard</li>
                <li>Navigate to SQL Editor</li>
                <li>Copy content from <code className="bg-[#333] px-1 rounded">supabase-schema.sql</code></li>
                <li>Paste and run the SQL</li>
                <li>Refresh this page</li>
              </ol>
            </div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-[#2e2d2d] hover:bg-[#3e3d3d] text-white rounded-md transition-colors"
              >
                Retry
              </button>
              <button
                onClick={() => window.open('/supabase-schema.sql', '_blank')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                View Schema
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const firstName = profile?.name?.split(' ')[0] || '';

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-black text-white" style={{ fontFamily: "'Stack Sans Notch', ui-sans-serif, system-ui, sans-serif" }}>
        {/* Universal Sidebar - Fixed Position Full Height */}
        <HomeFeedSidebar />
        {/* Main Content with left margin for sidebar */}
        <div className="ml-16">
          {/* Header */}
          <div className="fixed top-0 left-16 right-0 z-50 border-b border-[#333333] bg-black/80 backdrop-blur-sm flex-shrink-0">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-14">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => router.back()}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h1 className="text-xl font-semibold">Mailient Genome</h1>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => router.push('/i/bookmarks')}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors text-gray-400 hover:text-white hover:bg-gray-800"
                  >
                    <Bookmark className="w-4 h-4" />
                    Bookmarks
                  </button>
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    className="flex items-center gap-2 text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20 border-l-2 border-r-2 border-[#7d7d7d]">
            {/* Communication Energy Banner */}
            {profile?.banner_url ? (
              <div className="relative mb-8 overflow-hidden rounded-2xl aspect-[3/1] max-h-[200px]">
                <img
                  src={profile.banner_url}
                  alt="Profile banner"
                  className="w-full h-full object-cover transition-all duration-300 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
            ) : (
              <div className="relative h-32 bg-gray-800 rounded-2xl mb-8 overflow-hidden border-2 border-dashed border-gray-600 transition-all duration-300 hover:bg-gray-750 hover:border-gray-500 hover:shadow-lg hover:shadow-gray-900/20 cursor-pointer">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-gray-400 transition-all duration-300 hover:text-gray-300">
                    <Zap className="w-8 h-8 mx-auto mb-2 opacity-60 transition-all duration-300 hover:opacity-80 hover:scale-110" />
                    <p className="text-sm">Customize your communication energy banner</p>
                    <p className="text-xs opacity-75">Click edit to add a personal touch</p>
                  </div>
                </div>
              </div>
            )}

            {/* Profile Section */}
            <div className="bg-black rounded-2xl p-6 mb-8 transition-all duration-300 hover:bg-[#222222] hover:border-gray-600 hover:shadow-lg hover:shadow-gray-900/20 hover:scale-[1.005] cursor-pointer border border-transparent">
              <div className="flex flex-col sm:flex-row gap-6">
                {/* Profile Photo */}
                <div className="flex-shrink-0">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-[#2A2A2A] flex items-center justify-center overflow-hidden transition-transform duration-300 hover:scale-105">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={`${profile.name || 'User'} profile picture`}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-600 rounded-full flex items-center justify-center">
                          <User className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 ${profile?.status === 'online' ? 'bg-green-500' :
                      profile?.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
                      } rounded-full border-2 border-[#1A1A1A] transition-all duration-300 hover:scale-110`}></div>
                  </div>
                </div>

                {/* Profile Info */}
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                      {profile?.username ? (
                        <Tooltip delayDuration={200}>
                          <TooltipTrigger asChild>
                            <h2 className="text-2xl font-bold mb-1 transition-colors duration-300 cursor-default hover:text-gray-300 inline-block">
                              {profile?.name || 'User'}
                            </h2>
                          </TooltipTrigger>
                          <TooltipContent
                            side="bottom"
                            className="bg-[#000000] text-white border-0 shadow-xl px-4 py-2 rounded-lg"
                            sideOffset={8}
                            style={{
                              animation: 'fadeIn 0.2s ease-out, slideUp 0.2s ease-out',
                            }}
                          >
                            <p className="text-sm font-medium">@{profile.username}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <h2 className="text-2xl font-bold mb-1 transition-colors duration-300">{profile?.name || 'User'}</h2>
                      )}
                      <p className="text-gray-400 mb-2">{profile?.email}</p>
                      <p className="text-gray-300 mb-3 max-w-md">
                        {profile?.bio || 'Add a bio to tell others about yourself...'}
                      </p>

                      {/* Links */}
                      <div className="flex flex-wrap gap-4 text-sm">
                        {profile?.location && (
                          <div className="flex items-center gap-1 text-gray-400 transition-colors duration-300 hover:text-gray-300">
                            <MapPin className="w-4 h-4" />
                            <span>{profile.location}</span>
                          </div>
                        )}
                        {profile?.website && (
                          <WebsiteLink url={profile.website} variant="default" showExternalIcon={true} />
                        )}
                        <div className="flex items-center gap-1 text-gray-400 transition-colors duration-300 hover:text-gray-300">
                          <Calendar className="w-4 h-4" />
                          <span>Joined {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                      <EditProfileDialog
                        trigger={
                          <Button className="bg-white text-black transition-all duration-300 hover:scale-105 rounded-xl">
                            Edit
                          </Button>
                        }
                        user={session?.user ? {
                          name: session.user.name || undefined,
                          email: session.user.email || undefined
                        } : undefined}
                        profile={{
                          avatar_url: profile?.avatar_url || undefined,
                          bio: profile?.bio || undefined,
                          location: profile?.location || undefined,
                          website: profile?.website || undefined
                        }}
                        onSave={async (data) => {
                          // Save to API
                          setSaving(true);
                          try {
                            const response = await fetch('/api/profile', {
                              method: 'PATCH',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify(data),
                            });

                            if (response.ok) {
                              console.log('Profile updated successfully!');
                              fetchProfile(); // Refresh profile data
                            } else {
                              const errorData = await response.json().catch(() => ({}));
                              const errorMessage = errorData.error || 'Failed to update profile';
                              console.error('API Error:', errorMessage);
                            }
                          } catch (error) {
                            console.error('Save error:', error);
                            console.error('Network or server error occurred');
                          } finally {
                            setSaving(false);
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-black rounded-xl p-4 text-center transition-all duration-300 hover:bg-[#222222] hover:border-gray-600 hover:shadow-lg hover:shadow-gray-900/20 hover:scale-[1.02] cursor-pointer border border-transparent">
                <MessageSquare className="w-6 h-6 text-blue-400 mx-auto mb-2 transition-colors duration-300" />
                <div className="text-2xl font-bold">{profile?.emails_processed?.toLocaleString() || '0'}</div>
                <div className="text-sm text-gray-400">Total Emails</div>
              </div>
              <div className="bg-black rounded-xl p-4 text-center transition-all duration-300 hover:bg-[#222222] hover:border-gray-600 hover:shadow-lg hover:shadow-gray-900/20 hover:scale-[1.02] cursor-pointer border border-transparent">
                <Timer className="w-6 h-6 text-green-400 mx-auto mb-2 transition-colors duration-300" />
                <div className="text-2xl font-bold">
                  {profile?.emails_processed ? Math.round(profile.emails_processed * 0.1) + 'h' : '2.4h'}
                </div>
                <div className="text-sm text-gray-400">Avg Response</div>
              </div>
              <div className="bg-black rounded-xl p-4 text-center transition-all duration-300 hover:bg-[#222222] hover:border-gray-600 hover:shadow-lg hover:shadow-gray-900/20 hover:scale-[1.02] cursor-pointer border border-transparent">
                <CalendarDays className="w-6 h-6 text-purple-400 mx-auto mb-2 transition-colors duration-300" />
                <div className="text-2xl font-bold">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown'}
                </div>
                <div className="text-sm text-gray-400">Active Since</div>
              </div>
              <div className="bg-black rounded-xl p-4 text-center transition-all duration-300 hover:bg-[#222222] hover:border-gray-600 hover:shadow-lg hover:shadow-gray-900/20 hover:scale-[1.02] cursor-pointer border border-transparent">
                <Hash className="w-6 h-6 text-orange-400 mx-auto mb-2 transition-colors duration-300" />
                <div className="text-2xl font-bold">{profile?.plan || 'Free Plan'}</div>
                <div className="text-sm text-gray-400">Plan</div>
              </div>
            </div>

            {/* Network & AI Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Network Section */}
              <div className="bg-black rounded-xl p-6 transition-all duration-300 hover:bg-[#222222] hover:border-gray-600 hover:shadow-lg hover:shadow-gray-900/20 hover:scale-[1.01] cursor-pointer border border-transparent">
                <div className="flex items-center gap-2 mb-4">
                  <Network className="w-5 h-5 text-blue-400 transition-colors duration-300" />
                  <h3 className="text-lg font-semibold">Network</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Email Accounts</span>
                    <span className="text-white font-medium">1</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Storage Used</span>
                    <span className="text-white font-medium">{profile?.storage_used || '0 MB'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Plan</span>
                    <span className="text-green-400 font-medium">{profile?.plan || 'Free Plan'}</span>
                  </div>
                </div>
              </div>

              {/* Posts */}
              <div className="bg-black rounded-xl p-6 transition-all duration-300 hover:bg-[#222222] hover:border-gray-600 hover:shadow-lg hover:shadow-gray-900/20 hover:scale-[1.01] cursor-pointer border border-transparent">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-5 h-5 text-purple-400 transition-colors duration-300" />
                  <h3 className="text-lg font-semibold">Posts</h3>
                </div>
                <div className="space-y-3">
                  {loadingEmails ? (
                    <div className="text-center text-gray-400 py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                      <p className="text-sm">Loading recent posts...</p>
                    </div>
                  ) : recentSentEmails && recentSentEmails.length > 0 ? (
                    recentSentEmails.map((email: any, index: number) => (
                      <div key={email.id || index} className="border-l-2 border-gray-600 pl-3 transition-all duration-300 hover:border-gray-500">
                        <div className="flex items-start justify-between mb-1">
                          <span className="text-sm font-medium text-white truncate flex-1 mr-2">
                            {email.subject || 'No Subject'}
                          </span>
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            {email.date ? new Date(email.date).toLocaleDateString() : 'Unknown'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 line-clamp-2">
                          {email.snippet || 'No content available'}
                        </p>
                        <div className="text-xs text-gray-500 mt-1">
                          To: {email.to || 'Unknown recipient'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-400 py-8">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No recent posts found</p>
                      <p className="text-xs">Recent sent emails will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Feedback Component */}
          <div className="bg-black rounded-xl p-4 mb-8 mx-auto max-w-md border border-gray-700">
            <Dialog open={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen}>
              <DialogTrigger asChild>
                <button className="w-full flex items-center gap-2 hover:bg-gray-800 p-2 rounded transition-colors">
                  <MessageSquare className="w-5 h-5 text-white" />
                  <span className="text-white">Is everything ok till now?</span>
                </button>
              </DialogTrigger>
              <DialogContent className="bg-[#1A1A1A] border-[#333333] text-white max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-white" />
                    Feedback
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {feedbackStep === 'initial' && (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-gray-300 text-lg">Is everything ok till now?</p>
                        <div className="flex gap-6">
                          <button
                            onClick={() => setFeedbackStep('yes')}
                            className="text-white underline hover:text-[#8a8a8a] transition-colors text-lg font-medium"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setFeedbackStep('no')}
                            className="text-white underline hover:text-[#8a8a8a] transition-colors text-lg font-medium"
                          >
                            No
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                  {feedbackStep === 'yes' && (
                    <>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-white mb-2 font-medium">What do you find useful?</label>
                          <textarea
                            value={usefulFeedback}
                            onChange={(e) => setUsefulFeedback(e.target.value)}
                            className="w-full p-3 bg-[#333333] text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#333333] resize-none"
                            rows={3}
                            placeholder="Tell us what you like..."
                          />
                        </div>
                        <div>
                          <label className="block text-white mb-2 font-medium">Can you suggest some improvement?</label>
                          <textarea
                            value={improvementFeedback}
                            onChange={(e) => setImprovementFeedback(e.target.value)}
                            className="w-full p-3 bg-[#333333] text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#333333] resize-none"
                            rows={3}
                            placeholder="Any suggestions?"
                          />
                        </div>
                        <button
                          onClick={() => handleSendFeedback('yes')}
                          disabled={!usefulFeedback.trim() || !improvementFeedback.trim()}
                          className={`w-full text-white px-4 py-2 rounded border border-gray-600 transition-colors font-medium ${!usefulFeedback.trim() || !improvementFeedback.trim()
                            ? 'bg-[#141414] cursor-not-allowed'
                            : 'bg-black hover:bg-gray-800'
                            }`}
                        >
                          Send Feedback
                        </button>
                      </div>
                    </>
                  )}
                  {feedbackStep === 'no' && (
                    <>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-white mb-2 font-medium">What did go wrong?</label>
                          <textarea
                            value={wrongFeedback}
                            onChange={(e) => setWrongFeedback(e.target.value)}
                            className="w-full p-3 bg-[#333333] text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#333333] resize-none"
                            rows={3}
                            placeholder="What issues did you face?"
                          />
                        </div>
                        <div>
                          <label className="block text-white mb-2 font-medium">Can you suggest some improvement?</label>
                          <textarea
                            value={improvementFeedback}
                            onChange={(e) => setImprovementFeedback(e.target.value)}
                            className="w-full p-3 bg-[#333333] text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#333333] resize-none"
                            rows={3}
                            placeholder="How can we improve?"
                          />
                        </div>
                        <button
                          onClick={() => handleSendFeedback('no')}
                          disabled={!wrongFeedback.trim() || !improvementFeedback.trim()}
                          className={`w-full text-white px-4 py-2 rounded border border-gray-600 transition-colors font-medium ${!wrongFeedback.trim() || !improvementFeedback.trim()
                            ? 'bg-[#141414] cursor-not-allowed'
                            : 'bg-black hover:bg-gray-800'
                            }`}
                        >
                          Send Feedback
                        </button>
                      </div>
                    </>
                  )}
                  {feedbackStep === 'complete' && (
                    <div className="text-center py-4">
                      <div className="text-green-400 text-lg font-medium mb-2">Thank you for your feedback!</div>
                      <p className="text-gray-400 text-sm">Your response has been sent successfully.</p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Edit Personal Information Modal */}
          {isEditModalOpen && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setIsEditModalOpen(false)} />

              {/* Modal */}
              <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-[#121212] border border-[#333333] rounded-lg shadow-2xl z-50 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[#333333]">
                  <h2 className="text-white font-medium text-lg">Edit Personal Information</h2>
                  <button
                    onClick={() => setIsEditModalOpen(false)}
                    className="text-gray-400 hover:text-white transition-colors p-1 rounded-md hover:bg-[#2A2A2A]"
                    aria-label="Close edit modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form */}
                <div className="p-6 space-y-6">
                  {/* Banner Upload Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Profile Banner (1500x500px, 3:1 aspect ratio)
                    </label>
                    <div className="space-y-3">
                      {/* Banner Preview */}
                      <div className="relative aspect-[3/1] bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 overflow-hidden">
                        {bannerPreview || editForm.banner_url ? (
                          <>
                            <img
                              src={bannerPreview || editForm.banner_url}
                              alt="Banner preview"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/20"></div>
                            <button
                              type="button"
                              onClick={handleRemoveBanner}
                              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center text-gray-400">
                              <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-60" />
                              <p className="text-sm">Upload banner image</p>
                              <p className="text-xs opacity-75">1500x500px recommended</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* File Input */}
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBannerChange}
                          className="hidden"
                          id="banner-upload"
                        />
                        <label
                          htmlFor="banner-upload"
                          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg cursor-pointer transition-colors"
                        >
                          <Upload className="w-4 h-4" />
                          Choose Banner
                        </label>
                        {(bannerPreview || editForm.banner_url) && (
                          <button
                            type="button"
                            onClick={handleRemoveBanner}
                            className="px-4 py-2 text-red-400 hover:text-red-300 transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bio - Large text area at the top */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Bio
                    </label>
                    <textarea
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      rows={6}
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#444444] rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 resize-none text-sm"
                      placeholder="Tell us about yourself... Share your story, interests, and what makes you unique."
                    />
                  </div>

                  {/* Email - Read Only */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={profile?.email || ''}
                        disabled
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#444444] rounded-md text-gray-500 cursor-not-allowed text-sm"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>

                  {/* Two column layout for remaining fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Location with autocomplete */}
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        <MapPin className="w-4 h-4 inline mr-1" />
                        Location
                      </label>
                      <input
                        type="text"
                        value={editForm.location}
                        onChange={(e) => handleLocationChange(e.target.value)}
                        onFocus={() => editForm.location && setShowLocationSuggestions(true)}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#444444] rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
                        placeholder="Enter your country"
                      />
                      {showLocationSuggestions && locationSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 bg-[#1A1A1A] border border-[#444444] rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
                          {locationSuggestions.map((country, index) => (
                            <button
                              key={index}
                              onClick={() => selectLocationSuggestion(country)}
                              className="w-full text-left px-4 py-2 text-white hover:bg-[#2A2A2A] transition-colors first:rounded-t-md last:rounded-b-md"
                            >
                              {country}
                            </button>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-1">Country only</p>
                    </div>

                    {/* Website */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        <Globe className="w-4 h-4 inline mr-1" />
                        Website
                      </label>
                      <input
                        type="url"
                        value={editForm.website}
                        onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#444444] rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
                        placeholder="https://example.com"
                      />
                    </div>

                    {/* Birthdate with calendar */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Birth date
                      </label>
                      <input
                        type="date"
                        value={editForm.birthdate}
                        onChange={(e) => setEditForm({ ...editForm, birthdate: e.target.value })}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#444444] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-6 border-t border-[#333333]">
                  <button
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-6 py-2 text-gray-400 hover:text-white transition-colors rounded-md hover:bg-[#2A2A2A]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePersonalInfo}
                    disabled={saving}
                    className="px-6 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-md transition-colors font-medium"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}