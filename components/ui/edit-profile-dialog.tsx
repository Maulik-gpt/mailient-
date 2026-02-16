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
import { Pencil, Camera, ArrowLeft, X, Linkedin, Instagram, Github, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  avatar_url: string;
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
    name?: string | null;
    avatar_url?: string | null;
    banner_url?: string | null;
    bio?: string | null;
    location?: string | null;
    website?: string | null;
    username?: string | null;
    preferences?: {
      username?: string;
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
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const [uploadingBanner, setUploadingBanner] = React.useState(false);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);
  const bannerInputRef = React.useRef<HTMLInputElement>(null);

  const [form, setForm] = React.useState<EditProfileFormData>({
    name: profile?.name || user?.name || "",
    username: profile?.preferences?.username ?? profile?.username ?? (user?.email?.split("@")[0] ?? ""),
    bio: profile?.bio ?? "",
    location: profile?.location ?? "",
    website: profile?.website ?? "",
    avatar_url: profile?.avatar_url ?? "",
    banner_url: profile?.banner_url ?? "",
    social_x: profile?.preferences?.social_links?.x ?? "",
    social_linkedin: profile?.preferences?.social_links?.linkedin ?? "",
    social_instagram: profile?.preferences?.social_links?.instagram ?? "",
    social_github: profile?.preferences?.social_links?.github ?? "",
  });

  React.useEffect(() => {
    if (open) {
      setForm({
        name: profile?.name || user?.name || "",
        username: profile?.preferences?.username ?? profile?.username ?? (user?.email?.split("@")[0] ?? ""),
        bio: profile?.bio ?? "",
        location: profile?.location ?? "",
        website: profile?.website ?? "",
        avatar_url: profile?.avatar_url ?? "",
        banner_url: profile?.banner_url ?? "",
        social_x: profile?.preferences?.social_links?.x ?? "",
        social_linkedin: profile?.preferences?.social_links?.linkedin ?? "",
        social_instagram: profile?.preferences?.social_links?.instagram ?? "",
        social_github: profile?.preferences?.social_links?.github ?? "",
      });
    }
  }, [open, user?.name, user?.email, profile]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Set loading state
    if (type === 'avatar') {
      setUploadingAvatar(true);
    } else {
      setUploadingBanner(true);
    }

    try {
      const formData = new FormData();
      // Append file with the correct key name that the API expects
      formData.append(type, file);

      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      // Update form state with the returned URL
      if (type === 'avatar') {
        setForm(prev => ({ ...prev, avatar_url: data.url }));
      } else {
        setForm(prev => ({ ...prev, banner_url: data.url }));
      }
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully`);
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(err.message || `Failed to upload ${type}`);
    } finally {
      // Reset loading state
      if (type === 'avatar') {
        setUploadingAvatar(false);
      } else {
        setUploadingBanner(false);
      }
      // Reset the input so the same file can be selected again
      e.target.value = '';
    }
  };

  const currentAvatarUrl = form.avatar_url || (user as { image?: string })?.image;

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(form);
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className={cn(
          "max-w-2xl w-full p-0 gap-0 overflow-hidden border-none bg-black text-neutral-200",
          "shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]",
          "flex flex-col max-h-[90vh]"
        )}
      >
        <DialogHeader className="flex flex-row items-center gap-4 px-6 py-4 border-b border-white/10 shrink-0">
          <button
            onClick={() => setOpen(false)}
            className="w-10 h-10 rounded-full flex items-center justify-center border border-white/10 hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-400" />
          </button>
          <DialogTitle className="text-xl font-bold text-neutral-100">
            Edit Profile
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-6 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
          {/* Photos section */}
          <div className="space-y-6">
            <div className="flex flex-col gap-4">
              <Label className="text-neutral-400 text-sm font-medium">Profile & Banner</Label>
              <div className="flex items-start gap-8">
                {/* Profile Photo */}
                <div className="relative group">
                  <div className="w-24 h-24 squircle bg-neutral-900 border-2 border-white/10 relative">
                    {uploadingAvatar ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <Loader2 className="w-6 h-6 animate-spin text-white" />
                      </div>
                    ) : currentAvatarUrl ? (
                      <img
                        src={currentAvatarUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-600 text-3xl font-medium">
                        {(user?.name ?? "U").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-black border border-white/20 flex items-center justify-center hover:bg-neutral-900 transition-colors shadow-lg"
                    aria-label="Change avatar"
                  >
                    <Camera className="w-4 h-4 text-neutral-300" />
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'avatar')}
                  />
                  <div className="mt-2 text-center">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Photo</p>
                  </div>
                </div>

                {/* Banner Photo */}
                <div className="flex-1">
                  <div
                    className="relative h-24 rounded-2xl bg-neutral-900 border-2 border-white/10 overflow-hidden cursor-pointer hover:border-white/20 transition-all"
                    onClick={() => bannerInputRef.current?.click()}
                  >
                    {uploadingBanner ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <Loader2 className="w-6 h-6 animate-spin text-white" />
                      </div>
                    ) : form.banner_url ? (
                      <img
                        src={form.banner_url}
                        alt="Banner"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center gap-2 text-neutral-500 group">
                        <Camera className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-medium">Add Banner</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={bannerInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'banner')}
                  />
                  <p className="mt-2 text-xs text-neutral-500">
                    Recommended size: 1500x500px. JPG, PNG or WebP.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-neutral-400 text-sm">Full name <span className="text-red-500">*</span></Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="bg-neutral-950 border-white/10 h-12 rounded-2xl focus:border-white/20 focus:ring-0 text-neutral-100 placeholder:text-neutral-700"
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-neutral-400 text-sm">Username <span className="text-red-500">*</span></Label>
              <Input
                value={form.username}
                onChange={(e) =>
                  setForm((f) => ({ ...f, username: e.target.value.replace(/^@/, "") }))
                }
                className="bg-neutral-950 border-white/10 h-12 rounded-2xl focus:border-white/20 focus:ring-0 text-neutral-100 placeholder:text-neutral-700"
                placeholder="@username"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-neutral-400 text-sm">Brief bio</Label>
              <span className="text-[10px] font-mono text-neutral-600">
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
              className="w-full rounded-2xl bg-neutral-950 border border-white/10 p-4 text-sm resize-none focus:outline-none focus:border-white/20 text-neutral-200 placeholder:text-neutral-700"
              placeholder="Tell us about yourself..."
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-neutral-400 text-sm">Location</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="bg-neutral-950 border-white/10 h-12 rounded-2xl focus:border-white/20 focus:ring-0 text-neutral-100 placeholder:text-neutral-700"
                placeholder="City, Country"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-neutral-400 text-sm">Website</Label>
              <Input
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                className="bg-neutral-950 border-white/10 h-12 rounded-2xl focus:border-white/20 focus:ring-0 text-neutral-100 placeholder:text-neutral-700"
                placeholder="https://yourwebsite.com"
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-white/5">
            <p className="text-xs text-neutral-500 font-medium tracking-tight">
              Social Links <span className="text-neutral-600">(enter usernames only)</span>
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: "social_x", label: "X (Twitter)", prefix: "x.com/", icon: <X className="w-4 h-4" /> },
                { key: "social_linkedin", label: "LinkedIn", prefix: "linkedin.com/in/", icon: <Linkedin className="w-4 h-4" /> },
                { key: "social_instagram", label: "Instagram", prefix: "instagram.com/", icon: <Instagram className="w-4 h-4" /> },
                { key: "social_github", label: "GitHub", prefix: "github.com/", icon: <Github className="w-4 h-4" /> },
              ].map(({ key, label, prefix, icon }) => (
                <div key={key} className="space-y-2">
                  <Label className="text-neutral-400 text-xs flex items-center gap-2">
                    <span className="text-neutral-500">{icon}</span>
                    {label}
                  </Label>
                  <div className="flex items-center gap-0 rounded-xl overflow-hidden border border-white/10 bg-neutral-950 focus-within:border-white/20">
                    <span className="text-[11px] font-mono text-neutral-600 bg-neutral-900 px-3 py-3 border-r border-white/10 whitespace-nowrap">
                      {prefix}
                    </span>
                    <Input
                      value={form[key as keyof EditProfileFormData] as string}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [key]: e.target.value }))
                      }
                      className="bg-transparent border-0 h-10 focus:ring-0 text-neutral-200 text-sm flex-1 min-w-0"
                      placeholder="username"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-5 border-t border-white/10 bg-neutral-950/50 shrink-0">
          <Button
            type="button"
            variant="outline"
            className="rounded-full px-8 h-12 border-white/10 hover:bg-white/5 text-neutral-300"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving || !form.name.trim() || !form.username.trim()}
            className="rounded-full px-8 h-12 bg-white text-black hover:bg-neutral-200 transition-all font-bold"
            onClick={handleSave}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
