"use client";

import React, { useEffect, useState } from 'react';
import { Check, Lock, Crown, Sparkles, ArrowRight, Loader2, Star, ShieldCheck, RefreshCw, ChevronDown, Activity, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const POLAR_CHECKOUT_URLS = {
	starter: 'https://buy.polar.sh/polar_cl_ojXGgACq5GNMsUInVP3HX5vpXepohT5P8m7SL2RcCej',
	pro: 'https://buy.polar.sh/polar_cl_BmoCj2jm6Hxy2Pc4DI6y717wsENNDAniGPfsB1pMO61'
};

const PLANS = [
	{
		id: 'free',
		name: 'Free',
		price: 0,
		description: 'Experience the power of Mailient AI — no credit card required',
		features: [
			'1 AI Draft per day',
			'1 Sift Analysis per day',
			'3 Email Summaries per day',
			'Secure Google OAuth',
			'Basic Relationship Tracking'
		],
		buttonText: 'Start Free',
		isPopular: false,
		checkoutUrl: ''
	},
	{
		id: 'starter',
		name: 'Starter',
		price: 7.99,
		description: 'For solopreneurs ready to automate their inbox at scale',
		features: [
			'10 AI Drafts per day',
			'10 Sift Analyses per day',
			'20 Arcus AI queries per day',
			'30 Email Summaries per day',
			'Standard Relationship Tracking'
		],
		buttonText: 'Get Started',
		isPopular: true,
		checkoutUrl: POLAR_CHECKOUT_URLS.starter
	},
	{
		id: 'pro',
		name: 'Pro',
		price: 29.99,
		description: 'Unlimited power for teams and power users who demand the best',
		features: [
			'Everything in Starter',
			'Unlimited AI Processing',
			'Advanced Relationship Tracking',
			'Custom Neural Voice',
			'Priority Support',
			'Unlimited Draft Replies'
		],
		buttonText: 'Go Pro',
		isPopular: false,
		checkoutUrl: POLAR_CHECKOUT_URLS.pro
	}
];

export default function PricingPage() {
	const { data: session } = useSession();
	const router = useRouter();
	const [currentPlan, setCurrentPlan] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		document.title = 'Pricing / Mailient';
		fetchSubscriptionStatus();
	}, []);

	const fetchSubscriptionStatus = async () => {
		try {
			const response = await fetch('/api/subscription/status');
			if (response.ok) {
				const data = await response.json();
				setCurrentPlan(data.subscription?.planType || 'free');
			}
		} catch (error) {
			console.error('Error fetching subscription status:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleSelectPlan = async (planId: string, checkoutUrl: string) => {
		if (planId === 'free') {
			router.push('/home-feed');
			return;
		}

		const params = new URLSearchParams();
		if (session?.user?.email) params.set('email', session.user.email);
		const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://mailient.xyz';
		params.set('redirect_url', `${baseUrl}/payment-success`);

		window.location.href = `${checkoutUrl}?${params.toString()}`;
	};

	return (
		<div className="min-h-screen bg-[#000000] text-white flex flex-col items-center justify-start overflow-y-auto overflow-x-hidden font-sans select-none relative pb-32">
			<div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
				style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }}></div>

			<div className="relative z-10 text-center mb-16 mt-24 px-6">
				<div className="inline-block px-4 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black tracking-widest uppercase text-white/40 mb-8">
					<span className="flex items-center gap-2">
						<Sparkles className="w-3 h-3" />
						Pricing
					</span>
				</div>
				<h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">Simple Price For All</h1>
				<p className="text-white/40 text-lg md:text-xl max-w-2xl mx-auto font-medium">Choose the layer of intelligence that matches your output velocity.</p>
			</div>

			<div className="relative z-10 w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6 px-6 group">
				{PLANS.map((plan, idx) => (
					<PricingCard 
						key={plan.id}
						plan={plan}
						index={idx}
						currentPlan={currentPlan}
						isLoading={isLoading}
						onSelect={() => handleSelectPlan(plan.id, plan.checkoutUrl)}
					/>
				))}
			</div>

            <p className="relative z-10 text-[10px] text-white/20 italic mt-16 px-6 text-center max-w-2xl">
                Compliance Note: All email sending actions require you to draft and approve each message — Mailient does not send emails automatically without your approval.
            </p>
		</div>
	);
}

function PricingCard({ plan, index, currentPlan, isLoading, onSelect }: any) {
	const isCurrent = currentPlan === plan.id;
	
	return (
		<motion.div
			initial={{ opacity: 0, y: 30 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: index * 0.1, duration: 0.6 }}
			className={cn(
				"relative rounded-[40px] p-8 flex flex-col transition-all duration-500 min-h-[560px] border overflow-hidden group",
				plan.id === 'starter' 
					? "bg-white text-black border-white shadow-[0_0_80px_rgba(255,255,255,0.1)] scale-105 z-20" 
					: "bg-[#0d0d0d] text-white border-white/5 hover:border-white/10"
			)}
		>
			{plan.isPopular && (
				<div className="absolute top-6 right-6 px-3 py-1.5 bg-black text-white text-[10px] font-black rounded-full uppercase tracking-widest flex items-center gap-2 shadow-2xl">
					<Star className="w-3 h-3 fill-white" />
					Popular
				</div>
			)}

			<div className="mb-10">
				<h3 className={cn(
					"text-sm font-bold uppercase tracking-[0.25em] mb-10",
					plan.id === 'starter' ? "text-black/40" : "text-white/30"
				)}>{plan.name}</h3>
				
				<div className="flex items-baseline gap-2">
					<span className="text-6xl font-black tracking-tighter">{plan.price === 0 ? 'Free' : `$${plan.price}`}</span>
					<span className={cn(
						"text-sm opacity-40 font-medium",
						plan.price === 0 ? "italic" : ""
					)}>{plan.price === 0 ? 'forever' : '/month'}</span>
				</div>
				<p className={cn(
					"mt-6 text-[14px] font-medium leading-relaxed opacity-60 max-w-[200px]",
					plan.id === 'starter' ? "text-black" : "text-white"
				)}>{plan.description}</p>
			</div>

			<div className="mb-12">
				<button 
					onClick={onSelect}
					disabled={isCurrent || isLoading}
					className={cn(
						"w-full py-4.5 py-4 rounded-[20px] font-black text-[12px] tracking-[0.25em] uppercase transition-all flex items-center justify-center gap-2 border glass-button group/btn",
						isCurrent 
							? (plan.id === 'starter' ? "bg-black/5 text-black/40 border-black/10" : "bg-white/5 text-white/30 border-white/10")
							: (plan.id === 'starter' ? "bg-[#fcfcfc] text-black border-black/5 shadow-[0_4px_15px_rgba(0,0,0,0.1)] hover:bg-neutral-100" : "bg-white/5 border border-white/10 hover:bg-white/10 text-white")
					)}
				>
					{isCurrent ? <Lock className="w-4 h-4" /> : null}
					{isCurrent ? "Current Plan" : plan.buttonText}
					{!isCurrent && <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover/btn:translate-x-1" />}
				</button>
			</div>

			<div className={cn(
				"h-[1px] w-full mb-10 border-t border-dashed",
				plan.id === 'starter' ? "border-black/10" : "border-white/10"
			)} />

			<div className="flex-1 space-y-5">
				{plan.features.map((feature: string) => (
					<div key={feature} className="flex items-start gap-4 group/feat">
						<div className={cn(
							"mt-0.5 w-5 h-5 rounded-full flex items-center justify-center transition-all",
							plan.id === 'starter' ? "bg-black/5 border border-black/10" : "bg-white/5 border border-white/10"
						)}>
							<Check className={cn(
								"w-3 h-3",
								plan.id === 'starter' ? "text-black" : "text-white"
							)} strokeWidth={4} />
						</div>
						<span className={cn(
							"text-[14px] font-medium transition-colors opacity-80",
							plan.id === 'starter' ? "text-black hover:opacity-100" : "text-white hover:opacity-100"
						)}>{feature}</span>
					</div>
				))}
			</div>

			{plan.id !== 'starter' && (
				<div className="absolute -bottom-20 -left-20 w-40 h-40 bg-white/[0.02] rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
			)}
		</motion.div>
	);
}
