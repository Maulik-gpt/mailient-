"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Brain,
    TrendingUp,
    TrendingDown,
    Target,
    Clock,
    DollarSign,
    Users,
    AlertTriangle,
    CheckCircle,
    XCircle,
    ArrowRight,
    Zap,
    Eye,
    Calculator,
    Activity,
    BarChart3,
    PieChart,
    Lightbulb,
    Shield,
    Rocket
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface SimulationScenario {
    id: string
    action: 'accept' | 'delegate' | 'decline' | 'negotiate'
    probability: number
    outcome: string
    value: number
    timeToResult: string
    confidence: number
    risks: string[]
    benefits: string[]
    alternatives: string[]
}

interface OracleAnalysis {
    emailId: string
    currentSituation: string
    scenarios: SimulationScenario[]
    recommendedAction: string
    reasoning: string
    marketContext: string
    competitorAnalysis: string
    networkEffects: string[]
    longTermImpact: string
}

// Mock Oracle analysis - in production this comes from Neural Context Engine
const mockOracleAnalysis: OracleAnalysis = {
    emailId: "1",
    currentSituation: "Enterprise client interested in 50k annual contract. Decision maker engaged, budget approved.",
    scenarios: [
        {
            id: "accept-immediate",
            action: "accept",
            probability: 85,
            outcome: "Close deal in 2 weeks, secure $50k ARR",
            value: 50000,
            timeToResult: "2 weeks",
            confidence: 85,
            risks: ["Resource allocation", "Timeline pressure"],
            benefits: ["Immediate revenue", "Reference client", "Upsell potential"],
            alternatives: ["Negotiate terms", "Phase rollout"]
        },
        {
            id: "delegate-sales",
            action: "delegate",
            probability: 75,
            outcome: "Sales team handles, 70% close rate",
            value: 35000,
            timeToResult: "3 weeks",
            confidence: 75,
            risks: ["Loss of personal touch", "Misalignment"],
            benefits: ["Time savings", "Scalable process"],
            alternatives: ["Co-selling", "Strategic partnership"]
        },
        {
            id: "negotiate-terms",
            action: "negotiate",
            probability: 90,
            outcome: "Better terms, 3-year commitment",
            value: 75000,
            timeToResult: "4 weeks",
            confidence: 90,
            risks: ["Deal complexity", "Extended timeline"],
            benefits: ["Higher value", "Long-term stability"],
            alternatives: ["Standard terms", "Volume discount"]
        },
        {
            id: "decline-opportunity",
            action: "decline",
            probability: 0,
            outcome: "No revenue, preserve resources",
            value: 0,
            timeToResult: "Immediate",
            confidence: 100,
            risks: ["Market perception", "Lost opportunity"],
            benefits: ["Resource availability", "Focus on higher-value deals"],
            alternatives: ["Refer to partner", "Future engagement"]
        }
    ],
    recommendedAction: "negotiate",
    reasoning: "High-value enterprise client with budget approval. Negotiating better terms could increase deal value by 50% with 90% success probability. Market conditions favor longer contracts.",
    marketContext: "Enterprise SaaS market growing 25% YoY. Budgets increasing for AI-powered tools. Competitive landscape fragmented.",
    competitorAnalysis: "3 main competitors: Competitor A (higher pricing), Competitor B (fewer features), Competitor C (poor support). Your positioning is strong.",
    networkEffects: ["Could lead to 2-3 similar enterprise deals", "Referral potential in industry network", "Partnership opportunities with ecosystem"],
    longTermImpact: "Establishes enterprise segment, increases average contract value by 300%, creates reference case for similar clients."
}

export function OracleMode({ emailId }: { emailId: string }) {
    const [selectedScenario, setSelectedScenario] = useState<SimulationScenario | null>(null)
    const [analysis, setAnalysis] = useState<OracleAnalysis | null>(null)
    const [isSimulating, setIsSimulating] = useState(false)

    useEffect(() => {
        // Simulate Oracle analysis
        setTimeout(() => {
            setAnalysis(mockOracleAnalysis)
            setSelectedScenario(mockOracleAnalysis.scenarios[2]) // Default to recommended
        }, 1000)
    }, [emailId])

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'accept': return <CheckCircle className="w-4 h-4 text-emerald-500" />
            case 'delegate': return <Users className="w-4 h-4 text-blue-500" />
            case 'decline': return <XCircle className="w-4 h-4 text-red-500" />
            case 'negotiate': return <Calculator className="w-4 h-4 text-yellow-500" />
            default: return <Target className="w-4 h-4 text-zinc-500" />
        }
    }

    const getActionColor = (action: string) => {
        switch (action) {
            case 'accept': return 'border-emerald-500/20 bg-emerald-500/10'
            case 'delegate': return 'border-blue-500/20 bg-blue-500/10'
            case 'decline': return 'border-red-500/20 bg-red-500/10'
            case 'negotiate': return 'border-yellow-500/20 bg-yellow-500/10'
            default: return 'border-zinc-500/20 bg-zinc-500/10'
        }
    }

    const getValueColor = (value: number) => {
        if (value > 50000) return 'text-emerald-500'
        if (value > 20000) return 'text-yellow-500'
        if (value > 0) return 'text-blue-500'
        return 'text-red-500'
    }

    if (!analysis) {
        return (
            <div className="min-h-screen bg-black text-white p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-4 mb-8">
                        <Brain className="w-8 h-8 text-purple-500" />
                        <h1 className="text-3xl font-bold">Oracle Mode</h1>
                    </div>
                    
                    <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardContent className="p-12 text-center">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="w-16 h-16 mx-auto mb-6"
                            >
                                <Brain className="w-16 h-16 text-purple-500" />
                            </motion.div>
                            <p className="text-zinc-400 mb-4">Oracle is analyzing possibilities...</p>
                            <div className="flex items-center justify-center gap-2">
                                <Activity className="w-4 h-4 text-purple-500" />
                                <span className="text-sm text-purple-500">Simulating outcomes</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black text-white p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Brain className="w-8 h-8 text-purple-500" />
                        <div>
                            <h1 className="text-3xl font-bold">Oracle Mode</h1>
                            <p className="text-zinc-400">Outcome simulation & prediction</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20">
                        <Eye className="w-4 h-4 text-purple-500" />
                        <span className="text-purple-500 font-medium">Live Analysis</span>
                    </div>
                </div>

                {/* Current Situation */}
                <Card className="bg-zinc-900/50 border-zinc-800 mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-blue-500" />
                            Current Situation
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-zinc-300 mb-4">{analysis.currentSituation}</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                                    <span className="text-sm font-medium">Market Context</span>
                                </div>
                                <p className="text-xs text-zinc-400">{analysis.marketContext}</p>
                            </div>
                            <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                                <div className="flex items-center gap-2 mb-2">
                                    <Shield className="w-4 h-4 text-blue-500" />
                                    <span className="text-sm font-medium">Competitor Analysis</span>
                                </div>
                                <p className="text-xs text-zinc-400">{analysis.competitorAnalysis}</p>
                            </div>
                            <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                                <div className="flex items-center gap-2 mb-2">
                                    <Rocket className="w-4 h-4 text-purple-500" />
                                    <span className="text-sm font-medium">Long-term Impact</span>
                                </div>
                                <p className="text-xs text-zinc-400">{analysis.longTermImpact}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Scenario Simulations */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Scenarios List */}
                    <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calculator className="w-5 h-5 text-yellow-500" />
                                Scenario Simulations
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {analysis.scenarios.map((scenario, index) => (
                                <motion.div
                                    key={scenario.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    onClick={() => setSelectedScenario(scenario)}
                                    className={`p-4 rounded-lg border cursor-pointer transition-all hover:bg-zinc-800/50 ${
                                        selectedScenario?.id === scenario.id ? 'bg-zinc-800/50 border-purple-500/50' : 'border-zinc-700'
                                    } ${getActionColor(scenario.action)}`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            {getActionIcon(scenario.action)}
                                            <span className="font-medium capitalize">{scenario.action}</span>
                                            {analysis.recommendedAction === scenario.action && (
                                                <span className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-500 text-xs font-medium">
                                                    Recommended
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-lg font-bold ${getValueColor(scenario.value)}`}>
                                                ${scenario.value.toLocaleString()}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <div className="w-16 bg-zinc-700 rounded-full h-2">
                                                    <div 
                                                        className="bg-emerald-500 h-2 rounded-full"
                                                        style={{ width: `${scenario.probability}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-zinc-400">{scenario.probability}%</span>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-sm text-zinc-400 mb-2">{scenario.outcome}</p>
                                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            <span>{scenario.timeToResult}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Activity className="w-3 h-3" />
                                            <span>{scenario.confidence}% confidence</span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Selected Scenario Details */}
                    <AnimatePresence mode="wait">
                        {selectedScenario && (
                            <motion.div
                                key={selectedScenario.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <Card className="bg-zinc-900/50 border-zinc-800">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            {getActionIcon(selectedScenario.action)}
                                            <span className="capitalize">{selectedScenario.action} Scenario</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {/* Value Metrics */}
                                        <div>
                                            <h4 className="font-medium mb-3">Value Metrics</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <DollarSign className="w-4 h-4 text-emerald-500" />
                                                        <span className="text-sm font-medium">Expected Value</span>
                                                    </div>
                                                    <div className={`text-xl font-bold ${getValueColor(selectedScenario.value)}`}>
                                                        ${selectedScenario.value.toLocaleString()}
                                                    </div>
                                                </div>
                                                <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Target className="w-4 h-4 text-blue-500" />
                                                        <span className="text-sm font-medium">Success Rate</span>
                                                    </div>
                                                    <div className="text-xl font-bold text-blue-500">
                                                        {selectedScenario.probability}%
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Risk Analysis */}
                                        <div>
                                            <h4 className="font-medium mb-3">Risk Factors</h4>
                                            <div className="space-y-2">
                                                {selectedScenario.risks.map((risk, index) => (
                                                    <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                                                        <AlertTriangle className="w-4 h-4 text-red-500" />
                                                        <span className="text-sm text-red-400">{risk}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Benefits */}
                                        <div>
                                            <h4 className="font-medium mb-3">Benefits</h4>
                                            <div className="space-y-2">
                                                {selectedScenario.benefits.map((benefit, index) => (
                                                    <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                        <span className="text-sm text-emerald-400">{benefit}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Alternatives */}
                                        <div>
                                            <h4 className="font-medium mb-3">Alternative Approaches</h4>
                                            <div className="space-y-2">
                                                {selectedScenario.alternatives.map((alternative, index) => (
                                                    <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800/50 border border-zinc-700">
                                                        <Lightbulb className="w-4 h-4 text-yellow-500" />
                                                        <span className="text-sm text-zinc-300">{alternative}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Action Button */}
                                        <button className="w-full bg-purple-500 text-black px-6 py-3 rounded-lg font-medium hover:bg-purple-400 transition-colors flex items-center justify-center gap-2">
                                            <Zap className="w-4 h-4" />
                                            Execute {selectedScenario.action} Strategy
                                        </button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Oracle Reasoning */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Brain className="w-5 h-5 text-purple-500" />
                            Oracle Reasoning
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-zinc-300 mb-4">{analysis.reasoning}</p>
                        
                        {/* Network Effects */}
                        <div>
                            <h4 className="font-medium mb-3">Network Effects</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {analysis.networkEffects.map((effect, index) => (
                                    <div key={index} className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Users className="w-4 h-4 text-purple-500" />
                                            <span className="text-sm font-medium text-purple-400">Network Effect {index + 1}</span>
                                        </div>
                                        <p className="text-xs text-zinc-400">{effect}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
