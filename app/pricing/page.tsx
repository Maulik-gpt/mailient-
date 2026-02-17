"use client";

import React, { useEffect, useState } from 'react';
import { Check, Lock, Crown, Sparkles, ArrowRight, Loader2, Star, ShieldCheck, RefreshCw, MessageCircle, Zap, Shield, ChevronDown, Activity, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Polar checkout URLs (migrated from Whop)
const POLAR_CHECKOUT_URLS = {
	starter: 'https://buy.polar.sh/polar_cl_B9DSDJSz1EeVhR8rtLcVgn1vVvjvizMvp0yOs3IQOJW',
	pro: 'https://buy.polar.sh/polar_cl_B9DSDJSz1EeVhR8rtLcVgn1vVvjvizMvp0yOs3IQOJW'
};

// Helper function to get cookie value
const getCookie = (name: string): string | null => {
	const value = `; ${document.cookie}`;
	const parts = value.split(`; ${name}=`);
	if (parts.length === 2) {
		const cookieValue = parts.pop()?.split(';').shift();
		return cookieValue || null;
	}
	return null;
};

const PLANS = [
	{
		id: 'free',
		name: 'Free',
		price: 0,
		features: [
			'1 AI Draft per day',
			'1 Sift Analysis per day',
			'5 Arcus AI messages per day',
			'3 Email Summaries per day',
			'2 AI Notes per month',
			'Secure Google OAuth'
		],
		buttonText: 'Start Free',
		isPopular: false,
		checkoutUrl: '' // No checkout needed — it's free
	},
	{
		id: 'starter',
		name: 'Starter',
		price: 7.99,
		features: [
			'10 AI Drafts per day',
			'10 Sift Analyses per day',
			'20 Arcus AI messages per day',
			'30 Email Summaries per day',
			'50 AI Notes per month',
			'30 Scheduled Calls per month'
		],
		buttonText: 'Get Started with Starter',
		isPopular: true,
		checkoutUrl: POLAR_CHECKOUT_URLS.starter
	},
	{
		id: 'pro',
		name: 'Pro',
		price: 29.99,
		features: [
			'Everything in Starter',
			'Unlimited AI Drafts',
			'Unlimited Sift Analyses',
			'Unlimited Arcus AI messages',
			'Unlimited Email Summaries',
			'Priority Support'
		],
		buttonText: 'Level up with Pro',
		isPopular: false,
		checkoutUrl: POLAR_CHECKOUT_URLS.pro
	}
];

export default function PricingPage() {
	const { data: session } = useSession();
	const router = useRouter();
	const [currentPlan, setCurrentPlan] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [subscriptionEndsAt, setSubscriptionEndsAt] = useState<string | null>(null);

	useEffect(() => {
		document.title = 'Pricing / Mailient';
		fetchSubscriptionStatus();
	}, []);

	// SECURITY FIX: Clear any stale pending plan data on page load
	// Subscriptions are ONLY activated via Polar webhook after verified payment
	useEffect(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const paymentStatus = urlParams.get('payment');

		// Clear any pending plan data - no auto-activation allowed
		localStorage.removeItem('pending_plan');
		localStorage.removeItem('pending_plan_timestamp');

		if (paymentStatus === 'success') {
			// Just refresh subscription status from server - webhook should have activated it
			console.log('📡 Payment success detected, refreshing subscription status from server...');
			fetchSubscriptionStatus();
			// Clean up URL
			window.history.replaceState({}, '', '/pricing');
		}
	}, []);

	const fetchSubscriptionStatus = async () => {
		try {
			const response = await fetch('/api/subscription/status');
			if (response.ok) {
				const data = await response.json();
				if (data.subscription?.hasActiveSubscription) {
					setCurrentPlan(data.subscription.planType);
					setSubscriptionEndsAt(data.subscription.subscriptionEndsAt);
				} else if (data.subscription?.planType === 'free') {
					// Free tier users don't have an active subscription record,
					// but we still want to show their current plan
					setCurrentPlan('free');
				} else {
					setCurrentPlan(null);
				}
			}
		} catch (error) {
			console.error('Error fetching subscription status:', error);
		} finally {
			setIsLoading(false);
		}
	};

	// REMOVED: activateSubscription function was a security risk
	// Subscriptions are now ONLY activated via Whop webhook after verified payment

	const handleSelectPlan = async (planId: string, checkoutUrl: string) => {
		// Capture DataFast visitor ID before redirecting
		const datafastVisitorId = getCookie('datafast_visitor_id');

		// Store selected plan and visitor ID in localStorage for after payment return
		localStorage.setItem('pending_plan', planId);
		localStorage.setItem('pending_plan_timestamp', Date.now().toString());
		if (datafastVisitorId) {
			localStorage.setItem('datafast_visitor_id', datafastVisitorId);
		}

		// Store visitor ID in server cache for webhook retrieval
		if (datafastVisitorId && session?.user?.email) {
			try {
				await fetch('/api/datafast/visitor-id', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email: session.user.email,
						datafast_visitor_id: datafastVisitorId
					})
				});
			} catch (error) {
				console.error('Error storing visitor ID:', error);
			}
		}

		// Complete onboarding before redirecting (prevents onboarding loop)
		try {
			await fetch("/api/onboarding/complete", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: session?.user?.name?.toLowerCase().replace(/\s/g, '_') || 'user',
					plan: planId
				}),
			});
		} catch (error) {
			console.error('Error completing onboarding:', error);
		}

		// Build checkout URL with parameters
		const params = new URLSearchParams();
		if (session?.user?.email) {
			params.set('email', session.user.email);
		}
		if (datafastVisitorId) {
			params.set('datafast_visitor_id', datafastVisitorId);
		}

		// CRITICAL: Set redirect URL so users come back to our payment success page
		// This ensures proper subscription verification after payment
		const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://mailient.xyz';
		params.set('redirect_url', `${baseUrl}/payment-success`);

		window.location.href = `${checkoutUrl}?${params.toString()}`;
	};

	return (
		<div className="min-h-screen bg-[#000000] dark:bg-[#000000] text-white flex flex-col items-center justify-start overflow-y-auto overflow-x-hidden font-sans select-none relative pb-32">

			{/* Background Texture Overlay */}
			<div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
				style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }}></div>

			{/* Large Background Text - Centered and Visible */}
			<div className="absolute top-[2%] left-1/2 -translate-x-1/2 z-0 w-full text-center pointer-events-none select-none">
				<h1 className="text-[18vw] font-black text-[#fafafa]/[0.1] leading-none uppercase tracking-tighter filter blur-[1px]">
					Pricing
				</h1>
			</div>

			{/* Hero Content */}
			<div className="relative z-10 text-center mb-12 mt-32 px-6">
				<motion.div
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					className="flex flex-col items-center gap-4"
				>
					<Badge className="bg-white/10 text-white/80 border-white/20 px-6 py-2 backdrop-blur-md">
						Simple, Transparent Pricing
					</Badge>
					<h2 className="text-4xl md:text-6xl font-black tracking-tighter text-white mt-4">
						Reclaim your focus.
					</h2>
					<p className="text-neutral-500 max-w-lg mx-auto text-lg md:text-xl font-medium mb-4">
						Choose the plan that fits your workflow. Automate the noise, extract the signal.
					</p>
					<p className="text-[10px] sm:text-xs text-white/20 italic max-w-md mx-auto">
						All email sending actions require you to draft and approve each message — Mailient does not send emails automatically without your approval.
					</p>
				</motion.div>
			</div>

			{/* Current Plan Indicator */}
			{currentPlan && (
				<motion.div
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					className="relative z-20 mb-8 px-6 py-3 bg-gradient-to-r from-white/5 to-white/10 border border-white/10 rounded-full backdrop-blur-xl"
				>
					<div className="flex items-center gap-3">
						<Crown className="w-5 h-5 text-yellow-400" />
						<span className="text-sm text-white/80">
							Current Plan: <span className="text-white font-semibold">{currentPlan === 'pro' ? 'Pro' : currentPlan === 'starter' ? 'Starter' : 'Free'}</span>
						</span>
						{subscriptionEndsAt && (
							<span className="text-xs text-white/50 ml-2">
								Renews: {new Date(subscriptionEndsAt).toLocaleDateString()}
							</span>
						)}
					</div>
				</motion.div>
			)}

			{/* Cards Container */}
			<div className="relative z-10 w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6 px-6 mt-8 group">
				{PLANS.map((plan, idx) => (
					<PricingCard
						key={idx}
						plan={plan}
						index={idx}
						currentPlan={currentPlan}
						isLoading={isLoading}
						onSelect={() => {
							if (plan.id === 'free') {
								router.push('/auth/signin');
							} else {
								handleSelectPlan(plan.id, plan.checkoutUrl);
							}
						}}
					/>
				))}
			</div>

			<p className="relative z-10 text-[10px] text-white/20 italic mt-12 px-6 text-center max-w-2xl">
				Compliance Note: All email sending actions require you to draft and approve each message — Mailient does not send emails automatically without your approval.
			</p>

			{/* Back to Dashboard */}
			{currentPlan && (
				<motion.button
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.5 }}
					onClick={() => router.push('/home-feed')}
					className="relative z-20 mt-12 px-6 py-3 text-sm text-white/50 hover:text-white/80 transition-colors flex items-center gap-2"
				>
					<ArrowRight className="w-4 h-4 rotate-180" />
					Back to Dashboard
				</motion.button>
			)}

			{/* Guarantee Bar */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true }}
				className="relative z-10 w-full max-w-5xl grid grid-cols-1 sm:grid-cols-3 gap-6 px-6 mt-20 mb-20"
			>
				<div className="flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-white/[0.02] border border-white/5">
					<ShieldCheck className="w-5 h-5 text-green-500" />
					<span className="text-xs font-bold uppercase tracking-wider text-white/60">Secure OAuth 2.0</span>
				</div>
				<div className="flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-white/[0.02] border border-white/5">
					<RefreshCw className="w-5 h-5 text-blue-500" />
					<span className="text-xs font-bold uppercase tracking-wider text-white/60">Cancel Anytime</span>
				</div>
				<div className="flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-white/[0.02] border border-white/5">
					<Lock className="w-5 h-5 text-purple-500" />
					<span className="text-xs font-bold uppercase tracking-wider text-white/60">Zero Data Storage</span>
				</div>
			</motion.div>

			{/* Social Proof / Trust Section */}
			<section className="relative z-10 w-full max-w-6xl px-6 py-20 border-t border-white/5">
				<div className="text-center mb-16">
					<h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">Trusted by modern teams</h2>
					<p className="text-neutral-500 max-w-2xl mx-auto">Join founders, sales teams, and busy professionals who have reclaimed their time with Mailient.</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
					<SecurityCard
						icon={<Activity className="w-6 h-6 text-zinc-100" />}
						title="SOC 2 Readiness"
						desc="We follow industry best practices for data security and privacy compliance."
					/>
					<SecurityCard
						icon={<Globe className="w-6 h-6 text-zinc-100" />}
						title="GDPR Compliant"
						desc="Your data is your own. We process it according to strict European privacy standards."
					/>
					<SecurityCard
						icon={<Shield className="w-6 h-6 text-zinc-100" />}
						title="Encrypted Intelligence"
						desc="All AI processing happens over secure, encrypted tunnels with no training on your data."
					/>
				</div>
			</section>

			{/* FAQ Section */}
			<section className="relative z-10 w-full max-w-4xl px-6 py-20">
				<div className="text-center mb-16">
					<Badge className="mb-4 bg-white/5 text-white/70 border-white/10 px-4 py-1">Common Questions</Badge>
					<h2 className="text-3xl md:text-4xl font-black tracking-tight">Got questions? We've got answers.</h2>
				</div>

				<div className="space-y-4">
					<FAQItem
						question="How secure is my Gmail data?"
						answer="Mailient uses standard Google OAuth 2.0 to access your emails. We never see your password, and we only process data in memory to provide AI insights. We don't store your sensitive email content on our servers permanently."
					/>
					<FAQItem
						question="Can I cancel my subscription anytime?"
						answer="Yes, absolutely. You can cancel your subscription at any time through your account settings or the payment provider dashboard. You will continue to have access to your plan until the end of your current billing period."
					/>
					<FAQItem
						question="Does Mailient train its AI on my personal emails?"
						answer="Never. We use enterprise-grade AI models that guarantee no customer data is used for training. Your business logic and personal communications remain private and exclusive to you."
					/>
					<FAQItem
						question="What's the difference between Free, Starter, and Pro?"
						answer="Free gives you a daily taste of Mailient's AI to build trust. Starter is great for solopreneurs managing a moderate volume of email with 10x the AI capacity. Pro is designed for power users who need unlimited AI drafting, advanced relationship tracking, and priority processing speeds."
					/>
				</div>
			</section>

			{/* Product Hunt / Social Footer Badge */}
			<div className="relative z-10 mt-20 mb-20 flex flex-col items-center gap-6">
				<p className="text-xs font-bold text-neutral-600 uppercase tracking-[0.3em]">Featured on</p>
				<div className="flex flex-wrap justify-center gap-8 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
					<img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1059008&theme=dark" alt="Product Hunt" className="h-10" />
					<div className="flex items-center gap-2 font-black text-xl tracking-tighter text-white">
						<Star className="w-6 h-6 fill-white text-white" />
						FoundrList
					</div>
				</div>
			</div>

			<style jsx global>{`
        @font-face {
          font-family: 'Satoshi';
          src: url('https://api.fontshare.com/v2/css?f[]=satoshi@900,100,700,500,300,400&display=swap');
        }
        body {
          font-family: 'Satoshi', sans-serif;
          background: #000;
        }
      `}</style>
		</div>
	);
}

interface PricingCardProps {
	plan: typeof PLANS[0];
	index: number;
	currentPlan: string | null;
	isLoading: boolean;
	onSelect: () => void;
}

function PricingCard({ plan, index, currentPlan, isLoading, onSelect }: PricingCardProps) {
	const isCurrentPlan = currentPlan === plan.id;
	// Current plan should be locked, other plan should be available
	const isUpgrade = currentPlan === 'starter' && plan.id === 'pro';
	const isSwitch = currentPlan === 'pro' && plan.id === 'starter';

	return (
		<motion.div
			initial={{ opacity: 0, y: 40 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: index * 0.1, duration: 1, ease: [0.23, 1, 0.32, 1] }}
			className={cn(
				"relative rounded-[2.5rem] flex flex-col transition-all duration-700 min-h-[580px] group/card",
				plan.id === 'pro'
					? "bg-white border-white shadow-[0_0_80px_rgba(255,255,255,0.15)]"
					: plan.id === 'free'
						? "bg-gradient-to-br from-neutral-900/40 to-black border-white/5 shadow-inner"
						: plan.isPopular
							? "bg-black border-white/20 shadow-[0_0_40px_rgba(255,255,255,0.05)]"
							: "bg-black border-white/10",
				isCurrentPlan && "ring-2 ring-green-500/50 border-green-500/30"
			)}
		>
			{/* High-Contrast Grain Texture */}
			<div className={cn(
				"absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-150",
				plan.id === 'pro' && "invert"
			)}></div>

			{/* Current Plan Badge - Active in Green */}
			{isCurrentPlan && (
				<div className="absolute -top-3 left-1/2 -translate-x-1/2 px-6 py-1 bg-green-500 text-black text-[10px] font-black rounded-full uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(34,197,94,0.3)] z-20">
					ACTIVE PLAN
				</div>
			)}

			{/* Popular Badge - Only show if not current plan */}
			{plan.isPopular && !isCurrentPlan && (
				<div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-black text-white text-[10px] font-black rounded-full uppercase tracking-[0.2em] flex items-center gap-1 shadow-xl z-20">
					<Star className="w-3 h-3 fill-white" />
					Most Popular
				</div>
			)}

			<div className="relative p-8 pt-10">
				<p className={cn(
					"text-xs font-semibold mb-6 tracking-[0.15em] uppercase",
					plan.id === 'pro' ? "text-black/50" : "text-neutral-500"
				)}>
					{plan.name}
				</p>

				<div className="flex items-baseline gap-1">
					<span className={cn(
						"text-4xl font-black tracking-tighter",
						plan.id === 'pro' ? "text-black" : "text-white"
					)}>
						{plan.price === 0 ? 'Free' : `$${plan.price}`}
					</span>
					<span className={cn(
						"text-sm font-normal tracking-tight opacity-50",
						plan.id === 'pro' ? "text-black/30" : "text-white/30"
					)}>{plan.price === 0 ? 'forever' : '/month'}</span>
				</div>
			</div>

			{/* Divider */}
			<div className={cn(
				"h-px w-full",
				plan.id === 'pro' ? "bg-black/5" : "bg-white/5"
			)}></div>

			{/* Features */}
			<div className="flex-1 p-8 pt-10 space-y-4">
				{plan.features.map((feature: string) => (
					<div key={feature} className="flex items-start gap-4 group/feat">
						<div className={cn(
							"mt-0.5 w-4 h-4 rounded-full flex items-center justify-center transition-all",
							plan.id === 'pro' ? "bg-black/5 border border-black/10" : "bg-neutral-900 border border-white/5"
						)}>
							<Check className={cn(
								"w-2 h-2",
								plan.id === 'pro' ? "text-black" : plan.id === 'free' ? "text-white/40" : "text-white"
							)} strokeWidth={4} />
						</div>
						<p className={cn(
							"text-[13px] font-normal leading-relaxed transition-colors",
							plan.id === 'pro' ? "text-black/70 group-hover/feat:text-black" : plan.id === 'free' ? "text-neutral-500 group-hover/feat:text-neutral-400" : "text-neutral-500 group-hover/feat:text-neutral-300"
						)}>
							{feature}
						</p>
					</div>
				))}
			</div>

			{/* Button */}
			<div className="p-8 pt-0">
				{isLoading ? (
					<div className={cn(
						"w-full py-4 rounded-2xl flex items-center justify-center",
						plan.id === 'pro' ? "bg-black/5" : "bg-neutral-800/50"
					)}>
						<Loader2 className={cn(
							"w-5 h-5 animate-spin",
							plan.id === 'pro' ? "text-black/50" : "text-neutral-400"
						)} />
					</div>
				) : isCurrentPlan ? (
					// Current plan - show original button text but locked
					<div
						className={cn(
							"w-full py-4 rounded-2xl font-black text-[12px] tracking-[0.2em] uppercase flex items-center justify-center gap-2 border cursor-not-allowed group/locked",
							plan.id === 'pro' ? "bg-green-500/10 text-green-600 border-green-500/30" : "bg-green-500/10 text-green-500 border-green-500/30"
						)}
					>
						<Lock className="w-4 h-4 transition-transform group-hover/locked:scale-110" />
						Current Plan
					</div>
				) : (
					// No current plan OR upgrade/switch - show button
					<button
						onClick={onSelect}
						className={cn(
							"w-full py-4 rounded-2xl font-black text-[12px] tracking-[0.2em] uppercase transition-all duration-500 relative overflow-hidden shadow-xl hover:scale-[1.02] active:scale-[0.98]",
							plan.id === 'pro'
								? "bg-black text-white hover:bg-zinc-900"
								: plan.id === 'free'
									? "bg-white/5 text-white hover:bg-white/10 border border-white/10 backdrop-blur-sm"
									: "bg-white text-black hover:bg-neutral-200"
						)}
					>
						{isUpgrade ? "Upgrade to Pro" : isSwitch ? "Switch to Starter" : plan.buttonText}
					</button>
				)}
			</div>

			{/* Inner Shadow / Glow Effect */}
			<div className="absolute inset-px rounded-[2rem] border border-white/5 pointer-events-none"></div>

			{/* Dynamic Hover Glow */}
			<div className="absolute -bottom-20 -left-20 w-40 h-40 bg-white/[0.03] rounded-full blur-[80px] opacity-0 group-hover/card:opacity-100 transition-opacity duration-1000"></div>
		</motion.div>
	);
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
	return (
		<span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", className)}>
			{children}
		</span>
	);
}

function SecurityCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
	return (
		<div className="group p-8 rounded-[2rem] border border-white/5 bg-white/[0.02] backdrop-blur-sm hover:border-white/10 transition-colors">
			<div className="mb-6 p-4 bg-white/5 rounded-2xl w-fit group-hover:scale-110 transition-transform">
				{icon}
			</div>
			<h3 className="text-xl font-bold mb-3">{title}</h3>
			<p className="text-zinc-500 text-sm leading-relaxed">{desc}</p>
		</div>
	);
}

function FAQItem({ question, answer }: { question: string, answer: string }) {
	const [isOpen, setIsOpen] = useState(false);
	return (
		<div
			className={cn(
				"border rounded-2xl transition-all duration-300",
				isOpen ? 'bg-white/[0.03] border-white/10' : 'bg-transparent border-white/5 hover:border-white/10'
			)}
		>
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="w-full p-6 text-left flex items-center justify-between group"
			>
				<span className={cn("text-lg font-bold transition-colors", isOpen ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200')}>
					{question}
				</span>
				<div className={cn("p-1 rounded-full transition-colors", isOpen ? 'bg-white/10' : 'bg-transparent')}>
					<ChevronDown className={cn("w-5 h-5 text-zinc-500 transition-transform duration-500", isOpen && "rotate-180 text-white")} />
				</div>
			</button>
			<AnimatePresence initial={false}>
				{isOpen && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.3, ease: "easeInOut" }}
					>
						<div className="px-6 pb-6 text-neutral-500 text-base leading-relaxed">
							{answer}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
