import React from 'react';
import { HomeFeedSidebar } from '@/components/ui/home-feed-sidebar';
import { Mail, Shield, Lock, Eye, CheckCircle2, XCircle, Globe, Scale } from 'lucide-react';

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-[#F9F8F6] dark:bg-[#0c0c0c] flex overflow-hidden selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
            <HomeFeedSidebar className="z-50" />
            <div className="flex-1 p-6 md:p-12 lg:p-20 overflow-y-auto relative z-10">
                {/* Premium Grain Overlay */}
                <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150" />

                <div className="max-w-4xl mx-auto bg-white dark:bg-[#111111] rounded-[2.5rem] p-8 md:p-16 shadow-2xl border border-neutral-200 dark:border-white/5 relative z-10 animate-fade-in">
                    
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-black dark:bg-white rounded-2xl flex items-center justify-center shadow-lg">
                            <Shield className="text-white dark:text-black w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold text-black dark:text-white tracking-tight">Privacy Policy</h1>
                            <p className="text-sm text-neutral-500 dark:text-white/40 mt-1 uppercase tracking-widest font-bold">Effective: April 12, 2026</p>
                        </div>
                    </div>

                    <div className="prose dark:prose-invert max-w-none space-y-12 text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        
                        <div className="bg-neutral-50 dark:bg-white/[0.02] border border-neutral-100 dark:border-white/[0.05] rounded-3xl p-8 space-y-4">
                            <p className="text-lg font-medium text-black dark:text-white/90 leading-snug italic">
                                "Your privacy is not just a policy—it is a core feature of the Mailient architecture."
                            </p>
                            <p>
                                This Privacy Policy describes how Mailient Intelligence ("Mailient," "we," "us," or "our") collects, uses, stores, and protects your personal information when you use our email intelligence platform at <b>mailient.xyz</b>. By using Mailient, you agree to the practices described in this policy.
                            </p>
                        </div>

                        <section>
                            <h2 className="flex items-center gap-3 text-2xl font-bold text-black dark:text-white mb-6">
                                <Scale className="w-5 h-5 opacity-40" /> 1. Who we are
                            </h2>
                            <p>Mailient is an AI-powered email intelligence platform founded and operated by Maulik. Our service connects to your Gmail or Google Workspace account (with your explicit permission) to help you triage, summarize, draft, and manage email communications more efficiently.</p>
                            <div className="mt-4 p-4 bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5 flex items-center gap-3">
                                <Mail className="w-4 h-4 text-black dark:text-white" />
                                <span className="text-sm font-medium">Contact: mailient.xyz@gmail.com</span>
                            </div>
                        </section>

                        <section>
                            <h2 className="flex items-center gap-3 text-2xl font-bold text-black dark:text-white mb-6">
                                <Globe className="w-5 h-5 opacity-40" /> 2. Scope of this policy
                            </h2>
                            <p>This policy applies to:</p>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 list-none p-0">
                                {['Users of mailient.xyz', 'Google / Workspace connections', 'Free, Starter, and Pro tiers', 'Visitors browsing non-auth areas'].map(item => (
                                    <li key={item} className="flex items-center gap-3 bg-neutral-50 dark:bg-white/[0.03] p-3 rounded-xl text-sm font-medium">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {item}
                                    </li>
                                ))}
                            </ul>
                        </section>

                        <section>
                            <h2 className="flex items-center gap-3 text-2xl font-bold text-black dark:text-white mb-6">
                                <Eye className="w-5 h-5 opacity-40" /> 3. Information we collect
                            </h2>
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-bold text-black dark:text-white mb-2">3.1 Account and identity information</h3>
                                    <p>When you sign up or log in via Google OAuth 2.0, we receive from Google: your full name, email address, and profile picture. We never receive or store your Google account password.</p>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-black dark:text-white mb-2">3.2 Email data</h3>
                                    <p>To provide AI-powered inbox analysis, Mailient accesses your Gmail data through the official Gmail API. This may include: email subject lines, sender and recipient addresses, timestamps, email body content, and thread metadata.</p>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-black dark:text-white mb-2">3.3 Usage and analytics data</h3>
                                    <p>We collect anonymized usage data including features used, frequency of use, session duration, error logs, and browser or device type.</p>
                                </div>
                            </div>
                        </section>

                        <section className="bg-black dark:bg-white rounded-[2rem] p-8 md:p-12 text-white dark:text-black">
                            <h2 className="text-3xl font-bold mb-8 tracking-tight">5. What we do not do</h2>
                            <div className="grid grid-cols-1 gap-6">
                                {[
                                    { title: "No Selling Data", desc: "We do not sell your personal data — ever. Your email content and identity information are not sold." },
                                    { title: "No Public Model Training", desc: "Your email content is never used to improve foundational or publicly shared machine learning models." },
                                    { title: "No Automated Sending", desc: "All email sending actions require you to review and approve each message before it is sent." },
                                    { title: "No Password Storage", desc: "Authentication is handled entirely through Google OAuth 2.0; we never see your credentials." },
                                    { title: "No Advertising", desc: "Mailient is a subscription product. We do not allow advertisers to target you." }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex gap-4 items-start border-b border-white/10 dark:border-black/10 pb-6 last:border-0 last:pb-0">
                                        <XCircle className="w-6 h-6 shrink-0 opacity-50" />
                                        <div>
                                            <h4 className="font-bold text-lg mb-1 uppercase tracking-tighter">{item.title}</h4>
                                            <p className="opacity-70 text-sm leading-relaxed">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section>
                            <h2 className="flex items-center gap-3 text-2xl font-bold text-black dark:text-white mb-6">
                                <Lock className="w-5 h-5 opacity-40" /> 6. Data security and encryption
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                                    <h4 className="font-bold text-black dark:text-white mb-2">AES-256 Encryption</h4>
                                    <p className="text-sm">Sensitive metadata is encrypted using military-grade standards. Decryption keys reside in your browser.</p>
                                </div>
                                <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                                    <h4 className="font-bold text-black dark:text-white mb-2">Zero-Knowledge</h4>
                                    <p className="text-sm">We store only encrypted blobs which we cannot read. Processing happens securely in memory.</p>
                                </div>
                            </div>
                        </section>
                        
                        <section className="border-t border-neutral-100 dark:border-white/5 pt-12">
                            <h2 className="text-2xl font-bold text-black dark:text-white mb-6">15. Contact us</h2>
                            <div className="space-y-2 text-sm font-medium">
                                <p className="text-black dark:text-white text-lg font-bold italic mb-4">Mailient Intelligence</p>
                                <p>Email: <a href="mailto:mailient.xyz@gmail.com" className="hover:text-black dark:hover:text-white transition-colors underline decoration-black/10">mailient.xyz@gmail.com</a></p>
                                <p>Website: <a href="https://mailient.xyz" className="hover:text-black dark:hover:text-white transition-colors">mailient.xyz</a></p>
                                <p>Founder: <a href="https://x.com/Maulik_055" className="hover:text-black dark:hover:text-white transition-colors">@Maulik_055 on X</a></p>
                            </div>
                            <div className="mt-12 text-[10px] text-neutral-400 dark:text-white/20 uppercase tracking-[0.2em] font-bold">
                                © 2026 Mailient Intelligence. All rights reserved.
                            </div>
                        </section>

                    </div>
                </div>
                <div className="h-20" /> {/* Spacer */}
            </div>
        </div>
    );
}
