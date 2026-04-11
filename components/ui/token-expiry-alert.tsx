'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RefreshCw, LogOut, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

interface TokenExpiryAlertProps {
    isVisible: boolean;
    onClose?: () => void;
}

export function TokenExpiryAlert({ isVisible, onClose }: TokenExpiryAlertProps) {
    const router = useRouter();

    const handleReauthenticate = async () => {
        // Sign out to force re-auth through Google
        await signOut({ callbackUrl: '/auth/signin' });
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ height: 0, opacity: 0, y: -20 }}
                    animate={{ height: 'auto', opacity: 1, y: 0 }}
                    exit={{ height: 0, opacity: 0, y: -20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="w-full bg-rose-500 overflow-hidden relative z-[60]"
                >
                    <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
                                <AlertCircle className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[13px] font-bold text-white tracking-tight leading-none mb-1">
                                    Google Connection Expired
                                </span>
                                <span className="text-[11px] text-white/80 font-medium leading-none">
                                    Reconnect to resume Arcus AI workflows and Gmail syncing.
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleReauthenticate}
                                className="px-4 py-1.5 bg-white text-rose-600 rounded-full text-[12px] font-black uppercase tracking-wider hover:bg-neutral-100 transition-colors flex items-center gap-2 group active:scale-95"
                            >
                                <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
                                <span>Reconnect Now</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                            
                            {onClose && (
                                <button 
                                    onClick={onClose}
                                    className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <LogOut className="w-4 h-4 text-white/60" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Subtle light beam effect */}
                    <motion.div 
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent w-full pointer-events-none"
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
