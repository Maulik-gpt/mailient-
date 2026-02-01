"use client";

import { motion } from "framer-motion";
import {
    X,
    Camera,
    Twitter,
    Instagram,
    Github,
    Linkedin,
    MapPin,
    Globe,
    Loader2,
    XIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useImageUpload } from "@/components/hooks/use-image-upload";

interface EditProfileFormProps {
    profile: any;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
}

export function EditProfileForm({ profile, onClose, onSave }: EditProfileFormProps) {
    const avatarUpload = useImageUpload();
    const bannerUpload = useImageUpload();

    const [formData, setFormData] = useState({
        name: profile?.name || "",
        username: profile?.username || "",
        bio: profile?.bio || "",
        location: profile?.location || "",
        website: profile?.website || "",
        twitter: profile?.twitter || "",
        instagram: profile?.instagram || "",
        linkedin: profile?.linkedin || "",
        github: profile?.github || "github.com/"
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        const dataToSave = {
            ...formData,
            avatar_url: avatarUpload.previewUrl || profile?.avatar_url,
            banner_url: bannerUpload.previewUrl || profile?.banner_url
        };

        await onSave(dataToSave);
        setIsSaving(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl w-full glass-card rounded-[40px] overflow-hidden border-white/5 shadow-2xl relative"
        >
            <div className="p-8 space-y-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-white/5 transition-colors text-neutral-400 hover:text-white"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>
                        <h2 className="text-2xl font-bold text-white">Edit Profile</h2>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Banner Edit Section */}
                    <div className="relative h-32 rounded-3xl overflow-hidden glass-panel apple-border bg-neutral-900 group">
                        {(bannerUpload.previewUrl || profile?.banner_url) && (
                            <img
                                src={bannerUpload.previewUrl || profile?.banner_url}
                                className="w-full h-full object-cover opacity-50 group-hover:opacity-40 transition-opacity"
                                alt=""
                            />
                        )}
                        <div
                            className="absolute inset-0 flex items-center justify-center cursor-pointer"
                            onClick={bannerUpload.handleThumbnailClick}
                        >
                            <Camera className="w-6 h-6 text-white/50 group-hover:text-white transition-colors" />
                            <input type="file" ref={bannerUpload.fileInputRef} onChange={bannerUpload.handleFileChange} className="hidden" accept="image/*" />
                        </div>
                        <p className="absolute bottom-2 right-4 text-[10px] font-bold text-white/30 truncate max-w-[200px]">
                            {bannerUpload.fileName || "Change Banner"}
                        </p>
                    </div>

                    {/* Avatar Section */}
                    <div className="flex items-center gap-6 -mt-16 relative z-10 px-4">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-3xl overflow-hidden glass-panel apple-border bg-neutral-900 flex items-center justify-center shadow-2xl">
                                <img
                                    src={avatarUpload.previewUrl || profile?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=Maulik"}
                                    alt="Avatar"
                                    className="w-full h-full object-cover group-hover:opacity-50 transition-opacity"
                                />
                                <div
                                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                    onClick={avatarUpload.handleThumbnailClick}
                                >
                                    <Camera className="w-8 h-8 text-white" />
                                    <input type="file" ref={avatarUpload.fileInputRef} onChange={avatarUpload.handleFileChange} className="hidden" accept="image/*" />
                                </div>
                            </div>
                        </div>
                        <div className="pt-8 space-y-1">
                            <p className="text-sm font-medium text-neutral-400">Recommended size:</p>
                            <p className="text-sm text-neutral-500">400x400px</p>
                        </div>
                    </div>

                    {/* Basic Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-neutral-400 ml-1">Full name <span className="text-red-500">*</span></label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="h-14 rounded-2xl glass-panel border-white/5 focus:border-blue-500/50 focus:ring-blue-500/20 text-white transition-all bg-white/5"
                                placeholder="Maulik ✦"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-neutral-400 ml-1">Username <span className="text-red-500">*</span></label>
                            <Input
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="h-14 rounded-2xl glass-panel border-white/5 focus:border-blue-500/50 focus:ring-blue-500/20 text-white transition-all bg-white/5"
                                placeholder="@maulik_05"
                            />
                        </div>
                    </div>

                    {/* Bio Section */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-sm font-semibold text-neutral-400">Brief bio</label>
                            <span className="text-xs text-neutral-500 font-mono">{formData.bio.length}/120</span>
                        </div>
                        <Textarea
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            className="min-h-[120px] rounded-3xl glass-panel border-white/5 focus:border-blue-500/50 focus:ring-blue-500/20 text-white p-6 transition-all bg-white/5 resize-none"
                            placeholder="Tell the world about yourself..."
                            maxLength={120}
                        />
                    </div>

                    {/* Location & Website Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-neutral-400 ml-1">Location</label>
                            <Input
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                className="h-14 rounded-2xl glass-panel border-white/5 focus:border-blue-500/50 focus:ring-blue-500/20 text-white transition-all bg-white/5"
                                placeholder="India"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-neutral-400 ml-1">Website</label>
                            <Input
                                value={formData.website}
                                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                className="h-14 rounded-2xl glass-panel border-white/5 focus:border-blue-500/50 focus:ring-blue-500/20 text-white transition-all bg-white/5"
                                placeholder="mailient.xyz"
                            />
                        </div>
                    </div>

                    {/* Note */}
                    <p className="text-sm text-neutral-500 px-1">
                        Note: You only need to add your <span className="text-neutral-300 font-bold">username</span>.
                    </p>

                    {/* Social Links Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative group">
                            <Twitter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
                            <Input
                                className="h-14 pl-12 rounded-2xl glass-panel border-white/5 focus:border-blue-500/50 text-white bg-white/5"
                                placeholder="x.com/Maulik_055"
                            />
                        </div>
                        <div className="relative group">
                            <Linkedin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-600" />
                            <Input
                                className="h-14 pl-12 rounded-2xl glass-panel border-white/5 focus:border-blue-500/50 text-white bg-white/5"
                                placeholder="linkedin.com/in/"
                            />
                        </div>
                        <div className="relative group">
                            <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-pink-500" />
                            <Input
                                className="h-14 pl-12 rounded-2xl glass-panel border-white/5 focus:border-blue-500/50 text-white bg-white/5"
                                placeholder="instagram.com/mailient_xyz"
                            />
                        </div>
                        <div className="relative group">
                            <Github className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white" />
                            <Input
                                className="h-14 pl-12 rounded-2xl glass-panel border-white/5 focus:border-blue-500/50 text-white bg-white/5"
                                placeholder="github.com/"
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-4 pt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="px-8 h-12 rounded-full text-neutral-400 hover:text-white hover:bg-white/5 font-semibold"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSaving}
                            className="px-10 h-12 rounded-full bg-white text-black hover:bg-neutral-200 font-bold transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Changes"}
                        </Button>
                    </div>
                </form>
            </div>

            {/* Indicator */}
            <div className="flex justify-center pb-4 bg-transparent">
                <div className="h-1.5 w-16 rounded-full bg-neutral-800"></div>
            </div>
        </motion.div>
    );
}
