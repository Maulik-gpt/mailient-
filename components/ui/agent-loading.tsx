"use client";

import { Bot, Sparkles } from "lucide-react";
import { HomeFeedSidebar } from "@/components/ui/home-feed-sidebar";

export function AgentLoading() {
    return (
        <div className="flex h-screen w-full bg-black/95 text-white">
            <HomeFeedSidebar />
            <div className="flex flex-1 flex-col items-center justify-center pl-16">
                <div className="relative flex flex-col items-center justify-center">
                    {/* Pulsing rings */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div className="h-24 w-24 animate-ping rounded-full bg-blue-500/20 duration-1000" />
                    </div>
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div className="h-32 w-32 animate-ping rounded-full bg-purple-500/10 delay-150 duration-1000" />
                    </div>

                    {/* Center Icon */}
                    <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-800 to-black shadow-xl border border-white/10">
                        <Bot className="h-8 w-8 text-blue-400 animate-pulse" />
                        <Sparkles className="absolute -right-2 -top-2 h-4 w-4 text-yellow-400 animate-bounce" />
                    </div>

                    {/* Loading Text */}
                    <div className="mt-8 flex flex-col items-center gap-2">
                        <h3 className="text-xl font-medium bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent animate-pulse">
                            Initializing Agent
                        </h3>
                        <div className="flex gap-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]" />
                            <div className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-bounce [animation-delay:-0.15s]" />
                            <div className="h-1.5 w-1.5 rounded-full bg-pink-500 animate-bounce" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
