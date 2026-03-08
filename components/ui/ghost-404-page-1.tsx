'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { FlowButton } from "@/components/ui/flow-button";

const cubicEase = [0.43, 0.13, 0.23, 0.96] as const;

const containerVariants: Variants = {
    hidden: {
        opacity: 0,
        y: 30
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.7,
            ease: [...cubicEase] as [number, number, number, number],
            delayChildren: 0.1,
            staggerChildren: 0.1
        }
    }
};

const itemVariants: Variants = {
    hidden: {
        opacity: 0,
        y: 20
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.6,
            ease: [...cubicEase] as [number, number, number, number]
        }
    }
};

const numberVariants: Variants = {
    hidden: (direction: number) => ({
        opacity: 0,
        x: direction * 40,
        y: 15,
        rotate: direction * 5
    }),
    visible: {
        opacity: 0.7,
        x: 0,
        y: 0,
        rotate: 0,
        transition: {
            duration: 0.8,
            ease: [...cubicEase] as [number, number, number, number]
        }
    }
};

const ghostVariants: Variants = {
    hidden: {
        scale: 0.8,
        opacity: 0,
        y: 15,
        rotate: -5
    },
    visible: {
        scale: 1,
        opacity: 1,
        y: 0,
        rotate: 0,
        transition: {
            duration: 0.6,
            ease: [...cubicEase] as [number, number, number, number]
        }
    },
    hover: {
        scale: 1.1,
        y: -10,
        rotate: [0, -5, 5, -5, 0],
        transition: {
            duration: 0.8,
            ease: "easeInOut",
            rotate: {
                duration: 2,
                ease: "linear",
                repeat: Infinity,
                repeatType: "reverse" as const
            }
        }
    },
    floating: {
        y: [-5, 5],
        transition: {
            y: {
                duration: 2,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "reverse" as const
            }
        }
    }
};

export function GhostNotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black px-4">
            <AnimatePresence mode="wait">
                <motion.div
                    className="text-center"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                >
                    <div className="flex items-center justify-center gap-4 md:gap-6 mb-8 md:mb-12">
                        <motion.span
                            className="text-[80px] md:text-[120px] font-bold text-[#F8F8FF] opacity-70 select-none"
                            style={{ fontFamily: 'Satoshi, sans-serif' }}
                            variants={numberVariants}
                            custom={-1}
                        >
                            4
                        </motion.span>
                        <motion.div
                            variants={ghostVariants}
                            whileHover="hover"
                            animate={["visible", "floating"]}
                        >
                            <Image
                                src="https://xubohuah.github.io/xubohua.top/Group.png"
                                alt="Ghost"
                                width={120}
                                height={120}
                                className="w-[80px] h-[80px] md:w-[120px] md:h-[120px] object-contain select-none invert"
                                draggable="false"
                                priority
                            />
                        </motion.div>
                        <motion.span
                            className="text-[80px] md:text-[120px] font-bold text-[#F8F8FF] opacity-70 select-none"
                            style={{ fontFamily: 'Satoshi, sans-serif' }}
                            variants={numberVariants}
                            custom={1}
                        >
                            4
                        </motion.span>
                    </div>

                    <motion.h1
                        className="text-3xl md:text-5xl font-bold text-[#F8F8FF] mb-4 md:mb-6 opacity-70 select-none"
                        style={{ fontFamily: 'Satoshi, sans-serif' }}
                        variants={itemVariants}
                    >
                        Boo! Page missing!
                    </motion.h1>

                    <motion.p
                        className="text-lg md:text-xl text-[#F8F8FF] mb-8 md:mb-12 opacity-50 select-none"
                        style={{ fontFamily: 'Satoshi, sans-serif' }}
                        variants={itemVariants}
                    >
                        Whoops! This page must be a ghost - it&apos;s not here!
                    </motion.p>

                    <motion.div
                        variants={itemVariants}
                        whileHover={{
                            scale: 1.05,
                            transition: {
                                duration: 0.3,
                                ease: [...cubicEase] as [number, number, number, number]
                            }
                        }}
                        className="flex justify-center"
                    >
                        <Link href="/dashboard/agent-talk">
                            <FlowButton text="Find shelter" />
                        </Link>
                    </motion.div>

                    <motion.div
                        className="mt-12"
                        variants={itemVariants}
                    >
                        <button
                            onClick={() => window.history.back()}
                            className="text-[#F8F8FF] opacity-50 hover:opacity-70 transition-opacity underline select-none cursor-pointer bg-transparent border-none"
                            style={{ fontFamily: 'Satoshi, sans-serif' }}
                        >
                            Go back
                        </button>
                    </motion.div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
