"use client";

import { HomeFeedSidebar } from "@/components/ui/home-feed-sidebar";

export function AgentLoading() {
    return (
        <div className="flex h-screen w-full bg-[#000000] text-white">
            <HomeFeedSidebar />
            <div className="flex flex-1 flex-col items-center justify-center pl-16">
                <div className="relative flex items-center justify-center">
                    {/* Centered smooth grey ripples */}
                    <div className="absolute h-1 w-1 bg-neutral-500 rounded-full animate-[ripple_3s_infinite]" />
                    <div className="absolute h-1 w-1 bg-neutral-500 rounded-full animate-[ripple_3s_infinite_1s]" />
                    <div className="absolute h-1 w-1 bg-neutral-500 rounded-full animate-[ripple_3s_infinite_2s]" />

                    {/* Minimalist center dot */}
                    <div className="relative z-10 h-2 w-2 bg-neutral-400 rounded-full shadow-[0_0_15px_rgba(163,163,163,0.5)]" />
                </div>

                <p className="mt-12 text-sm font-light tracking-[0.2em] text-neutral-500 uppercase animate-pulse">
                    Synchronizing Arcus
                </p>

                <style jsx>{`
                    @keyframes ripple {
                        0% {
                            transform: scale(0);
                            opacity: 0.8;
                        }
                        100% {
                            transform: scale(60);
                            opacity: 0;
                        }
                    }
                `}</style>
            </div>
        </div>
    );
}
