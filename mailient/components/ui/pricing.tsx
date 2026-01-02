'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { CheckCircleIcon, StarIcon } from 'lucide-react';
import Link from 'next/link';
import { motion, Transition } from 'framer-motion';

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

interface PricingSectionProps extends React.ComponentProps<'div'> {
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
		<div
			className={cn(
				'flex w-full flex-col items-center justify-center space-y-5 p-4',
				props.className,
			)}
			{...props}
		>
			<div className="mx-auto max-w-3xl space-y-4 mb-6" style={{ fontFamily: 'Satoshi, sans-serif' }}>
				<h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
					{heading}
				</h2>
				{description && (
					<p className="text-gray-400 text-center text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
						{description}
					</p>
				)}
			</div>
			<div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
				{plans.map((plan) => (
					<PricingCard plan={plan} key={plan.name} isHighlighted={plan.highlighted} />
				))}
			</div>
		</div>
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

type PricingCardProps = React.ComponentProps<'div'> & {
	plan: Plan;
	isHighlighted?: boolean;
};

export function PricingCard({
	plan,
	className,
	isHighlighted = false,
	...props
}: PricingCardProps) {
	return (
		<div
			key={plan.name}
			className={cn(
				'relative flex w-full flex-col rounded-2xl border border-white/20 bg-[#1a1a1a] px-6 py-8 mt-8 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:z-10 hover:border-white/40',
				isHighlighted && 'md:scale-105 md:shadow-2xl md:z-10 hover:scale-110',
				className,
			)}
			{...props}
		>
			{plan.highlighted && (
				<BorderTrail
					style={{
						boxShadow:
							'0px 0px 60px 30px rgb(255 255 255 / 50%), 0 0 100px 60px rgb(0 0 0 / 50%), 0 0 140px 90px rgb(0 0 0 / 50%)',
					}}
					size={100}
				/>
			)}
			<div
				className={cn(
					'bg-transparent p-0 mb-6',
				)}
			>
				<div className="absolute top-2 right-2 z-10 flex items-center gap-2">
					{plan.highlighted && (
						<p className="bg-green-600 text-white flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs">
							<StarIcon className="h-3 w-3 fill-current" />
							Popular
						</p>
					)}
				</div>

				<div className="text-lg font-medium mb-2">{plan.name}</div>
				<h3 className="text-3xl font-bold mb-4 flex items-baseline gap-1">
					<span>
						{plan.price.monthly === 0 && plan.name === 'Enterprise'
							? "Let's Talk"
							: `$${plan.price.monthly}`}
					</span>
					{plan.name !== 'Free' && plan.name !== 'Enterprise' && (
						<span className="text-gray-500 text-lg">/month</span>
					)}
				</h3>
				<p className="text-gray-400 text-sm font-normal">{plan.info}</p>
			</div>
			<div
				className={cn(
					'text-white space-y-4 text-sm flex-1',
				)}
			>
				{plan.features.map((feature, index) => (
					<div key={index} className="flex items-center gap-2">
						<CheckCircleIcon className="text-foreground h-4 w-4" />
						<TooltipProvider>
							<Tooltip delayDuration={0}>
								<TooltipTrigger asChild>
									<p
										className={cn(
											feature.tooltip &&
												'cursor-pointer border-b border-dashed',
										)}
									>
										{feature.text}
									</p>
								</TooltipTrigger>
								{feature.tooltip && (
									<TooltipContent>
										<p>{feature.tooltip}</p>
									</TooltipContent>
								)}
							</Tooltip>
						</TooltipProvider>
					</div>
				))}
			</div>
			<div
				className={cn(
					'mt-auto w-full pt-6',
				)}
			>
				<Button
					className="w-full"
					variant={plan.highlighted ? 'default' : 'outline'}
					asChild
				>
					<Link href={plan.btn.href}>{plan.btn.text}</Link>
				</Button>
			</div>
		</div>
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
  const BASE_TRANSITION = {
    repeat: Infinity,
    duration: 5,
    ease: 'linear',
  };

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
          ...(transition ?? BASE_TRANSITION),
          delay: delay,
        }}
        onAnimationComplete={onAnimationComplete}
      />
    </div>
  );
}
