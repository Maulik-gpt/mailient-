"use client";

import { motion } from "framer-motion";
import {
    Sparkles
} from "lucide-react";
import {
    Location01Icon as MapPin,
    Link01Icon as LinkIcon,
    Calendar01Icon as Calendar,
    TwitterIcon as Twitter,
    InstagramIcon as Instagram,
    GithubIcon as Github,
    Linkedin01Icon as Linkedin,
    PencilEdit02Icon as Edit2
} from "hugeicons-react";
import { Button } from "@/components/ui/button";

interface ProfileViewProps {
    profile: any;
    onEdit: () => void;
}

export function ProfileView({ profile, onEdit }: ProfileViewProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full space-y-8"
        >
            {/* Banner & Avatar Section */}
            <div className="relative">
                <div className="h-64 w-full rounded-3xl overflow-hidden glass-panel apple-border">
                    {profile?.banner_url ? (
                        <img
                            src={profile.banner_url}
                            alt="Profile Banner"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-neutral-900 via-neutral-950 to-black flex items-center justify-center">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                        </div>
                    )}
                </div>

                <div className="absolute -bottom-16 left-8">
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-full border-[6px] border-[#050505] overflow-hidden glass-panel shadow-2xl">
                            <img
                                src={profile?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=Maulik"}
                                alt="Avatar"
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Profile Info Section */}
            <div className="pt-16 px-4 space-y-6">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                                {profile?.name || "Maulik"}
                                <Sparkles className="w-5 h-5 text-blue-400 fill-blue-400/20" />
                            </h1>
                        </div>
                        <p className="text-neutral-500 text-lg">@{profile?.username || "maulik_05"}</p>
                    </div>

                    <Button
                        onClick={onEdit}
                        variant="outline"
                        className="rounded-full px-6 py-6 apple-border glass-morphic text-white hover:bg-white/10 transition-all gap-2 interactive-glass"
                    >
                        <Edit2 className="w-4 h-4" />
                        Edit Profile
                    </Button>
                </div>

                <p className="text-neutral-300 text-lg leading-relaxed max-w-2xl">
                    {profile?.bio || "14 yo | Built Mailient | 1270+ followers across all social media"}
                </p>

                <div className="flex flex-wrap gap-6 text-neutral-500 font-medium">
                    {profile?.location && (
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-white/40" />
                            <span>{profile.location}</span>
                        </div>
                    )}
                    {profile?.website && (
                        <div className="flex items-center gap-2">
                            <LinkIcon className="w-4 h-4 text-white/40" />
                            <a href={profile.website} target="_blank" className="text-blue-400 hover:underline transition-colors">
                                {profile.website.replace(/^https?:\/\//, '')}
                            </a>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-white/40" />
                        <span>Joined {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Jan 2026'}</span>
                    </div>
                </div>

                <div className="flex gap-8 text-lg font-semibold">
                    <div className="flex items-center gap-2">
                        <span className="text-white">4</span>
                        <span className="text-neutral-500 font-medium">followers</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-white">3</span>
                        <span className="text-neutral-500 font-medium">following</span>
                    </div>
                </div>

                {/* Social Links */}
                <div className="flex gap-4 pt-2">
                    <motion.a
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        href="#"
                        className="p-3 rounded-full glass-morphic apple-border text-white hover:bg-white/10 transition-colors"
                    >
                        <Twitter className="w-5 h-5 fill-current" />
                    </motion.a>
                    <motion.a
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        href="#"
                        className="p-3 rounded-full glass-morphic apple-border text-white hover:bg-white/10 transition-colors"
                    >
                        <Instagram className="w-5 h-5" />
                    </motion.a>
                    <motion.a
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        href="#"
                        className="p-3 rounded-full glass-morphic apple-border text-white hover:bg-white/10 transition-colors"
                    >
                        <Linkedin className="w-5 h-5" />
                    </motion.a>
                    <motion.a
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        href="#"
                        className="p-3 rounded-full glass-morphic apple-border text-white hover:bg-white/10 transition-colors"
                    >
                        <Github className="w-5 h-5" />
                    </motion.a>
                </div>
            </div>
        </motion.div>
    );
}
