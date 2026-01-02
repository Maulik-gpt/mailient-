import { NextResponse } from 'next/server';
// @ts-ignore
import { auth } from '../../../../lib/auth.js';
import { DatabaseService } from '../../../../lib/supabase.js';
import { decrypt } from '../../../../lib/crypto.js';
import { GmailService } from '../../../../lib/gmail';
import { AIConfig } from '../../../../lib/ai-config.js';
import { subscriptionService, FEATURE_TYPES } from '../../../../lib/subscription-service';

interface EmailDetail {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  body: string;
  timestamp: string;
}

interface EnrichedEmail {
  id: string;
  subject: string;
  snippet: string;
  sender: {
    name: string;
    email: string;
  };
  receivedAt: string;
}

export async function GET(request: Request) {
  try {
    // @ts-ignore
    const session = await (auth as any)();
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
        insights: [],
        sift_intelligence_summary: {
          opportunities_detected: 0,
          urgent_action_required: 0,
          hot_leads_heating_up: 0,
          conversations_at_risk: 0,
          missed_follow_ups: 0,
          unread_but_important: 0
        }
      });
    }

    const userEmail = session.user.email;

    // Check subscription and feature usage for Sift AI (5/day for Starter)
    const canUse = await subscriptionService.canUseFeature(userEmail, FEATURE_TYPES.SIFT_ANALYSIS);
    if (!canUse) {
      const usage = await subscriptionService.getFeatureUsage(userEmail, FEATURE_TYPES.SIFT_ANALYSIS);
      return NextResponse.json({
        success: false,
        error: 'limit_reached',
        message: 'You have used all 5 Sift AI analysis credits for today. Credits reset at midnight.',
        usage: usage.usage,
        limit: usage.limit,
        upgradeUrl: '/pricing',
        insights: [],
        sift_intelligence_summary: {
          opportunities_detected: 0,
          urgent_action_required: 0,
          hot_leads_heating_up: 0,
          conversations_at_risk: 0,
          missed_follow_ups: 0,
          unread_but_important: 0
        }
      }, { status: 403 });
    }

    let accessToken = (session as any)?.accessToken;
    let refreshToken = (session as any)?.refreshToken;

    const db = new DatabaseService();
    let privacyMode = false;
    try {
      const profile = await db.getUserProfile(userEmail);
      if (profile?.preferences?.ai_privacy_mode === 'enabled') {
        privacyMode = true;
        console.log('🛡️ AI Privacy Mode is ENABLED for this request.');
      }
    } catch (e) {
      console.warn('Error fetching profile for privacy check:', e);
    }

    // Fetch tokens from database if not in session
    if (!accessToken) {
      try {
        const userTokens = await db.getUserTokens(userEmail);
        if (userTokens?.encrypted_access_token) {
          accessToken = decrypt(userTokens.encrypted_access_token);
          refreshToken = userTokens.encrypted_refresh_token ? decrypt(userTokens.encrypted_refresh_token) : '';
        }
      } catch (e) {
        console.error('Error fetching tokens from DB:', e);
      }
    }

    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Gmail not connected',
        insights: [],
        sift_intelligence_summary: {
          opportunities_detected: 0,
          urgent_action_required: 0,
          hot_leads_heating_up: 0,
          conversations_at_risk: 0,
          missed_follow_ups: 0,
          unread_but_important: 0
        }
      });
    }

    const { searchParams } = new URL(request.url);
    const pageToken = searchParams.get('pageToken') || undefined;

    const gmailService = new GmailService(accessToken, refreshToken || '');
    gmailService.setUserEmail(userEmail); // Enable token refresh persistence

    console.log('📧 Fetching emails for analysis...');

    // Fetch recent emails
    const recentEmails = await gmailService.getEmails(50, 'newer_than:60d', pageToken);
    const allMessages = recentEmails.messages || [];
    const nextPageToken = recentEmails.nextPageToken;

    // Get email IDs (up to 50)
    const uniqueIds: string[] = allMessages.slice(0, 50).map((m: any) => m.id);

    console.log(`📬 Fetching details for ${uniqueIds.length} emails...`);

    // Fetch full email details
    // Fetch full email details with batching to avoid Rate Limits
    const emailDetails: EmailDetail[] = [];
    const BATCH_SIZE = 15; // Increased batch size for faster processing

    for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
      const batch = uniqueIds.slice(i, i + BATCH_SIZE);
      console.log(`📡 Fetching batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(uniqueIds.length / BATCH_SIZE)}...`);

      const batchPromises = batch.map(async (id: string): Promise<EmailDetail | null> => {
        try {
          const details = await gmailService.getEmailDetails(id);
          const parsed = gmailService.parseEmailData(details);
          return {
            id: parsed.id,
            from: parsed.from || '',
            subject: parsed.subject || '(No Subject)',
            snippet: parsed.snippet || '',
            body: (parsed.body || '').substring(0, 1500),
            timestamp: parsed.date || new Date().toISOString()
          };
        } catch (e) {
          console.error(`Failed to fetch email ${id}:`, e);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      const validResults = batchResults.filter((d): d is EmailDetail => d !== null);
      emailDetails.push(...validResults);

      // Small delay between batches
      if (i + BATCH_SIZE < uniqueIds.length) {
        await new Promise(resolve => setTimeout(resolve, 50)); // Reduced delay between batches
      }
    }
    const filteredEmails = emailDetails.filter((d): d is EmailDetail => d !== null);

    console.log(`✅ Successfully fetched ${filteredEmails.length} email details`);

    if (filteredEmails.length === 0) {
      return NextResponse.json({
        success: true,
        insights: [],
        sift_intelligence_summary: {
          opportunities_detected: 0,
          urgent_action_required: 0,
          hot_leads_heating_up: 0,
          conversations_at_risk: 0,
          missed_follow_ups: 0,
          unread_but_important: 0
        },
        timestamp: new Date().toISOString(),
        userEmail
      });
    }

    // Create email lookup map for fast access
    const emailMap = new Map<string, EmailDetail>();
    filteredEmails.forEach(email => emailMap.set(email.id, email));

    // Initialize AI service
    const aiConfig = new AIConfig();
    const aiService = aiConfig.getService();
    if (!aiService) {
      throw new Error('AI Service not available');
    }

    console.log('🤖 Sending emails to AI for analysis...');

    // Send emails to AI with explicit IDs for reference
    const aiData = await aiService.generateInboxIntelligence(filteredEmails, privacyMode);
    const rawInsights = aiData.inbox_intelligence || [];
    const stats = aiData.sift_intelligence_summary || {
      opportunities_detected: 0,
      urgent_action_required: 0,
      hot_leads_heating_up: 0,
      conversations_at_risk: 0,
      missed_follow_ups: 0,
      unread_but_important: 0
    };

    console.log(`🧠 AI generated ${rawInsights.length} insights`);

    // Helper function to parse sender from "From" header
    const parseSender = (fromHeader: string): { name: string; email: string } => {
      const match = fromHeader.match(/^(.+?)\s*<(.+)>$/);
      if (match) {
        return { name: match[1].trim().replace(/"/g, ''), email: match[2].trim() };
      }
      // If no angle brackets, treat entire string as email
      return { name: fromHeader.split('@')[0] || 'Unknown', email: fromHeader };
    };

    // Enrich insights with real email data
    const enrichedInsights = rawInsights.map((insight: any, idx: number) => {
      const category = insight.metadata?.category || insight.type || 'important';
      const involvedIds: string[] = insight.metadata?.emails_involved || [];

      // Find matching emails - either by ID or by best effort matching
      let enrichedEmails: EnrichedEmail[] = [];

      if (involvedIds.length > 0) {
        // Try to match by provided IDs
        enrichedEmails = involvedIds
          .map((id: string) => {
            const email = emailMap.get(id);
            if (email) {
              const sender = parseSender(email.from);
              return {
                id: email.id,
                subject: email.subject,
                snippet: email.snippet,
                sender,
                receivedAt: email.timestamp
              };
            }
            return null;
          })
          .filter((e): e is EnrichedEmail => e !== null);
      }

      // If no emails found by ID, we do not assign random emails anymore.
      // This ensures that only AI-verified emails are shown in insights.
      if (enrichedEmails.length === 0) {
        // Leave empty
      }

      // Determine card type for frontend styling
      let cardType = 'inbox-intelligence';
      switch (category) {
        case 'opportunity': cardType = 'opportunity'; break;
        case 'urgent': cardType = 'urgent-action'; break;
        case 'lead': cardType = 'hot-leads'; break;
        case 'risk': cardType = 'at-risk'; break;
        case 'follow_up': cardType = 'missed-followups'; break;
        case 'important': cardType = 'unread-important'; break;
      }

      // Create structured metadata with source emails for each category
      const createCategoryEmails = (cat: string) => cat === category ? enrichedEmails : [];

      return {
        id: insight.id || `insight-${Date.now()}-${idx}`,
        type: cardType,
        title: insight.title || 'Insight',
        content: insight.content || '',
        timestamp: insight.timestamp || new Date().toISOString(),
        metadata: {
          category,
          priority: insight.metadata?.priority || 'medium',
          source: 'sift-ai',
          emails_involved: enrichedEmails.map(e => e.id),
          opportunityDetails: createCategoryEmails('opportunity'),
          urgentItems: createCategoryEmails('urgent'),
          hotLeads: createCategoryEmails('lead'),
          atRiskConversations: createCategoryEmails('risk'),
          missedFollowUps: createCategoryEmails('follow_up'),
          unreadImportantEmails: createCategoryEmails('important')
        },
        source_emails: enrichedEmails
      };
    });

    console.log(`✨ Returning ${enrichedInsights.length} enriched insights`);

    // Increment usage after successful analysis
    await subscriptionService.incrementFeatureUsage(userEmail, FEATURE_TYPES.SIFT_ANALYSIS);

    return NextResponse.json({
      success: true,
      insights: enrichedInsights,
      sift_intelligence_summary: stats,
      nextPageToken,
      timestamp: new Date().toISOString(),
      userEmail
    });

  } catch (error: any) {
    console.error('💥 Insights API Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to generate insights',
      insights: [],
      sift_intelligence_summary: {
        opportunities_detected: 0,
        urgent_action_required: 0,
        hot_leads_heating_up: 0,
        conversations_at_risk: 0,
        missed_follow_ups: 0,
        unread_but_important: 0
      }
    }, { status: 500 });
  }
}
