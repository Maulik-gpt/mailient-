"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    TrendingUp,
    AlertTriangle,
    Users,
    Clock,
    DollarSign,
    Target,
    Brain,
    Zap,
    Eye,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
    Activity,
    Network,
    Calendar,
    BarChart3,
    PieChart,
    Shield,
    Rocket,
    Star
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface EmailItem {
    id: string
    subject: string
    sender: string
    revenueScore: number
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
    opportunityType: 'revenue' | 'partnership' | 'risk' | 'network' | 'neutral'
    predictedOutcome: string
    timeSensitivity: number
    networkValue: number
}

// Mock data - in production this comes from Neural Context Engine
const mockEmails: EmailItem[] = [
    {
        id: "1",
        subject: "Enterprise deal - 50k annual contract",
        sender: "sarah@acme-corp.com",
        revenueScore: 95,
        riskLevel: "low",
        opportunityType: "revenue",
        predictedOutcome: "85% chance of closing, 2-week cycle",
        timeSensitivity: 90,
        networkValue: 85
    },
    {
        id: "2", 
        subject: "URGENT: Legal compliance issue",
        sender: "legal@tech-corp.com",
        revenueScore: 20,
        riskLevel: "critical",
        opportunityType: "risk",
        predictedOutcome: "Must respond in 24h to avoid penalty",
        timeSensitivity: 95,
        networkValue: 40
    },
    {
        id: "3",
        subject: "Introduction to YC founder network",
        sender: "investor@vc-fund.com",
        revenueScore: 75,
        riskLevel: "low",
        opportunityType: "network",
        predictedOutcome: "High-value network expansion opportunity",
        timeSensitivity: 60,
        networkValue: 95
    },
    {
        id: "4",
        subject: "Partnership with Fortune 500 company",
        sender: "partnerships@fortune500.com",
        revenueScore: 88,
        riskLevel: "medium",
        opportunityType: "partnership",
        predictedOutcome: "70% chance of strategic partnership",
        timeSensitivity: 75,
        networkValue: 90
    },
    {
        id: "5",
        subject: "Customer feedback - potential churn",
        sender: "customer@unhappy-client.com",
        revenueScore: 15,
        riskLevel: "high",
        opportunityType: "risk",
        predictedOutcome: "Immediate action required to retain $25k ARR",
        timeSensitivity: 85,
        networkValue: 30
    }
]

export function MatrixDashboard() {
    const [selectedView, setSelectedView] = useState<'heatmap' | 'risk' | 'network' | 'timeline'>('heatmap')
    const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week')
    const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null)

    // Calculate metrics
    const metrics = useMemo(() => {
        const totalRevenue = mockEmails.reduce((sum, email) => sum + email.revenueScore, 0)
        const highRisk = mockEmails.filter(email => email.riskLevel === 'critical' || email.riskLevel === 'high').length
        const networkValue = mockEmails.reduce((sum, email) => sum + email.networkValue, 0)
        const urgent = mockEmails.filter(email => email.timeSensitivity > 80).length

        return {
            totalRevenue: Math.round(totalRevenue / mockEmails.length),
            highRisk,
            networkValue: Math.round(networkValue / mockEmails.length),
            urgent
        }
    }, [])

    const getRevenueColor = (score: number) => {
        if (score >= 80) return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
        if (score >= 60) return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20"
        if (score >= 40) return "text-orange-500 bg-orange-500/10 border-orange-500/20"
        return "text-red-500 bg-red-500/10 border-red-500/20"
    }

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'critical': return "text-red-500 bg-red-500/10 border-red-500/20"
            case 'high': return "text-orange-500 bg-orange-500/10 border-orange-500/20"
            case 'medium': return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20"
            default: return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
        }
    }

    const getOpportunityIcon = (type: string) => {
        switch (type) {
            case 'revenue': return <DollarSign className="w-4 h-4" />
            case 'partnership': return <Users className="w-4 h-4" />
            case 'risk': return <AlertTriangle className="w-4 h-4" />
            case 'network': return <Network className="w-4 h-4" />
            default: return <Target className="w-4 h-4" />
        }
    }

    return (
        <div className="min-h-screen bg-black text-white p-6">
            {/* Header */}
            <div className="mb-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between mb-6"
                >
                    <div>
                        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                            The Matrix
                        </h1>
                        <p className="text-zinc-400">Founder's Operating System</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            <Activity className="w-4 h-4 text-emerald-500" />
                            <span className="text-emerald-500 font-medium">Live Intelligence</span>
                        </div>
                    </div>
                </motion.div>

                {/* View Selector */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="flex bg-zinc-900 rounded-xl p-1">
                        {(['heatmap', 'risk', 'network', 'timeline'] as const).map((view) => (
                            <button
                                key={view}
                                onClick={() => setSelectedView(view)}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                    selectedView === view
                                        ? 'bg-white text-black'
                                        : 'text-zinc-400 hover:text-white'
                                }`}
                            >
                                {view.charAt(0).toUpperCase() + view.slice(1)}
                            </button>
                        ))}
                    </div>
                    <div className="flex bg-zinc-900 rounded-xl p-1">
                        {(['day', 'week', 'month'] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                    timeRange === range
                                        ? 'bg-white text-black'
                                        : 'text-zinc-400 hover:text-white'
                                }`}
                            >
                                {range.charAt(0).toUpperCase() + range.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-2">
                                <DollarSign className="w-5 h-5 text-emerald-500" />
                                <span className="text-xs text-emerald-500 font-medium">+12%</span>
                            </div>
                            <div className="text-2xl font-bold mb-1">{metrics.totalRevenue}</div>
                            <div className="text-xs text-zinc-400">Revenue Score</div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-2">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                <span className="text-xs text-red-500 font-medium">Alert</span>
                            </div>
                            <div className="text-2xl font-bold mb-1">{metrics.highRisk}</div>
                            <div className="text-xs text-zinc-400">Risk Items</div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-2">
                                <Network className="w-5 h-5 text-blue-500" />
                                <span className="text-xs text-blue-500 font-medium">+8%</span>
                            </div>
                            <div className="text-2xl font-bold mb-1">{metrics.networkValue}</div>
                            <div className="text-xs text-zinc-400">Network Value</div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-2">
                                <Clock className="w-5 h-5 text-orange-500" />
                                <span className="text-xs text-orange-500 font-medium">Urgent</span>
                            </div>
                            <div className="text-2xl font-bold mb-1">{metrics.urgent}</div>
                            <div className="text-xs text-zinc-400">Time Sensitive</div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Email List */}
                <div className="lg:col-span-2">
                    <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Brain className="w-5 h-5 text-purple-500" />
                                Intelligence Feed
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="space-y-2">
                                {mockEmails.map((email, index) => (
                                    <motion.div
                                        key={email.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        onClick={() => setSelectedEmail(email)}
                                        className={`p-4 border cursor-pointer transition-all hover:bg-zinc-800/50 ${
                                            selectedEmail?.id === email.id ? 'bg-zinc-800/50 border-purple-500/50' : 'border-zinc-800'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    {getOpportunityIcon(email.opportunityType)}
                                                    <span className="font-medium">{email.subject}</span>
                                                </div>
                                                <div className="text-sm text-zinc-400">{email.sender}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className={`px-2 py-1 rounded-lg text-xs font-medium border ${getRevenueColor(email.revenueScore)}`}>
                                                    {email.revenueScore}
                                                </div>
                                                <div className={`px-2 py-1 rounded-lg text-xs font-medium border ${getRiskColor(email.riskLevel)}`}>
                                                    {email.riskLevel}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-sm text-zinc-400">{email.predictedOutcome}</div>
                                    </motion.div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Detail Panel */}
                <div>
                    <AnimatePresence mode="wait">
                        {selectedEmail ? (
                            <motion.div
                                key={selectedEmail.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <Card className="bg-zinc-900/50 border-zinc-800">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Eye className="w-5 h-5 text-blue-500" />
                                            Oracle Analysis
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div>
                                            <h4 className="font-medium mb-2">Revenue Prediction</h4>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-zinc-800 rounded-full h-2">
                                                    <div 
                                                        className="bg-emerald-500 h-2 rounded-full"
                                                        style={{ width: `${selectedEmail.revenueScore}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm font-medium">{selectedEmail.revenueScore}%</span>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-medium mb-2">Risk Assessment</h4>
                                            <div className={`px-3 py-2 rounded-lg text-sm font-medium border ${getRiskColor(selectedEmail.riskLevel)}`}>
                                                {selectedEmail.riskLevel.toUpperCase()} RISK
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-medium mb-2">Network Value</h4>
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4 text-blue-500" />
                                                <span>{selectedEmail.networkValue}/100</span>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-medium mb-2">Time Sensitivity</h4>
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-orange-500" />
                                                <span>{selectedEmail.timeSensitivity}% urgent</span>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-medium mb-2">Predicted Outcome</h4>
                                            <p className="text-sm text-zinc-400">{selectedEmail.predictedOutcome}</p>
                                        </div>

                                        <div className="flex gap-2">
                                            <button className="flex-1 bg-emerald-500 text-black px-4 py-2 rounded-lg font-medium hover:bg-emerald-400 transition-colors">
                                                Accept
                                            </button>
                                            <button className="flex-1 bg-zinc-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-zinc-700 transition-colors">
                                                Delegate
                                            </button>
                                            <button className="flex-1 bg-red-500/10 text-red-500 px-4 py-2 rounded-lg font-medium hover:bg-red-500/20 transition-colors">
                                                Decline
                                            </button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <Card className="bg-zinc-900/50 border-zinc-800">
                                    <CardContent className="p-8 text-center">
                                        <Brain className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                                        <p className="text-zinc-400">Select an email to see Oracle analysis</p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}
