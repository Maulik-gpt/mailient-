"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

export default function TermsOfService() {
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
                        Terms of <br /> Service
                    </h1>
                    <p className="text-neutral-500 font-medium tracking-widest uppercase text-sm">
                        Last Updated: January 2026
                    </p>
                </header>

                <div className="space-y-12 text-neutral-300 leading-relaxed font-medium">
                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase">1. Acceptance of Terms</h2>
                        <p>By accessing or using Mailient (“the Service”), you agree to these Terms of Service. If you do not agree, do not use the Service.</p>
                        <p className="text-neutral-400 bg-white/5 border border-white/10 p-4 rounded-2xl italic">
                            Mailient is an early-stage product. Things will change. Bugs may exist. Features may evolve or be removed.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase">2. What Mailient Is (and Isn’t)</h2>
                        <p>Mailient is an AI-powered email management tool designed to help users organize, prioritize, and respond to emails more efficiently.</p>

                        <div className="grid md:grid-cols-2 gap-6 pt-4">
                            <div className="space-y-3">
                                <span className="text-xs font-black text-white/40 uppercase tracking-widest">Mailient Assists With:</span>
                                <ul className="space-y-2 text-sm">
                                    <li className="flex gap-3"><span className="text-white">•</span> Drafting and organizing emails</li>
                                    <li className="flex gap-3"><span className="text-white">•</span> Surfacing important conversations</li>
                                    <li className="flex gap-3"><span className="text-white">•</span> Saving time on inbox management</li>
                                </ul>
                            </div>
                            <div className="space-y-3">
                                <span className="text-xs font-black text-white/40 uppercase tracking-widest">Mailient Does Not:</span>
                                <ul className="space-y-2 text-sm text-neutral-400">
                                    <li className="flex gap-3"><span>•</span> Guarantee accuracy, outcomes, or results</li>
                                    <li className="flex gap-3"><span>•</span> Replace human judgment</li>
                                    <li className="flex gap-3"><span>•</span> Act on your behalf without explicit input</li>
                                </ul>
                            </div>
                        </div>
                        <p className="text-sm border-l-2 border-white/20 pl-4 mt-6">You remain responsible for all emails sent, actions taken, and decisions made.</p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase">3. Eligibility</h2>
                        <p>You must be at least 13 years old to use Mailient. If you are under 18, you must have permission from a parent or legal guardian.</p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase">4. User Accounts</h2>
                        <p>You are responsible for:</p>
                        <ul className="space-y-2 pl-4 list-disc marker:text-white/20 font-medium">
                            <li>Maintaining account security</li>
                            <li>All activity under your account</li>
                            <li>Providing accurate information</li>
                        </ul>
                        <p className="text-sm italic">We are not liable for unauthorized access caused by your failure to secure your account.</p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase">5. Email Data & Access</h2>
                        <p>To function, Mailient may access email content only as authorized by you.</p>
                        <p>We do not sell your email data, do not read emails for advertising, and do not claim ownership over your content. Access is used solely to provide the Service.</p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase">6. Acceptable Use</h2>
                        <p>You agree not to use Mailient for illegal, harmful, or abusive activities, attempt to reverse engineer the Service, or use it to spam or mislead others.</p>
                        <p>We reserve the right to suspend or terminate accounts that violate these terms.</p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase">7. Payments & Subscriptions</h2>
                        <p>Paid plans and billing terms will be clearly shown before purchase. Payments are generally non-refundable unless required by law. Pricing may change with notice.</p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase">8. Service Availability</h2>
                        <p>Mailient is provided on an “as is” and “as available” basis. We do not guarantee uptime, error-free operation, or feature permanence.</p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase">9. Limitation of Liability</h2>
                        <p>Mailient is not liable for lost data, missed emails/opportunities, or financial/reputational losses. Use the Service at your own discretion.</p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase">10. Termination</h2>
                        <p>You may stop using Mailient at any time. We may suspend access if terms are violated or as required by law.</p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase">11. Changes to Terms</h2>
                        <p>We may update these terms as Mailient evolves. Continued use after updates means you accept the revised terms.</p>
                    </section>

                    <section className="space-y-6 pt-12 border-t border-white/10">
                        <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase">12. Contact</h2>
                        <p>Questions? Reach out to the team directly:</p>
                        <a
                            href="https://x.com/Maulik_055"
                            target="_blank"
                            className="inline-flex items-center gap-3 px-8 py-4 bg-white text-black rounded-2xl font-black italic uppercase tracking-tighter hover:scale-[1.02] transition-transform"
                        >
                            Contact on X
                        </a>
                    </section>
                </div>
            </main>
        </div>
    );
}
