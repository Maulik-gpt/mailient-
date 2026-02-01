"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Pencil, Camera } from "lucide-react";

const BIO_MAX = 120;
const SOCIAL_PREFIXES: Record<string, string> = {
  x: "x.com/",
  linkedin: "linkedin.com/in/",
  instagram: "instagram.com/",
  github: "github.com/",
};

export type EditProfileFormData = {
  name: string;
  username: string;
  bio: string;
  location: string;
  website: string;
  banner_url: string;
  social_x: string;
  social_linkedin: string;
  social_instagram: string;
  social_github: string;
};

type EditProfileDialogProps = {
  trigger: React.ReactNode;
  user?: { name?: string | null; email?: string | null };
  profile?: {
    avatar_url?: string | null;
    banner_url?: string | null;
    bio?: string | null;
    location?: string | null;
    website?: string | null;
    username?: string | null;
    preferences?: {
      social_links?: { x?: string; linkedin?: string; instagram?: string; github?: string };
    };
  };
  onSave?: (data: EditProfileFormData) => void | Promise<void>;
};

export function EditProfileDialog({
  trigger,
  user,
  profile,
  onSave,
}: EditProfileDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<EditProfileFormData>({
    name: user?.name ?? "",
    username: profile?.preferences?.username ?? profile?.username ?? (user?.email?.split("@")[0] ?? ""),
    bio: profile?.bio ?? "",
    location: profile?.location ?? "",
    website: profile?.website ?? "",
    banner_url: profile?.banner_url ?? "",
    social_x: profile?.preferences?.social_links?.x ?? "",
    social_linkedin: profile?.preferences?.social_links?.linkedin ?? "",
    social_instagram: profile?.preferences?.social_links?.instagram ?? "",
    social_github: profile?.preferences?.social_links?.github ?? "",
  });

  React.useEffect(() => {
    if (open) {
      setForm({
        name: user?.name ?? "",
        username: profile?.preferences?.username ?? profile?.username ?? (user?.email?.split("@")[0] ?? ""),
        bio: profile?.bio ?? "",
        location: profile?.location ?? "",
        website: profile?.website ?? "",
        banner_url: profile?.banner_url ?? "",
        social_x: profile?.preferences?.social_links?.x ?? "",
        social_linkedin: profile?.preferences?.social_links?.linkedin ?? "",
        social_instagram: profile?.preferences?.social_links?.instagram ?? "",
        social_github: profile?.preferences?.social_links?.github ?? "",
      });
    }
  }, [open, user?.name, user?.email, profile]);

  const avatarUrl = profile?.avatar_url || (user as { image?: string })?.image;
  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(form);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className={cn(
          "glass-panel border-[var(--glass-border)] bg-[var(--glass-bg-elevated)]",
          "backdrop-blur-[var(--glass-blur)] max-w-lg p-0 gap-0 overflow-hidden",
          "text-[var(--settings-text)]"
        )}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-[var(--glass-border)]">
          <DialogTitle className="text-xl font-semibold tracking-tight text-[var(--settings-text)]">
            Edit Profile
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 space-y-6 max-h-[min(70vh,520px)] overflow-y-auto">
          {/* Profile picture */}
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-[var(--settings-surface)] border border-[var(--glass-border)]">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--settings-text-tertiary)] text-2xl font-medium">
                    {(user?.name ?? "U").slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full glass-button-secondary flex items-center justify-center border border-[var(--glass-border)]"
                aria-label="Change photo"
              >
                <Camera className="w-4 h-4 text-[var(--settings-text-secondary)]" />
              </button>
            </div>
            <p className="text-sm text-[var(--settings-text-tertiary)] pt-2">
              Recommended size: 400×400px
            </p>
          </div>

          {/* Banner image URL */}
          <div>
            <Label className="text-[var(--settings-text-secondary)]">
              Banner image URL <span className="text-[var(--settings-text-tertiary)] font-normal">(optional)</span>
            </Label>
            <Input
              value={form.banner_url}
              onChange={(e) => setForm((f) => ({ ...f, banner_url: e.target.value.trim() }))}
              className="mt-1.5 glass-input h-11 border-[var(--glass-border)] bg-white/5"
              placeholder="https://example.com/your-banner.jpg"
              type="url"
            />
            <p className="text-xs text-[var(--settings-text-tertiary)] mt-1">
              Paste a direct image link. Recommended: 1500×500px or similar aspect ratio.
            </p>
          </div>

          {/* Profile fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="text-[var(--settings-text-secondary)]">
                Full name <span className="text-red-400">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1.5 glass-input h-11 border-[var(--glass-border)] bg-white/5"
                placeholder="Your name"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-[var(--settings-text-secondary)]">
                Username <span className="text-red-400">*</span>
              </Label>
              <Input
                value={form.username}
                onChange={(e) =>
                  setForm((f) => ({ ...f, username: e.target.value.replace(/^@/, "") }))
                }
                className="mt-1.5 glass-input h-11 border-[var(--glass-border)] bg-white/5"
                placeholder="@username"
              />
            </div>
            <div className="sm:col-span-2">
              <div className="flex justify-between items-center">
                <Label className="text-[var(--settings-text-secondary)]">
                  Brief bio
                </Label>
                <span className="text-xs text-[var(--settings-text-tertiary)]">
                  {form.bio.length}/{BIO_MAX}
                </span>
              </div>
              <textarea
                value={form.bio}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bio: e.target.value.slice(0, BIO_MAX) }))
                }
                maxLength={BIO_MAX}
                rows={3}
                className="mt-1.5 w-full rounded-xl glass-input px-3 py-2.5 text-sm resize-y min-h-[80px] border border-[var(--glass-border)] bg-white/5 placeholder:text-[var(--settings-text-tertiary)] focus:outline-none focus:border-[var(--settings-accent)] focus:ring-2 focus:ring-[var(--settings-focus-ring)]"
                placeholder="Tell us about yourself"
              />
            </div>
            <div>
              <Label className="text-[var(--settings-text-secondary)]">Location</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="mt-1.5 glass-input h-11 border-[var(--glass-border)] bg-white/5"
                placeholder="e.g. India"
              />
            </div>
            <div>
              <Label className="text-[var(--settings-text-secondary)]">Website</Label>
              <Input
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                className="mt-1.5 glass-input h-11 border-[var(--glass-border)] bg-white/5"
                placeholder="https://example.com"
              />
            </div>
          </div>

          <p className="text-sm text-[var(--settings-text-tertiary)]">
            Note: You only need to add your <strong className="text-[var(--settings-text-secondary)]">username</strong>.
          </p>

          {/* Social links */}
          <div className="pt-2 border-t border-[var(--glass-border)]">
            <p className="text-sm text-[var(--settings-text-tertiary)] mb-4">
              Note: You only need to add your <strong className="text-[var(--settings-text-secondary)]">username</strong> for each platform.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  { key: "social_x", label: "X", prefix: SOCIAL_PREFIXES.x, icon: "𝕏" },
                  { key: "social_linkedin", label: "LinkedIn", prefix: SOCIAL_PREFIXES.linkedin, icon: "in" },
                  { key: "social_instagram", label: "Instagram", prefix: SOCIAL_PREFIXES.instagram, icon: "📷" },
                  { key: "social_github", label: "GitHub", prefix: SOCIAL_PREFIXES.github, icon: "⌃" },
                ] as const
              ).map(({ key, label, prefix }) => (
                <div key={key}>
                  <Label className="text-[var(--settings-text-secondary)] text-xs">
                    {label}
                  </Label>
                  <div className="mt-1.5 flex rounded-xl border border-[var(--glass-border)] bg-white/5 overflow-hidden focus-within:border-[var(--settings-accent)] focus-within:ring-2 focus-within:ring-[var(--settings-focus-ring)]">
                    <span className="flex items-center px-3 text-sm text-[var(--settings-text-tertiary)] bg-white/5 border-r border-[var(--glass-border)]">
                      {prefix}
                    </span>
                    <Input
                      value={form[key]}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [key]: e.target.value }))
                      }
                      className="glass-input border-0 bg-transparent rounded-none h-11 focus-visible:ring-0 focus-visible:ring-offset-0"
                      placeholder={label}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[var(--glass-border)] bg-white/[0.02]">
          <Button
            type="button"
            variant="outline"
            className="glass-button-secondary"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="glass-button-primary"
            onClick={handleSave}
            disabled={saving || !form.name.trim() || !form.username.trim()}
          >
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
