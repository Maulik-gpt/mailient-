"use client";

import React, { useEffect, useState } from 'react';
import { Check, Lock, Crown, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Whop checkout URLs
const WHOP_CHECKOUT_URLS = {
	starter: 'https://whop.com/checkout/plan_OXtDPFaYlmYWN',
	pro: 'https://whop.com/checkout/plan_HjjXVb5SWxdOK'
};

const PLANS = [
	{
		id: 'starter',
		name: 'Starter',
		price: 7.99,
		features: [
			'30 Draft Replies /month',
			'30 Schedule Calls /month',
			'20 AI-assisted Notes /month',
			'5 Sift AI Analysis /day',
			'10 Arcus AI interactions /day',
			'20 Email Summaries /day'
		],
		buttonText: 'Subscribe to Starter',
		isPopular: false,
		checkoutUrl: WHOP_CHECKOUT_URLS.starter
	},
	{
		id: 'pro',
		name: 'Pro',
		price: 29.99,
		features: [
			'Unlimited Draft Replies',
			'Unlimited Schedule Calls',
			'Unlimited AI-assisted Notes',
			'Unlimited Sift AI Analysis',
			'Unlimited Arcus AI interactions',
			'Unlimited Email Summaries',
			'Priority Support',
			'Early Access to New Features'
		],
		buttonText: 'Subscribe to Pro',
		isPopular: true,
		checkoutUrl: WHOP_CHECKOUT_URLS.pro
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
	// Subscriptions are ONLY activated via Whop webhook after verified payment
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
		// Store selected plan in localStorage for after payment return
		localStorage.setItem('pending_plan', planId);
		localStorage.setItem('pending_plan_timestamp', Date.now().toString());

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

		window.location.href = `${checkoutUrl}?${params.toString()}`;
	};

	return (
		<div className="min-h-screen bg-[#000000] dark:bg-[#000000] text-white flex flex-col items-center justify-center overflow-hidden font-sans select-none relative">

			{/* Background Texture Overlay */}
			<div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
				style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }}></div>

			{/* Large Background Text - Centered and Visible */}
			<div className="absolute top-[2%] left-1/2 -translate-x-1/2 z-0 w-full text-center pointer-events-none select-none">
				<h1 className="text-[18vw] font-black text-[#fafafa]/[0.15] leading-none uppercase tracking-tighter filter blur-[1px]">
					Pricing
				</h1>
				{/* Subtle blur bleed for the bottom of the text */}
				<div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-black to-transparent backdrop-blur-[2px]"></div>
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
							Current Plan: <span className="text-white font-semibold">{currentPlan === 'pro' ? 'Pro' : 'Starter'}</span>
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
			<div className="relative z-10 w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 px-6 mt-8 group">
				{PLANS.map((plan, idx) => (
					<PricingCard
						key={idx}
						plan={plan}
						index={idx}
						currentPlan={currentPlan}
						isLoading={isLoading}
						onSelect={() => handleSelectPlan(plan.id, plan.checkoutUrl)}
					/>
				))}
			</div>

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
				"relative rounded-[2.5rem] bg-white/[0.02] border border-white/5 flex flex-col transition-all duration-700 hover:border-white/20 backdrop-blur-[5px] min-h-[620px] group/card",
				plan.isPopular && "border-white/10 bg-white/[0.08] shadow-[0_0_80px_rgba(255,255,255,0.03)]",
				isCurrentPlan && "ring-2 ring-green-500/50 border-green-500/30"
			)}
		>
			{/* High-Contrast Grain Texture */}
			<div className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-150"></div>

			{/* Current Plan Badge - Active in Green */}
			{isCurrentPlan && (
				<div className="absolute -top-3 left-1/2 -translate-x-1/2 px-6 py-1 bg-green-500 text-black text-[10px] font-black rounded-full uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(34,197,94,0.3)]">
					ACTIVE PLAN
				</div>
			)}

			{/* Popular Badge - Only show if not current plan */}
			{plan.isPopular && !isCurrentPlan && (
				<div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-violet-500 to-purple-500 text-white text-[10px] font-black rounded-full uppercase tracking-[0.2em] flex items-center gap-1 shadow-[0_0_20px_rgba(139,92,246,0.3)]">
					<Sparkles className="w-3 h-3" />
					Most Popular
				</div>
			)}

			<div className="relative p-8 pt-10">
				<p className="text-neutral-500 text-xs font-semibold mb-6 tracking-[0.15em] uppercase">
					{plan.name}
				</p>

				<div className="flex items-baseline gap-1">
					<span className="text-4xl font-black text-white tracking-tighter">
						${plan.price}
					</span>
					<span className="text-white/20 text-sm font-medium">/month</span>
				</div>
			</div>

			{/* Divider */}
			<div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.05] to-transparent"></div>

			{/* Features */}
			<div className="flex-1 p-8 pt-10 space-y-4">
				{plan.features.map((feature: string) => (
					<div key={feature} className="flex items-start gap-4 group/feat">
						<div className="mt-0.5 w-5 h-5 rounded-full bg-neutral-900 border border-white/5 flex items-center justify-center transition-all group-hover/feat:border-white/40 group-hover/feat:bg-white/[0.05]">
							{plan.isPopular ? (
								<Sparkles className="w-2.5 h-2.5 text-purple-400" />
							) : (
								<Check className="w-2.5 h-2.5 text-neutral-400 group-hover/feat:text-white" strokeWidth={4} />
							)}
						</div>
						<p className="text-neutral-500 text-[13px] font-medium leading-relaxed group-hover/feat:text-neutral-300 transition-colors">
							{feature}
						</p>
					</div>
				))}
			</div>

			{/* Button */}
			<div className="p-8 pt-0">
				{isLoading ? (
					<div className="w-full py-4 rounded-2xl flex items-center justify-center bg-neutral-800/50">
						<Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
					</div>
				) : isCurrentPlan ? (
					// Current plan - show original button text but locked
					<div
						className="w-full py-4 rounded-2xl font-black text-[12px] tracking-[0.2em] uppercase flex items-center justify-center gap-2 bg-green-500/10 text-green-500 border border-green-500/30 cursor-not-allowed group/locked shadow-[0_0_20px_rgba(34,197,94,0.05)]"
					>
						<Lock className="w-4 h-4 transition-transform group-hover/locked:scale-110" />
						{plan.buttonText}
					</div>
				) : isUpgrade ? (
					// Starter user upgrading to Pro
					<button
						onClick={onSelect}
						className="w-full py-4 rounded-2xl font-black text-[12px] tracking-[0.2em] uppercase transition-all duration-500 relative overflow-hidden bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-xl shadow-purple-900/10 hover:shadow-purple-900/30 hover:scale-[1.02] active:scale-[0.98]"
					>
						<span className="flex items-center justify-center gap-2">
							<Crown className="w-4 h-4" />
							Upgrade to Pro
						</span>
					</button>
				) : isSwitch ? (
					// Pro user switching to Starter
					<button
						onClick={onSelect}
						className="w-full py-4 rounded-2xl font-black text-[12px] tracking-[0.2em] uppercase transition-all duration-500 relative overflow-hidden bg-white text-black hover:bg-neutral-200 shadow-xl shadow-white/5 hover:scale-[1.02] active:scale-[0.98]"
					>
						Switch to Starter
					</button>
				) : (
					// No current plan - show subscribe button
					<button
						onClick={onSelect}
						className={cn(
							"w-full py-4 rounded-2xl font-black text-[12px] tracking-[0.2em] uppercase transition-all duration-500 relative overflow-hidden shadow-xl hover:scale-[1.02] active:scale-[0.98]",
							plan.isPopular
								? "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-purple-900/10 hover:shadow-purple-900/30"
								: "bg-white text-black hover:bg-neutral-200 shadow-white/5"
						)}
					>
						{plan.buttonText}
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
