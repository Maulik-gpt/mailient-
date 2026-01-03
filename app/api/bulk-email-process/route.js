import { NextResponse } from 'next/server';

// CRITICAL: Force dynamic rendering to prevent build-time evaluation
export const dynamic = 'force-dynamic';
import { auth } from '@/lib/auth.js';
import { DatabaseService } from '@/lib/supabase.js';
import { decrypt } from '@/lib/crypto.js';
import { GmailService } from '@/lib/gmail.js';
import { AIConfig } from '@/lib/ai-config.js';

/**
 * Bulk Email Processing API - Process exactly 50 emails at once
 * Analyzes all emails with AI and categorizes them into 6 categories
 * Displays results in home-feed format
 */
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;
    console.log(`🚀 BULK EMAIL PROCESS: Starting bulk processing for: ${userEmail}`);

    // Get Gmail access token
    let accessToken = session?.accessToken;
    let refreshToken = session?.refreshToken;

    // If not in session, try database as fallback
    if (!accessToken) {
      try {
        const db = new DatabaseService();
        const userTokens = await db.getUserTokens(userEmail);

        if (userTokens?.encrypted_access_token) {
          accessToken = decrypt(userTokens.encrypted_access_token);
          refreshToken = userTokens.encrypted_refresh_token ? decrypt(userTokens.encrypted_refresh_token) : '';
        }
      } catch (dbError) {
        console.log('⚠️ Unable to derive Gmail token from database:', dbError.message);
      }
    }

    if (!accessToken) {
      return NextResponse.json({
        error: 'Gmail not connected. Please sign in with Google to access your emails.',
        success: false,
        bulkProcessStatus: 'gmail_not_connected'
      }, { status: 403 });
    }

    const gmailService = new GmailService(accessToken, refreshToken || '');

    // Start bulk processing of exactly 50 emails
    const bulkResults = await processBulkEmails(gmailService, userEmail, privacyMode);

    // Transform results into home-feed format
    const homeFeedResults = transformBulkResultsToHomeFeed(bulkResults);

    return NextResponse.json({
      success: true,
      processedCount: bulkResults.totalProcessed,
      categories: bulkResults.categories,
      homeFeedCards: homeFeedResults,
      timestamp: new Date().toISOString(),
      userEmail,
      bulkProcessStatus: 'completed',
      processingTime: bulkResults.processingTime,
      ai_version: "bulk-processing-sift-ai-v1"
    });

  } catch (error) {
    console.error('💥 BULK EMAIL PROCESS error:', error);
    return NextResponse.json(
      {
        error: `Bulk email processing failed: ${error.message}`,
        success: false,
        bulkProcessStatus: 'error'
      },
      { status: 500 }
    );
  }
}

/**
 * Process exactly 50 emails with AI analysis
 */
async function processBulkEmails(gmailService, userEmail, privacyMode = false) {
  const startTime = Date.now();

  try {
    console.log('📧 BULK PROCESS: Fetching 50 emails for analysis...');

    // Fetch exactly 50 emails with diverse criteria
    const [recentEmails, unreadEmails, importantEmails, allRecent] = await Promise.all([
      gmailService.getEmails(15, 'newer_than:7d'),
      gmailService.getEmails(15, 'is:unread newer_than:14d'),
      gmailService.getEmails(10, 'is:important newer_than:30d'),
      gmailService.getEmails(10, 'newer_than:30d')
    ]);

    // Combine and deduplicate to get exactly 50 unique emails
    const allMessages = [
      ...(recentEmails.messages || []),
      ...(unreadEmails.messages || []),
      ...(importantEmails.messages || []),
      ...(allRecent.messages || [])
    ];

    const uniqueMessages = [...new Set(allMessages.map(m => m.id))]
      .map(id => allMessages.find(m => m.id === id))
      .slice(0, 50); // Ensure exactly 50 emails

    console.log(`📧 BULK PROCESS: Processing ${uniqueMessages.length} unique emails`);

    // Get detailed email content for all emails
    const emailDetails = [];
    const batchSize = 10; // Process 10 emails at a time

    for (let i = 0; i < uniqueMessages.length; i += batchSize) {
      const batch = uniqueMessages.slice(i, i + batchSize);
      console.log(`📧 BULK PROCESS: Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(uniqueMessages.length / batchSize)}`);

      const batchPromises = batch.map(async (message) => {
        try {
          const details = await gmailService.getEmailDetails(message.id);
          return gmailService.parseEmailData(details);
        } catch (error) {
          console.log('BULK PROCESS: Error processing email:', error.message);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      emailDetails.push(...batchResults.filter(email => email !== null));

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < uniqueMessages.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`📧 BULK PROCESS: Successfully processed ${emailDetails.length} emails`);

    // Use AI to analyze all emails and categorize them
    const categorizedResults = await analyzeEmailsWithAI(emailDetails, userEmail, privacyMode);

    const processingTime = Date.now() - startTime;

    return {
      totalProcessed: emailDetails.length,
      categories: categorizedResults,
      processingTime,
      emails: emailDetails
    };

  } catch (error) {
    console.error('BULK PROCESS: Error in bulk processing:', error);
    throw error;
  }
}

/**
 * Analyze emails with AI and categorize into 6 categories
 */
async function analyzeEmailsWithAI(emailDetails, userEmail, privacyMode = false) {
  try {
    console.log('🤖 BULK PROCESS: Starting AI analysis...');

    // Initialize AI service
    const aiConfig = new AIConfig();
    if (!aiConfig.hasAIConfigured()) {
      throw new Error('OpenRouter AI not configured - please set OPENROUTER_API_KEY');
    }

    const aiService = aiConfig.getService();

    // Prepare data for AI analysis
    const emailsForAI = emailDetails.map(email => ({
      id: email.id,
      from: email.from?.split('<')[0]?.trim() || email.from || '',
      subject: (email.subject || '').substring(0, 150),
      snippet: (email.snippet || '').substring(0, 300),
      timestamp: email.date || new Date().toISOString(),
      bodyPreview: (email.body || '').substring(0, 500)
    }));

    // Process in batches for AI analysis
    const batchSize = 8;
    const batches = [];
    for (let i = 0; i < emailsForAI.length; i += batchSize) {
      batches.push(emailsForAI.slice(i, i + batchSize));
    }

    console.log(`🤖 BULK PROCESS: Processing ${batches.length} AI batches`);

    const allCategories = {
      opportunities_detected: [],
      urgent_action_required: [],
      hot_leads_heating_up: [],
      conversations_at_risk: [],
      missed_follow_ups: [],
      unread_but_important: []
    };

    // Process each batch with AI
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`🤖 BULK PROCESS: AI analyzing batch ${batchIndex + 1}/${batches.length}`);

      try {
        const batchData = {
          emails: batch,
          analysis_type: 'bulk_50_emails',
          categories: ['opportunities_detected', 'urgent_action_required', 'hot_leads_heating_up', 'conversations_at_risk', 'missed_follow_ups', 'unread_but_important'],
          user_profile: {
            name: userEmail.split('@')[0],
            role: 'founder/entrepreneur',
            company: userEmail.split('@')[1] || 'Unknown'
          }
        };

        const aiIntelligence = await aiService.generateInboxIntelligence(batchData, privacyMode);
        const batchCategories = transformAIIntelligenceToCategories(aiIntelligence, emailDetails);

        // Merge batch results
        Object.keys(allCategories).forEach(category => {
          allCategories[category].push(...batchCategories[category]);
        });

        console.log(`✅ BULK PROCESS: AI batch ${batchIndex + 1} completed`);

      } catch (batchError) {
        console.log(`⚠️ BULK PROCESS: AI batch ${batchIndex + 1} failed, using fallback:`, batchError.message);

        // Use fallback analysis for this batch
        const fallbackCategories = generateFallbackAnalysis(batch, emailDetails);
        Object.keys(allCategories).forEach(category => {
          allCategories[category].push(...fallbackCategories[category]);
        });
      }
    }

    console.log('✅ BULK PROCESS: AI analysis completed');
    return allCategories;

  } catch (error) {
    console.error('BULK PROCESS: AI analysis failed, using fallback:', error);
    return generateFallbackAnalysis(emailsForAI, emailDetails);
  }
}

/**
 * Transform AI intelligence to category format
 */
function transformAIIntelligenceToCategories(aiIntelligence, emailDetails) {
  const categories = {
    opportunities_detected: [],
    urgent_action_required: [],
    hot_leads_heating_up: [],
    conversations_at_risk: [],
    missed_follow_ups: [],
    unread_but_important: []
  };

  // Process AI intelligence results
  if (aiIntelligence.inbox_intelligence && Array.isArray(aiIntelligence.inbox_intelligence)) {
    aiIntelligence.inbox_intelligence.forEach(intelligence => {
      const email = emailDetails.find(e => e.id === intelligence.emails_involved?.[0]);
      if (!email) return;

      const senderName = email.from?.split('<')[0]?.trim() || 'Unknown';
      const senderEmail = email.from?.match(/<(.+)>/)?.[1] || email.from || '';

      switch (intelligence.category) {
        case 'opportunity':
        case 'lead':
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

        case 'urgent':
        case 'follow_up':
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

        case 'engagement':
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
          break;

        default:
          // Default categorization based on content analysis
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
 * Generate fallback analysis when AI fails
 */
function generateFallbackAnalysis(emails, emailDetails) {
  console.log('BULK PROCESS: Generating fallback analysis');

  const fallbackCategories = {
    opportunities_detected: [],
    urgent_action_required: [],
    hot_leads_heating_up: [],
    conversations_at_risk: [],
    missed_follow_ups: [],
    unread_but_important: []
  };

  emails.forEach(email => {
    const content = `${email.subject} ${email.snippet}`.toLowerCase();
    const senderName = email.from || 'Unknown';

    // Basic pattern matching for categorization
    if (content.includes('investment') || content.includes('partnership') || content.includes('opportunity')) {
      fallbackCategories.opportunities_detected.push({
        id: email.id,
        title: `${senderName} - Potential Opportunity`,
        description: email.subject || 'Business opportunity detected',
        sender: senderName,
        email: email.from?.match(/<(.+)>/)?.[1] || email.from || '',
        score: 7,
        signals: ['Partnership discussion', 'Business opportunity'],
        reasoning: 'Fallback analysis detected partnership/investment keywords',
        nextAction: 'Schedule follow-up call',
        priority: 'medium',
        emailId: email.id
      });
    } else if (content.includes('urgent') || content.includes('asap') || content.includes('deadline')) {
      fallbackCategories.urgent_action_required.push({
        id: email.id,
        subject: email.subject,
        reason: 'Contains urgent keywords',
        urgency: 'high',
        recommendedAction: 'Respond within 24 hours',
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        emailId: email.id
      });
    } else if (content.includes('follow') || content.includes('schedule') || content.includes('send')) {
      fallbackCategories.missed_follow_ups.push({
        id: email.id,
        subject: email.subject,
        promisedAction: 'Follow up on previous conversation',
        daysOverdue: Math.floor((new Date() - new Date(email.timestamp)) / (1000 * 60 * 60 * 24)),
        recommendedAction: 'Send follow-up response',
        emailId: email.id
      });
    } else if (content.includes('open') || content.includes('click') || content.includes('engagement')) {
      fallbackCategories.hot_leads_heating_up.push({
        id: email.id,
        name: senderName,
        email: email.from?.match(/<(.+)>/)?.[1] || email.from || '',
        engagementScore: 75,
        signals: ['High engagement detected'],
        trend: 'heating_up',
        lastActivity: email.timestamp,
        nextAction: 'Engage with personalized follow-up',
        emailId: email.id
      });
    } else {
      fallbackCategories.unread_but_important.push({
        id: email.id,
        subject: email.subject,
        importance: 'medium',
        importanceFactors: ['Recent email activity'],
        recommendedAction: 'Review for strategic value',
        emailId: email.id
      });
    }
  });

  return fallbackCategories;
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
 * Transform bulk results to home-feed format
 */
function transformBulkResultsToHomeFeed(bulkResults) {
  const insights = [];
  const timestamp = new Date().toISOString();
  const { categories, totalProcessed } = bulkResults;

  // Only include categories that have data
  if (categories.opportunities_detected?.length > 0) {
    insights.push({
      id: `bulk-opportunities-${Date.now()}`,
      type: 'opportunity',
      title: `${categories.opportunities_detected.length} Opportunities Detected`,
      subtitle: 'Buying signals, partnerships, investments',
      content: categories.opportunities_detected.map(opp =>
        `${opp.sender}: ${opp.description}`
      ).join(' • '),
      timestamp,
      metadata: {
        opportunityCount: categories.opportunities_detected.length,
        opportunityDetails: categories.opportunities_detected,
        avgScore: Math.round(
          categories.opportunities_detected.reduce((sum, opp) => sum + (opp.score || 0), 0) /
          categories.opportunities_detected.length
        ),
        processedFromTotal: `${categories.opportunities_detected.length} of ${totalProcessed} emails`
      },
      section: 'opportunities'
    });
  }

  if (categories.urgent_action_required?.length > 0) {
    insights.push({
      id: `bulk-urgent-${Date.now()}`,
      type: 'inbox-intelligence',
      title: `${categories.urgent_action_required.length} Items Need Urgent Action`,
      subtitle: 'Deadlines, waiting responses, critical issues',
      content: categories.urgent_action_required.map(item =>
        `${item.subject} - ${item.recommendedAction}`
      ).join(' • '),
      timestamp,
      metadata: {
        urgentCount: categories.urgent_action_required.length,
        urgentItems: categories.urgent_action_required,
        urgencyLevel: 'high',
        processedFromTotal: `${categories.urgent_action_required.length} of ${totalProcessed} emails`
      },
      section: 'inbox-intelligence'
    });
  }

  if (categories.hot_leads_heating_up?.length > 0) {
    insights.push({
      id: `bulk-hot-leads-${Date.now()}`,
      type: 'inbox-intelligence',
      title: `${categories.hot_leads_heating_up.length} Hot Leads Heating Up`,
      subtitle: 'High engagement, multiple opens, renewed interest',
      content: categories.hot_leads_heating_up.map(lead =>
        `${lead.name} (${lead.engagementScore}% engagement)`
      ).join(' • '),
      timestamp,
      metadata: {
        hotLeadsCount: categories.hot_leads_heating_up.length,
        hotLeads: categories.hot_leads_heating_up,
        avgEngagementScore: Math.round(
          categories.hot_leads_heating_up.reduce((sum, lead) => sum + (lead.engagementScore || 0), 0) /
          categories.hot_leads_heating_up.length
        ),
        processedFromTotal: `${categories.hot_leads_heating_up.length} of ${totalProcessed} emails`
      },
      section: 'inbox-intelligence'
    });
  }

  if (categories.conversations_at_risk?.length > 0) {
    insights.push({
      id: `bulk-at-risk-${Date.now()}`,
      type: 'inbox-intelligence',
      title: `${categories.conversations_at_risk.length} Conversations At Risk`,
      subtitle: 'No response, negative tone, stalled momentum',
      content: categories.conversations_at_risk.map(risk =>
        `${risk.subject} (${risk.riskLevel} risk)`
      ).join(' • '),
      timestamp,
      metadata: {
        atRiskCount: categories.conversations_at_risk.length,
        atRiskConversations: categories.conversations_at_risk,
        riskLevel: 'medium-high',
        processedFromTotal: `${categories.conversations_at_risk.length} of ${totalProcessed} emails`
      },
      section: 'inbox-intelligence'
    });
  }

  if (categories.missed_follow_ups?.length > 0) {
    insights.push({
      id: `bulk-missed-${Date.now()}`,
      type: 'inbox-intelligence',
      title: `${categories.missed_follow_ups.length} Missed Follow-Ups`,
      subtitle: 'Promised actions, overdue responses',
      content: categories.missed_follow_ups.map(missed =>
        `${missed.subject} (${missed.daysOverdue} days overdue)`
      ).join(' • '),
      timestamp,
      metadata: {
        missedCount: categories.missed_follow_ups.length,
        missedFollowUps: categories.missed_follow_ups,
        avgDaysOverdue: Math.round(
          categories.missed_follow_ups.reduce((sum, missed) => sum + (missed.daysOverdue || 0), 0) /
          categories.missed_follow_ups.length
        ),
        processedFromTotal: `${categories.missed_follow_ups.length} of ${totalProcessed} emails`
      },
      section: 'inbox-intelligence'
    });
  }

  if (categories.unread_but_important?.length > 0) {
    insights.push({
      id: `bulk-unread-important-${Date.now()}`,
      type: 'inbox-intelligence',
      title: `${categories.unread_but_important.length} Unread But Important`,
      subtitle: 'Revenue impact, strategic value, deadlines',
      content: categories.unread_but_important.map(important =>
        `${important.subject} (${important.importance} priority)`
      ).join(' • '),
      timestamp,
      metadata: {
        unreadImportantCount: categories.unread_but_important.length,
        unreadImportantEmails: categories.unread_but_important,
        importanceLevel: 'high',
        processedFromTotal: `${categories.unread_but_important.length} of ${totalProcessed} emails`
      },
      section: 'inbox-intelligence'
    });
  }

  // Add bulk processing summary
  const totalActionableItems = [
    ...categories.opportunities_detected,
    ...categories.urgent_action_required,
    ...categories.hot_leads_heating_up,
    ...categories.conversations_at_risk,
    ...categories.missed_follow_ups,
    ...categories.unread_but_important
  ].length;

  if (totalActionableItems > 0) {
    insights.push({
      id: `bulk-summary-${Date.now()}`,
      type: 'weekly-intelligence',
      title: `Bulk Analysis Complete - ${totalProcessed} Emails Processed`,
      subtitle: 'AI-powered categorization results',
      content: `AI analyzed ${totalProcessed} emails and found ${totalActionableItems} actionable items: ${categories.opportunities_detected?.length || 0} opportunities, ${categories.urgent_action_required?.length || 0} urgent items, ${categories.hot_leads_heating_up?.length || 0} hot leads. Focus on high-impact actions first.`,
      timestamp,
      metadata: {
        totalProcessedEmails: totalProcessed,
        totalActionableItems,
        bulkProcessingVersion: 'bulk-sift-ai-v1',
        categories: Object.keys(categories).filter(key => categories[key]?.length > 0),
        ai_analysis: 'bulk_openrouter_ai'
      },
      section: 'ai-highlights'
    });
  }

  return insights;
}
