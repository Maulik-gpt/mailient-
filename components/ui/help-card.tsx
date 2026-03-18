'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, HelpCircle, BookOpen, Heart, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface HelpCardProps {
    onClose: () => void;
}

export function HelpCard({ onClose }: HelpCardProps) {
    const [activeSection, setActiveSection] = useState<'faq' | 'guide' | 'founder' | 'feedback'>('faq');
    const [feedback, setFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSendFeedback = async () => {
        if (!feedback.trim()) {
            toast.error('Please enter your feedback');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feedback }),
            });

            if (response.ok) {
                toast.success('Feedback sent! Founder will reach out soon.');
                setFeedback('');
            } else {
                toast.error('Failed to send feedback');
            }
        } catch (error) {
            toast.error('An error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const sections = [
        { id: 'faq', label: 'FAQs', icon: HelpCircle },
        { id: 'guide', label: 'Pro Tips', icon: BookOpen },
        { id: 'founder', label: 'Founder', icon: Heart },
        { id: 'feedback', label: 'Feedback', icon: MessageSquare },
    ];

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-md"
            onClick={onClose}
        >
            <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="w-full max-w-4xl h-[80vh] bg-white dark:bg-[#0A0A0A] rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-neutral-200 dark:border-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Sidebar */}
                <div className="w-full md:w-64 bg-neutral-50 dark:bg-[#111] border-r border-neutral-200 dark:border-white/5 p-6 flex flex-col">
                    <div className="flex items-center gap-3 mb-10 px-2">
                        <div className="w-10 h-10 bg-black dark:bg-white rounded-xl flex items-center justify-center">
                            <HelpCircle className="w-6 h-6 text-white dark:text-black" />
                        </div>
                        <h2 className="text-xl font-bold dark:text-white">Help</h2>
                    </div>

                    <nav className="flex-1 space-y-2">
                        {sections.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id as any)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
                                    activeSection === section.id 
                                    ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg translate-x-1' 
                                    : 'text-neutral-500 hover:bg-neutral-200 dark:hover:bg-white/5'
                                }`}
                            >
                                <section.icon className="w-5 h-5" />
                                <span className="font-medium">{section.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0A0A0A]">
                    <header className="h-20 border-b border-neutral-200 dark:border-white/5 flex items-center justify-between px-8">
                        <h3 className="text-lg font-semibold dark:text-white">
                            {sections.find(s => s.id === activeSection)?.label}
                        </h3>
                        <button 
                            onClick={onClose}
                            className="p-2 hover:bg-neutral-100 dark:hover:bg-white/5 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6 dark:text-white" />
                        </button>
                    </header>

                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        <AnimatePresence mode="wait">
                            {activeSection === 'faq' && (
                                <motion.div 
                                    key="faq"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="space-y-8"
                                >
                                    <div className="space-y-6">
                                        <div className="p-6 bg-neutral-50 dark:bg-white/5 rounded-3xl border border-neutral-100 dark:border-white/5">
                                            <h4 className="font-bold mb-3 dark:text-white">What is Mailient Sift?</h4>
                                            <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed">
                                                Sift is our proprietary AI that scans your inbox to find high-value opportunities, pending follow-ups, and critical shifts in your business conversations. It&apos;s not just summary; it&apos;s intelligence.
                                            </p>
                                        </div>
                                        <div className="p-6 bg-neutral-50 dark:bg-white/5 rounded-3xl border border-neutral-100 dark:border-white/5">
                                            <h4 className="font-bold mb-3 dark:text-white">Is my data secure?</h4>
                                            <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed">
                                                Absolutely. We use enterprise-grade encryption and only access the data necessary to provide AI insights. We never store your raw email content permanently unless you save it as an AI note.
                                            </p>
                                        </div>
                                        <div className="p-6 bg-neutral-50 dark:bg-white/5 rounded-3xl border border-neutral-100 dark:border-white/5">
                                            <h4 className="font-bold mb-3 dark:text-white">How do Arcus credits work?</h4>
                                            <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed">
                                                Arcus AI interactions (summaries, replies, scheduling) use credits based on your plan. Free users get a taste, while Pro users enjoy unlimited power.
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeSection === 'guide' && (
                                <motion.div 
                                    key="guide"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="space-y-6"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[
                                            { title: "Smart Nudges", desc: "Enable notifications for high-priority leads in settings." },
                                            { title: "Draft Tones", desc: "Use 'Mimic My Style' to let AI write exactly like you." },
                                            { title: "One-Click Calls", desc: "Click the calendar icon on any email to find a slot." },
                                            { title: "Deep Research", desc: "Use Arcus Chat to ask complex questions across your history." }
                                        ].map((tip, i) => (
                                            <div key={i} className="p-5 border border-neutral-200 dark:border-white/10 rounded-2xl flex gap-4">
                                                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                                    <CheckCircle2 className="w-5 h-5 text-blue-500" />
                                                </div>
                                                <div>
                                                    <h5 className="font-bold text-sm mb-1 dark:text-white">{tip.title}</h5>
                                                    <p className="text-xs text-neutral-500 leading-normal">{tip.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {activeSection === 'founder' && (
                                <motion.div 
                                    key="founder"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="prose dark:prose-invert max-w-none"
                                >
                                    <div className="relative p-8 bg-neutral-900 rounded-[40px] text-white overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-[100px] group-hover:bg-blue-600/30 transition-all" />
                                        
                                        <h4 className="text-2xl font-bold mb-6 text-white">Hey, I&apos;m Maulik.</h4>
                                        <p className="text-neutral-400 leading-relaxed mb-6 italic">
                                            &quot;I built Mailient because I was tired of fighting my own inbox. It felt like every morning I was drowning in noise, missing opportunities that actually mattered.&quot;
                                        </p>
                                        <p className="text-neutral-300 leading-relaxed mb-6">
                                            We built this app to be your second brain. Not another tool that demands your attention, but a partner that clears the path so you can focus on the work that truly moves the needle. Mailient is about reclaiming your time and your sanity.
                                        </p>
                                        <p className="text-neutral-300 leading-relaxed">
                                            We&apos;re just getting started. Every feature, every pixel, and every AI model we train is designed with one goal: making your life simpler. Thanks for joining us on this journey. It means the world to me.
                                        </p>
                                        
                                        <div className="mt-10 flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20">
                                                <img src="/mailient-logo-v3.png" className="w-full h-full object-cover bg-black" alt="Maulik" />
                                            </div>
                                            <div>
                                                <div className="font-bold">Maulik Barsaiyan</div>
                                                <div className="text-xs text-neutral-500">Founder, Mailient</div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeSection === 'feedback' && (
                                <motion.div 
                                    key="feedback"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="space-y-6"
                                >
                                    <div className="bg-blue-500/5 border border-blue-500/10 p-6 rounded-3xl">
                                        <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                                            Your feedback matters the most for us. Please input your valuable feedback on this. We&apos;ll try our whole heart to reach out to you as soon as possible.
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <textarea
                                            value={feedback}
                                            onChange={(e) => setFeedback(e.target.value)}
                                            placeholder="Tell us what's on your mind..."
                                            className="w-full h-40 bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-[24px] p-5 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-neutral-400"
                                        />
                                        <button 
                                            onClick={handleSendFeedback}
                                            disabled={isSubmitting}
                                            className="w-full h-14 bg-black dark:bg-white text-white dark:text-black rounded-[20px] font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed group shadow-xl"
                                        >
                                            {isSubmitting ? (
                                                <div className="w-5 h-5 border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    <span>Send Feedback</span>
                                                    <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
