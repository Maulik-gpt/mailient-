"use client";

import { HomeFeedSidebar } from "@/components/ui/home-feed-sidebar";
import { motion } from "framer-motion";

export function AgentLoading() {
    return (
        <div className="flex h-screen w-full bg-[#000000] text-white overflow-hidden">
            <HomeFeedSidebar />
            <div className="flex flex-1 flex-col items-start justify-center pl-32 max-w-[900px] opacity-80">
                <div className="flex flex-col gap-5 w-full">
                    {/* Header Skeleton */}
                    <div className="h-5 w-56 bg-white/10 rounded-full relative overflow-hidden mb-10 border border-white/[0.05]">
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.1] to-transparent w-[200%]"
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        />
                    </div>
                    
                    {/* Content Skeletons */}
                    <div className="flex flex-col gap-4 w-full">
                        <div className="h-[14px] w-full bg-white/[0.05] rounded-lg relative overflow-hidden border border-white/[0.03]">
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent w-[200%]"
                                animate={{ x: ['-100%', '100%'] }}
                                transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                            />
                        </div>
                        <div className="h-[14px] w-[96%] bg-white/[0.05] rounded-lg relative overflow-hidden border border-white/[0.03]">
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent w-[200%]"
                                animate={{ x: ['-100%', '100%'] }}
                                transition={{ repeat: Infinity, duration: 2.5, ease: "linear", delay: 0.2 }}
                            />
                        </div>
                        <div className="h-[14px] w-[68%] bg-white/[0.05] rounded-lg relative overflow-hidden border border-white/[0.03]">
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent w-[200%]"
                                animate={{ x: ['-100%', '100%'] }}
                                transition={{ repeat: Infinity, duration: 2.5, ease: "linear", delay: 0.4 }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
