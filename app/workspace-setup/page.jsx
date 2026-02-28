"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    Shield,
    Key,
    CheckCircle2,
    ArrowRight,
    Copy,
    Check,
    ExternalLink,
    Lock,
    Settings,
    FileText,
    Zap,
    ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

const ADMIN_EMAIL_TEMPLATE = `Hi,

I'd like to use Mailient for our team's email management.

To enable this, we need to authorize Mailient as a trusted app in the Google Workspace Admin Console:

1. Navigate to admin.google.com → Security → API Controls → App Access Control
2. Click "Add app" → "OAuth App Name or Client ID"
3. Search for Client ID: ${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '[See mailient.xyz/workspace-setup]'}
4. Set access level to "Trusted"

This configuration takes approximately 60 seconds and enables seamless access for our entire domain.

Reference: https://mailient.xyz/workspace-setup

Regards,`;

export default function WorkspaceSetupPage() {
    const router = useRouter();
    const [copiedField, setCopiedField] = useState(null);

    const copyToClipboard = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const steps = [
        {
            num: "01",
            title: "API Controls",
            description: "Access the Google Workspace Admin Console and navigate to the security settings.",
            detail: "Security > Access and data control > API Controls",
            action: {
                label: "Open Console",
                url: "https://admin.google.com/ac/owl/list?tab=apps",
            }
        },
        {
            num: "02",
            title: "App Identification",
            description: 'Select "Add app" followed by "OAuth App Name or Client ID". Paste the identifier below.',
            copyable: CLIENT_ID,
        },
        {
            num: "03",
            title: "Admin Access",
            description: "Locate Mailient in the list and set the access level to Trusted.",
            detail: "This enables domain-wide integration without individual user prompts.",
        },
        {
            num: "04",
            title: "Deployment",
            description: "Permission propagation is immediate. Your team is now ready to use Mailient.",
            isDone: true,
        },
    ];

    return (
        <div className="min-h-screen bg-[#080808] text-zinc-100 selection:bg-white/20 font-sans antialiased">
            {/* Subtle Gradient Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#1a1a2e,transparent_70%)] opacity-40" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px]" />
            </div>

            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-white/[0.05] bg-[#080808]/80 backdrop-blur-md">
                <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <button onClick={() => router.push('/')} className="flex items-center gap-2.5 group">
                            <div className="w-6 h-6 bg-white rounded flex items-center justify-center transition-transform group-hover:scale-105">
                                <div className="w-2.5 h-2.5 bg-black rounded-[1px]" />
                            </div>
                            <span className="text-sm font-semibold tracking-tight">Mailient</span>
                        </button>
                        <div className="hidden md:flex items-center gap-6 text-[11px] font-medium text-zinc-500 uppercase tracking-widest pt-0.5">
                            <span className="text-zinc-700">/</span>
                            <span>Setup Guide</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <button onClick={() => router.push('/auth/signin')} className="text-xs text-zinc-400 hover:text-white transition-colors">Sign In</button>
                        <button onClick={() => router.push('/')} className="text-xs px-4 py-1.5 bg-white text-black rounded-full font-medium hover:bg-zinc-200 transition-colors">Home</button>
                    </div>
                </div>
            </nav>

            <main className="relative z-10 pt-40 pb-32 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">
                        {/* Header & Context */}
                        <div className="lg:col-span-5 space-y-12">
                            <div className="space-y-6">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    <span className="text-[10px] uppercase tracking-widest font-semibold text-zinc-400">Enterprise Onboarding</span>
                                </div>
                                <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
                                    Domain-wide<br />Authorization
                                </h1>
                                <p className="text-zinc-400 text-lg font-light leading-relaxed">
                                    Grant Mailient the necessary permissions to manage your organization's email intelligence. Secure, transparent, and reversible.
                                </p>
                            </div>

                            <div className="space-y-8 pt-10 border-t border-white/5">
                                <h4 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Security Layers</h4>
                                <div className="grid grid-cols-1 gap-8">
                                    {[
                                        { title: "OAuth 2.0 Enforcement", desc: "No passwords stored. Ever.", icon: Shield },
                                        { title: "Vault Encryption", desc: "AES-256 military-grade protection.", icon: Lock },
                                        { title: "Revocation Control", desc: "Instantly disconnect at any time.", icon: Settings }
                                    ].map((spec, i) => (
                                        <div key={i} className="flex gap-4 group">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/[0.03] flex items-center justify-center text-zinc-500 group-hover:text-white transition-colors border border-white/[0.05]">
                                                <spec.icon className="w-4 h-4" />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-xs text-white font-medium">{spec.title}</div>
                                                <div className="text-[11px] text-zinc-500 leading-relaxed font-light">{spec.desc}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Implementation Steps */}
                        <div className="lg:col-span-7 space-y-3">
                            {steps.map((step, i) => (
                                <motion.div
                                    key={step.num}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="group relative bg-white/[0.02] border border-white/[0.05] rounded-2xl p-8 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300"
                                >
                                    <div className="flex gap-8">
                                        <div className="flex-shrink-0 font-mono text-xs text-zinc-700 group-hover:text-zinc-500 transition-colors pt-1">
                                            {step.num}
                                        </div>
                                        <div className="flex-1 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-lg font-medium text-white">{step.title}</h3>
                                                {step.isDone && (
                                                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-500">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        Active
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-sm text-zinc-400 leading-relaxed font-light">
                                                {step.description}
                                            </p>

                                            {step.detail && (
                                                <div className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest bg-black/40 border border-white/[0.03] px-3 py-1.5 rounded-lg w-fit">
                                                    {step.detail}
                                                </div>
                                            )}

                                            {step.action && (
                                                <button
                                                    onClick={() => window.open(step.action.url, "_blank")}
                                                    className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-300 hover:text-white transition-colors pt-2 group/link"
                                                >
                                                    {step.action.label}
                                                    <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                                </button>
                                            )}

                                            {step.copyable && (
                                                <div className="flex items-center justify-between gap-4 bg-black/60 border border-white/[0.05] rounded-xl px-5 py-4 mt-2 group/copy overflow-hidden">
                                                    <code className="text-[11px] font-mono text-blue-300/60 truncate italic">
                                                        {step.copyable}
                                                    </code>
                                                    <button
                                                        onClick={() => copyToClipboard(step.copyable, "clientId")}
                                                        className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                                                    >
                                                        {copiedField === "clientId" ? (
                                                            <span className="text-emerald-500 flex items-center gap-1">
                                                                <Check className="w-3.5 h-3.5" />
                                                                Copied
                                                            </span>
                                                        ) : (
                                                            <>
                                                                <Copy className="w-3.5 h-3.5" />
                                                                Copy ID
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}

                            {/* Admin Notification */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="mt-12 bg-white/[0.03] border border-white/10 rounded-2xl p-8 space-y-6"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h4 className="text-xs font-semibold text-white uppercase tracking-widest">Admin Notification</h4>
                                        <p className="text-[10px] text-zinc-500 font-medium italic">Forward this to your workspace administrator.</p>
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(ADMIN_EMAIL_TEMPLATE, "email")}
                                        className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
                                    >
                                        {copiedField === "email" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                        {copiedField === "email" ? "Copied" : "Copy Template"}
                                    </button>
                                </div>
                                <div className="bg-black/80 border border-white/[0.03] rounded-xl p-6 h-48 overflow-y-auto font-mono text-[11px] text-zinc-500 leading-loose scrollbar-hide">
                                    <pre className="whitespace-pre-wrap">{ADMIN_EMAIL_TEMPLATE}</pre>
                                </div>
                            </motion.div>

                            {/* Final CTA */}
                            <div className="pt-20 flex flex-col items-center gap-4">
                                <button
                                    onClick={() => router.push('/auth/signin')}
                                    className="group relative w-full md:w-auto px-12 py-4 bg-white text-black text-xs font-bold uppercase tracking-[0.2em] rounded-full hover:bg-zinc-200 transition-all active:scale-95 shadow-xl"
                                >
                                    Proceed to Dashboard
                                    <ArrowRight className="inline-block ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                                </button>
                                <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Setup is required for first-time integration</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 py-12 px-6 border-t border-white/[0.03]">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 text-[10px] font-medium tracking-[0.3em] text-zinc-600 uppercase">
                    <p>© 2026 Mailient / Tier 1 Data Integrity</p>
                    <div className="flex gap-12">
                        <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
                        <a href="/security" className="hover:text-white transition-colors">Security</a>
                        <a href="mailto:support@mailient.xyz" className="hover:text-white transition-colors">Support</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
