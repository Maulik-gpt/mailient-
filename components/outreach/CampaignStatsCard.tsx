'use client';

import { motion } from 'framer-motion';
import {
    Users, Mail, MousePointer, Reply, TrendingUp,
    BarChart3, Calendar, Clock, ArrowUp, ArrowDown
} from 'lucide-react';

interface CampaignStats {
    totalProspects: number;
    emailsSent: number;
    opened: number;
    clicked: number;
    replied: number;
    bounced: number;
}

interface CampaignStatsCardProps {
    stats: CampaignStats;
    campaignName?: string;
    startDate?: string;
    className?: string;
}

export function CampaignStatsCard({
    stats,
    campaignName = 'Campaign',
    startDate,
    className = ''
}: CampaignStatsCardProps) {
    const openRate = stats.emailsSent > 0
        ? ((stats.opened / stats.emailsSent) * 100).toFixed(1)
        : '0';

    const replyRate = stats.emailsSent > 0
        ? ((stats.replied / stats.emailsSent) * 100).toFixed(1)
        : '0';

    const metrics = [
        {
            label: 'Prospects',
            value: stats.totalProspects,
            icon: Users,
        },
        {
            label: 'Sent',
            value: stats.emailsSent,
            icon: Mail,
        },
        {
            label: 'Opened',
            value: stats.opened,
            rate: `${openRate}%`,
            icon: MousePointer,
            isGood: parseFloat(openRate) >= 30
        },
        {
            label: 'Replied',
            value: stats.replied,
            rate: `${replyRate}%`,
            icon: Reply,
            isGood: parseFloat(replyRate) >= 5
        }
    ];

    return (
        <div className={`bg-black rounded-2xl border border-white/10 overflow-hidden ${className}`}>
            {/* Header */}
            <div className="p-8 border-b border-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-black" />
                        </div>
                        <div>
                            <h3 className="text-lg font-normal text-white">{campaignName}</h3>
                            {startDate && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                    <Calendar className="w-3 h-3" />
                                    <span>Initiated {startDate}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 text-xs font-normal text-gray-400">
                        <div className={`w-1.5 h-1.5 rounded-full ${parseFloat(openRate) >= 30 ? 'bg-white' : 'bg-gray-600'}`} />
                        {parseFloat(openRate) >= 30 ? 'High Performance' : 'Active'}
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-4 gap-px bg-white/5">
                {metrics.map((metric, index) => (
                    <motion.div
                        key={metric.label}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-8 bg-black hover:bg-white/[0.02] transition-colors"
                    >
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-4 font-normal">{metric.label}</p>
                        <div className="flex items-end gap-2">
                            <p className="text-2xl font-normal text-white leading-none">{metric.value.toLocaleString()}</p>
                            {metric.rate && (
                                <span className="text-[10px] text-gray-500 pb-0.5">{metric.rate}</span>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Progress Bar */}
            <div className="p-8 border-t border-white/5">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] uppercase tracking-widest text-gray-500 font-normal">Delivery Progress</span>
                    <span className="text-xs font-normal text-white">
                        {stats.emailsSent} of {stats.totalProspects}
                    </span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{
                            width: `${stats.totalProspects > 0 ? (stats.emailsSent / stats.totalProspects) * 100 : 0}%`
                        }}
                        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full bg-white rounded-full opacity-80"
                    />
                </div>
            </div>

            {/* Conversion Funnel */}
            <div className="p-8 border-t border-white/5 bg-white/[0.01]">
                <h4 className="text-[10px] uppercase tracking-widest text-gray-500 font-normal mb-6">Conversion Funnel</h4>
                <div className="space-y-4">
                    {[
                        { label: 'Sent', value: stats.emailsSent, percent: 100 },
                        { label: 'Opened', value: stats.opened, percent: stats.emailsSent ? (stats.opened / stats.emailsSent) * 100 : 0 },
                        { label: 'Replied', value: stats.replied, percent: stats.emailsSent ? (stats.replied / stats.emailsSent) * 100 : 0 }
                    ].map((step, index) => (
                        <div key={step.label} className="space-y-2">
                            <div className="flex justify-between text-[10px] font-normal">
                                <span className="text-gray-400 uppercase tracking-wider">{step.label}</span>
                                <span className="text-white">{step.value.toLocaleString()} ({step.percent.toFixed(1)}%)</span>
                            </div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden relative">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${step.percent}%` }}
                                    transition={{ duration: 1, delay: 0.2 + index * 0.1 }}
                                    className="absolute inset-y-0 left-0 bg-white opacity-20"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default CampaignStatsCard;
