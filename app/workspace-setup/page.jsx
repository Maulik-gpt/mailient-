"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

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
            action: {
                label: "Open Console",
                url: "https://admin.google.com/ac/owl/list?tab=apps",
            },
            detail: "Security > Access and data control > API Controls > App Access Control",
        },
        {
            num: "02",
            title: "Identification",
            description: 'Select "Add app" followed by "OAuth App Name or Client ID". Paste the unique identifier below.',
            copyable: CLIENT_ID,
        },
        {
            num: "03",
            title: "Authorization",
            description: "Locate Mailient in the search results and define the access level as Trusted.",
            detail: "This establishes the secure handshake between Mailient and your organization domain.",
        },
        {
            num: "04",
            title: "Deployment",
            description: "Permission propagation is immediate. Your team members may now authenticate using their work accounts.",
            isDone: true,
        },
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
    };

    return (
        <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
            {/* Grid Pattern Background */}
            <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

            {/* Header */}
            <header className="relative z-10 border-b border-white/10 bg-black/80 backdrop-blur-md">
                <div className="max-w-5xl mx-auto px-8 py-6 flex items-center justify-between font-mono uppercase tracking-widest text-[10px]">
                    <button onClick={() => router.push('/')} className="flex items-center gap-4 group">
                        <div className="w-5 h-5 bg-white shrink-0" />
                        <span className="text-white">Mailient / Workspace Setup</span>
                    </button>
                    <div className="flex items-center gap-8">
                        <button onClick={() => router.push('/auth/signin')} className="hover:text-zinc-400 transition-colors">Sign In</button>
                        <button onClick={() => router.push('/')} className="hover:text-zinc-400 transition-colors">Documentation</button>
                    </div>
                </div>
            </header>

            <main className="relative z-10 max-w-5xl mx-auto px-8 py-24 md:py-32">
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24"
                >
                    {/* Left Column: Context */}
                    <div className="lg:col-span-5 space-y-12">
                        <motion.div variants={itemVariants} className="space-y-6">
                            <div className="inline-block border border-white/20 px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-400">
                                Step-by-step
                            </div>
                            <h1 className="text-5xl font-medium tracking-tight leading-[1.1]">
                                Domain-wide<br />Authorization
                            </h1>
                            <p className="text-zinc-400 text-base leading-relaxed max-w-sm font-light">
                                Securely integrate Mailient with your Google Workspace domain. This one-time setup removes authentication friction for your entire team.
                            </p>
                        </motion.div>

                        <motion.div variants={itemVariants} className="pt-8 space-y-8 border-t border-white/10">
                            <div className="space-y-4">
                                <h4 className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">Security Architecture</h4>
                                <div className="grid grid-cols-1 gap-6">
                                    {[
                                        { title: "OAuth 2.0 Protocol", desc: "Industry-standard delegated access without credential sharing." },
                                        { title: "AES-256 Storage", desc: "Data is encrypted at rest using military-grade standards." },
                                        { title: "Granular Revocation", desc: "Domain admins retain absolute control over app permissions." }
                                    ].map((spec, i) => (
                                        <div key={i} className="space-y-1">
                                            <div className="text-xs text-white font-medium">{spec.title}</div>
                                            <div className="text-[11px] text-zinc-500 leading-relaxed font-light">{spec.desc}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Column: Steps */}
                    <div className="lg:col-span-7 space-y-2">
                        {steps.map((step, i) => (
                            <motion.div
                                key={step.num}
                                variants={itemVariants}
                                className="group relative flex gap-8 p-8 border-b border-white/10 last:border-0 hover:bg-white/[0.02] transition-colors"
                            >
                                <div className="font-mono text-[10px] text-zinc-600 pt-1 tracking-widest">{step.num}</div>
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-start justify-between">
                                        <h3 className="text-lg font-medium text-white">{step.title}</h3>
                                        {step.isDone && (
                                            <div className="text-[10px] uppercase tracking-widest font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/20">Active</div>
                                        )}
                                    </div>
                                    <p className="text-sm text-zinc-400 leading-relaxed font-light max-w-lg">{step.description}</p>

                                    {step.detail && (
                                        <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">{step.detail}</div>
                                    )}

                                    {step.action && (
                                        <button
                                            onClick={() => window.open(step.action.url, "_blank")}
                                            className="inline-flex items-center text-[11px] font-mono uppercase tracking-widest text-white hover:text-zinc-400 transition-colors border-b border-white/20 pb-0.5"
                                        >
                                            {step.action.label}
                                            <svg className="w-3 h-3 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path d="M15 3h6v6" /><path d="M10 14 21 3" /></svg>
                                        </button>
                                    )}

                                    {step.copyable !== undefined && (
                                        <div className="pt-2">
                                            {step.copyable ? (
                                                <div className="flex items-center justify-between border border-white/10 p-4 bg-black group/copy">
                                                    <code className="text-xs font-mono text-zinc-300 truncate pr-4">{step.copyable}</code>
                                                    <button
                                                        onClick={() => copyToClipboard(step.copyable, "clientId")}
                                                        className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                                                    >
                                                        {copiedField === "clientId" ? "Copied" : "Copy ID"}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="text-[10px] font-mono text-zinc-700 uppercase italic">Identifier pending configuration</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}

                        {/* Email Template Card */}
                        <motion.div variants={itemVariants} className="mt-16 bg-white/[0.03] border border-white/10 p-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-xs font-medium text-white uppercase tracking-widest">Admin Notification</h3>
                                    <p className="text-[10px] text-zinc-500 font-mono italic">Forward this to your lead administrator.</p>
                                </div>
                                <button
                                    onClick={() => copyToClipboard(ADMIN_EMAIL_TEMPLATE, "email")}
                                    className="px-4 py-2 border border-white/10 text-[10px] font-mono uppercase tracking-widest hover:bg-white hover:text-black transition-colors"
                                >
                                    {copiedField === "email" ? "Copied" : "Copy Template"}
                                </button>
                            </div>
                            <div className="bg-black border border-white/5 p-6 h-48 overflow-y-auto">
                                <pre className="text-[11px] text-zinc-500 font-mono leading-loose whitespace-pre-wrap">{ADMIN_EMAIL_TEMPLATE}</pre>
                            </div>
                        </motion.div>

                        {/* CTA */}
                        <motion.div variants={itemVariants} className="pt-24 text-center">
                            <button
                                onClick={() => router.push('/auth/signin')}
                                className="group relative inline-flex items-center justify-center px-12 py-5 bg-white text-black text-xs font-mono uppercase tracking-[0.3em] overflow-hidden transition-transform active:scale-95"
                            >
                                <span className="relative z-10">Proceed to login</span>
                                <div className="absolute inset-0 bg-zinc-200 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            </button>
                        </motion.div>
                    </div>
                </motion.div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 border-t border-white/10 py-12 px-8">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 font-mono text-[10px] tracking-widest text-zinc-600 uppercase">
                    <p>© 2026 Mailient Intelligence / Privacy First</p>
                    <div className="flex gap-12">
                        <a href="/privacy-policy" className="hover:text-white transition-colors">Privacy</a>
                        <a href="/terms-of-service" className="hover:text-white transition-colors">Terms</a>
                        <a href="mailto:support@mailient.xyz" className="hover:text-white transition-colors">Support</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
