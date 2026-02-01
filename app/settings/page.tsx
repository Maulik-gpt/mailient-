"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  User,
  Palette,
  Bell,
  Shield,
  CreditCard,
  ChevronRight,
  Pencil,
  Globe,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";
import { UnifiedSidebar } from "@/components/ui/unified-sidebar";
import { EditProfileDialog, type EditProfileFormData } from "@/components/ui/edit-profile-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type UserProfile = {
  name?: string | null;
  email?: string;
  username?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  created_at?: string | null;
  preferences?: {
    theme?: string;
    language?: string;
    social_links?: { x?: string; linkedin?: string; instagram?: string; github?: string };
  };
};

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeSection, setActiveSection] = useState<string>("profile");

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
      .then((r) => r.ok ? r.json() : null)
      .then((data) => data && setProfile(data))
      .catch(() => {});
  }, [session?.user?.email]);

  const handleSaveProfile = async (data: EditProfileFormData) => {
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        bio: data.bio,
        location: data.location,
        website: data.website || undefined,
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
      }),
    });
    if (res.ok) {
      const updated = await fetch("/api/profile").then((r) => r.json());
      setProfile(updated);
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
  const displayName = profile?.name ?? user.name ?? "User";
  const displayHandle = profile?.preferences?.username ?? profile?.username ?? user.email?.split("@")[0] ?? "user";
  const avatarUrl = profile?.avatar_url ?? user.image;

  return (
    <div className="settings-page min-h-screen flex">
      <UnifiedSidebar
        variant="settings"
        showUniversalNav={true}
        activeItem={activeSection}
        onItemClick={setActiveSection}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
          <header className="glass-fade-up">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--settings-text)]">
              Settings
            </h1>
            <p className="mt-1 text-sm text-[var(--settings-text-secondary)]">
              Manage your profile and preferences
            </p>
          </header>

          {/* Profile card */}
          <section
            className={cn(
              "glass-panel p-6 space-y-4 glass-fade-up",
              "animation-delay-75"
            )}
            style={{ animationDelay: "75ms" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--settings-text)]">
                Profile
              </h2>
              <EditProfileDialog
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[var(--settings-text-secondary)] hover:text-[var(--settings-text)] hover:bg-white/10 gap-2"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit Profile
                  </Button>
                }
                user={{ name: user.name, email: user.email }}
                profile={{
                  avatar_url: profile?.avatar_url ?? undefined,
                  username: profile?.preferences?.username ?? profile?.username ?? undefined,
                  bio: profile?.bio ?? undefined,
                  location: profile?.location ?? undefined,
                  website: profile?.website ?? undefined,
                  preferences: profile?.preferences,
                }}
                onSave={handleSaveProfile}
              />
            </div>
            <div className="flex items-center gap-4 pt-2">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-[var(--settings-surface)] border border-[var(--glass-border)] shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--settings-text-tertiary)] text-xl font-medium">
                    {displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-[var(--settings-text)] truncate">
                  {displayName}
                </p>
                <p className="text-sm text-[var(--settings-text-secondary)] truncate">
                  @{displayHandle}
                </p>
                {profile?.bio && (
                  <p className="text-sm text-[var(--settings-text-tertiary)] mt-1 line-clamp-2">
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>
            {(profile?.location || profile?.website) && (
              <div className="flex flex-wrap gap-4 text-sm text-[var(--settings-text-secondary)] pt-2 border-t border-[var(--glass-border)]">
                {profile?.location && (
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-[var(--settings-text-tertiary)]" />
                    {profile.location}
                  </span>
                )}
                {profile?.website && (
                  <a
                    href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--settings-accent)] hover:underline"
                  >
                    {profile.website}
                  </a>
                )}
              </div>
            )}
          </section>

          {/* Appearance */}
          <section
            className="glass-panel p-6 space-y-4 glass-fade-up"
            style={{ animationDelay: "150ms" }}
          >
            <h2 className="text-lg font-semibold text-[var(--settings-text)] flex items-center gap-2">
              <Palette className="w-5 h-5 text-[var(--settings-text-tertiary)]" />
              Appearance
            </h2>
            <div className="grid gap-3">
              {[
                { id: "dark", label: "Dark", icon: Moon },
                { id: "light", label: "Light", icon: Sun },
                { id: "system", label: "System", icon: Monitor },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  className="glass-button-secondary w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <span className="flex items-center gap-3 text-[var(--settings-text)]">
                    <Icon className="w-5 h-5 text-[var(--settings-text-tertiary)]" />
                    {label}
                  </span>
                  <ChevronRight className="w-5 h-5 text-[var(--settings-text-tertiary)]" />
                </button>
              ))}
            </div>
          </section>

          {/* Notifications */}
          <section
            className="glass-panel p-6 space-y-4 glass-fade-up"
            style={{ animationDelay: "200ms" }}
          >
            <h2 className="text-lg font-semibold text-[var(--settings-text)] flex items-center gap-2">
              <Bell className="w-5 h-5 text-[var(--settings-text-tertiary)]" />
              Notifications
            </h2>
            <p className="text-sm text-[var(--settings-text-secondary)]">
              Manage email and push notifications. (Coming soon.)
            </p>
          </section>

          {/* Security */}
          <section
            className="glass-panel p-6 space-y-4 glass-fade-up"
            style={{ animationDelay: "250ms" }}
          >
            <h2 className="text-lg font-semibold text-[var(--settings-text)] flex items-center gap-2">
              <Shield className="w-5 h-5 text-[var(--settings-text-tertiary)]" />
              Security
            </h2>
            <p className="text-sm text-[var(--settings-text-secondary)]">
              Two-factor authentication and active sessions. (Coming soon.)
            </p>
          </section>

          {/* Billing */}
          <section
            className="glass-panel p-6 space-y-4 glass-fade-up"
            style={{ animationDelay: "300ms" }}
          >
            <h2 className="text-lg font-semibold text-[var(--settings-text)] flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[var(--settings-text-tertiary)]" />
              Billing & Plans
            </h2>
            <p className="text-sm text-[var(--settings-text-secondary)]">
              Manage your subscription and usage.
            </p>
            <Button
              className="glass-button-secondary"
              onClick={() => router.push("/pricing")}
            >
              View plans
            </Button>
          </section>
        </div>
      </main>
    </div>
  );
}
