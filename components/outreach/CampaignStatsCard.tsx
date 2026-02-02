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

    const clickRate = stats.opened > 0
        ? ((stats.clicked / stats.opened) * 100).toFixed(1)
        : '0';

    const replyRate = stats.emailsSent > 0
        ? ((stats.replied / stats.emailsSent) * 100).toFixed(1)
        : '0';

    const bounceRate = stats.emailsSent > 0
        ? ((stats.bounced / stats.emailsSent) * 100).toFixed(1)
        : '0';

    const metrics = [
        {
            label: 'Total Prospects',
            value: stats.totalProspects,
            icon: Users,
            color: 'from-blue-500 to-cyan-500',
            bgColor: 'bg-blue-500/10'
        },
        {
            label: 'Emails Sent',
            value: stats.emailsSent,
            icon: Mail,
            color: 'from-purple-500 to-pink-500',
            bgColor: 'bg-purple-500/10'
        },
        {
            label: 'Opened',
            value: stats.opened,
            rate: `${openRate}%`,
            icon: MousePointer,
            color: 'from-green-500 to-emerald-500',
            bgColor: 'bg-green-500/10',
            isGood: parseFloat(openRate) >= 30
        },
        {
            label: 'Replied',
            value: stats.replied,
            rate: `${replyRate}%`,
            icon: Reply,
            color: 'from-amber-500 to-orange-500',
            bgColor: 'bg-amber-500/10',
            isGood: parseFloat(replyRate) >= 5
        }
    ];

    return (
        <div className={`bg-gradient-to-br from-[#0d0d14] to-[#0a0a0f] rounded-2xl border border-white/10 overflow-hidden ${className}`}>
            {/* Header */}
            <div className="p-5 border-b border-white/10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">{campaignName}</h3>
                            {startDate && (
                                <div className="flex items-center gap-1 text-sm text-gray-400">
                                    <Calendar className="w-3 h-3" />
                                    <span>Started {startDate}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Overall Performance Badge */}
                    <div className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 ${parseFloat(openRate) >= 30
                            ? 'bg-green-500/20 text-green-400'
                            : parseFloat(openRate) >= 20
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-red-500/20 text-red-400'
                        }`}>
                        <TrendingUp className="w-3.5 h-3.5" />
                        {parseFloat(openRate) >= 30 ? 'Excellent' : parseFloat(openRate) >= 20 ? 'Good' : 'Improving'}
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/5">
                {metrics.map((metric, index) => (
                    <motion.div
                        key={metric.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-5 bg-[#0a0a0f] hover:bg-white/5 transition-colors"
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                                <metric.icon className={`w-4 h-4 bg-gradient-to-r ${metric.color} bg-clip-text text-transparent`}
                                    style={{
                                        color: metric.color.includes('blue') ? '#3b82f6' :
                                            metric.color.includes('purple') ? '#a855f7' :
                                                metric.color.includes('green') ? '#22c55e' : '#f59e0b'
                                    }}
                                />
                            </div>
                            {metric.rate && (
                                <div className={`flex items-center gap-0.5 text-xs font-medium ${metric.isGood ? 'text-green-400' : 'text-gray-400'
                                    }`}>
                                    {metric.isGood ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                                    {metric.rate}
                                </div>
                            )}
                        </div>
                        <p className="text-2xl font-bold text-white mb-1">{metric.value.toLocaleString()}</p>
                        <p className="text-sm text-gray-400">{metric.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Progress Bar */}
            <div className="p-5 border-t border-white/10">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Sending Progress</span>
                    <span className="text-sm font-medium text-white">
                        {stats.emailsSent} / {stats.totalProspects}
                    </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{
                            width: `${stats.totalProspects > 0 ? (stats.emailsSent / stats.totalProspects) * 100 : 0}%`
                        }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                    />
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                </div>
            </div>

            {/* Funnel Visualization */}
            <div className="p-5 border-t border-white/10">
                <h4 className="text-sm font-medium text-gray-400 mb-4">Conversion Funnel</h4>
                <div className="space-y-2">
                    {[
                        { label: 'Sent', value: stats.emailsSent, percent: 100 },
                        { label: 'Opened', value: stats.opened, percent: stats.emailsSent ? (stats.opened / stats.emailsSent) * 100 : 0 },
                        { label: 'Clicked', value: stats.clicked, percent: stats.emailsSent ? (stats.clicked / stats.emailsSent) * 100 : 0 },
                        { label: 'Replied', value: stats.replied, percent: stats.emailsSent ? (stats.replied / stats.emailsSent) * 100 : 0 }
                    ].map((step, index) => (
                        <div key={step.label} className="flex items-center gap-3">
                            <span className="text-xs text-gray-400 w-16">{step.label}</span>
                            <div className="flex-1 h-6 bg-white/5 rounded-md overflow-hidden relative">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${step.percent}%` }}
                                    transition={{ duration: 0.8, delay: index * 0.15 }}
                                    className={`absolute inset-y-0 left-0 rounded-md ${index === 0 ? 'bg-blue-500/50' :
                                            index === 1 ? 'bg-purple-500/50' :
                                                index === 2 ? 'bg-green-500/50' : 'bg-amber-500/50'
                                        }`}
                                />
                                <div className="absolute inset-0 flex items-center justify-end pr-2">
                                    <span className="text-xs font-medium text-white">
                                        {step.value.toLocaleString()} ({step.percent.toFixed(1)}%)
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default CampaignStatsCard;
