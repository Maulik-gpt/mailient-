"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { motion, useScroll, useSpring, useTransform, useInView, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  ArrowUpRight,
  Mail,
  Zap,
  Fingerprint,
  ChevronRight,
  Lock,
  Cpu,
  Workflow,
  Sparkles,
  Globe,
  Plus,
  ArrowRight,
  Check,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PricingSection } from "@/components/ui/pricing";

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const containerRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const plans = [
    {
      name: "Starter",
      info: "Perfect for high-output individuals",
      price: { monthly: 0, yearly: 0 },
      features: [
        { text: "AI Sift Intelligence" },
        { text: "Priority Inbox" },
        { text: "Basic AI Drafts" },
        { text: "Secure Google OAuth" }
      ],
      btn: { text: "Get Started", href: "/auth/signin" }
    },
    {
      name: "Pro",
      info: "For teams and advanced founders",
      price: { monthly: 29, yearly: 290 },
      features: [
        { text: "Everything in Starter" },
        { text: "Unlimited AI Processing" },
        { text: "Advanced Relationship Tracking" },
        { text: "Custom Neural Voice" },
        { text: "Priority Support" }
      ],
      btn: { text: "Upgrade to Pro", href: "/pricing" },
      highlighted: true
    },
    {
      name: "Enterprise",
      info: "Custom solutions for organizations",
      price: { monthly: 0, yearly: 0 },
      features: [
        { text: "Everything in Pro" },
        { text: "Dedicated Infrastructure" },
        { text: "Custom API Integration" },
        { text: "White-glove Onboarding" }
      ],
      btn: { text: "Contact Sales", href: "/contact" }
    }
  ];

  return (
    <div ref={containerRef} className="min-h-screen bg-black text-white selection:bg-white selection:text-black font-['Satoshi'] overflow-x-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

        {/* Drifting Beams/Pills */}
        <AnimatedBeams />
      </div>

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/5 py-4' : 'bg-transparent py-8'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform">
              <Mail className="w-5 h-5 text-black" />
            </div>
            <span className="font-bold tracking-tighter text-xl">Mailient</span>
          </motion.div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#integration" className="hover:text-white transition-colors">Security</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-4">
            {status === "authenticated" ? (
              <Button onClick={() => router.push('/home-feed')} variant="secondary" className="rounded-full px-6">Dashboard</Button>
            ) : (
              <>
                <button onClick={() => signIn('google')} className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Sign In</button>
                <Button onClick={() => router.push('/auth/signin')} className="rounded-full px-6 bg-white text-black hover:bg-zinc-200">Get Started</Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-48 pb-32 px-6 flex flex-col items-center justify-center text-center overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Badge variant="outline" className="rounded-full py-1 px-4 mb-8 border-white/10 bg-white/5 text-zinc-400 backdrop-blur-sm">
            <Sparkles className="w-3 h-3 mr-2" />
            AI-Powered Email Automation
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-8xl font-black tracking-tight mb-8 max-w-5xl leading-[1.05]"
        >
          Turn your inbox into a <br />
          <span className="text-zinc-500">decision system.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-12 leading-relaxed"
        >
          High-performance email intelligence for founders. Sift through noise, extract revenue signals, and automate your replies with Arcus AI.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-4 mb-16"
        >
          <Button onClick={() => router.push('/auth/signin')} size="lg" className="rounded-full px-12 py-7 text-lg bg-white text-black hover:scale-105 transition-transform">
            Get Started Free
          </Button>
          <Button variant="outline" size="lg" className="rounded-full px-12 py-7 text-lg border-white/10 hover:bg-white/5 backdrop-blur-sm">
            Watch Demo
          </Button>
        </motion.div>

        {/* User Avatars Placeholder Like Reference */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="flex -space-x-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="w-10 h-10 rounded-full border-2 border-black bg-zinc-800" />
            ))}
          </div>
          <p className="text-sm text-zinc-500 font-medium">Joined by 1,000+ output-focused founders</p>
        </motion.div>
      </section>

      {/* Feature Section: Signal Extraction */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center mb-40">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Badge variant="outline" className="rounded-full mb-6 border-white/10 text-zinc-500">Signal Extraction</Badge>
              <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tighter">Sift noise from <span className="text-zinc-500 italic">pure signal.</span></h2>
              <p className="text-lg text-zinc-400 mb-10 leading-relaxed">
                Mailient's Aether Core scans every incoming thread for revenue markers, relationship priority, and urgent action items. It doesn't just read email—it understands your business logic.
              </p>
              <ul className="space-y-4 mb-10">
                <li className="flex items-start gap-4 text-zinc-400">
                  <div className="mt-1 p-1 bg-white/5 rounded-full"><Check className="w-3 h-3 text-white" /></div>
                  <p>Automatic categorization of high-value leads</p>
                </li>
                <li className="flex items-start gap-4 text-zinc-400">
                  <div className="mt-1 p-1 bg-white/5 rounded-full"><Check className="w-3 h-3 text-white" /></div>
                  <p>Sentiment-based relationship tracking</p>
                </li>
              </ul>
              <Button variant="link" className="text-white p-0 h-auto font-bold group">
                Learn more about Sift <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>

            <div className="relative aspect-video bg-zinc-950 rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Visual Mockup for Sift */}
                <div className="w-[80%] h-[60%] bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-32 h-2 bg-white/10 rounded-full" />
                    <Badge className="bg-white text-black text-[10px]">98% CONFIDENCE</Badge>
                  </div>
                  <div className="space-y-4">
                    <div className="w-full h-3 bg-white/5 rounded-full" />
                    <div className="w-4/5 h-3 bg-white/5 rounded-full" />
                    <div className="w-3/4 h-8 bg-white/10 rounded-xl" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center mb-40 lg:flex-row-reverse">
            <div className="order-2 lg:order-1 relative aspect-video bg-zinc-950 rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-bl from-white/5 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Visual Mockup for Drafts */}
                <div className="w-[70%] bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <MessageSquare className="w-5 h-5 text-white" />
                    <span className="text-sm font-bold tracking-widest uppercase">Neural Draft</span>
                  </div>
                  <div className="space-y-3 opacity-50">
                    <div className="w-full h-2 bg-white/10 rounded-full" />
                    <div className="w-full h-2 bg-white/10 rounded-full" />
                    <div className="w-2/3 h-2 bg-white/10 rounded-full" />
                  </div>
                  <div className="mt-8 pt-6 border-t border-white/5 flex gap-2">
                    <div className="h-8 w-20 bg-white rounded-lg" />
                    <div className="h-8 w-20 bg-zinc-800 rounded-lg" />
                  </div>
                </div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-1 lg:order-2"
            >
              <Badge variant="outline" className="rounded-full mb-6 border-white/10 text-zinc-500">Autonomous Replies</Badge>
              <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tighter">AI that sounds <br /><span className="text-zinc-500 italic">exactly like you.</span></h2>
              <p className="text-lg text-zinc-400 mb-10 leading-relaxed">
                Arcus AI learns your communication style, past context, and business goals to draft perfect replies. You maintain complete control while we eliminate the friction of starting from scratch.
              </p>
              <Button variant="link" className="text-white p-0 h-auto font-bold group">
                Discover Neural Drafting <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="integration" className="py-32 px-6 bg-zinc-950/30">
        <div className="max-w-4xl mx-auto text-center mb-24">
          <Badge variant="outline" className="rounded-full mb-6 border-white/10 text-zinc-500">Data Integrity</Badge>
          <h2 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter">Gmail Native Security.</h2>
          <p className="text-xl text-zinc-400 leading-relaxed italic">
            Mailient respects your privacy perimeter. We use enterprise Google OAuth 2.0 to process data in real-time without storing a single byte of your private content in shadow databases.
          </p>
        </div>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <SecurityCard
            icon={<ShieldCheck className="w-10 h-10" />}
            title="OAuth 2.0 Verified"
            desc="Authenticated directly through Google. We never see your password."
          />
          <SecurityCard
            icon={<Lock className="w-10 h-10" />}
            title="Volatile Processing"
            desc="Drafts are generated in isolated memory and purged after 24 hours."
          />
          <SecurityCard
            icon={<Globe className="w-10 h-10" />}
            title="Global Privacy"
            desc="GDPR compliant architecture by design. You own your intelligence."
          />
        </div>
      </section>

      {/* Founder Section */}
      <section className="py-32 px-6 border-y border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col items-center">
          <div className="relative mb-12">
            <div className="absolute inset-0 bg-white/10 blur-3xl rounded-full" />
            <div className="relative w-32 h-32 rounded-full border border-white/20 bg-black flex items-center justify-center overflow-hidden">
              <span className="text-4xl font-black italic">M</span>
            </div>
          </div>
          <h3 className="text-2xl font-black mb-2 uppercase tracking-widest">Maulik</h3>
          <p className="text-zinc-500 font-bold mb-8 text-sm uppercase tracking-[0.3em]">Neural Architect</p>
          <blockquote className="max-w-3xl text-center text-2xl md:text-4xl font-medium text-zinc-300 italic mb-12 leading-tight">
            "I built Mailient because the inbox is the last frontier of friction for founders. My goal is to transform email from a chore into a high-leverage asset."
          </blockquote>
          <Button variant="outline" className="rounded-full border-white/10 hover:bg-white/5" asChild>
            <a href="https://x.com/Maulik_055" target="_blank">Connect with the founder</a>
          </Button>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 bg-black">
        <PricingSection
          plans={plans}
          heading="Access the Signal."
          description="Choose the layer of intelligence that matches your output velocity."
          className="bg-transparent"
        />
      </section>

      {/* FAQ Section */}
      <section className="py-32 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-black mb-16 text-center tracking-tighter">Common Inquiries</h2>
          <div className="space-y-4">
            <FAQItem
              question="How is my data stored?"
              answer="We don't store your raw email content. Mailient processes metadata and content in real-time to generate insights and drafts, which are stored in encrypted form for your session only."
            />
            <FAQItem
              question="Does the AI really sound like me?"
              answer="Yes. Arcus AI analyzes your past sent emails (with your permission) to build a style profile that matches your tone, brevity, and formatting."
            />
            <FAQItem
              question="Can I cancel any time?"
              answer="Absolutely. You can disconnect your Google account and cancel your subscription in one click from the dashboard."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-black" />
                </div>
                <span className="font-bold tracking-tighter text-xl">Mailient</span>
              </div>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Redefining founder communication with autonomous email intelligence.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-white mb-6 uppercase text-xs tracking-widest">Product</h4>
              <ul className="space-y-4 text-sm text-zinc-500">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#integration" className="hover:text-white transition-colors">Security</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-6 uppercase text-xs tracking-widest">Company</h4>
              <ul className="space-y-4 text-sm text-zinc-500">
                <li><a href="/contact" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="https://x.com/Maulik_055" className="hover:text-white transition-colors">Twitter</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-6 uppercase text-xs tracking-widest">Legal</h4>
              <ul className="space-y-4 text-sm text-zinc-500">
                <li><a href="/privacy-policy" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="/terms-of-service" className="hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between pt-12 border-t border-white/5 gap-8">
            <p className="text-xs text-zinc-600">© 2026 Mailient Intelligence. Built for high-output founders.</p>
            <div className="flex items-center gap-6 grayscale opacity-30">
              <div className="flex items-center gap-2">
                <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Verified OAuth</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1 border border-zinc-500 rounded"><Lock className="w-2 h-2" /></div>
                <span className="text-[10px] font-bold uppercase tracking-widest">256-Bit Encrypted</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function AnimatedBeams() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute h-[1px] w-[500px] bg-gradient-to-r from-transparent via-white/10 to-transparent"
          style={{
            top: `${20 * i}%`,
            left: "-500px",
          }}
          animate={{
            left: "100%",
          }}
          transition={{
            duration: 10 + i * 5,
            repeat: Infinity,
            ease: "linear",
            delay: i * 2,
          }}
        />
      ))}
      <div className="absolute top-1/2 left-1/4 w-[200px] h-[400px] bg-blue-500/5 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-white/5 blur-[120px] rounded-full" />
    </div>
  );
}

function SecurityCard({ icon, title, desc }) {
  return (
    <div className="group p-8 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-sm hover:border-white/10 transition-colors">
      <div className="mb-6 p-4 bg-white/5 rounded-2xl w-fit group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-4">{title}</h3>
      <p className="text-zinc-500 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function FAQItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border border-white/5 rounded-2xl bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <span className="font-bold">{question}</span>
        <Plus className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-6 pb-6 text-zinc-500 text-sm leading-relaxed"
          >
            {answer}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
