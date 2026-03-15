"use client";

import React, { useState, useEffect } from 'react';
import { 
    Search, 
    ChevronDown, 
    BookOpen, 
    Sparkles, 
    Shield, 
    CreditCard, 
    MessageCircle, 
    ArrowLeft, 
    Zap, 
    ArrowRight,
    HelpCircle,
    User,
    Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';

// --- Types ---
interface FAQ {
    question: string;
    answer: string;
}

interface Category {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    faqs: FAQ[];
}

// --- Data ---
const HELP_CATEGORIES: Category[] = [
    {
        id: 'getting-started',
        title: 'Getting Started',
        description: 'Connect your Gmail, set up your profile, and start using AI.',
        icon: <BookOpen className="w-6 h-6 text-blue-400" />,
        faqs: [
            {
                question: "How do I connect my Gmail account?",
                answer: "Simply sign in with your Google account through our secure OAuth 2.0 flow. Mailient will request limited permissions to read your emails and provide AI-powered assistance."
            },
            {
                question: "Is Mailient secure and private?",
                answer: "Absolutely. We use enterprise-grade AI models that do NOT train on your data. Your email content is processed in memory and never stored permanently on our servers. We prioritize SOC 2 readiness and GDPR compliance."
            },
            {
                question: "Does Mailient send emails automatically?",
                answer: "Never. Mailient is an assistant, not a ghostwriter. It helps you draft, refine, and navigate your inbox, but you must manually approve and send any drafts it creates."
            }
        ]
    },
    {
        id: 'ai-features',
        title: 'AI Power Tools',
        description: 'Unlock the potential of Sift AI, Arcus AI, and Smart Nudges.',
        icon: <Sparkles className="w-6 h-6 text-amber-400" />,
        faqs: [
            {
                question: "What is Sift AI?",
                answer: "Sift AI analyzes your inbox to surface critical opportunities, urgent actions, and relationship insights. It \"sifts\" through the noise to find the high-signal emails that matter most to your business."
            },
            {
                question: "How does Arcus AI (Agent Talk) work?",
                answer: "Arcus is your dedicated email agent. You can chat with it about specific emails, ask for summaries, draft complex replies, or search your entire inbox using natural language."
            },
            {
                question: "What are Smart Nudges?",
                answer: "Smart Nudges use AI to detect which conversations are cooling off or where a follow-up is expected. It helps you maintain momentum with clients and investors automatically."
            }
        ]
    },
    {
        id: 'account-billing',
        title: 'Account & Billing',
        description: 'Manage your plan, subscription, and account preferences.',
        icon: <CreditCard className="w-6 h-6 text-purple-400" />,
        faqs: [
            {
                question: "What's the difference between Starter and Pro?",
                answer: "The Starter plan ($7.99) is perfect for individuals, providing a significant boost to your daily AI limits. The Pro plan ($29.99) is for power users, offering unlimited AI drafting, Sift analyses, and priority support."
            },
            {
                question: "Can I cancel my subscription?",
                answer: "Yes, you can cancel at any time from your account settings. You'll keep access to your plan's features until the end of your billing cycle."
            },
            {
                question: "How can I update my billing info?",
                answer: "All billing is handled securely via Polar.sh. You can manage your payment methods and download receipts through the billing portal linked in your settings."
            }
        ]
    },
    {
        id: 'support',
        title: 'Contact Support',
        description: 'Reach out to our team for technical help or feature requests.',
        icon: <MessageCircle className="w-6 h-6 text-green-400" />,
        faqs: [
            {
                question: "How do I report a bug?",
                answer: "The best way to report a bug is to reach out directly to millionairemaulik@gmail.com with a description of the issue and your account email."
            },
            {
                question: "Can I request new features?",
                answer: "We love hearing from our users! Please send feature requests or suggestions to our team via email. We're constantly building the future of email together."
            }
        ]
    }
];

// --- Components ---

function HelpCategoryCard({ category, isActive, onClick, index }: { 
    category: Category, 
    isActive: boolean, 
    onClick: () => void,
    index: number
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={onClick}
            className={cn(
                "group p-8 rounded-[2.5rem] border transition-all duration-500 cursor-pointer relative overflow-hidden",
                isActive 
                    ? "bg-white/10 border-white/20 shadow-[0_0_40px_rgba(255,255,255,0.05)]" 
                    : "bg-white/[0.02] border-white/5 hover:border-white/10"
            )}
        >
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
            
            <div className="mb-6 w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                {category.icon}
            </div>
            
            <h3 className="text-xl font-bold mb-2 text-white">{category.title}</h3>
            <p className={cn(
                "text-sm leading-relaxed transition-colors duration-500",
                isActive ? "text-white/70" : "text-neutral-500 group-hover:text-neutral-400"
            )}>
                {category.description}
            </p>
            
            {isActive && (
                <motion.div 
                    layoutId="active-indicator"
                    className="absolute bottom-6 right-8"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                >
                    <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                </motion.div>
            )}
        </motion.div>
    );
}

function FAQAccordion({ faq, index }: { faq: FAQ, index: number }) {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
                "border rounded-2xl transition-all duration-300 mb-4 overflow-hidden",
                isOpen ? 'bg-white/[0.03] border-white/10' : 'bg-transparent border-white/5 hover:border-white/10'
            )}
        >
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-6 text-left flex items-center justify-between group"
            >
                <span className={cn(
                    "text-lg font-bold transition-colors duration-300", 
                    isOpen ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-200'
                )}>
                    {faq.question}
                </span>
                <div className={cn(
                    "p-1 rounded-full transition-all duration-300", 
                    isOpen ? 'bg-white/10 rotate-180' : 'bg-transparent'
                )}>
                    <ChevronDown className={cn("w-5 h-5 transition-colors duration-300", isOpen ? "text-white" : "text-neutral-600")} />
                </div>
            </button>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                    >
                        <div className="px-6 pb-6 text-neutral-400 text-base leading-relaxed max-w-3xl">
                            {faq.answer}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default function HelpPage() {
    const router = useRouter();
    const { status } = useSession();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>(HELP_CATEGORIES[0].id);

    // Filter FAQs based on active category and search
    // (Search is very simple for now, can be expanded)
    const currentCategory = HELP_CATEGORIES.find(c => c.id === activeCategory);
    const filteredFaqs = currentCategory?.faqs.filter(faq => 
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    // All FAQs across all categories for global search
    const allFaqs = HELP_CATEGORIES.flatMap(c => c.faqs.map(f => ({ ...f, categoryId: c.id })));
    const searchResults = searchQuery 
        ? allFaqs.filter(f => f.question.toLowerCase().includes(searchQuery.toLowerCase()) || f.answer.toLowerCase().includes(searchQuery.toLowerCase()))
        : [];

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black pb-32">
            {/* Grain Texture Overflow Filter */}
            <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-150"></div>

            {/* Navigation Bar */}
            <nav className="relative z-50 w-full px-6 py-6 md:px-12 flex items-center justify-between backdrop-blur-md bg-black/50 border-b border-white/5">
                <button 
                    onClick={() => router.push('/home-feed')}
                    className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-bold uppercase tracking-widest">Dashboard</span>
                </button>
                
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-lg transform hover:rotate-12 transition-transform">
                        <img src="/mailient-logo-new.png" alt="M" className="w-5 h-5" />
                    </div>
                </div>

                <div className="w-24"></div> {/* Spacer for symmetry */}
            </nav>

            <div className="relative z-10 max-w-7xl mx-auto px-6">
                
                {/* Hero / Search Section */}
                <div className="pt-24 pb-16 text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/50 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
                            <HelpCircle className="w-3 h-3" />
                            Help Center
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 leading-tight">
                            Mailient Support
                        </h1>
                        <p className="text-neutral-500 max-w-xl mx-auto text-lg md:text-xl font-medium mb-12">
                            Everything you need to master your AI-powered inbox. Search for questions or browse by category.
                        </p>

                        {/* Search Bar */}
                        <div className="w-full max-w-2xl relative group">
                            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                                <Search className="w-5 h-5 text-neutral-500 group-focus-within:text-white transition-colors" />
                            </div>
                            <input 
                                type="text" 
                                placeholder="Search the help center..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-full py-6 pl-14 pr-8 text-lg font-medium outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all placeholder:text-neutral-600"
                            />
                        </div>
                    </motion.div>
                </div>

                {/* Main Content Grid */}
                {searchQuery && searchResults.length > 0 ? (
                    <div className="pt-8">
                        <div className="flex items-center justify-between mb-12">
                            <h2 className="text-2xl font-black tracking-tight">Search Results</h2>
                            <button onClick={() => setSearchQuery('')} className="text-sm text-neutral-500 hover:text-white">Clear search</button>
                        </div>
                        <div className="space-y-4">
                            {searchResults.map((faq, i) => (
                                <FAQAccordion key={i} faq={faq} index={i} />
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Categories List */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
                            {HELP_CATEGORIES.map((category, i) => (
                                <HelpCategoryCard 
                                    key={category.id} 
                                    category={category} 
                                    isActive={activeCategory === category.id}
                                    onClick={() => setActiveCategory(category.id)}
                                    index={i}
                                />
                            ))}
                        </div>

                        {/* Active Category FAQs */}
                        <div className="pt-8 border-t border-white/5">
                            <div className="mb-12">
                                <h2 className="text-3xl font-black tracking-tight mb-2">{currentCategory?.title}</h2>
                                <p className="text-neutral-500 font-medium">Common questions about {currentCategory?.title.toLowerCase()}.</p>
                            </div>
                            <div className="space-y-4">
                                {filteredFaqs.map((faq, i) => (
                                    <FAQAccordion key={i} faq={faq} index={i} />
                                ))}
                                {filteredFaqs.length === 0 && (
                                    <div className="text-center py-12 text-neutral-600 font-bold uppercase tracking-widest">
                                        No results found in this category
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* Bottom CTA Section */}
                <section className="mt-32 p-12 md:p-20 rounded-[3rem] bg-gradient-to-br from-neutral-900/40 to-black border border-white/5 relative overflow-hidden text-center">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none"></div>
                    
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mb-8">
                            <MessageCircle className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-6 leading-tight">
                            Still need help?
                        </h2>
                        <p className="text-neutral-500 max-w-xl mx-auto text-lg font-medium mb-12">
                            Can't find what you're looking for? Our team is always here to help you get the most out of Mailient.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-4">
                            <a 
                                href="mailto:millionairemaulik@gmail.com" 
                                className="px-10 py-5 bg-white text-black font-black text-xs uppercase tracking-[0.2em] rounded-2.5xl hover:bg-neutral-200 transition-all transform hover:scale-[1.03] active:scale-[0.98] shadow-2xl"
                            >
                                Contact Support
                            </a>
                            <button 
                                onClick={() => router.push('/pricing')}
                                className="px-10 py-5 bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2.5xl hover:bg-white/10 transition-all flex items-center gap-2 group"
                            >
                                Upgrade to Pro
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </section>

                {/* Footer Credits */}
                <footer className="mt-32 pt-12 border-t border-white/5 text-center text-neutral-600 text-[10px] font-black uppercase tracking-[0.3em]">
                    &copy; 2026 Mailient Intelligence &middot; Built for the modern workflow
                </footer>

            </div>
        </div>
    );
}
