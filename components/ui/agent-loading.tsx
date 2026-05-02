"use client";

import { HomeFeedSidebar } from "@/components/ui/home-feed-sidebar";
import { motion } from "framer-motion";

export function AgentLoading() {
    return (
        <div className="flex h-screen w-full bg-[#000000] text-white overflow-hidden relative">
            <HomeFeedSidebar />
            
            {/* High-Fidelity Page Shadow Skeleton */}
            <div className="flex-1 flex flex-col px-12 py-6 relative">
                {/* Top Bar Skeleton Shadow */}
                <div className="flex items-center justify-between w-full h-14 opacity-20 mb-12">
                    <div className="w-28 h-6 bg-white/10 rounded-lg relative overflow-hidden">
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.1] to-transparent w-[200%]"
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-full bg-white/5 relative overflow-hidden"><div className="absolute inset-0 bg-white/[0.03] animate-pulse" /></div>
                        <div className="w-9 h-9 rounded-full bg-white/5 relative overflow-hidden"><div className="absolute inset-0 bg-white/[0.03] animate-pulse" /></div>
                        <div className="w-9 h-9 rounded-full bg-white/5 relative overflow-hidden"><div className="absolute inset-0 bg-white/[0.03] animate-pulse" /></div>
                        <div className="w-24 h-9 rounded-xl bg-white/5 relative overflow-hidden"><div className="absolute inset-0 bg-white/[0.03] animate-pulse" /></div>
                    </div>
                </div>

                {/* Main Content Skeleton Shadow */}
                <div className="flex flex-col gap-6 w-full max-w-4xl opacity-20 mt-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-6 h-6 rounded-md bg-white/10" />
                        <div className="w-20 h-4 bg-white/10 rounded-full" />
                    </div>
                    <div className="h-3 w-full bg-white/5 rounded-full relative overflow-hidden">
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent w-[200%]"
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                        />
                    </div>
                    <div className="h-3 w-full bg-white/5 rounded-full relative overflow-hidden">
                         <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent w-[200%]"
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ repeat: Infinity, duration: 2.5, ease: "linear", delay: 0.2 }}
                        />
                    </div>
                    <div className="h-3 w-[88%] bg-white/5 rounded-full relative overflow-hidden">
                         <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent w-[200%]"
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ repeat: Infinity, duration: 2.5, ease: "linear", delay: 0.4 }}
                        />
                    </div>
                    <div className="h-3 w-[45%] bg-white/5 rounded-full relative overflow-hidden">
                         <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent w-[200%]"
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ repeat: Infinity, duration: 2.5, ease: "linear", delay: 0.6 }}
                        />
                    </div>
                </div>

                {/* Bottom Prompt Box Skeleton Shadow */}
                <div className="absolute bottom-12 left-12 right-12 opacity-20">
                    <div className="h-20 w-full max-w-4xl mx-auto bg-white/5 rounded-[28px] border border-white/[0.05] relative overflow-hidden flex items-center justify-between px-8">
                        <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full bg-white/10" />
                            <div className="w-8 h-8 rounded-full bg-white/10" />
                        </div>
                        <div className="h-2.5 w-48 bg-white/10 rounded-full" />
                        <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full bg-white/10" />
                            <div className="w-8 h-8 rounded-full bg-white/10" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
