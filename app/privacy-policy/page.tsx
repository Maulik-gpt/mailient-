"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Mail, Calendar, Video } from "lucide-react";

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-black text-[#fafafa] font-['Satoshi'] selection:bg-white selection:text-black">
            {/* Background accents */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[160px] opacity-50" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[160px] opacity-50" />
            </div>

            <main className="relative z-10 max-w-3xl mx-auto pt-20 pb-32 px-6">
                <Link
                    href="/auth/signup"
                    className="inline-flex items-center gap-2 text-neutral-500 hover:text-white transition-colors mb-12 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium uppercase tracking-widest">Back to Signup</span>
                </Link>

                <header className="mb-16">
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter italic uppercase leading-none mb-6">
                        Privacy <br /> Policy
                    </h1>
                    <p className="text-neutral-500 font-medium tracking-widest uppercase text-sm">
                        Last Updated: January 2026
                    </p>
                </header>

                <div className="space-y-12 text-neutral-300 leading-relaxed font-medium">
                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase">1. Overview</h2>
                        <p>Your privacy matters. This policy explains what data we collect, why we collect it, and how we handle it without fluff.</p>
                    </section>

                    <section className="space-y-6">
                        <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase">2. Information We Collect</h2>

                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
                                <span className="text-white/20">a)</span> Account Information
                            </h3>
                            <ul className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {["Username", "Email address", "Basic profile details"].map((item) => (
                                    <li key={item} className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-sm italic">{item}</li>
                                ))}
                            </ul>
                        </div>

                        <div className="space-y-4 pt-4">
                            <h3 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
                                <span className="text-white/20">b)</span> Connected Service Data
                            </h3>
                            <p>We only access what is necessary for functionality. With your explicit permission, we access:</p>

                            <div className="grid gap-4">
                                <div className="flex gap-4 p-5 bg-white/5 border border-white/10 rounded-[2rem]">
                                    <Mail className="w-6 h-6 text-blue-400 shrink-0" />
                                    <div>
                                        <h4 className="text-white font-bold text-sm mb-1 uppercase tracking-wider">Email Access</h4>
                                        <p className="text-sm text-neutral-400">Content, metadata, and threading required for AI categorization, summarization, and drafting.</p>
                                    </div>
                                </div>

                                <div className="flex gap-4 p-5 bg-white/5 border border-white/10 rounded-[2rem]">
                                    <Calendar className="w-6 h-6 text-indigo-400 shrink-0" />
                                    <div>
                                        <h4 className="text-white font-bold text-sm mb-1 uppercase tracking-wider">Google Calendar</h4>
                                        <p className="text-sm text-neutral-400">Reading and writing events to provide smart scheduling and meeting management.</p>
                                    </div>
                                </div>

                                <div className="flex gap-4 p-5 bg-white/5 border border-white/10 rounded-[2rem]">
                                    <Video className="w-6 h-6 text-purple-400 shrink-0" />
                                    <div>
                                        <h4 className="text-white font-bold text-sm mb-1 uppercase tracking-wider">Google Meet</h4>
                                        <p className="text-sm text-neutral-400">Creation and management of meeting links for scheduled calls.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase">3. How We Use Data</h2>
                        <p>We use data to provide and improve Mailient, power AI features you request, and maintain security. </p>
                        <div className="p-6 bg-red-950/20 border border-red-500/20 rounded-[2rem] space-y-3 mt-4">
                            <span className="text-xs font-black text-red-400 uppercase tracking-[0.2em]">Our Commitment:</span>
                            <ul className="space-y-2 text-sm italic">
                                <li className="flex gap-3 text-red-200"><span className="text-red-500">×</span> We do not sell personal data</li>
                                <li className="flex gap-3 text-red-200"><span className="text-red-500">×</span> We do not use emails for advertising</li>
                                <li className="flex gap-3 text-red-200"><span className="text-red-500">×</span> We do not train public AI models on your private emails</li>
                            </ul>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase">4. AI & Automation</h2>
                        <p>Mailient uses AI to assist with email-related tasks.</p>
                        <p className="text-sm italic text-neutral-400 px-6 py-4 border-l border-white/20 bg-white/[0.02]">
                            AI outputs may be imperfect. You are always in control. Final responsibility remains with you.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase">5. Data Storage & Security</h2>
                        <p>We take reasonable measures to protect your data, including secure storage and industry-standard practices. No system is 100% secure. Use Mailient with that understanding.</p>
                    </section>

                    <section className="space-y-6">
                        <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase">6. Sharing, Transfer & Disclosure of Google User Data</h2>
                        <p>We may share, transfer, or disclose Google user data only as needed to provide the Service, comply with law, protect users, and run our infrastructure.</p>
                        <div className="space-y-3">
                            <p className="text-sm italic text-neutral-400 px-6 py-4 border-l border-white/20 bg-white/[0.02]">
                                We do not sell Google user data. We do not use Google user data for advertising.
                            </p>
                            <ul className="space-y-2 text-sm">
                                <li className="flex gap-3"><span className="text-white/30">•</span> <span><span className="text-white font-semibold">Google APIs (Google)</span>: data is transmitted to Google to access Gmail/Calendar/Meet features you enable (e.g., reading messages you request, sending emails you initiate, creating calendar events).</span></li>
                                <li className="flex gap-3"><span className="text-white/30">•</span> <span><span className="text-white font-semibold">AI processing providers</span>: when you use AI features, relevant email content and metadata may be sent to our AI providers to generate summaries, drafts, and classifications (e.g., OpenRouter and model providers such as Anthropic).</span></li>
                                <li className="flex gap-3"><span className="text-white/30">•</span> <span><span className="text-white font-semibold">Database & infrastructure vendors</span>: encrypted tokens and app data may be stored/processed by our infrastructure providers (e.g., Supabase) to operate Mailient.</span></li>
                                <li className="flex gap-3"><span className="text-white/30">•</span> <span><span className="text-white font-semibold">Payments & subscription management</span>: limited account data may be shared with our subscription/payment provider (Polar) to manage billing and access.</span></li>
                                <li className="flex gap-3"><span className="text-white/30">•</span> <span><span className="text-white font-semibold">Legal, safety, and enforcement</span>: we may disclose information if required by law, subpoena, or to protect Mailient, our users, and the public from fraud, abuse, or security threats.</span></li>
                            </ul>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase">7. Third-Party Services</h2>
                        <p>Mailient may rely on trusted third-party tools (e.g., hosting, payments). They only receive what is necessary to operate.</p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase">8. Your Rights</h2>
                        <p>You can access your data, request deletion, or disconnect email access anytime.</p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase">9. Data Retention</h2>
                        <p>We keep data only as long as needed to provide the Service. Deleted accounts will have data removed within a reasonable timeframe.</p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase">10. Changes to Privacy Policy</h2>
                        <p>As Mailient grows, this policy may change. We’ll update the date and notify users when appropriate.</p>
                    </section>

                    <section className="space-y-6 pt-12 border-t border-white/10">
                        <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase">11. Contact</h2>
                        <p>Privacy questions? Contact us on X:</p>
                        <a
                            href="https://x.com/Maulik_055"
                            target="_blank"
                            className="inline-flex items-center gap-3 px-8 py-4 bg-[#fafafa] text-black rounded-2xl font-black italic uppercase tracking-tighter hover:scale-[1.02] transition-transform shadow-[0_0_40px_rgba(255,255,255,0.1)]"
                        >
                            Contact on X
                        </a>
                    </section>
                </div>
            </main>
        </div>
    );
}
