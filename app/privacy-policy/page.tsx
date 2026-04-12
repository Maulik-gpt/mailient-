"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Mail, Calendar, Video, Lock, UserCheck, RefreshCw, Trash2, Globe } from "lucide-react";

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
                    href="/"
                    className="inline-flex items-center gap-2 text-neutral-500 hover:text-white transition-colors mb-12 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium uppercase tracking-widest">Back to Home</span>
                </Link>

                <header className="mb-16">
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter italic uppercase leading-none mb-6">
                        Privacy <br /> Policy
                    </h1>
                    <p className="text-neutral-500 font-medium tracking-widest uppercase text-sm">
                        Effective Date: 16th Feb, 2026
                    </p>
                </header>

                <div className="space-y-12 text-neutral-300 leading-relaxed font-medium">
                    <section className="space-y-4">
                        <p className="text-lg text-white font-medium italic">
                            Mailient (“Mailient”, “we”, “our”, or “us”) is an AI-powered email assistant designed to help users manage their inbox more efficiently. This Privacy Policy explains what information we collect, how we use it, and how we protect it.
                        </p>
                        <div className="p-6 bg-blue-950/20 border border-blue-500/20 rounded-[2rem] flex gap-4 items-start">
                            <ShieldCheck className="w-6 h-6 text-blue-400 shrink-0 mt-1" />
                            <p className="text-sm font-bold text-blue-200 uppercase tracking-tight italic">
                                Mailient strictly limits its access to Google user data to only what is necessary to provide the functionality explicitly requested and enabled by the user.
                            </p>
                        </div>
                    </section>

                    <section className="space-y-6">
                        <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase flex items-center gap-3">
                            <span className="w-8 h-[1px] bg-white/20" /> 1. Information We Collect
                        </h2>

                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
                                <span className="text-white/20 italic">A.</span> Account Information
                            </h3>
                            <p>When you create an account, we may collect:</p>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {[
                                    { label: "Your name", icon: <UserCheck className="w-4 h-4" /> },
                                    { label: "Your email address", icon: <Mail className="w-4 h-4" /> },
                                    { label: "Basic profile details", icon: <ShieldCheck className="w-4 h-4" /> }
                                ].map((item) => (
                                    <li key={item.label} className="bg-white/5 border border-white/10 px-4 py-3 rounded-xl text-sm italic flex items-center gap-3">
                                        <span className="text-neutral-500">{item.icon}</span>
                                        {item.label}
                                    </li>
                                ))}
                            </ul>
                            <p className="text-sm text-neutral-500">This information is used solely to create and manage your Mailient account.</p>
                        </div>

                        <div className="space-y-4 pt-4">
                            <h3 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
                                <span className="text-white/20 italic">B.</span> Google User Data
                            </h3>
                            <p>When you connect your Google account, we request access only to the Google API scopes required to provide the features you enable. Depending on the permissions granted, Mailient may access:</p>

                            <div className="grid gap-4">
                                <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem] space-y-4">
                                    <div className="flex gap-4 items-center border-b border-white/5 pb-4">
                                        <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center">
                                            <Mail className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <h4 className="text-white font-bold uppercase tracking-wider italic text-lg">Gmail Data</h4>
                                    </div>
                                    <p className="text-sm text-neutral-400 leading-relaxed">
                                        Email content, metadata (sender, recipient, subject, timestamp), thread information, and labels.
                                    </p>
                                    <div className="space-y-2 pt-2">
                                        <p className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-3">Strict Use Cases:</p>
                                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {[
                                                "Display your inbox",
                                                "Generate AI summaries",
                                                "Draft replies at request",
                                                "Organize or label messages",
                                                "Send emails on approval"
                                            ].map((text) => (
                                                <li key={text} className="flex items-center gap-2 text-xs text-neutral-400">
                                                    <div className="w-1 h-1 bg-blue-500 rounded-full" />
                                                    {text}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm italic text-neutral-500 border-l border-white/20 pl-4 py-1">
                                Mailient does not access Gmail data beyond what is necessary to perform these user-requested tasks.
                            </p>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase flex items-center gap-3">
                            <span className="w-8 h-[1px] bg-white/20" /> 2. How We Use Google User Data
                        </h2>
                        <p>Google user data is used exclusively to provide the core functionality of Mailient. We only perform actions you directly initiate.</p>

                        <div className="p-6 bg-neutral-900 border border-white/10 rounded-[2rem] space-y-4">
                            <ul className="space-y-3 text-sm">
                                <li className="flex gap-3">
                                    <div className="w-5 h-5 shrink-0 bg-green-500/10 rounded flex items-center justify-center">
                                        <ShieldCheck className="w-3 h-3 text-green-400" />
                                    </div>
                                    <span>Emails are sent only when you explicitly draft, review, and confirm sending.</span>
                                </li>
                                <li className="flex gap-3">
                                    <div className="w-5 h-5 shrink-0 bg-green-500/10 rounded flex items-center justify-center">
                                        <ShieldCheck className="w-3 h-3 text-green-400" />
                                    </div>
                                    <span>Mailient does not automatically send bulk emails or follow-up sequences without direct user action.</span>
                                </li>
                            </ul>
                        </div>

                        <div className="p-6 bg-red-950/20 border border-red-500/20 rounded-[2rem] space-y-3 mt-4">
                            <span className="text-xs font-black text-red-400 uppercase tracking-[0.2em]">Our Strict Prohibitions:</span>
                            <ul className="space-y-2 text-sm italic">
                                <li className="flex gap-3 text-red-100"><span className="text-red-500 font-bold shrink-0">×</span> No advertising, marketing, or profiling unrelated to functionality.</li>
                                <li className="flex gap-3 text-red-100"><span className="text-red-500 font-bold shrink-0">×</span> We do not sell Google user data.</li>
                                <li className="flex gap-3 text-red-100"><span className="text-red-500 font-bold shrink-0">×</span> We do not use Google user data to train public or shared AI models.</li>
                            </ul>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase flex items-center gap-3">
                            <span className="w-8 h-[1px] bg-white/20" /> 3. AI Processing
                        </h2>
                        <p>When you use AI features, only the data necessary to generate output is securely transmitted to providers.</p>
                        <div className="p-6 bg-white/[0.03] border border-white/10 rounded-[2rem] flex gap-4">
                            <RefreshCw className="w-5 h-5 text-purple-400 shrink-0 mt-1" />
                            <p className="text-sm">
                                These providers process data solely to generate the requested result and are not permitted to use it for independent purposes. Mailient does not use Gmail data to train public AI systems.
                            </p>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase flex items-center gap-3">
                            <span className="w-8 h-[1px] bg-white/20" /> 4. Data Storage and Security
                        </h2>
                        <p>We implement reasonable administrative, technical, and physical safeguards to protect your data.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                                <div className="flex items-center gap-2 text-xs font-bold text-white uppercase mb-2">
                                    <Lock className="w-3 h-3" /> Encryption
                                </div>
                                <p className="text-xs text-neutral-400 italic">Data is encrypted in transit using HTTPS and stored securely.</p>
                            </div>
                            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                                <div className="flex items-center gap-2 text-xs font-bold text-white uppercase mb-2">
                                    <ShieldCheck className="w-3 h-3" /> Access
                                </div>
                                <p className="text-xs text-neutral-400 italic">OAuth access tokens are stored securely with restricted access.</p>
                            </div>
                        </div>
                        <p className="text-xs text-neutral-500 italic">While we take industry-standard precautions, no online system can guarantee absolute security.</p>
                    </section>

                    <section className="space-y-6">
                        <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase flex items-center gap-3">
                            <span className="w-8 h-[1px] bg-white/20" /> 5. Sharing and Disclosure
                        </h2>
                        <p>Mailient does not sell or rent Google user data. We share only in limited circumstances:</p>
                        <ul className="space-y-3">
                            {[
                                { title: "Service Providers", desc: "Infrastructure providers (hosting/database) receive the minimum data required." },
                                { title: "AI Processing Providers", desc: "Only data necessary to generate AI outputs requested by you." },
                                { title: "Legal Requirements", desc: "If required by applicable law, regulation, or valid legal process." }
                            ].map((item) => (
                                <li key={item.title} className="flex gap-4 p-4 bg-white/[0.02] border-l border-white/20">
                                    <div>
                                        <h5 className="text-white text-sm font-bold uppercase italic tracking-wider">{item.title}</h5>
                                        <p className="text-xs text-neutral-400 mt-1">{item.desc}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <div className="p-4 bg-red-950/10 border border-red-500/10 rounded-xl">
                            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Crucial Header:</p>
                            <p className="text-xs text-neutral-400 italic mt-1 font-bold">Google user data is never shared for advertising, marketing, or unrelated analytics purposes.</p>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase flex items-center gap-3">
                            <span className="w-8 h-[1px] bg-white/20" /> 6. Data Retention
                        </h2>
                        <div className="flex gap-4 p-6 bg-white/5 border border-white/10 rounded-[2rem]">
                            <Trash2 className="w-6 h-6 text-neutral-500 shrink-0" />
                            <div className="space-y-2">
                                <p className="text-sm">Mailient retains data only as long as necessary to provide the service.</p>
                                <p className="text-xs text-neutral-400 italic">Disconnecting your account revokes OAuth tokens and initiates data deletion within a reasonable timeframe.</p>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase flex items-center gap-3">
                            <span className="w-8 h-[1px] bg-white/20" /> 7. User Control and Rights
                        </h2>
                        <p>You maintain full control over your data. You may:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            {[
                                "Revoke Google access via Google settings",
                                "Disconnect account from Mailient",
                                "Request full account deletion",
                                "Request deletion of specific data"
                            ].map(text => (
                                <div key={text} className="p-3 bg-white/5 rounded-lg border border-white/5 italic">
                                    {text}
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase flex items-center gap-3">
                            <span className="w-8 h-[1px] bg-white/20" /> 8. Third-Party Services
                        </h2>
                        <p>Mailient relies on trusted third-party service providers for infrastructure, AI processing, and payment handling. These providers are contractually restricted from using data for unrelated purposes.</p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase flex items-center gap-3">
                            <span className="w-8 h-[1px] bg-white/20" /> 9. Changes to This Policy
                        </h2>
                        <p>We may update this Privacy Policy from time to time. Updates will be reflected with a revised effective date at the top of this page.</p>
                    </section>

                    <section className="space-y-6 pt-12 border-t border-white/10">
                        <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase flex items-center gap-3">
                            <span className="w-8 h-[1px] bg-white/20" /> 10. Contact
                        </h2>
                        <p>If you have privacy-related questions or requests, please contact us at:</p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <a
                                href="mailto:mailient.xyz@gmail.com"
                                className="inline-flex items-center gap-3 px-8 py-4 bg-[#fafafa] text-black rounded-2xl font-black italic uppercase tracking-tighter hover:scale-[1.02] transition-transform shadow-[0_0_40px_rgba(255,255,255,0.1)]"
                            >
                                <Mail className="w-4 h-4" />
                                mailient.xyz@gmail.com
                            </a>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
