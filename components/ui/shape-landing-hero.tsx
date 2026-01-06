"use client";

import React from "react";
import { motion, Variants } from "framer-motion";
import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { EtherealShadow } from "@/components/ui/etheral-shadow";

function HeroGeometric({
    badge = "Design Collective",
    title1 = "Elevate Your Digital Vision",
    title2 = "Crafting Exceptional Websites",
    children,
}: {
    badge?: string;
    title1?: string;
    title2?: string;
    children?: React.ReactNode;
}) {
    const fadeUpVariants: Variants = {
        hidden: { opacity: 0, y: 30 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: {
                duration: 1,
                delay: 0.5 + i * 0.2,
                ease: [0.25, 0.4, 0.25, 1] as const,
            },
        }),
    };

    return (
        <div className="relative min-h-screen w-full flex items-start justify-center overflow-hidden bg-black">
            {/* Ethereal Shadow Background Layer - Ultra Smooth */}
            <div className="absolute inset-0 z-0">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.35 }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    className="w-full h-full"
                >
                    <EtherealShadow
                        color="rgba(100, 100, 120, 0.8)"
                        animation={{ scale: 35, speed: 25 }}
                        noise={{ opacity: 0.3, scale: 1.5 }}
                        sizing="fill"
                        className="opacity-70"
                        showTitle={false}
                    />
                </motion.div>
            </div>

            {/* Secondary Ethereal Layer - Offset for depth */}
            <div className="absolute inset-0 z-0 translate-x-[10%] translate-y-[5%]">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.2 }}
                    transition={{ duration: 2.5, ease: "easeOut", delay: 0.3 }}
                    className="w-full h-full"
                >
                    <EtherealShadow
                        color="rgba(80, 80, 100, 0.6)"
                        animation={{ scale: 25, speed: 20 }}
                        sizing="fill"
                        className="opacity-50"
                        showTitle={false}
                    />
                </motion.div>
            </div>

            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-white/[0.01] z-[1]" />

            {/* Content Container */}
            <div className="relative z-10 container mx-auto px-4 md:px-6 pt-32 md:pt-48">
                <div className="max-w-5xl mx-auto text-center">
                    <motion.div
                        custom={0}
                        variants={fadeUpVariants}
                        initial="hidden"
                        animate="visible"
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] mb-8 md:mb-12"
                    >
                        <Circle className="h-2 w-2 fill-white/80" />
                        <span className="text-sm text-white/60 tracking-wide">
                            {badge}
                        </span>
                    </motion.div>

                    <motion.div
                        custom={1}
                        variants={fadeUpVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <h1 className="text-4xl sm:text-6xl md:text-8xl font-bold mb-6 md:mb-8 tracking-tight">
                            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/80">
                                {title1}
                            </span>
                            <br />
                            <span
                                className={cn(
                                    "bg-clip-text text-transparent bg-gradient-to-r from-zinc-400 via-white/90 to-zinc-400"
                                )}
                            >
                                {title2}
                            </span>
                        </h1>
                    </motion.div>
                </div>

                <div className="max-w-6xl mx-auto">
                    <motion.div
                        custom={2}
                        variants={fadeUpVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {children || (
                            <p className="text-base sm:text-lg md:text-xl text-white/40 mb-8 leading-relaxed font-light tracking-wide max-w-xl mx-auto px-4 text-center">
                                Crafting exceptional digital experiences through
                                innovative design and cutting-edge technology.
                            </p>
                        )}
                    </motion.div>
                </div>
            </div>

            {/* Top and bottom fade overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-[#030303]/80 pointer-events-none z-[2]" />
        </div>
    );
}

export { HeroGeometric }
