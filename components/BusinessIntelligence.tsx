"use client"

import { useState, useEffect } from "react"
import { businessContextEngine, BusinessContext, DealState } from "@/lib/business-context-engine"

export function BusinessIntelligence() {
  const [insights, setInsights] = useState<any>(null)
  const [summary, setSummary] = useState<any>(null)

  useEffect(() => {
    // Initialize with sample business context
    const context: BusinessContext = {
      businessModel: 'SaaS',
      currentStage: 'Seed',
      currentPriorities: ['fundraising', 'product-launch', 'customer-acquisition'],
      teamSize: 5,
      monthlyRevenue: 15000,
      runway: 8
    }
    
    businessContextEngine.setBusinessContext(context)

    // Add sample deals
    const sampleDeals: DealState[] = [
      {
        id: '1',
        company: 'Acme Corp',
        contact: 'john@acme.com',
        stage: 'Proposal',
        value: 50000,
        probability: 75,
        lastContact: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        nextAction: 'Follow up on proposal',
        daysSinceContact: 3,
        riskLevel: 'Medium'
      },
      {
        id: '2',
        company: 'TechStart',
        contact: 'sarah@techstart.com',
        stage: 'Negotiation',
        value: 25000,
        probability: 85,
        lastContact: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
        nextAction: 'Send contract',
        daysSinceContact: 8,
        riskLevel: 'High'
      }
    ]

    sampleDeals.forEach(deal => businessContextEngine.updateDeal(deal))

    // Get insights
    const actionableInsights = businessContextEngine.getActionableInsights()
    const businessSummary = businessContextEngine.getBusinessSummary()

    setInsights(actionableInsights)
    setSummary(businessSummary)
  }, [])

  if (!insights || !summary) {
    return <div>Loading business intelligence...</div>
  }

  return (
    <div className="p-6 bg-zinc-900 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Business Intelligence</h3>
      
      {/* Business Health */}
      <div className="mb-6">
        <div className={`px-3 py-1 rounded-full text-sm font-medium inline-block mb-2 ${
          summary.health === 'Good' ? 'bg-green-500/10 text-green-500' :
          summary.health === 'Warning' ? 'bg-yellow-500/10 text-yellow-500' :
          'bg-red-500/10 text-red-500'
        }`}>
          Business Health: {summary.health}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-zinc-400">Active Deals</div>
            <div className="font-medium">{summary.keyMetrics.activeDeals}</div>
          </div>
          <div>
            <div className="text-zinc-400">Pipeline Value</div>
            <div className="font-medium">${summary.keyMetrics.totalPipeline.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-zinc-400">High-Value Contacts</div>
            <div className="font-medium">{summary.keyMetrics.highValueRelationships}</div>
          </div>
          <div>
            <div className="text-zinc-400">Avg Response Time</div>
            <div className="font-medium">{summary.keyMetrics.avgResponseTime}h</div>
          </div>
        </div>
      </div>

      {/* Urgent Actions */}
      {insights.urgentActions.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium mb-2 text-red-400">Urgent Actions</h4>
          <div className="space-y-2">
            {insights.urgentActions.map((action: string, index: number) => (
              <div key={index} className="p-2 bg-red-500/10 border border-red-500/20 rounded text-sm">
                {action}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Priority Emails */}
      {insights.priorityEmails.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium mb-2 text-yellow-400">Priority Emails</h4>
          <div className="space-y-2">
            {insights.priorityEmails.map((email: string, index: number) => (
              <div key={index} className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-sm">
                {email}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {summary.recommendations.length > 0 && (
        <div>
          <h4 className="font-medium mb-2 text-blue-400">Recommendations</h4>
          <div className="space-y-2">
            {summary.recommendations.map((rec: string, index: number) => (
              <div key={index} className="p-2 bg-blue-500/10 border border-blue-500/20 rounded text-sm">
                {rec}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
