"use client";

import React, { useEffect, useState } from "react";
import { Check, Lock, Crown, Sparkles, ArrowRight, ShieldCheck, HelpCircle, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const POLAR_CHECKOUT_URLS = {
  starter: "https://buy.polar.sh/polar_cl_ojXGgACq5GNMsUInVP3HX5vpXepohT5P8m7SL2RcCej",
  pro: "https://buy.polar.sh/polar_cl_BmoCj2jm6Hxy2Pc4DI6y717wsENNDAniGPfsB1pMO61"
};

const COMPARISON_FEATURES = [
  { category: "Core Capabilities", name: "Relational Sift", monthly: "Standard", annual: "Advanced", lifetime: "Priority Graph" },
  { category: "Core Capabilities", name: "AI Draft Replies", monthly: "Unlimited", annual: "Unlimited", lifetime: "500 / month" },
  { category: "Core Capabilities", name: "Arcus AI Queries", monthly: "20 / day", annual: "Priority Access", lifetime: "500 / month" },
  { category: "Integration", name: "Google Calendar Sync", monthly: "Included", annual: "Included", lifetime: "Included" },
  { category: "Integration", name: "Notion & Cal.com Sync", monthly: "Included", annual: "Included", lifetime: "Included" },
  { category: "Security & Badges", name: "Founding Badge", monthly: "—", annual: "✓ Gold Badge", lifetime: "✓ Diamond Badge" },
  { category: "Support", name: "Customer Service", monthly: "Standard", annual: "Priority", lifetime: "24/7 Premium" }
];

const PRICING_FAQS = [
  {
    q: "Can I upgrade or downgrade anytime?",
    a: "Yes, you can manage your subscription directly inside your billing portal. Upgrades are applied instantly and prorated, while downgrades or cancellations take effect at the end of your current billing period."
  },
  {
    q: "How does the Lifetime founding tier work?",
    a: "The Lifetime tier is a one-time purchase of $499. You secure full access to all Mailient core features forever. The 500 AI queries/month cap is refilled automatically on the 1st of every month."
  },
  {
    q: "Are there any hidden API fees?",
    a: "No. All AI models, tokens, and storage costs are completely covered in your subscription rate. You will never see variable overage fees."
  },
  {
    q: "What is your refund policy?",
    a: "We offer a 14-day no-questions-asked refund policy for monthly and annual tiers if you are unsatisfied with your setup. Contact support@mailient.xyz."
  }
];

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedToggle, setSelectedToggle] = useState<"monthly" | "annual" | "lifetime">("annual");
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Mouse coordinate tracker for cards shine effect
  const [mouseCoord, setMouseCoord] = useState({ x: 0, y: 0 });

  useEffect(() => {
    document.title = "Pricing / Mailient";
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await fetch("/api/subscription/status");
      if (response.ok) {
        const data = await response.json();
        setCurrentPlan(data.subscription?.planType || "free");
      }
    } catch (error) {
      console.error("Error fetching subscription status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPlan = async (planId: "monthly" | "annual" | "lifetime") => {
    let checkoutUrl = "";
    if (planId === "annual") {
      checkoutUrl = POLAR_CHECKOUT_URLS.starter; // Map Annual to starter checkout
    } else if (planId === "monthly") {
      checkoutUrl = POLAR_CHECKOUT_URLS.pro; // Map Monthly to pro checkout
    } else {
      // Lifetime - redirect to custom or pro checkout
      checkoutUrl = POLAR_CHECKOUT_URLS.pro;
    }

    const params = new URLSearchParams();
    if (session?.user?.email) params.set("email", session.user.email);
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://mailient.xyz";
    params.set("redirect_url", `${baseUrl}/payment-success`);

    window.location.href = `${checkoutUrl}?${params.toString()}`;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMouseCoord({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col items-center justify-start overflow-x-hidden font-satoshi select-none relative pb-32">
      {/* Top Navbar */}
      <Navbar />

      {/* Background Grids */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(circle, #000 1px, transparent 1px)`,
            backgroundSize: "24px 24px"
          }}
        />
        <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-neutral-100/40 blur-[100px]" />
      </div>

      {/* Header */}
      <div className="relative z-10 text-center mb-10 mt-36 px-6">
        <div className="inline-block px-3 py-1 bg-neutral-50 border border-neutral-200/60 rounded-full text-[10px] font-black tracking-widest uppercase text-neutral-500 mb-6 shadow-sm">
          <span className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-neutral-800" />
            Pricing Plans
          </span>
        </div>
        
        <h1 className="text-4xl md:text-7xl font-normal tracking-tight mb-4 text-neutral-900">
          One subscription. <span className="font-extralight italic text-neutral-500">Every feature.</span>
        </h1>
        <p className="text-neutral-500 text-base md:text-lg max-w-2xl mx-auto font-light leading-relaxed">
          Scale your email output autonomously with a flat, predictable subscription designed for high-performance founders.
        </p>
      </div>

      {/* 3-Way Pricing Toggle (Monthly / Annual / Lifetime) */}
      <div className="relative z-10 flex items-center bg-neutral-100 p-1.5 rounded-full mb-16 border border-neutral-200/60 shadow-sm font-semibold text-xs">
        <button
          onClick={() => setSelectedToggle("monthly")}
          className={cn(
            "px-6 py-2.5 rounded-full transition-all duration-300 relative",
            selectedToggle === "monthly" ? "text-neutral-950" : "text-neutral-500"
          )}
        >
          {selectedToggle === "monthly" && (
            <motion.div
              layoutId="pricing-toggle-pill"
              className="absolute inset-0 bg-white rounded-full shadow-sm border border-neutral-200/50"
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
            />
          )}
          <span className="relative z-10">Monthly</span>
        </button>

        <button
          onClick={() => setSelectedToggle("annual")}
          className={cn(
            "px-6 py-2.5 rounded-full transition-all duration-300 relative flex items-center gap-1.5",
            selectedToggle === "annual" ? "text-neutral-950 font-bold" : "text-neutral-500"
          )}
        >
          {selectedToggle === "annual" && (
            <motion.div
              layoutId="pricing-toggle-pill"
              className="absolute inset-0 bg-white rounded-full shadow-sm border border-neutral-200/50"
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1">
            Annual
            <span className="px-1.5 py-0.5 bg-neutral-950 text-[8px] font-black uppercase text-white rounded">
              Best Value
            </span>
          </span>
        </button>

        <button
          onClick={() => setSelectedToggle("lifetime")}
          className={cn(
            "px-6 py-2.5 rounded-full transition-all duration-300 relative",
            selectedToggle === "lifetime" ? "text-neutral-950" : "text-neutral-500"
          )}
        >
          {selectedToggle === "lifetime" && (
            <motion.div
              layoutId="pricing-toggle-pill"
              className="absolute inset-0 bg-white rounded-full shadow-sm border border-neutral-200/50"
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
            />
          )}
          <span className="relative z-10">Lifetime</span>
        </button>
      </div>

      {/* PLANS CARDS GRID */}
      <div 
        className="relative z-10 w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-8 px-6 items-stretch"
        onMouseMove={handleMouseMove}
      >
        
        {/* CARD 1: MONTHLY PLAN */}
        <motion.div
          animate={{
            scale: selectedToggle === "monthly" ? 1.03 : 0.98,
            borderColor: selectedToggle === "monthly" ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.08)"
          }}
          className={cn(
            "relative rounded-[32px] p-8 flex flex-col justify-between transition-all duration-500 bg-white border shadow-sm hover:shadow-md",
            selectedToggle === "monthly" ? "ring-1 ring-neutral-300" : ""
          )}
        >
          <div>
            <div className="flex items-center justify-between mb-8">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Monthly Tier</span>
            </div>
            
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className="text-5xl font-normal text-neutral-900">$29</span>
              <span className="text-neutral-400 font-light text-sm">/month</span>
            </div>
            <p className="text-xs text-neutral-500 font-light mb-8">
              For solo builders looking for autonomous triage. Cancel anytime.
            </p>

            <hr className="border-neutral-100 my-6" />

            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-xs text-neutral-600 font-light">
                <Check className="w-4 h-4 text-neutral-800 shrink-0" />
                Full access to Sift
              </li>
              <li className="flex items-center gap-3 text-xs text-neutral-600 font-light">
                <Check className="w-4 h-4 text-neutral-800 shrink-0" />
                Unlimited projects
              </li>
              <li className="flex items-center gap-3 text-xs text-neutral-600 font-light">
                <Check className="w-4 h-4 text-neutral-800 shrink-0" />
                Cancel anytime
              </li>
              <li className="flex items-center gap-3 text-xs text-neutral-600 font-light">
                <Check className="w-4 h-4 text-neutral-800 shrink-0" />
                AI workflow automation
              </li>
            </ul>
          </div>

          <div className="mt-12">
            <button
              onClick={() => handleSelectPlan("monthly")}
              disabled={isLoading || currentPlan === "pro"}
              className={cn(
                "w-full py-3.5 rounded-xl border font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5",
                currentPlan === "pro"
                  ? "bg-neutral-50 border-neutral-200 text-neutral-400 cursor-not-allowed"
                  : "bg-white border-neutral-200 hover:border-neutral-400 text-neutral-800"
              )}
            >
              {isLoading ? (
                "Loading..."
              ) : currentPlan === "pro" ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-neutral-400" />
                  Current Plan
                </>
              ) : (
                "Start Monthly"
              )}
            </button>
          </div>
        </motion.div>

        {/* CARD 2: ANNUAL PLAN (RECOMMENDED, DOMINANT, GLOWING) */}
        <motion.div
          animate={{
            scale: selectedToggle === "annual" ? 1.05 : 1.0,
            borderColor: selectedToggle === "annual" ? "rgba(0, 0, 0, 0.8)" : "rgba(0, 0, 0, 0.08)"
          }}
          className={cn(
            "relative rounded-[36px] p-8 md:p-10 flex flex-col justify-between transition-all duration-500 bg-neutral-950 text-white shadow-2xl overflow-hidden group",
            selectedToggle === "annual" ? "ring-2 ring-neutral-900" : ""
          )}
        >
          {/* Subtle moving light glow in background */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_60%)] pointer-events-none" />

          {/* Mouse follow light inside recommended card */}
          {selectedToggle === "annual" && (
            <div 
              className="absolute pointer-events-none w-[400px] h-[400px] rounded-full bg-white/5 blur-[50px] -z-10 transition-opacity"
              style={{
                left: mouseCoord.x - 200,
                top: mouseCoord.y - 200
              }}
            />
          )}

          <div>
            <div className="flex items-center justify-between mb-8">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Best Value Tier</span>
              <span className="px-2 py-0.5 rounded bg-white text-neutral-950 text-[8px] font-black uppercase tracking-wider">
                Recommended
              </span>
            </div>

            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-6xl font-normal">$16.58</span>
              <span className="text-neutral-400 font-light text-sm">/month</span>
            </div>
            <p className="text-[10px] font-semibold text-neutral-400 mb-6">
              billed annually at $199/year (Save 40%)
            </p>
            <p className="text-xs text-neutral-400 font-light mb-8">
              Full enterprise scale: Sift Triage, Draft Replies, and priority Arcus Access.
            </p>

            <hr className="border-neutral-800 my-6" />

            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-xs text-neutral-300 font-light">
                <Check className="w-4 h-4 text-white shrink-0" />
                Full access to Sift & Draft Replies
              </li>
              <li className="flex items-center gap-3 text-xs text-neutral-300 font-light">
                <Check className="w-4 h-4 text-white shrink-0" />
                2 months free included
              </li>
              <li className="flex items-center gap-3 text-xs text-neutral-300 font-light text-emerald-400">
                <Crown className="w-4 h-4 text-emerald-400 shrink-0" />
                Gold Founding Badge
              </li>
              <li className="flex items-center gap-3 text-xs text-neutral-300 font-light">
                <Check className="w-4 h-4 text-white shrink-0" />
                Priority Arcus AI unlocks
              </li>
            </ul>
          </div>

          <div className="mt-12">
            <button
              onClick={() => handleSelectPlan("annual")}
              disabled={isLoading || currentPlan === "starter"}
              className={cn(
                "w-full py-4 rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5",
                currentPlan === "starter"
                  ? "bg-neutral-800 text-neutral-400 cursor-not-allowed border border-neutral-700"
                  : "bg-white text-neutral-950 hover:bg-neutral-100 hover:scale-[1.02]"
              )}
            >
              {isLoading ? (
                "Loading..."
              ) : currentPlan === "starter" ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-neutral-400" />
                  Current Plan
                </>
              ) : (
                <>
                  Get Best Value
                  <ArrowRight className="w-4 h-4 text-neutral-950" />
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* CARD 3: LIFETIME PLAN */}
        <motion.div
          animate={{
            scale: selectedToggle === "lifetime" ? 1.03 : 0.98,
            borderColor: selectedToggle === "lifetime" ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.08)"
          }}
          className={cn(
            "relative rounded-[32px] p-8 flex flex-col justify-between transition-all duration-500 bg-white border shadow-sm hover:shadow-md",
            selectedToggle === "lifetime" ? "ring-1 ring-neutral-300" : ""
          )}
        >
          <div>
            <div className="flex items-center justify-between mb-8">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Founding Tier</span>
            </div>

            <div className="flex items-baseline gap-1.5 mb-2">
              <span className="text-5xl font-normal text-neutral-900">$499</span>
              <span className="text-neutral-400 font-light text-sm">once</span>
            </div>
            <p className="text-xs text-neutral-500 font-light mb-8">
              Own Mailient forever. Full access, diamond founding status, 500 monthly queries.
            </p>

            <hr className="border-neutral-100 my-6" />

            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-xs text-neutral-600 font-light">
                <Check className="w-4 h-4 text-neutral-800 shrink-0" />
                Full access forever
              </li>
              <li className="flex items-center gap-3 text-xs text-neutral-600 font-light">
                <Check className="w-4 h-4 text-neutral-800 shrink-0" />
                500 AI queries/month
              </li>
              <li className="flex items-center gap-3 text-xs text-neutral-600 font-light text-purple-600">
                <Crown className="w-4 h-4 text-purple-600 shrink-0" />
                Diamond Founding Badge
              </li>
              <li className="flex items-center gap-3 text-xs text-neutral-600 font-light">
                <Check className="w-4 h-4 text-neutral-800 shrink-0" />
                Lifetime updates & premium support
              </li>
            </ul>
          </div>

          <div className="mt-12">
            <button
              onClick={() => handleSelectPlan("lifetime")}
              disabled={isLoading || currentPlan === "lifetime"}
              className={cn(
                "w-full py-3.5 rounded-xl border font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5",
                currentPlan === "lifetime"
                  ? "bg-neutral-50 border-neutral-200 text-neutral-400 cursor-not-allowed"
                  : "bg-white border-neutral-200 hover:border-neutral-400 text-neutral-800"
              )}
            >
              {isLoading ? (
                "Loading..."
              ) : currentPlan === "lifetime" ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-neutral-400" />
                  Current Plan
                </>
              ) : (
                "Own It (Lifetime)"
              )}
            </button>
          </div>
        </motion.div>

      </div>

      {/* FEATURE COMPARISON TABLE */}
      <section className="relative z-10 w-full max-w-5xl mt-36 px-6">
        <div className="text-center mb-16">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400 mb-3">
            Specs comparison
          </h2>
          <p className="text-2xl md:text-4xl font-light text-neutral-900 tracking-tight">
            Detailed Feature Comparison
          </p>
        </div>

        <div className="border border-neutral-200/80 rounded-2xl bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="p-4 font-semibold text-neutral-800 w-1/3">Feature</th>
                  <th className="p-4 font-semibold text-neutral-800">Monthly</th>
                  <th className="p-4 font-semibold text-neutral-800 bg-neutral-100/30">Annual (Best)</th>
                  <th className="p-4 font-semibold text-neutral-800">Lifetime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {COMPARISON_FEATURES.map((item, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="p-4">
                      <div>
                        <p className="font-semibold text-neutral-800">{item.name}</p>
                        <p className="text-[10px] text-neutral-400 font-light">{item.category}</p>
                      </div>
                    </td>
                    <td className="p-4 text-neutral-500">{item.monthly}</td>
                    <td className="p-4 text-neutral-900 font-medium bg-neutral-100/10">{item.annual}</td>
                    <td className="p-4 text-neutral-500">{item.lifetime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* PRICING FAQs */}
      <section className="relative z-10 w-full max-w-3xl mt-36 px-6">
        <div className="text-center mb-16 space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
            Billing details
          </h2>
          <p className="text-2xl md:text-4xl font-light text-neutral-900 tracking-tight">
            Pricing FAQs
          </p>
        </div>

        <div className="space-y-4">
          {PRICING_FAQS.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div 
                key={idx} 
                className="rounded-xl border border-neutral-200 bg-white overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left focus:outline-none"
                >
                  <span className="font-semibold text-xs md:text-sm text-neutral-800">
                    {faq.q}
                  </span>
                  <div className="w-5 h-5 rounded-full bg-neutral-50 flex items-center justify-center border border-neutral-100">
                    {isOpen ? (
                      <Minus className="w-3 h-3 text-neutral-500" />
                    ) : (
                      <Plus className="w-3 h-3 text-neutral-500" />
                    )}
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="overflow-hidden border-t border-neutral-100"
                    >
                      <div className="px-6 py-4 text-xs md:text-sm text-neutral-500 font-light leading-relaxed bg-neutral-50/50">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* CLOSING PRICING CTA */}
      <section className="relative z-10 w-full max-w-5xl mt-36 mb-20 px-6">
        <div className="rounded-[40px] border border-neutral-200 bg-neutral-50/60 p-8 md:p-16 text-center space-y-6 shadow-sm overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(240,240,240,0.5),_transparent_70%)] pointer-events-none" />
          
          <h2 className="text-3xl md:text-5xl font-light text-neutral-900 tracking-tight">
            Start saving hours of email today.
          </h2>
          <p className="text-neutral-500 font-light text-xs md:text-sm max-w-md mx-auto">
            Authorized via secure Google OAuth. All emails require your manual click-approval before sending.
          </p>

          <div className="pt-4">
            <button
              onClick={() => handleSelectPlan("annual")}
              className="px-8 py-3.5 rounded-full bg-neutral-950 text-white font-semibold text-xs transition-transform duration-300 hover:scale-[1.02] shadow-md inline-flex items-center gap-1.5"
            >
              Get started with annual plan
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
