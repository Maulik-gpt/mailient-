"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  MapPin,
  Globe,
  Calendar,
  Pencil,
  Mail,
  Link2,
  HardDrive,
  Activity,
  CreditCard,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  FileText,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { HomeFeedSidebar } from "@/components/ui/home-feed-sidebar";
import { EditProfileDialog, type EditProfileFormData } from "@/components/ui/edit-profile-dialog";
import { Button } from "@/components/ui/button";
import { WebsiteLink } from "@/components/ui/website-link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * StreakGrid Component - GitHub-style contribution graph for activity
 */
function StreakGrid({ history = [], streak = 0 }: { history?: any[], streak?: number }) {
  const weeks = 40; // Show 40 weeks for a nice long graph
  const today = new Date();
  const daysToShow = weeks * 7;

  // Calculate start date (Sunday of the first week)
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - daysToShow + (7 - today.getDay()) % 7);

  const activityMap = new Map(history.map(h => [h.activity_date, h.count]));

  const grid = [];
  for (let i = 0; i < daysToShow; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const key = d.toISOString().split('T')[0];
    grid.push({
      key,
      count: activityMap.get(key) || 0,
      isToday: key === today.toISOString().split('T')[0]
    });
  }

  const streakMessage = streak <= 6 ? "oh cmon'" : "keep it up";

  // GitHub-style coloring based on intensity
  const getIntensityColor = (count: number) => {
    if (count === 0) return "bg-white/5 hover:bg-white/10";
    if (count <= 2) return "bg-orange-950/40"; // Lightest
    if (count <= 5) return "bg-orange-800/60";
    if (count <= 10) return "bg-orange-600";
    return "bg-orange-500 shadow-[0_0_10px_-2px_rgba(249,115,22,0.5)]";
  };

  return (
    <div className="glass-panel p-6 rounded-2xl space-y-6 border border-white/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shadow-[0_0_20px_-10px_rgba(249,115,22,0.5)]">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h3 className="text-xl font-medium text-neutral-200">
              {streak}-day streak, {streakMessage}
            </h3>
            <p className="text-sm text-neutral-500">Consistent usage keeps your inbox optimized</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        {/* Day Labels */}
        <div className="flex flex-col justify-between py-1 text-[10px] text-neutral-600 font-medium h-[100px] select-none">
          <span>Sun</span>
          <span>Tue</span>
          <span>Thu</span>
          <span>Sat</span>
        </div>

        {/* The Grid */}
        <div className="flex-1 overflow-x-auto custom-scrollbar pb-2">
          <div
            className="grid grid-flow-col grid-rows-7 gap-1.5 h-[100px] min-w-max"
            style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }}
          >
            {grid.map((d) => (
              <div
                key={d.key}
                className={cn(
                  "w-3 h-3 rounded-[2px] transition-all duration-300",
                  getIntensityColor(d.count),
                  d.isToday && "ring-1 ring-orange-500 ring-offset-1 ring-offset-black"
                )}
                title={`${d.key}: ${d.count} activities`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 text-[10px] text-neutral-500 uppercase tracking-widest font-bold">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-[2px] bg-white/5 border border-white/5" />
          <span>Less</span>
        </div>
        <div className="flex gap-1 items-center">
          <div className="w-3 h-3 rounded-[2px] bg-orange-950/40" />
          <div className="w-3 h-3 rounded-[2px] bg-orange-800/60" />
          <div className="w-3 h-3 rounded-[2px] bg-orange-600" />
          <div className="w-3 h-3 rounded-[2px] bg-orange-500" />
        </div>
        <div className="flex items-center gap-2">
          <span>More</span>
        </div>
        <div className="ml-auto text-neutral-600">
          Last 280 days
        </div>
      </div>
    </div>
  );
}

type UserProfile = {
  name?: string | null;
  email?: string;
  username?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  created_at?: string | null;
  emails_processed?: number;
  email_accounts_connected?: number;
  storage_used?: string;
  last_email_activity?: string | null;
  plan?: string;
  preferences?: {
    theme?: string;
    language?: string;
    ai_privacy_mode?: string;
    username?: string;
    plan?: string;
    social_links?: { x?: string; linkedin?: string; instagram?: string; github?: string };
  };
  streak_count?: number;
  activity_history?: Array<{ activity_date: string, count: number }>;
};

const SECTIONS = ["profile", "account", "security", "legal"] as const;
type Section = (typeof SECTIONS)[number];

/** Mock profile data so Profile section matches reference images when real data is empty */
const MOCK_PROFILE = {
  name: "Maulik",
  handle: "maulik_05",
  bio: "14 yo | Built Mailient | 1270+ followers across all social media",
  location: "India",
  website: "mailient.xyz",
  joinDate: "Jan 3, 2026",
  followers: 4,
  following: 3,
  social_links: { x: "Maulik_055", instagram: "mailient_xyz" } as Record<string, string>,
};

const SOCIAL_ICONS: Record<string, { label: string; url: (u: string) => string }> = {
  x: { label: "X", url: (u) => `https://x.com/${u.replace(/^x\.com\/?/i, "")}` },
  linkedin: { label: "LinkedIn", url: (u) => `https://linkedin.com/in/${u.replace(/^linkedin\.com\/in\/?/i, "")}` },
  instagram: { label: "Instagram", url: (u) => `https://instagram.com/${u.replace(/^instagram\.com\/?/i, "")}` },
  github: { label: "GitHub", url: (u) => `https://github.com/${u.replace(/^github\.com\/?/i, "")}` },
};

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [section, setSection] = useState<Section>("profile");
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [avatarImageError, setAvatarImageError] = useState(false);
  const [bannerImageError, setBannerImageError] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
  }, [status, router]);

  useEffect(() => {
    if (!session?.user?.email) return;
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setProfile(data))
      .catch(() => { });
  }, [session?.user?.email]);

  useEffect(() => {
    setAvatarImageError(false);
    setBannerImageError(false);
  }, [profile?.avatar_url, profile?.banner_url, (session?.user as { image?: string })?.image]);

  const handleSaveProfile = async (data: EditProfileFormData) => {
    try {
      // Build the request body, only including URLs if they are valid
      const requestBody: Record<string, any> = {
        name: data.name,
        bio: data.bio || "",
        location: data.location || "",
        preferences: {
          ...profile?.preferences,
          username: data.username,
          social_links: {
            x: data.social_x || undefined,
            linkedin: data.social_linkedin || undefined,
            instagram: data.social_instagram || undefined,
            github: data.social_github || undefined,
          },
        },
      };

      // Only include website if it's a valid URL
      if (data.website && data.website.trim().startsWith('http')) {
        requestBody.website = data.website.trim();
      }

      // Only include avatar_url if it's a valid URL
      if (data.avatar_url && data.avatar_url.trim().startsWith('http')) {
        requestBody.avatar_url = data.avatar_url.trim();
      }

      // Only include banner_url if it's a valid URL
      if (data.banner_url && data.banner_url.trim().startsWith('http')) {
        requestBody.banner_url = data.banner_url.trim();
      }

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        toast.success("Profile updated successfully");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update profile");
      }
    } catch (err) {
      console.error("Save profile error:", err);
      toast.error("An error occurred while saving");
    }
  };

  const setAiPrivacyMode = async (enabled: boolean) => {
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preferences: {
          ...profile?.preferences,
          ai_privacy_mode: enabled ? "enabled" : "disabled",
        },
      }),
    });
    if (res.ok) {
      const updated = await fetch("/api/profile").then((r) => r.json());
      setProfile(updated);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE" || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/profile", { method: "DELETE" });
      if (res.ok) {
        await signOut({ redirect: false });
        router.push("/");
      }
    } finally {
      setDeleting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="settings-page min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--glass-border)] border-t-[var(--settings-accent)] animate-spin" />
      </div>
    );
  }

  if (!session?.user) return null;

  const user = session.user as { name?: string | null; email?: string; image?: string };
  const displayName = profile?.name ?? user.name ?? MOCK_PROFILE.name;
  const displayHandle = profile?.preferences?.username ?? profile?.username ?? user.email?.split("@")[0] ?? MOCK_PROFILE.handle;
  const avatarUrl = profile?.avatar_url ?? user.image;
  const bannerUrl = profile?.banner_url;
  const hasValidAvatarUrl = avatarUrl && (avatarUrl.startsWith("http") || avatarUrl.startsWith("/") || avatarUrl.startsWith("data:"));
  const hasValidBannerUrl = bannerUrl && (bannerUrl.startsWith("http") || bannerUrl.startsWith("/") || bannerUrl.startsWith("data:"));
  const showAvatarImage = hasValidAvatarUrl && !avatarImageError;
  const showBannerImage = hasValidBannerUrl && !bannerImageError;
  const joinDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : MOCK_PROFILE.joinDate;
  const displayBio = profile?.bio ?? MOCK_PROFILE.bio;
  const displayLocation = profile?.location ?? MOCK_PROFILE.location;
  const displayWebsite = profile?.website ?? MOCK_PROFILE.website;
  const socialLinks = { ...MOCK_PROFILE.social_links, ...(profile?.preferences?.social_links ?? {}) };
  const hasSocial = Object.values(socialLinks).some(Boolean);
  const aiPrivacyEnabled = profile?.preferences?.ai_privacy_mode === "enabled";

  return (
    <div className="settings-page min-h-screen flex bg-black">
      <HomeFeedSidebar />

      <main className="flex-1 overflow-y-auto ml-16">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <header className="mb-10">
            <h1 className="text-3xl font-medium tracking-tight text-neutral-200">
              Settings
            </h1>
            <p className="mt-2 text-base text-neutral-500">
              Manage your profile, account, and preferences.
            </p>
          </header>

          {/* Section tabs */}
          <nav className="flex gap-1 p-1 rounded-xl glass-panel mb-8 w-full max-w-xl" aria-label="Settings sections">
            {SECTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSection(s)}
                className={cn(
                  "flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 capitalize",
                  section === s
                    ? "bg-white/10 text-[var(--settings-text)] shadow-sm"
                    : "text-[var(--settings-text-secondary)] hover:text-[var(--settings-text)] hover:bg-white/5"
                )}
              >
                {s}
              </button>
            ))}
          </nav>

          {/* Profile — match reference images */}
          {section === "profile" && (
            <section className="space-y-6 glass-fade-up">
              <div className="glass-panel overflow-hidden rounded-2xl">
                {/* Banner */}
                <div className="relative h-32 sm:h-40 rounded-t-2xl overflow-hidden bg-gradient-to-br from-[var(--settings-surface)] via-[#1a1a1f] to-[#0d0d12]">
                  {showBannerImage && (
                    <img
                      src={bannerUrl!}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={() => setBannerImageError(true)}
                    />
                  )}
                  <div className="absolute inset-0 profile-banner-overlay" />
                </div>
                <div className="relative px-6 pb-6 -mt-12">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-[var(--glass-bg-elevated)] bg-[var(--settings-surface)] shadow-xl shrink-0 flex items-center justify-center">
                    {showAvatarImage ? (
                      <img
                        src={avatarUrl!}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={() => setAvatarImageError(true)}
                      />
                    ) : (
                      <span className="text-3xl font-semibold text-[var(--settings-text-tertiary)]">
                        {displayName.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mt-4">
                    <div>
                      <h2 className="text-2xl font-medium text-neutral-200 flex items-center gap-2">
                        {displayName}
                      </h2>
                      <p className="text-neutral-500 text-sm mt-1">@{displayHandle}</p>
                    </div>
                    <EditProfileDialog
                      trigger={
                        <Button className="glass-button-secondary shrink-0 gap-2 w-full sm:w-auto">
                          <Pencil className="w-4 h-4" />
                          Edit Profile
                        </Button>
                      }
                      user={{ name: user.name, email: user.email }}
                      profile={{
                        avatar_url: profile?.avatar_url ?? undefined,
                        banner_url: profile?.banner_url ?? undefined,
                        username: profile?.preferences?.username ?? profile?.username ?? undefined,
                        bio: profile?.bio ?? undefined,
                        location: profile?.location ?? undefined,
                        website: profile?.website ?? undefined,
                        preferences: profile?.preferences,
                      }}
                      onSave={handleSaveProfile}
                    />
                  </div>
                  <p className="mt-3 text-[var(--settings-text)] text-[15px] leading-relaxed">
                    {displayBio}
                  </p>
                  <div className="flex flex-wrap gap-4 sm:gap-6 mt-4 text-sm text-[var(--settings-text-secondary)]">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-[var(--settings-text-tertiary)] shrink-0" />
                      {displayLocation}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-[var(--settings-text-tertiary)] shrink-0" />
                      <WebsiteLink
                        url={displayWebsite}
                        variant="compact"
                        showExternalIcon={false}
                        className="text-[var(--settings-accent)] hover:underline"
                      />
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[var(--settings-text-tertiary)] shrink-0" />
                      Joined {joinDate}
                    </span>
                  </div>
                  {hasSocial && (
                    <div className="flex items-center gap-3 mt-6 pt-6 border-t border-[var(--glass-border)]">
                      {Object.entries(SOCIAL_ICONS).map(([key, { label, url }]) => {
                        const value = socialLinks[key as keyof typeof socialLinks];
                        if (!value?.trim()) return null;
                        const href = url(value);
                        return (
                          <a
                            key={key}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 rounded-full glass-button-secondary flex items-center justify-center text-[var(--settings-text-secondary)] hover:text-[var(--settings-text)] transition-colors"
                            aria-label={label}
                            title={label}
                          >
                            {key === "x" ? (
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                              </svg>
                            ) : key === "linkedin" ? (
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                              </svg>
                            ) : key === "instagram" ? (
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.919-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.919.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C8.333.014 8.741 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.22 0 4.61-2.805 5.625-5.475 5.92.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                              </svg>
                            )}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Streak Card */}
              <StreakGrid
                streak={profile?.streak_count || 0}
                history={profile?.activity_history || []}
              />
            </section>
          )}

          {/* Account — from DB */}
          {section === "account" && (
            <section className="space-y-4 glass-fade-up">
              <div className="glass-panel p-6">
                <h2 className="text-lg font-semibold text-[var(--settings-text)] mb-4">Account</h2>
                <p className="text-sm text-[var(--settings-text-secondary)] mb-6">
                  Usage and subscription data from your account.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-[var(--glass-border)]">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5 text-[var(--settings-text-tertiary)]" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[var(--settings-text-tertiary)] uppercase tracking-wider">Emails processed</p>
                      <p className="text-lg font-semibold text-[var(--settings-text)] mt-0.5">
                        {profile?.emails_processed ?? 0}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-[var(--glass-border)]">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <Link2 className="w-5 h-5 text-[var(--settings-text-tertiary)]" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[var(--settings-text-tertiary)] uppercase tracking-wider">Connections</p>
                      <p className="text-lg font-semibold text-[var(--settings-text)] mt-0.5">
                        {profile?.email_accounts_connected ?? 0}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-[var(--glass-border)]">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <HardDrive className="w-5 h-5 text-[var(--settings-text-tertiary)]" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[var(--settings-text-tertiary)] uppercase tracking-wider">Storage usage</p>
                      <p className="text-lg font-semibold text-[var(--settings-text)] mt-0.5">
                        {profile?.storage_used ?? "0 MB"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-[var(--glass-border)]">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <Activity className="w-5 h-5 text-[var(--settings-text-tertiary)]" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[var(--settings-text-tertiary)] uppercase tracking-wider">Last activity</p>
                      <p className="text-lg font-semibold text-[var(--settings-text)] mt-0.5">
                        {profile?.last_email_activity
                          ? new Date(profile.last_email_activity).toLocaleDateString(undefined, { dateStyle: "medium" })
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-4 rounded-xl bg-white/5 border border-[var(--glass-border)] flex items-center gap-4">
                  <CreditCard className="w-10 h-10 text-[var(--settings-text-tertiary)] shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-[var(--settings-text-tertiary)] uppercase tracking-wider">Subscription plan</p>
                    <p className="text-lg font-semibold text-[var(--settings-text)] mt-0.5">
                      {profile?.plan ?? profile?.preferences?.plan ?? "Free Plan"}
                    </p>
                  </div>
                  <Button className="ml-auto glass-button-secondary" onClick={() => router.push("/pricing")}>
                    View plans
                  </Button>
                </div>
              </div>
            </section>
          )}

          {/* Security */}
          {section === "security" && (
            <section className="space-y-6 glass-fade-up">
              <div className="glass-panel p-6">
                <h2 className="text-lg font-semibold text-[var(--settings-text)] mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[var(--settings-text-tertiary)]" />
                  Security
                </h2>
                <div className="space-y-6">
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-[var(--glass-border)]">
                    <Lock className="w-5 h-5 text-[var(--settings-accent)] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-[var(--settings-text)]">Advanced Encryption (AES-256)</p>
                      <p className="text-sm text-[var(--settings-text-secondary)] mt-1">
                        Your data is encrypted at rest and in transit using industry-standard AES-256 encryption.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-[var(--glass-border)]">
                    <div className="flex items-center gap-3">
                      {aiPrivacyEnabled ? (
                        <EyeOff className="w-5 h-5 text-[var(--settings-text-tertiary)]" />
                      ) : (
                        <Eye className="w-5 h-5 text-[var(--settings-text-tertiary)]" />
                      )}
                      <div>
                        <p className="font-medium text-[var(--settings-text)]">AI Privacy Mode</p>
                        <p className="text-sm text-[var(--settings-text-secondary)]">
                          {aiPrivacyEnabled
                            ? "AI processing of your content is disabled."
                            : "Allow AI to process content for summaries and suggestions."}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={aiPrivacyEnabled}
                      onClick={() => setAiPrivacyMode(!aiPrivacyEnabled)}
                      className={cn(
                        "relative w-11 h-6 rounded-full transition-colors",
                        aiPrivacyEnabled ? "bg-[var(--settings-accent)]" : "bg-white/20"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform",
                          aiPrivacyEnabled ? "left-6" : "left-1"
                        )}
                      />
                    </button>
                  </div>
                </div>
              </div>
              <div className="glass-panel p-6 border-red-500/20">
                <h3 className="text-base font-semibold text-red-400 flex items-center gap-2 mb-2">
                  <Trash2 className="w-4 h-4" />
                  Danger Zone
                </h3>
                <p className="text-sm text-[var(--settings-text-secondary)] mb-4">
                  Permanently delete your account and all associated data. This cannot be undone.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Type DELETE to confirm"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    className="glass-input flex-1 max-w-xs h-10 px-3 rounded-lg border border-[var(--glass-border)] bg-white/5 text-[var(--settings-text)] placeholder:text-[var(--settings-text-tertiary)]"
                  />
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirm !== "DELETE" || deleting}
                    className="shrink-0"
                  >
                    {deleting ? "Deleting…" : "Delete account"}
                  </Button>
                </div>
              </div>
            </section>
          )}

          {/* Legal */}
          {section === "legal" && (
            <section className="space-y-6 glass-fade-up">
              <div className="glass-panel p-6">
                <h2 className="text-lg font-semibold text-[var(--settings-text)] mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[var(--settings-text-tertiary)]" />
                  Legal
                </h2>
                <div className="space-y-4">
                  <Link
                    href="/terms-of-service"
                    className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-[var(--glass-border)] hover:bg-white/8 transition-colors text-[var(--settings-text)]"
                  >
                    <FileText className="w-5 h-5 text-[var(--settings-text-tertiary)] shrink-0" />
                    <span className="font-medium">Terms & Conditions</span>
                  </Link>
                  <Link
                    href="/privacy-policy"
                    className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-[var(--glass-border)] hover:bg-white/8 transition-colors text-[var(--settings-text)]"
                  >
                    <ShieldCheck className="w-5 h-5 text-[var(--settings-text-tertiary)] shrink-0" />
                    <span className="font-medium">Privacy Policy</span>
                  </Link>
                </div>
                <div className="mt-6 p-6 rounded-xl bg-white/5 border border-[var(--glass-border)]">
                  <p className="text-sm font-semibold text-[var(--settings-text)] mb-2">
                    Committed to your sovereignty
                  </p>
                  <p className="text-sm text-[var(--settings-text-secondary)] leading-relaxed">
                    We believe your data belongs to you. No hidden training, no data selling, no compromises. Our architecture is built to ensure only you can access your insights.
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
