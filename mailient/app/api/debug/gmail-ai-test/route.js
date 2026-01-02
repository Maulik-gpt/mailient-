import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.js';
import { DatabaseService } from '@/lib/supabase.js';
import { decrypt } from '@/lib/crypto.js';
import { GmailService } from '@/lib/gmail.ts';
import { AIConfig } from '@/lib/ai-config.js';

/**
 * Debug endpoint to test Gmail + AI workflow
 * This will help identify where the workflow is failing
 */
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({
        error: 'Unauthorized - please sign in',
        step: 'authentication'
      }, { status: 401 });
    }

    const userEmail = session.user.email;
    console.log(`🔍 DEBUG: Testing workflow for: ${userEmail}`);

    // Step 1: Check authentication and tokens
    console.log('📋 Step 1: Authentication Check');
    let accessToken = session?.accessToken;
    let refreshToken = session?.refreshToken;

    if (!accessToken) {
      try {
        const db = new DatabaseService();
        const userTokens = await db.getUserTokens(userEmail);
        
        if (userTokens?.encrypted_access_token) {
          accessToken = decrypt(userTokens.encrypted_access_token);
          refreshToken = userTokens.encrypted_refresh_token ? decrypt(userTokens.encrypted_refresh_token) : '';
          console.log('✅ Found tokens in database');
        } else {
          console.log('❌ No tokens found in database');
        }
      } catch (dbError) {
        console.log('❌ Database error:', dbError.message);
      }
    } else {
      console.log('✅ Found tokens in session');
    }

    if (!accessToken) {
      return NextResponse.json({
        error: 'Gmail not connected. Please sign in with Google to access your emails.',
        step: 'token_retrieval',
        insights: [],
        ai_status: 'gmail_not_connected'
      }, { status: 403 });
    }

    // Step 2: Test Gmail service
    console.log('📋 Step 2: Gmail Service Test');
    const gmailService = new GmailService(accessToken, refreshToken || '');
    
    let gmailTestResult = {};
    try {
      const profile = await gmailService.getProfile();
      gmailTestResult = {
        success: true,
        emailAddress: profile.emailAddress,
        messagesTotal: profile.messagesTotal,
        threadsTotal: profile.threadsTotal
      };
      console.log('✅ Gmail service working:', profile.emailAddress);
    } catch (gmailError) {
      console.log('❌ Gmail service error:', gmailError.message);
      gmailTestResult = {
        success: false,
        error: gmailError.message
      };
      return NextResponse.json({
        error: `Gmail service error: ${gmailError.message}`,
        step: 'gmail_service',
        gmailTestResult,
        insights: [],
        ai_status: 'gmail_error'
      }, { status: 500 });
    }

    // Step 3: Fetch emails
    console.log('📋 Step 3: Email Fetching');
    let emailFetchResult = {};
    let emailDetails = [];
    
    try {
      const [recentEmails, unreadEmails, importantEmails] = await Promise.all([
        gmailService.getEmails(20, 'newer_than:7d'),
        gmailService.getEmails(15, 'is:unread newer_than:7d'),
        gmailService.getEmails(10, 'is:important newer_than:14d')
      ]);

      const allMessages = [
        ...(recentEmails.messages || []),
        ...(unreadEmails.messages || []),
        ...(importantEmails.messages || [])
      ];
      
      const uniqueMessages = [...new Set(allMessages.map(m => m.id))]
        .map(id => allMessages.find(m => m.id === id))
        .slice(0, 15); // Limit to 15 most relevant emails

      console.log(`📧 Found ${uniqueMessages.length} unique emails to process`);

      // Get detailed email content
      for (const message of uniqueMessages) {
        try {
          const details = await gmailService.getEmailDetails(message.id);
          const parsed = gmailService.parseEmailData(details);
          emailDetails.push(parsed);
        } catch (error) {
          console.log('Error processing email:', error.message);
        }
      }

      emailFetchResult = {
        success: true,
        recentEmailsCount: recentEmails.messages?.length || 0,
        unreadEmailsCount: unreadEmails.messages?.length || 0,
        importantEmailsCount: importantEmails.messages?.length || 0,
        uniqueEmailsProcessed: emailDetails.length,
        sampleEmails: emailDetails.slice(0, 3).map(e => ({
          id: e.id,
          subject: e.subject,
          from: e.from,
          snippet: e.snippet
        }))
      };

      console.log(`✅ Processed ${emailDetails.length} emails successfully`);

    } catch (fetchError) {
      console.log('❌ Email fetch error:', fetchError.message);
      emailFetchResult = {
        success: false,
        error: fetchError.message
      };
      return NextResponse.json({
        error: `Email fetch error: ${fetchError.message}`,
        step: 'email_fetching',
        gmailTestResult,
        emailFetchResult,
        insights: [],
        ai_status: 'email_fetch_error'
      }, { status: 500 });
    }

    // Step 4: Test AI Configuration
    console.log('📋 Step 4: AI Configuration Test');
    const aiConfig = new AIConfig();
    const aiTestResult = {
      hasAIConfigured: aiConfig.hasAIConfigured(),
      configurationStatus: aiConfig.getConfigurationStatus(),
      availableProviders: aiConfig.getAvailableProviders()
    };

    if (!aiConfig.hasAIConfigured()) {
      return NextResponse.json({
        error: 'OpenRouter AI not configured',
        step: 'ai_configuration',
        gmailTestResult,
        emailFetchResult,
        aiTestResult,
        insights: [],
        ai_status: 'ai_not_configured'
      }, { status: 500 });
    }

    // Step 5: Test AI Analysis (ONLY if we have emails)
    let aiAnalysisResult = {};
    let finalInsights = [];

    if (emailDetails.length === 0) {
      console.log('⚠️ No emails to analyze - this is the issue!');
      return NextResponse.json({
        error: 'No emails found to analyze. Please check your Gmail account has emails.',
        step: 'no_emails',
        gmailTestResult,
        emailFetchResult,
        aiTestResult,
        insights: [],
        ai_status: 'no_emails_to_analyze',
        recommendation: 'Make sure your Gmail account has emails from the past 2 weeks'
      }, { status: 200 });
    }

    try {
      console.log('📋 Step 5: AI Analysis');
      const gmailData = {
        emails: emailDetails.map(email => ({
          id: email.id,
          threadId: email.threadId || '',
          from: email.from || '',
          to: email.to || [],
          subject: email.subject || '',
          snippet: email.snippet || '',
          body: email.body || '',
          timestamp: email.date || new Date().toISOString()
        })),
        time_range: 'past_week',
        user_profile: {
          name: userEmail.split('@')[0],
          role: 'founder/entrepreneur',
          company: userEmail.split('@')[1] || 'Unknown'
        }
      };

      const aiService = aiConfig.getService();
      const aiIntelligence = await aiService.generateInboxIntelligence(gmailData);

      // Transform AI response to our 6-category format
      const realAIInsights = transformAIIntelligenceToSiftCategories(aiIntelligence, emailDetails);
      const homeFeedInsights = transformRealAIInsightsToHomeFeedCards(realAIInsights);

      aiAnalysisResult = {
        success: true,
        aiIntelligenceReceived: !!aiIntelligence,
        inboxIntelligenceItems: aiIntelligence.inbox_intelligence?.length || 0,
        categoriesDetected: Object.keys(realAIInsights).filter(key => realAIInsights[key]?.length > 0),
        finalInsightsCount: homeFeedInsights.length,
        categoriesSummary: {
          opportunities_detected: realAIInsights.opportunities_detected?.length || 0,
          urgent_action_required: realAIInsights.urgent_action_required?.length || 0,
          hot_leads_heating_up: realAIInsights.hot_leads_heating_up?.length || 0,
          conversations_at_risk: realAIInsights.conversations_at_risk?.length || 0,
          missed_follow_ups: realAIInsights.missed_follow_ups?.length || 0,
          unread_but_important: realAIInsights.unread_but_important?.length || 0
        }
      };

      finalInsights = homeFeedInsights;

      console.log('✅ AI analysis completed successfully');

    } catch (aiError) {
      console.log('❌ AI analysis error:', aiError.message);
      aiAnalysisResult = {
        success: false,
        error: aiError.message
      };
      return NextResponse.json({
        error: `AI analysis failed: ${aiError.message}`,
        step: 'ai_analysis',
        gmailTestResult,
        emailFetchResult,
        aiTestResult,
        aiAnalysisResult,
        insights: [],
        ai_status: 'ai_analysis_error'
      }, { status: 500 });
    }

    // Success response
    return NextResponse.json({
      success: true,
      step: 'complete',
      gmailTestResult,
      emailFetchResult,
      aiTestResult,
      aiAnalysisResult,
      insights: finalInsights,
      ai_status: 'active',
      timestamp: new Date().toISOString(),
      userEmail,
      sift_intelligence_summary: {
        opportunities_detected: finalInsights.filter(i => i.section === 'opportunities').length,
        urgent_action_required: finalInsights.filter(i => i.section === 'inbox-intelligence' && i.title.includes('Urgent')).length,
        hot_leads_heating_up: finalInsights.filter(i => i.title.includes('Hot Leads')).length,
        conversations_at_risk: finalInsights.filter(i => i.title.includes('At Risk')).length,
        missed_follow_ups: finalInsights.filter(i => i.title.includes('Missed Follow')).length,
        unread_but_important: finalInsights.filter(i => i.title.includes('Unread But Important')).length
      }
    });

  } catch (error) {
    console.error('💥 Debug endpoint error:', error);
    return NextResponse.json(
      {
        error: `Debug endpoint failed: ${error.message}`,
        step: 'unknown_error',
        insights: [],
        ai_status: 'debug_error'
      },
      { status: 500 }
    );
  }
}

/**
 * Transform AI intelligence to Sift AI 6-category format
 */
function transformAIIntelligenceToSiftCategories(aiIntelligence, emailDetails) {
  const categories = {
    opportunities_detected: [],
    urgent_action_required: [],
    hot_leads_heating_up: [],
    conversations_at_risk: [],
    missed_follow_ups: [],
    unread_but_important: []
  };

  // Process AI intelligence data
  if (aiIntelligence.inbox_intelligence && Array.isArray(aiIntelligence.inbox_intelligence)) {
    aiIntelligence.inbox_intelligence.forEach(intelligence => {
      const email = emailDetails.find(e => e.id === intelligence.emails_involved?.[0]);
      if (!email) return;

      const senderName = email.from?.split('<')[0]?.trim() || 'Unknown';
      const senderEmail = email.from?.match(/<(.+)>/)?.[1] || email.from || '';

      switch (intelligence.category) {
        case 'opportunity':
        case 'lead':
        case 'investor':
          categories.opportunities_detected.push({
            id: email.id,
            title: `${senderName} - Business Opportunity`,
            description: intelligence.description || 'Business opportunity detected',
            sender: senderName,
            email: senderEmail,
            score: intelligence.priority === 'urgent' ? 9 : intelligence.priority === 'high' ? 7 : 5,
            signals: intelligence.action_recommendations || [],
            reasoning: `AI detected: ${intelligence.description}`,
            nextAction: intelligence.action_recommendations?.[0] || 'Schedule discovery call',
            priority: intelligence.priority || 'medium',
            emailId: email.id
          });
          break;

        case 'follow_up':
        case 'urgent':
          categories.urgent_action_required.push({
            id: email.id,
            subject: email.subject,
            reason: intelligence.description || 'Urgent action required',
            urgency: intelligence.priority === 'urgent' ? 'critical' : 'high',
            recommendedAction: intelligence.action_recommendations?.[0] || 'Take immediate action',
            deadline: intelligence.timestamp,
            emailId: email.id
          });
          break;

        case 'risk':
          categories.conversations_at_risk.push({
            id: email.id,
            subject: email.subject,
            riskLevel: intelligence.priority === 'urgent' ? 'high' : 'medium',
            riskFactors: intelligence.action_recommendations || ['Conversation risk detected'],
            recommendedAction: intelligence.action_recommendations?.[0] || 'Immediate outreach needed',
            emailId: email.id
          });
          break;

        default:
          // For other categories, analyze content for classification
          const content = `${email.subject} ${email.snippet} ${email.body}`.toLowerCase();
          
          if (content.includes('follow') || content.includes('schedule') || content.includes('send')) {
            categories.missed_follow_ups.push({
              id: email.id,
              subject: email.subject,
              promisedAction: extractPromisedAction(email),
              daysOverdue: Math.floor((new Date() - new Date(email.date)) / (1000 * 60 * 60 * 24)),
              recommendedAction: intelligence.action_recommendations?.[0] || 'Complete promised action',
              emailId: email.id
            });
          } else if (content.includes('open') || content.includes('click') || content.includes('engagement')) {
            categories.hot_leads_heating_up.push({
              id: email.id,
              name: senderName,
              email: senderEmail,
              engagementScore: 75,
              signals: ['High engagement detected'],
              trend: 'heating_up',
              lastActivity: email.date,
              nextAction: intelligence.action_recommendations?.[0] || 'Engage with personalized follow-up',
              emailId: email.id
            });
          } else {
            categories.unread_but_important.push({
              id: email.id,
              subject: email.subject,
              importance: intelligence.priority === 'high' ? 'high' : 'medium',
              importanceFactors: ['AI identified as important'],
              recommendedAction: intelligence.action_recommendations?.[0] || 'Review based on strategic value',
              emailId: email.id
            });
          }
      }
    });
  }

  return categories;
}

/**
 * Extract promised action from email content
 */
function extractPromisedAction(email) {
  const content = `${email.subject} ${email.snippet}`.toLowerCase();
  if (content.includes('send')) return 'Send promised materials';
  if (content.includes('schedule')) return 'Schedule promised meeting';
  if (content.includes('reply')) return 'Provide promised response';
  if (content.includes('update')) return 'Send promised update';
  return 'Complete promised action';
}

/**
 * Transform REAL AI insights into home-feed compatible cards
 */
function transformRealAIInsightsToHomeFeedCards(realAIInsights) {
  const insights = [];
  const timestamp = new Date().toISOString();

  // Only include categories that have REAL data from AI
  if (realAIInsights.opportunities_detected?.length > 0) {
    insights.push({
      id: `opportunities-${Date.now()}`,
      type: 'opportunity',
      title: `${realAIInsights.opportunities_detected.length} Opportunities Detected`,
      subtitle: 'Buying signals, partnerships, investments',
      content: realAIInsights.opportunities_detected.map(opp => 
        `${opp.sender}: ${opp.description}`
      ).join(' • '),
      timestamp,
      metadata: {
        opportunityCount: realAIInsights.opportunities_detected.length,
        opportunityDetails: realAIInsights.opportunities_detected,
        avgScore: Math.round(
          realAIInsights.opportunities_detected.reduce((sum, opp) => sum + (opp.score || 0), 0) / 
          realAIInsights.opportunities_detected.length
        )
      },
      section: 'opportunities'
    });
  }

  if (realAIInsights.urgent_action_required?.length > 0) {
    insights.push({
      id: `urgent-${Date.now()}`,
      type: 'inbox-intelligence',
      title: `${realAIInsights.urgent_action_required.length} Items Need Urgent Action`,
      subtitle: 'Deadlines, waiting responses, critical issues',
      content: realAIInsights.urgent_action_required.map(item => 
        `${item.subject} - ${item.recommendedAction}`
      ).join(' • '),
      timestamp,
      metadata: {
        urgentCount: realAIInsights.urgent_action_required.length,
        urgentItems: realAIInsights.urgent_action_required,
        urgencyLevel: 'high'
      },
      section: 'inbox-intelligence'
    });
  }

  if (realAIInsights.hot_leads_heating_up?.length > 0) {
    insights.push({
      id: `hot-leads-${Date.now()}`,
      type: 'inbox-intelligence',
      title: `${realAIInsights.hot_leads_heating_up.length} Hot Leads Heating Up`,
      subtitle: 'High engagement, multiple opens, renewed interest',
      content: realAIInsights.hot_leads_heating_up.map(lead => 
        `${lead.name} (${lead.engagementScore}% engagement)`
      ).join(' • '),
      timestamp,
      metadata: {
        hotLeadsCount: realAIInsights.hot_leads_heating_up.length,
        hotLeads: realAIInsights.hot_leads_heating_up,
        avgEngagementScore: Math.round(
          realAIInsights.hot_leads_heating_up.reduce((sum, lead) => sum + (lead.engagementScore || 0), 0) / 
          realAIInsights.hot_leads_heating_up.length
        )
      },
      section: 'inbox-intelligence'
    });
  }

  if (realAIInsights.conversations_at_risk?.length > 0) {
    insights.push({
      id: `at-risk-${Date.now()}`,
      type: 'inbox-intelligence',
      title: `${realAIInsights.conversations_at_risk.length} Conversations At Risk`,
      subtitle: 'No response, negative tone, stalled momentum',
      content: realAIInsights.conversations_at_risk.map(risk => 
        `${risk.subject} (${risk.riskLevel} risk)`
      ).join(' • '),
      timestamp,
      metadata: {
        atRiskCount: realAIInsights.conversations_at_risk.length,
        atRiskConversations: realAIInsights.conversations_at_risk,
        riskLevel: 'medium-high'
      },
      section: 'inbox-intelligence'
    });
  }

  if (realAIInsights.missed_follow_ups?.length > 0) {
    insights.push({
      id: `missed-${Date.now()}`,
      type: 'inbox-intelligence',
      title: `${realAIInsights.missed_follow_ups.length} Missed Follow-Ups`,
      subtitle: 'Promised actions, overdue responses',
      content: realAIInsights.missed_follow_ups.map(missed => 
        `${missed.subject} (${missed.daysOverdue} days overdue)`
      ).join(' • '),
      timestamp,
      metadata: {
        missedCount: realAIInsights.missed_follow_ups.length,
        missedFollowUps: realAIInsights.missed_follow_ups,
        avgDaysOverdue: Math.round(
          realAIInsights.missed_follow_ups.reduce((sum, missed) => sum + (missed.daysOverdue || 0), 0) / 
          realAIInsights.missed_follow_ups.length
        )
      },
      section: 'inbox-intelligence'
    });
  }

  if (realAIInsights.unread_but_important?.length > 0) {
    insights.push({
      id: `unread-important-${Date.now()}`,
      type: 'inbox-intelligence',
      title: `${realAIInsights.unread_but_important.length} Unread But Important`,
      subtitle: 'Revenue impact, strategic value, deadlines',
      content: realAIInsights.unread_but_important.map(important => 
        `${important.subject} (${important.importance} priority)`
      ).join(' • '),
      timestamp,
      metadata: {
        unreadImportantCount: realAIInsights.unread_but_important.length,
        unreadImportantEmails: realAIInsights.unread_but_important,
        importanceLevel: 'high'
      },
      section: 'inbox-intelligence'
    });
  }

  // Add AI summary if we have any real insights
  const totalItems = [
    ...(realAIInsights.opportunities_detected || []),
    ...(realAIInsights.urgent_action_required || []),
    ...(realAIInsights.hot_leads_heating_up || []),
    ...(realAIInsights.conversations_at_risk || []),
    ...(realAIInsights.missed_follow_ups || []),
    ...(realAIInsights.unread_but_important || [])
  ].length;

  if (totalItems > 0) {
    insights.push({
      id: `sift-summary-${Date.now()}`,
      type: 'weekly-intelligence',
      title: 'Your Week In 10 Seconds',
      subtitle: 'Real AI intelligence summary',
      content: `Real AI analysis found ${totalItems} actionable items from your emails: ${realAIInsights.opportunities_detected?.length || 0} opportunities, ${realAIInsights.urgent_action_required?.length || 0} urgent items, ${realAIInsights.hot_leads_heating_up?.length || 0} hot leads. Focus on high-impact actions first.`,
      timestamp,
      metadata: {
        totalActionableItems: totalItems,
        siftVersion: 'real-openrouter-sift-ai-v1',
        categories: Object.keys(realAIInsights).filter(key => realAIInsights[key]?.length > 0),
        ai_analysis: 'real_openrouter_ai'
      },
      section: 'ai-highlights'
    });
  }

  return insights;
}
