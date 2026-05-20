"use client";

import React, { useEffect, useState } from "react";
import { Check, Lock, Crown, Sparkles, ArrowRight, ShieldCheck, HelpCircle, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import AnimatedGradient from "@/components/ui/animated-gradient";
import { BlurFade } from "@/components/ui/blur-fade";


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
    <div className="min-h-screen bg-[#030303] text-white flex flex-col items-center justify-start overflow-x-hidden font-satoshi relative pb-32">
      {/* Top Navbar */}
      <Navbar theme="dark" />

      {/* Global Background Grid & Noise */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `radial-gradient(circle, #fff 1px, transparent 1px)`,
            backgroundSize: "24px 24px"
          }}
        />
        <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-neutral-900/10 blur-[130px]" />
      </div>

      <AnimatedGradient 
        config={{ preset: "Prism", speed: 8 }} 
        noise={{ opacity: 0.01 }} 
        className="opacity-20 pointer-events-none"
      />

      {/* Header */}
      <div className="relative z-10 text-center mb-10 mt-36 px-6 max-w-3xl space-y-4">
        <BlurFade delay={0.05} duration={0.8} yOffset={10} inView>
          <div className="inline-block px-3.5 py-1 bg-white/[0.02] border border-white/[0.06] rounded-full text-[10px] font-medium tracking-widest uppercase text-neutral-300 mb-4 shadow-2xl">
            <span className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-neutral-300" />
              Pricing Plans
            </span>
          </div>
        </BlurFade>
        
        <BlurFade delay={0.15} duration={0.8} yOffset={15} inView>
          <h1 className="text-4xl md:text-7xl font-light tracking-[-0.04em] text-white leading-tight">
            One subscription. <span className="font-medium italic text-neutral-350">Absolute access.</span>
          </h1>
        </BlurFade>

        <BlurFade delay={0.28} duration={0.8} yOffset={12} inView>
          <p className="text-neutral-400 text-sm md:text-base max-w-xl mx-auto font-light leading-relaxed tracking-tight">
            Scale your email output autonomously with a flat, predictable subscription designed for high-performance institutions.
          </p>
        </BlurFade>
      </div>

      {/* 3-Way Pricing Toggle (Monthly / Annual / Lifetime) */}
      <div className="relative z-10 flex items-center bg-white/[0.02] p-1.5 rounded-full mb-16 border border-white/[0.06] shadow-2xl font-semibold text-xs text-neutral-400">
        <button
          onClick={() => setSelectedToggle("monthly")}
          className={cn(
            "px-6 py-2.5 rounded-full transition-all duration-300 relative",
            selectedToggle === "monthly" ? "text-white" : "text-neutral-400 hover:text-white"
          )}
        >
          {selectedToggle === "monthly" && (
            <motion.div
              layoutId="pricing-toggle-pill"
              className="absolute inset-0 bg-white/[0.04] rounded-full shadow-inner border border-white/[0.08]"
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
            />
          )}
          <span className="relative z-10">Monthly</span>
        </button>

        <button
          onClick={() => setSelectedToggle("annual")}
          className={cn(
            "px-6 py-2.5 rounded-full transition-all duration-300 relative flex items-center gap-1.5",
            selectedToggle === "annual" ? "text-white font-bold" : "text-neutral-400 hover:text-white"
          )}
        >
          {selectedToggle === "annual" && (
            <motion.div
              layoutId="pricing-toggle-pill"
              className="absolute inset-0 bg-white/[0.04] rounded-full shadow-inner border border-white/[0.08]"
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1">
            Annual
            <span className="px-1.5 py-0.5 bg-white text-[8px] font-black uppercase text-[#030303] rounded">
              Best Value
            </span>
          </span>
        </button>

        <button
          onClick={() => setSelectedToggle("lifetime")}
          className={cn(
            "px-6 py-2.5 rounded-full transition-all duration-300 relative",
            selectedToggle === "lifetime" ? "text-white" : "text-neutral-400 hover:text-white"
          )}
        >
          {selectedToggle === "lifetime" && (
            <motion.div
              layoutId="pricing-toggle-pill"
              className="absolute inset-0 bg-white/[0.04] rounded-full shadow-inner border border-white/[0.08]"
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
            borderColor: selectedToggle === "monthly" ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.04)"
          }}
          className={cn(
            "relative rounded-[32px] p-8 flex flex-col justify-between transition-all duration-500 bg-white/[0.01] border backdrop-blur-2xl shadow-2xl overflow-hidden",
            selectedToggle === "monthly" ? "ring-1 ring-white/[0.12]" : ""
          )}
        >
          <div>
            <div className="flex items-center justify-between mb-8">
              <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">Monthly Tier</span>
            </div>
            
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className="text-5xl font-light text-white">$29</span>
              <span className="text-neutral-400 font-light text-sm">/month</span>
            </div>
            <p className="text-xs text-neutral-450 font-light mb-8">
              For solo builders looking for autonomous triage. Cancel anytime.
            </p>

            <hr className="border-white/[0.06] my-6" />

            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-xs text-neutral-300 font-light">
                <Check className="w-4 h-4 text-neutral-300 shrink-0" />
                Full access to Sift
              </li>
              <li className="flex items-center gap-3 text-xs text-neutral-300 font-light">
                <Check className="w-4 h-4 text-neutral-300 shrink-0" />
                Unlimited projects
              </li>
              <li className="flex items-center gap-3 text-xs text-neutral-300 font-light">
                <Check className="w-4 h-4 text-neutral-300 shrink-0" />
                Cancel anytime
              </li>
              <li className="flex items-center gap-3 text-xs text-neutral-300 font-light">
                <Check className="w-4 h-4 text-neutral-300 shrink-0" />
                AI workflow automation
              </li>
            </ul>
          </div>

          <div className="mt-12">
            <button
              onClick={() => handleSelectPlan("monthly")}
              disabled={isLoading || currentPlan === "pro"}
              className={cn(
                "w-full py-3.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5",
                currentPlan === "pro"
                  ? "bg-white/5 border border-white/10 text-neutral-400 cursor-not-allowed"
                  : "bg-white/[0.02] border border-white/[0.08] text-white hover:bg-white/[0.06] backdrop-blur-md transition-all duration-300 shadow-inner hover:scale-[1.01] hover:shadow-[0_0_30px_rgba(255,255,255,0.02)]"
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
            borderColor: selectedToggle === "annual" ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.05)"
          }}
          className={cn(
            "relative rounded-[36px] p-8 md:p-10 flex flex-col justify-between transition-all duration-500 bg-[#070707] border text-white shadow-2xl overflow-hidden group",
            selectedToggle === "annual" ? "ring-2 ring-white/[0.12]" : ""
          )}
        >
          {/* Subtle moving light glow in background */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.06),_transparent_60%)] pointer-events-none" />

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
              <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">Best Value Tier</span>
              <span className="px-2 py-0.5 rounded bg-white text-black text-[8px] font-black uppercase tracking-wider">
                Recommended
              </span>
            </div>

            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-6xl font-light text-white">$16.58</span>
              <span className="text-neutral-400 font-light text-sm">/month</span>
            </div>
            <p className="text-[10px] font-semibold text-neutral-450 mb-6">
              billed annually at $199/year (Save 40%)
            </p>
            <p className="text-xs text-neutral-400 font-light mb-8">
              Full enterprise scale: Sift Triage, Draft Replies, and priority Arcus Access.
            </p>

            <hr className="border-white/[0.08] my-6" />

            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-xs text-neutral-200 font-light">
                <Check className="w-4 h-4 text-neutral-200 shrink-0" />
                Advanced Relational Sift
              </li>
              <li className="flex items-center gap-3 text-xs text-neutral-200 font-light">
                <Check className="w-4 h-4 text-neutral-200 shrink-0" />
                Draft Replies in your voice
              </li>
              <li className="flex items-center gap-3 text-xs text-neutral-200 font-light">
                <Check className="w-4 h-4 text-neutral-200 shrink-0" />
                Cal.com & Notion Sync integrations
              </li>
              <li className="flex items-center gap-3 text-xs text-neutral-200 font-light">
                <Check className="w-4 h-4 text-neutral-200 shrink-0" />
                Gold Founding Badge
              </li>
              <li className="flex items-center gap-3 text-xs text-neutral-200 font-light">
                <Check className="w-4 h-4 text-neutral-200 shrink-0" />
                Priority Support & Updates
              </li>
            </ul>
          </div>

          <div className="mt-12">
            <button
              onClick={() => handleSelectPlan("annual")}
              disabled={isLoading || currentPlan === "starter"}
              className={cn(
                "w-full py-3.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5 border",
                currentPlan === "starter"
                  ? "bg-white/5 border-white/10 text-neutral-400 cursor-not-allowed"
                  : "bg-white text-black hover:bg-white/95 border-white/20 transition-all duration-300 shadow-inner hover:scale-[1.01] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
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
                  <ArrowRight className="w-4 h-4 text-black" />
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* CARD 3: LIFETIME PLAN */}
        <motion.div
          animate={{
            scale: selectedToggle === "lifetime" ? 1.03 : 0.98,
            borderColor: selectedToggle === "lifetime" ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.04)"
          }}
          className={cn(
            "relative rounded-[32px] p-8 flex flex-col justify-between transition-all duration-500 bg-white/[0.01] border backdrop-blur-2xl shadow-2xl overflow-hidden",
            selectedToggle === "lifetime" ? "ring-1 ring-white/[0.12]" : ""
          )}
        >
          <div>
            <div className="flex items-center justify-between mb-8">
              <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">Founding Tier</span>
            </div>

            <div className="flex items-baseline gap-1.5 mb-2">
              <span className="text-5xl font-light text-white">$499</span>
              <span className="text-neutral-400 font-light text-sm">once</span>
            </div>
            <p className="text-xs text-neutral-450 font-light mb-8">
              Own Mailient forever. Full access, diamond founding status, 500 monthly queries.
            </p>

            <hr className="border-white/[0.06] my-6" />

            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-xs text-neutral-300 font-light">
                <Check className="w-4 h-4 text-neutral-300 shrink-0" />
                Full access forever
              </li>
              <li className="flex items-center gap-3 text-xs text-neutral-300 font-light">
                <Check className="w-4 h-4 text-neutral-300 shrink-0" />
                500 AI queries/month
              </li>
              <li className="flex items-center gap-3 text-xs text-neutral-300 font-light text-neutral-250">
                <Crown className="w-4 h-4 text-neutral-300 shrink-0" />
                Diamond Founding Badge
              </li>
              <li className="flex items-center gap-3 text-xs text-neutral-300 font-light">
                <Check className="w-4 h-4 text-neutral-300 shrink-0" />
                Lifetime updates & premium support
              </li>
            </ul>
          </div>

          <div className="mt-12">
            <button
              onClick={() => handleSelectPlan("lifetime")}
              disabled={isLoading || currentPlan === "lifetime"}
              className={cn(
                "w-full py-3.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5",
                currentPlan === "lifetime"
                  ? "bg-white/5 border border-white/10 text-neutral-400 cursor-not-allowed"
                  : "bg-white/[0.02] border border-white/[0.08] text-white hover:bg-white/[0.06] backdrop-blur-md transition-all duration-300 shadow-inner hover:scale-[1.01] hover:shadow-[0_0_30px_rgba(255,255,255,0.02)]"
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
        <div className="text-center mb-16 space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
            Specs comparison
          </h2>
          <p className="text-3xl md:text-5xl font-light text-white tracking-tight">
            Detailed Feature Comparison
          </p>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-white/[0.04] bg-[#070707] p-4 shadow-2xl">
          <table className="w-full border-collapse text-left text-xs font-sans font-light">
            <thead>
              <tr className="border-b border-white/[0.06] text-neutral-450 uppercase font-bold tracking-widest text-[9px]">
                <th className="py-4 px-6">Feature</th>
                <th className="py-4 px-6">Monthly Plan</th>
                <th className="py-4 px-6">Annual Plan</th>
                <th className="py-4 px-6">Lifetime Plan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {COMPARISON_FEATURES.map((feat, idx) => (
                <tr 
                  key={idx} 
                  className="hover:bg-white/[0.01] transition-colors"
                >
                  <td className="py-4 px-6 font-medium text-white">{feat.name}</td>
                  <td className="py-4 px-6 text-neutral-400">{feat.monthly}</td>
                  <td className="py-4 px-6 text-neutral-200 font-semibold">{feat.annual}</td>
                  <td className="py-4 px-6 text-neutral-400">{feat.lifetime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="relative z-10 w-full max-w-4xl mt-36 px-6">
        <div className="text-center mb-20 space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
            System Inquiries
          </h2>
          <p className="text-3xl md:text-5xl font-light tracking-[-0.04em] text-white">
            Frequently Asked Questions
          </p>
        </div>

        <div className="space-y-4">
          {PRICING_FAQS.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div 
                key={idx} 
                className="rounded-[24px] border border-white/[0.04] bg-[#070707] overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full px-7 py-6 flex items-center justify-between text-left focus:outline-none"
                >
                  <span className="font-semibold text-xs md:text-sm text-white">
                    {faq.q}
                  </span>
                  <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center border border-white/10 flex-shrink-0">
                    {isOpen ? (
                      <Minus className="w-3.5 h-3.5 text-neutral-300" />
                    ) : (
                      <Plus className="w-3.5 h-3.5 text-neutral-300" />
                    )}
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden border-t border-white/[0.04]"
                    >
                      <div className="px-7 py-6 text-xs md:text-sm text-neutral-450 font-light leading-relaxed bg-white/[0.01]">
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

      {/* Footer */}
      <Footer theme="dark" />
    </div>
  );
}
