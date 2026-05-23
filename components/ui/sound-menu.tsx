'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Keyboard, Monitor, Sparkles, RefreshCw, SlidersHorizontal, Settings2 } from 'lucide-react';
import { useDashboardSettings } from '@/lib/DashboardSettingsContext';
import { cn } from '@/lib/utils';
import { DropdownMenu } from './dropdown-menu';

export function SoundMenu() {
    const { settings, updateSetting } = useDashboardSettings();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 border",
                    settings.soundExperience
                        ? "bg-white/5 border-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                        : "bg-black/5 border-black/5 text-neutral-400 dark:text-neutral-600"
                )}
                title="Sound Experience Settings"
            >
                {settings.soundExperience ? (
                    <Volume2 className="w-4 h-4" />
                ) : (
                    <VolumeX className="w-4 h-4" />
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setIsOpen(false)} 
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="absolute right-0 mt-3 w-72 bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-white/10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-50 flex flex-col p-6 space-y-6"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        settings.soundExperience ? "bg-emerald-500 animate-pulse" : "bg-neutral-500"
                                    )} />
                                    <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">Audio Feedback</span>
                                </div>
                                <button 
                                    onClick={() => updateSetting('soundExperience', !settings.soundExperience)}
                                    className={cn(
                                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all",
                                        settings.soundExperience 
                                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                                            : "bg-neutral-500/10 text-neutral-500 border border-neutral-500/20"
                                    )}
                                >
                                    {settings.soundExperience ? 'On' : 'Off'}
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-neutral-500">Character</span>
                                        <span className="text-[10px] uppercase font-bold text-black dark:text-white px-2 py-0.5 rounded-md bg-white/5">{settings.soundType}</span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[
                                            { id: 'mechanical', icon: Keyboard, label: 'Mech' },
                                            { id: 'macos', icon: Monitor, label: 'Mac' },
                                            { id: 'bubble', icon: Sparkles, label: 'Pop' },
                                            { id: 'vintage', icon: RefreshCw, label: 'Old' },
                                        ].map((t) => (
                                            <button
                                                key={t.id}
                                                onClick={() => updateSetting('soundType', t.id)}
                                                className={cn(
                                                    "aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all border",
                                                    settings.soundType === t.id
                                                        ? "bg-white/10 border-white/20 text-white"
                                                        : "bg-black/5 dark:bg-white/5 border-transparent text-neutral-500 hover:text-white"
                                                )}
                                                title={t.label}
                                            >
                                                <t.icon className="w-4 h-4" />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4 pt-2">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight text-neutral-500">
                                            <span>Volume</span>
                                            <span className="text-neutral-300 font-mono">{Math.round(settings.soundVolume * 100)}%</span>
                                        </div>
                                        <input 
                                            type="range" min="0" max="1" step="0.01"
                                            value={settings.soundVolume}
                                            onChange={(e) => updateSetting('soundVolume', parseFloat(e.target.value))}
                                            className="w-full h-1 bg-neutral-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight text-neutral-500">
                                            <span>Pitch</span>
                                            <span className="text-neutral-300 font-mono">{settings.soundPitch.toFixed(1)}x</span>
                                        </div>
                                        <input 
                                            type="range" min="0.5" max="1.5" step="0.1"
                                            value={settings.soundPitch}
                                            onChange={(e) => updateSetting('soundPitch', parseFloat(e.target.value))}
                                            className="w-full h-1 bg-neutral-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={() => { setIsOpen(false); /* should trigger some global settings open */ }} 
                                className="w-full py-3 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-white transition-colors border-t border-white/5 pt-6"
                            >
                                <Settings2 className="w-3 h-3" />
                                Extended Options
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
