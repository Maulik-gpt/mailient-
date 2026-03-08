"use client";

import React, { useEffect } from 'react';
import { PricingSection } from '@/components/ui/pricing';
import { HomeFeedSidebar } from '@/components/ui/home-feed-sidebar';

const PLANS = [
	{
		name: 'Starter',
		info: 'Perfect for individuals and small teams getting started',
		price: {
			monthly: 19,
			yearly: Math.round(19 * 12 * 0.8), // 20% discount
		},
		features: [
			{ text: 'Up to 1,000 emails processed per month' },
			{ text: 'AI-powered email categorization' },
			{ text: 'Basic analytics and insights' },
			{ text: 'Email priority scoring', tooltip: 'Automatically prioritize important emails' },
			{ text: 'Standard support' },
		],
		btn: {
			text: 'Get Started',
			href: '/signup?plan=starter',
		},
	},
	{
		highlighted: true,
		name: 'Professional',
		info: 'For growing teams that need advanced features',
		price: {
			monthly: 49,
			yearly: Math.round(49 * 12 * 0.8), // 20% discount
		},
		features: [
			{ text: 'Up to 10,000 emails processed per month' },
			{ text: 'Advanced AI email categorization' },
			{ text: 'Detailed analytics and reporting' },
			{ text: 'Smart email templates', tooltip: 'AI-generated response templates' },
			{ text: 'Team collaboration features' },
			{ text: 'Priority support', tooltip: '24/7 email and chat support' },
			{ text: 'Custom integrations' },
		],
		btn: {
			text: 'Start Free Trial',
			href: '/signup?plan=professional',
		},
	},
	{
		name: 'Enterprise',
		info: 'For large organizations with custom needs',
		price: {
			monthly: 0,
			yearly: 0,
		},
		features: [
			{ text: 'Unlimited email processing' },
			{ text: 'Custom AI model training' },
			{ text: 'Advanced analytics and BI integration' },
			{ text: 'Enterprise-grade security' },
			{ text: 'Dedicated account manager' },
			{ text: 'Custom development and integrations' },
			{ text: 'On-premise deployment options' },
		],
		btn: {
			text: "Contact Us",
			href: '/contact',
		},
	},
];

export default function PricingPage() {
	// Set page title
	useEffect(() => {
		document.title = 'Pricing / Mailient';
	}, []);

	return (
		<div className="min-h-screen bg-[#0a0a0a] flex" style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, sans-serif" }}>
			{/* Sidebar */}
			<HomeFeedSidebar />

			{/* Main Content */}
			<div className="flex-1 ml-16">
				<div className="container mx-auto px-4 py-16">
					<PricingSection
						plans={PLANS}
						heading="We've got a plan for you ;)"
						description="Choose the plan that's right for you. All plans include a 14-day free trial."
					/>
				</div>
			</div>
		</div>
	);
}