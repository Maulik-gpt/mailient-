"use client";

import React, { useEffect, useState } from "react";
import { Check, Lock, Crown, Sparkles, ArrowRight, ShieldCheck, HelpCircle, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import PricingSection3 from "@/components/ui/pricing-section-3";
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
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

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



      {/* Modular Pricing Component */}
      <PricingSection3 
        isLoading={isLoading} 
        currentPlan={currentPlan} 
        handleSelectPlan={handleSelectPlan} 
      />

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
                <th className="py-4 px-6">Subscription (Monthly)</th>
                <th className="py-4 px-6">Subscription (Annual)</th>
                <th className="py-4 px-6">Lifetime Founder</th>
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
      <Footer />
    </div>
  );
}
