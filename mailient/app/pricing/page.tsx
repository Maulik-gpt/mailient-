"use client";

import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const PLANS = [
	{
		name: 'Standard Plan',
		price: 7.99,
		features: [
			'Send up to 5 transfers per month',
			'Standard transaction history',
			'Email support',
			'Basic currency support',
			'Standard security features'
		],
		buttonText: 'Get Started',
		isPopular: false,
	},
	{
		name: 'Premium Plan',
		price: 29.99,
		features: [
			'Unlimited transfers',
			'Advanced transaction history',
			'Priority email support',
			'Expanded currency support',
			'Advanced security features'
		],
		buttonText: 'Get Started',
		isPopular: true,
	},
	{
		name: 'Enterprise Plan',
		price: 0,
		features: [
			'Unlimited priority transfers',
			'Comprehensive analytics',
			'24/7 dedicated support',
			'Full currency support',
			'Custom security protocols'
		],
		buttonText: 'Talk here',
		isPopular: false,
	},
];

export default function PricingPage() {
	const [isYearly, setIsYearly] = useState(false);

	useEffect(() => {
		document.title = 'Pricing / Mailient';
	}, []);

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

			{/* Cards Container */}
			<div className="relative z-10 w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6 px-6 mt-20 group">
				{PLANS.map((plan, idx) => (
					<PricingCard
						key={idx}
						plan={plan}
						isYearly={isYearly}
						index={idx}
					/>
				))}
			</div>

			{/* Billed Yearly Toggle - Centered */}
			<div className="relative z-20 mt-16 flex items-center gap-4 bg-neutral-900/30 backdrop-blur-2xl border border-white/10 p-2 px-4 rounded-full shadow-2xl transition-all hover:border-white/20">
				<label className="relative inline-flex items-center cursor-pointer">
					<input
						type="checkbox"
						className="sr-only peer"
						checked={isYearly}
						onChange={() => setIsYearly(!isYearly)}
					/>
					<div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white"></div>
				</label>
				<span className="text-sm font-medium text-neutral-400">Billed Yearly</span>
				{isYearly && (
					<span className="text-[10px] bg-white text-black px-2 py-0.5 rounded-full font-black uppercase tracking-widest shadow-lg">Save 20%</span>
				)}
			</div>

			<style jsx global>{`
        @font-face {
          font-family: 'Satoshi';
          src: url('https://api.fontshare.com/v2/css?f[]=satoshi@900,100,700,500,300,400&display=swap');
        }
        body {
          font-family: 'Satoshi', sans-serif;
          background: #000;
          overflow: hidden;
        }
      `}</style>
		</div>
	);
}

function PricingCard({ plan, isYearly, index }: { plan: any, isYearly: boolean, index: number }) {
	const price = isYearly ? Math.round(plan.price * 12 * 0.8) : plan.price;

	return (
		<motion.div
			initial={{ opacity: 0, y: 40 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: index * 0.1, duration: 1, ease: [0.23, 1, 0.32, 1] }}
			className={cn(
				"relative rounded-[2.5rem] bg-white/[0.02] border border-white/5 flex flex-col transition-all duration-700 hover:border-white/20 backdrop-blur-[5px] h-[520px] group/card",
				plan.isPopular && "border-white/10 bg-white/[0.08] shadow-[0_0_80px_rgba(255,255,255,0.03)]"
			)}
		>
			{/* High-Contrast Grain Texture */}
			<div className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-150"></div>

			<div className="relative p-8 pt-10">
				<p className="text-neutral-500 text-xs font-semibold mb-6 tracking-[0.15em] uppercase">
					{plan.name}
				</p>

				<div className="flex items-baseline gap-1">
					<span className="text-4xl font-black text-white tracking-tighter">
						{plan.name === 'Enterprise Plan' ? "Let's Talk" : `$${isYearly ? price : plan.price}`}
					</span>
					{plan.name !== 'Enterprise Plan' && (
						<span className="text-white/20 text-sm font-medium">/{isYearly ? 'yr' : 'm'}</span>
					)}
				</div>
			</div>

			{/* Divider */}
			<div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.05] to-transparent"></div>

			{/* Features */}
			<div className="flex-1 p-8 pt-10 space-y-4">
				{plan.features.map((feature: string) => (
					<div key={feature} className="flex items-start gap-4 group/feat">
						<div className="mt-0.5 w-5 h-5 rounded-full bg-neutral-900 border border-white/5 flex items-center justify-center transition-all group-hover/feat:border-white/40 group-hover/feat:bg-white/[0.05]">
							<Check className="w-2.5 h-2.5 text-neutral-400 group-hover/feat:text-white" strokeWidth={4} />
						</div>
						<p className="text-neutral-500 text-[13px] leading-relaxed group-hover/feat:text-neutral-300 transition-colors">
							{feature}
						</p>
					</div>
				))}
			</div>

			{/* Button */}
			<div className="p-8 pt-0">
				<button className={cn(
					"w-full py-3 rounded-full font-black text-[12px] tracking-[0.2em] uppercase transition-all duration-500 relative overflow-hidden",
					plan.isPopular
						? "bg-white text-black hover:bg-neutral-200"
						: "bg-black/40 text-white border border-white/10 hover:border-white/30 hover:bg-white/5"
				)}>
					{plan.buttonText}
				</button>
			</div>

			{/* Inner Shadow / Glow Effect */}
			<div className="absolute inset-px rounded-[2rem] border border-white/5 pointer-events-none"></div>

			{/* Dynamic Hover Glow */}
			<div className="absolute -bottom-20 -left-20 w-40 h-40 bg-white/[0.03] rounded-full blur-[80px] opacity-0 group-hover/card:opacity-100 transition-opacity duration-1000"></div>
		</motion.div>
	);
}