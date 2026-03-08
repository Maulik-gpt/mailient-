import { NextRequest, NextResponse } from 'next/server'
import { businessContextEngine } from '@/lib/business-context-engine'

export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json()

    switch (action) {
      case 'analyze_email':
        const { from, subject, content, timestamp } = data
        
        // Update relationship history
        businessContextEngine.updateRelationship(from, {
          subject,
          timestamp: new Date(timestamp),
          isReply: true,
          tags: []
        })

        // Predict importance
        const prediction = businessContextEngine.predictEmailImportance({
          from,
          subject,
          content,
          timestamp: new Date(timestamp)
        })

        return NextResponse.json({ prediction })

      case 'update_deal':
        const deal = data
        businessContextEngine.updateDeal(deal)
        return NextResponse.json({ success: true })

      case 'get_insights':
        const insights = businessContextEngine.getActionableInsights()
        const summary = businessContextEngine.getBusinessSummary()
        return NextResponse.json({ insights, summary })

      case 'set_context':
        const context = data
        businessContextEngine.setBusinessContext(context)
        return NextResponse.json({ success: true })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Business context API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const insights = businessContextEngine.getActionableInsights()
    const summary = businessContextEngine.getBusinessSummary()
    
    return NextResponse.json({
      insights,
      summary,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Business context GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
