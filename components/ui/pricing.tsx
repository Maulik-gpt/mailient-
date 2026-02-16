'use client';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ArrowRight, Check, Star } from 'lucide-react';
import Link from 'next/link';
import { motion, Transition, HTMLMotionProps } from 'framer-motion';

type FREQUENCY = 'monthly' | 'yearly';
const frequencies: FREQUENCY[] = ['monthly', 'yearly'];

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
			<div className="max-w-4xl mx-auto mb-20 text-center">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] mb-8"
				>
					<Star className="h-3 w-3 text-white/60" />
					<span className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">Pricing</span>
				</motion.div>
				<h2 className="text-4xl md:text-7xl font-bold tracking-tight mb-8 bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
					{heading}
				</h2>
				{description && (
					<p className="text-zinc-500 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
						{description}
					</p>
				)}
			</div>

			<div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
				{plans.map((plan) => (
					<PricingCard plan={plan} key={plan.name} isHighlighted={plan.highlighted} />
				))}
			</div>
		</motion.div>
	);
}

type PricingFrequencyToggleProps = React.ComponentProps<'div'> & {
	frequency: FREQUENCY;
	setFrequency: React.Dispatch<React.SetStateAction<FREQUENCY>>;
};

export function PricingFrequencyToggle({
	frequency,
	setFrequency,
	...props
}: PricingFrequencyToggleProps) {
	return null; // Toggle removed entirely
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
			initial={{ opacity: 0, y: 20 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true }}
			className={cn(
				'relative flex w-full flex-col rounded-[2.5rem] border p-8 md:p-12 transition-all duration-500',
				isHighlighted
					? 'bg-white border-white shadow-[0_0_80px_-15px_rgba(255,255,255,0.1)]'
					: 'bg-black border-white/10',
				className,
			)}
			{...props}
		>
			<div className="mb-10">
				<div className="flex items-center justify-between mb-8">
					<span className={cn(
						'text-xl font-bold tracking-tight',
						isHighlighted ? 'text-black' : 'text-white'
					)}>
						{plan.name}
					</span>
					{plan.highlighted && (
						<div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black text-white text-[10px] font-black uppercase tracking-widest shadow-xl">
							<Star className="w-3 h-3 fill-white" />
							Popular
						</div>
					)}
				</div>

				<div className="flex items-baseline gap-1 mb-6">
					{plan.price.monthly === 0 ? (
						<>
							<span className={cn(
								'text-5xl md:text-6xl font-bold tracking-tight',
								isHighlighted ? 'text-black' : 'text-white'
							)}>
								Free
							</span>
							<span className={cn(
								'text-lg font-medium',
								isHighlighted ? 'text-black/50' : 'text-zinc-500'
							)}>
								forever
							</span>
						</>
					) : (
						<>
							<span className={cn(
								'text-5xl md:text-6xl font-bold tracking-tight',
								isHighlighted ? 'text-black' : 'text-white'
							)}>
								${plan.price.monthly}
							</span>
							<span className={cn(
								'text-lg font-medium',
								isHighlighted ? 'text-black/50' : 'text-zinc-500'
							)}>
								/month
							</span>
						</>
					)}
				</div>

				<p className={cn(
					'text-base leading-relaxed max-w-[280px]',
					isHighlighted ? 'text-black/60' : 'text-zinc-500'
				)}>
					{plan.info}
				</p>
			</div>

			<div className="mb-12">
				{props.onPlanSelect ? (
					<Button
						className={cn(
							'w-full h-14 rounded-2xl text-lg font-bold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]',
							isHighlighted
								? 'bg-black text-white hover:bg-zinc-900 border-none shadow-2xl'
								: 'bg-white text-black hover:bg-zinc-100'
						)}
						onClick={props.onPlanSelect}
					>
						<div className="flex items-center justify-center gap-2">
							{plan.btn.text}
							<ArrowRight className="w-5 h-5" />
						</div>
					</Button>
				) : (
					<Button
						className={cn(
							'w-full h-14 rounded-2xl text-lg font-bold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]',
							isHighlighted
								? 'bg-black text-white hover:bg-zinc-900 border-none shadow-2xl'
								: 'bg-white text-black hover:bg-zinc-100'
						)}
						asChild
					>
						<Link href={plan.btn.href} className="flex items-center justify-center gap-2">
							{plan.btn.text}
							<ArrowRight className="w-5 h-5" />
						</Link>
					</Button>
				)}
			</div>

			<div className="space-y-4 pt-8 border-t border-dashed border-zinc-500/20">
				{plan.features.map((feature, index) => (
					<div key={index} className="flex items-center gap-3">
						<Check className={cn(
							'w-5 h-5',
							isHighlighted ? 'text-black' : 'text-white'
						)} />
						<span className={cn(
							'text-sm font-medium',
							isHighlighted ? 'text-black/80' : 'text-white'
						)}>
							{feature.text}
						</span>
					</div>
				))}
			</div>
		</motion.div>
	);
}


type BorderTrailProps = {
	className?: string;
	size?: number;
	transition?: Transition;
	delay?: number;
	onAnimationComplete?: () => void;
	style?: React.CSSProperties;
};

export function BorderTrail({
	className,
	size = 60,
	transition,
	delay,
	onAnimationComplete,
	style,
}: BorderTrailProps) {
	return (
		<div className='pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]'>
			<motion.div
				className={cn('absolute aspect-square bg-zinc-500', className)}
				style={{
					width: size,
					offsetPath: `rect(0 auto auto 0 round ${size}px)`,
					...style,
				}}
				animate={{
					offsetDistance: ['0%', '100%'],
				}}
				transition={{
					repeat: Infinity,
					duration: 5,
					ease: "linear" as const,
					delay: delay,
					...transition
				} as Transition}
				onAnimationComplete={onAnimationComplete}
			/>
		</div>
	);
}
