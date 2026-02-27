'use client';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import Link from 'next/link';
import { motion, HTMLMotionProps } from 'framer-motion';

interface Plan {
	name: string;
	info: string;
	price: {
		monthly: number;
		yearly: number;
	};
	features: {
		text: string;
		tooltip?: string;
	}[];
	btn: {
		text: string;
		href: string;
	};
	highlighted?: boolean;
}

interface PricingSectionProps extends Omit<HTMLMotionProps<'div'>, 'plans'> {
	plans: Plan[];
	heading: string;
	description?: string;
}

export function PricingSection({
	plans,
	heading,
	description,
	...props
}: PricingSectionProps) {
	return (
		<motion.div
			className={cn(
				'flex w-full flex-col items-center justify-center py-20 px-6',
				props.className,
			)}
			{...props}
		>
			<div className="max-w-4xl mx-auto mb-32 text-center space-y-8">
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					className="inline-block border border-white/10 px-4 py-1.5 text-[9px] uppercase tracking-[0.4em] font-mono text-zinc-500"
				>
					Pricing / Access
				</motion.div>
				<h2 className="text-4xl md:text-7xl font-medium tracking-tighter">
					{heading}
				</h2>
				{description && (
					<p className="text-zinc-500 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-light">
						{description}
					</p>
				)}
			</div>

			<div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-px bg-white/5">
				{plans.map((plan) => (
					<PricingCard plan={plan} key={plan.name} isHighlighted={plan.highlighted} />
				))}
			</div>
		</motion.div>
	);
}

type PricingCardProps = Omit<HTMLMotionProps<'div'>, 'plan'> & {
	plan: Plan;
	isHighlighted?: boolean;
	onPlanSelect?: () => void;
};

export function PricingCard({
	plan,
	className,
	isHighlighted = false,
	...props
}: PricingCardProps) {
	return (
		<motion.div
			initial={{ opacity: 0 }}
			whileInView={{ opacity: 1 }}
			viewport={{ once: true }}
			className={cn(
				'relative flex w-full flex-col md:flex-row items-center justify-between p-12 bg-black hover:bg-zinc-950 transition-colors group',
				className,
			)}
			{...props}
		>
			<div className="flex flex-col md:flex-row items-center gap-12 md:gap-24 flex-1">
				<div className="space-y-4 text-center md:text-left min-w-[200px]">
					<div className="flex items-center justify-center md:justify-start gap-4">
						<h3 className="text-[12px] font-mono uppercase tracking-[0.4em] text-white">
							{plan.name}
						</h3>
						{plan.highlighted && (
							<span className="text-[8px] font-mono uppercase tracking-[0.4em] text-zinc-500 border border-white/10 px-2 py-0.5">Recommended</span>
						)}
					</div>
					<div className="flex items-baseline justify-center md:justify-start gap-2">
						<span className="text-4xl font-medium tracking-tighter text-white">
							${plan.price.monthly}
						</span>
						<span className="text-[9px] font-mono uppercase tracking-[0.4em] text-zinc-600">
							/mo
						</span>
					</div>
				</div>

				<div className="hidden lg:grid grid-cols-2 gap-x-12 gap-y-4 flex-1">
					{plan.features.map((feature, index) => (
						<div key={index} className="flex items-center gap-3">
							<div className="w-1 h-1 bg-zinc-800" />
							<span className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500 group-hover:text-zinc-400 transition-colors">
								{feature.text}
							</span>
						</div>
					))}
				</div>
			</div>

			<div className="mt-12 md:mt-0 min-w-[200px]">
				<Link
					href={plan.btn.href}
					className={cn(
						"flex items-center justify-center px-10 py-5 text-[10px] font-mono uppercase tracking-[0.4em] transition-all",
						isHighlighted
							? "bg-white text-black hover:bg-zinc-200"
							: "border border-white/10 text-white hover:bg-white/5"
					)}
				>
					{plan.btn.text}
				</Link>
			</div>
		</motion.div>
	);
}
