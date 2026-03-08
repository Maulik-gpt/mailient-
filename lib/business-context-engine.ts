// Business Context Engine - Practical founder intelligence
export interface BusinessContext {
  businessModel: 'SaaS' | 'Services' | 'Marketplace' | 'Hardware' | 'Other'
  currentStage: 'Idea' | 'Pre-seed' | 'Seed' | 'Series A' | 'Growth'
  currentPriorities: string[]
  teamSize: number
  monthlyRevenue: number
  runway: number // months
}

export interface DealState {
  id: string
  company: string
  contact: string
  stage: 'Lead' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Closed-Won' | 'Closed-Lost'
  value: number
  probability: number
  lastContact: Date
  nextAction: string
  daysSinceContact: number
  riskLevel: 'Low' | 'Medium' | 'High'
}

export interface RelationshipHistory {
  email: string
  name: string
  company: string
  firstContact: Date
  lastContact: Date
  totalInteractions: number
  responseRate: number
  avgResponseTime: number // hours
  dealHistory: DealState[]
  influenceScore: number // 0-100
  tags: string[]
  daysSinceContact: number
}

export interface FounderIntent {
  currentFocus: string[]
  communicationStyle: 'Direct' | 'Friendly' | 'Formal'
  responsePatterns: {
    avgResponseTime: number
    preferredContactTimes: string[]
    quickReplyTopics: string[]
  }
  decisionFactors: string[]
}

export class BusinessContextEngine {
  private businessContext: BusinessContext | null = null
  private deals: Map<string, DealState> = new Map()
  private relationships: Map<string, RelationshipHistory> = new Map()
  private founderIntent: FounderIntent | null = null

  // Initialize with business context
  setBusinessContext(context: BusinessContext) {
    this.businessContext = context
  }

  // Track deal state
  updateDeal(deal: DealState) {
    this.deals.set(deal.id, {
      ...deal,
      daysSinceContact: Math.floor((Date.now() - deal.lastContact.getTime()) / (1000 * 60 * 60 * 24))
    })
  }

  // Track relationship history
  updateRelationship(email: string, interaction: {
    subject: string
    timestamp: Date
    isReply: boolean
    dealValue?: number
    tags?: string[]
  }) {
    const existing = this.relationships.get(email) || {
      email,
      name: this.extractName(email),
      company: '',
      firstContact: interaction.timestamp,
      lastContact: interaction.timestamp,
      totalInteractions: 0,
      responseRate: 0,
      avgResponseTime: 0,
      dealHistory: [] as DealState[],
      influenceScore: 50,
      tags: [],
      daysSinceContact: 0
    }

    existing.totalInteractions++
    existing.lastContact = interaction.timestamp
    existing.daysSinceContact = Math.floor((Date.now() - existing.lastContact.getTime()) / (1000 * 60 * 60 * 24))
    
    if (interaction.dealValue) {
      const newDeal: DealState = {
        id: `deal-${Date.now()}`,
        company: existing.company,
        contact: email,
        stage: 'Lead',
        value: interaction.dealValue,
        probability: 50,
        lastContact: interaction.timestamp,
        nextAction: 'Follow up',
        daysSinceContact: 0,
        riskLevel: 'Medium'
      }
      existing.dealHistory.push(newDeal)
    }
    if (interaction.tags) {
      existing.tags = [...new Set([...existing.tags, ...interaction.tags])]
    }

    this.relationships.set(email, existing)
  }

  // Learn founder intent from behavior
  learnFromBehavior(emails: any[]) {
    const responseTimes: number[] = []
    const quickReplyTopics: string[] = []
    const decisionFactors: string[] = []

    emails.forEach(email => {
      // Analyze patterns
      if (email.responseTime < 2) {
        quickReplyTopics.push(email.category)
      }
      if (email.subject.includes('urgent') || email.subject.includes('important')) {
        decisionFactors.push('Time sensitivity')
      }
      if (email.subject.includes('$') || email.subject.includes('price')) {
        decisionFactors.push('Revenue impact')
      }
    })

    this.founderIntent = {
      currentFocus: this.detectCurrentFocus(emails),
      communicationStyle: this.detectCommunicationStyle(emails),
      responsePatterns: {
        avgResponseTime: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 24,
        preferredContactTimes: ['9-11am', '2-4pm'],
        quickReplyTopics: [...new Set(quickReplyTopics)]
      },
      decisionFactors: [...new Set(decisionFactors)]
    }
  }

  // Get actionable insights
  getActionableInsights(): {
    urgentActions: string[]
    dealWarnings: string[]
    relationshipOpportunities: string[]
    priorityEmails: string[]
  } {
    const insights: {
      urgentActions: string[]
      dealWarnings: string[]
      relationshipOpportunities: string[]
      priorityEmails: string[]
    } = {
      urgentActions: [],
      dealWarnings: [],
      relationshipOpportunities: [],
      priorityEmails: []
    }

    // Check for urgent deal actions
    this.deals.forEach(deal => {
      if (deal.daysSinceContact > 5 && deal.stage !== 'Closed-Lost') {
        insights.urgentActions.push(
          `Follow up with ${deal.company} - ${deal.daysSinceContact} days since contact, $${deal.value} deal at risk`
        )
      }
      
      if (deal.probability > 70 && deal.stage === 'Negotiation') {
        insights.priorityEmails.push(
          `${deal.company} negotiation - ${deal.probability}% chance to close $${deal.value}`
        )
      }
    })

    // Check relationship opportunities
    this.relationships.forEach((rel, email) => {
      if (rel.influenceScore > 80 && rel.daysSinceContact < 30) {
        insights.relationshipOpportunities.push(
          `${rel.name} (${rel.company}) - High influence contact, recent interaction`
        )
      }
    })

    return insights
  }

  // Predict email importance
  predictEmailImportance(email: {
    from: string
    subject: string
    content: string
    timestamp: Date
  }): {
    importance: 'Low' | 'Medium' | 'High' | 'Critical'
    reasons: string[]
    suggestedAction: string
    estimatedValue?: number
  } {
    const reasons: string[] = []
    let importance: 'Low' | 'Medium' | 'High' | 'Critical' = 'Medium'
    let suggestedAction = 'Review when available'
    let estimatedValue = 0

    const relationship = this.relationships.get(email.from)
    const subject = email.subject.toLowerCase()
    const content = email.content.toLowerCase()

    // Check relationship influence
    if (relationship && relationship.influenceScore > 80) {
      reasons.push('High-influence contact')
      importance = 'High'
    }

    // Check for deal-related keywords
    const dealKeywords = ['proposal', 'contract', 'agreement', 'purchase', '$', 'price', 'deal']
    if (dealKeywords.some(keyword => subject.includes(keyword) || content.includes(keyword))) {
      reasons.push('Deal-related content')
      importance = 'High'
      suggestedAction = 'Respond within 24 hours'
      
      // Extract potential value
      const moneyMatch = content.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/)
      if (moneyMatch) {
        estimatedValue = parseFloat(moneyMatch[1].replace(/[$,]/g, ''))
        if (estimatedValue > 10000) {
          importance = 'Critical'
          suggestedAction = 'Respond today'
        }
      }
    }

    // Check for urgency
    const urgencyKeywords = ['urgent', 'asap', 'deadline', 'expiring', 'immediate']
    if (urgencyKeywords.some(keyword => subject.includes(keyword) || content.includes(keyword))) {
      reasons.push('Time-sensitive')
      importance = 'Critical'
      suggestedAction = 'Respond immediately'
    }

    // Check for current priorities
    if (this.businessContext && this.founderIntent) {
      if (this.businessContext.currentPriorities.some(priority => 
        subject.includes(priority.toLowerCase()) || content.includes(priority.toLowerCase())
      )) {
        reasons.push('Aligns with current priorities')
        importance = 'High'
      }
    }

    return {
      importance,
      reasons,
      suggestedAction,
      estimatedValue: estimatedValue || undefined
    }
  }

  // Helper methods
  private extractName(email: string): string {
    const parts = email.split('@')[0].split('.')
    return parts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
  }

  private detectCurrentFocus(emails: any[]): string[] {
    const topics: string[] = emails.map(e => e.category || 'general')
    const frequency: Record<string, number> = topics.reduce((acc, topic) => {
      acc[topic] = (acc[topic] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(frequency)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([topic]) => topic)
  }

  private detectCommunicationStyle(emails: any[]): 'Direct' | 'Friendly' | 'Formal' {
    // Simple heuristic based on email patterns
    const informalWords = ['hey', 'hi', 'thanks', 'cheers']
    const formalWords = ['dear', 'sincerely', 'regards']
    
    let informalCount = 0
    let formalCount = 0
    
    emails.forEach(email => {
      const content = (email.subject + ' ' + email.content).toLowerCase()
      informalWords.forEach(word => {
        if (content.includes(word)) informalCount++
      })
      formalWords.forEach(word => {
        if (content.includes(word)) formalCount++
      })
    })
    
    if (informalCount > formalCount) return 'Friendly'
    if (formalCount > informalCount) return 'Formal'
    return 'Direct'
  }

  // Get business summary
  getBusinessSummary(): {
    health: 'Good' | 'Warning' | 'Critical'
    keyMetrics: {
      activeDeals: number
      totalPipeline: number
      highValueRelationships: number
      avgResponseTime: number
    }
    recommendations: string[]
  } {
    const activeDeals = Array.from(this.deals.values()).filter(d => d.stage !== 'Closed-Won' && d.stage !== 'Closed-Lost')
    const totalPipeline = activeDeals.reduce((sum, deal) => sum + deal.value, 0)
    const highValueRelationships = Array.from(this.relationships.values()).filter(r => r.influenceScore > 80)
    const avgResponseTime = this.founderIntent?.responsePatterns.avgResponseTime || 24

    let health: 'Good' | 'Warning' | 'Critical' = 'Good'
    const recommendations = []

    if (totalPipeline < 50000 && this.businessContext?.currentStage !== 'Idea') {
      health = 'Warning'
      recommendations.push('Pipeline is low - focus on lead generation')
    }

    if (avgResponseTime > 48) {
      health = 'Warning'
      recommendations.push('Response time is slow - may be losing opportunities')
    }

    const overdueDeals = activeDeals.filter(d => d.daysSinceContact > 7)
    if (overdueDeals.length > 3) {
      health = 'Critical'
      recommendations.push(`${overdueDeals.length} deals need immediate follow-up`)
    }

    return {
      health,
      keyMetrics: {
        activeDeals: activeDeals.length,
        totalPipeline,
        highValueRelationships: highValueRelationships.length,
        avgResponseTime
      },
      recommendations
    }
  }
}

// Singleton instance
export const businessContextEngine = new BusinessContextEngine()
