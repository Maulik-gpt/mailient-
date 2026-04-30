"use client";

import { HomeFeedSidebar } from "@/components/ui/home-feed-sidebar";
import { motion } from "framer-motion";

export function AgentLoading() {
    return (
        <div className="flex h-screen w-full bg-[#000000] text-white overflow-hidden">
            <HomeFeedSidebar />
            <div className="flex flex-1 flex-col items-start justify-center pl-32 max-w-[800px]">
                <div className="flex flex-col gap-4 w-full">
                    {/* Header Skeleton */}
                    <div className="h-4 w-48 bg-white/5 rounded-full relative overflow-hidden mb-8 border border-white/[0.03]">
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent w-[200%]"
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        />
                    </div>
                    
                    {/* Content Skeletons */}
                    <div className="flex flex-col gap-3 w-full">
                        <div className="h-3 w-full bg-white/[0.03] rounded-md relative overflow-hidden border border-white/[0.02]">
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent w-[200%]"
                                animate={{ x: ['-100%', '100%'] }}
                                transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                            />
                        </div>
                        <div className="h-3 w-[92%] bg-white/[0.03] rounded-md relative overflow-hidden border border-white/[0.02]">
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent w-[200%]"
                                animate={{ x: ['-100%', '100%'] }}
                                transition={{ repeat: Infinity, duration: 2.5, ease: "linear", delay: 0.2 }}
                            />
                        </div>
                        <div className="h-3 w-[70%] bg-white/[0.03] rounded-md relative overflow-hidden border border-white/[0.02]">
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent w-[200%]"
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
