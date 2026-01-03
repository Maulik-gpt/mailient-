/**
 * Sift AI Email Classification Service
 * Categorizes emails into 6 specific categories for entrepreneurial productivity
 */

export class SiftAIEmailClassifier {
  constructor() {
    // Classification patterns for each category
    this.patterns = {
      opportunities: {
        keywords: [
          'buy', 'purchase', 'order', 'budget', 'quote', 'pricing', 'proposal', 
          'contract', 'demo', 'trial', 'interested', 'looking for', 'need',
          'requirement', 'specification', 'investment', 'funding', 'partnership',
          'collaboration', 'integration', 'investor', 'vc', 'seed', 'series',
          'valuation', 'pitch', 'deck', 'upsell', 'upgrade', 'enterprise'
        ],
        scoreWeight: 1.0
      },
      urgent_action: {
        keywords: [
          'urgent', 'asap', 'immediately', 'deadline', 'today', 'emergency',
          'waiting', 'follow up', 'overdue', 'promised', 'expecting',
          'angry', 'frustrated', 'disappointed', 'complaint', 'escalate'
        ],
        scoreWeight: 1.2
      },
      hot_leads: {
        keywords: [
          'opened', 'clicked', 'link', 'multiple times', 'engagement',
          'renewed', 'interested again', 'reopened', 're-engaged',
          'following up', 'circle back', 'ping', 'reach out'
        ],
        scoreWeight: 1.1
      },
      conversations_at_risk: {
        keywords: [
          'no response', 'heard back', 'silence', 'cold', 'slow',
          'stalled', 'confusion', 'frustrated', 'negative tone',
          'momentum', 'lost interest', 'unclear', 'question'
        ],
        scoreWeight: 1.0
      },
      missed_follow_ups: {
        keywords: [
          'said i would', 'promised to', 'will send', 'will schedule',
          'will reply', 'will update', 'get back to you', 'follow up',
          'next steps', 'action item', 'todo', 'remember to'
        ],
        scoreWeight: 0.9
      },
      unread_important: {
        keywords: [
          'revenue', 'deal', 'million', 'billion', 'enterprise',
          'investor', 'board', 'strategic', 'deadline', 'launch',
          'funding', 'acquisition', 'partnership', 'important'
        ],
        scoreWeight: 0.8
      }
    };

    // Email context patterns
    this.contextPatterns = {
      senderImportance: {
        investors: ['vc', 'investor', 'fund', 'angel', 'partner'],
        enterprise: ['enterprise', 'fortune', 'corp', 'corporation'],
        keyContacts: ['ceo', 'cto', 'founder', 'vp', 'director']
      },
      urgencyIndicators: [
        'urgent', 'asap', 'deadline', 'today', 'immediately',
        'time sensitive', 'priority', 'critical', 'emergency'
      ],
      engagementSignals: [
        'opened', 'clicked', 'forwarded', 'replied', 'responded',
        'engaged', 'interested', 'following up'
      ]
    };
  }

  /**
   * Classify a single email into Sift AI categories
   */
  classifyEmail(email, threadContext = null) {
    const classifications = [];
    
    // Analyze email content
    const content = this.extractEmailContent(email);
    const senderAnalysis = this.analyzeSender(email.from);
    const temporalAnalysis = this.analyzeTemporalContext(email, threadContext);
    
    // Check each category
    for (const [category, config] of Object.entries(this.patterns)) {
      const score = this.calculateCategoryScore(
        category, 
        content, 
        senderAnalysis, 
        temporalAnalysis
      );
      
      if (score > 0.3) { // Minimum threshold
        classifications.push({
          category,
          score,
          signals: this.extractSignals(category, content),
          reasoning: this.generateReasoning(category, content, score),
          priority: this.calculatePriority(category, score, temporalAnalysis)
        });
      }
    }

    // Return top classification or multiple if scores are close
    classifications.sort((a, b) => b.score - a.score);
    
    return {
      primaryCategory: classifications[0]?.category || 'general',
      allClassifications: classifications,
      confidence: classifications[0]?.score || 0,
      requiresAction: classifications.some(c => 
        ['urgent_action', 'missed_follow_ups', 'conversations_at_risk'].includes(c.category)
      )
    };
  }

  /**
   * Batch classify multiple emails
   */
  batchClassifyEmails(emails) {
    return emails.map((email, index) => {
      const threadContext = this.getThreadContext(emails, index);
      const classification = this.classifyEmail(email, threadContext);
      
      return {
        ...email,
        siftClassification: classification,
        emailId: email.id || `email-${index}`,
        timestamp: new Date().toISOString()
      };
    });
  }

  /**
   * Generate insights for the 6 Sift AI categories
   */
  generateSiftInsights(classifiedEmails) {
    const insights = {
      opportunities_detected: [],
      urgent_action_required: [],
      hot_leads_heating_up: [],
      conversations_at_risk: [],
      missed_follow_ups: [],
      unread_but_important: []
    };

    // Categorize emails
    classifiedEmails.forEach(email => {
      const classification = email.siftClassification;
      
      if (classification.primaryCategory === 'opportunities') {
        insights.opportunities_detected.push(this.formatOpportunity(email, classification));
      } else if (classification.primaryCategory === 'urgent_action') {
        insights.urgent_action_required.push(this.formatUrgentAction(email, classification));
      } else if (classification.primaryCategory === 'hot_leads') {
        insights.hot_leads_heating_up.push(this.formatHotLead(email, classification));
      } else if (classification.primaryCategory === 'conversations_at_risk') {
        insights.conversations_at_risk.push(this.formatAtRisk(email, classification));
      } else if (classification.primaryCategory === 'missed_follow_ups') {
        insights.missed_follow_ups.push(this.formatMissedFollowUp(email, classification));
      } else if (classification.primaryCategory === 'unread_important') {
        insights.unread_but_important.push(this.formatUnreadImportant(email, classification));
      }
    });

    return insights;
  }

  /**
   * Extract and clean email content for analysis
   */
  extractEmailContent(email) {
    return {
      subject: (email.subject || '').toLowerCase(),
      snippet: (email.snippet || '').toLowerCase(),
      body: (email.body || '').toLowerCase(),
      from: (email.from || '').toLowerCase(),
      combined: `${email.subject || ''} ${email.snippet || ''} ${email.body || ''}`.toLowerCase()
    };
  }

  /**
   * Analyze sender for importance signals
   */
  analyzeSender(fromEmail) {
    const sender = fromEmail.toLowerCase();
    const importance = {
      isInvestor: false,
      isEnterprise: false,
      isKeyContact: false,
      domain: sender.split('@')[1] || '',
      name: sender.split('<')[0].trim()
    };

    // Check for investor domains/signals
    if (this.contextPatterns.senderImportance.investors.some(pattern => sender.includes(pattern))) {
      importance.isInvestor = true;
    }

    // Check for enterprise signals
    if (this.contextPatterns.senderImportance.enterprise.some(pattern => sender.includes(pattern))) {
      importance.isEnterprise = true;
    }

    // Check for key contacts
    if (this.contextPatterns.senderImportance.keyContacts.some(pattern => sender.includes(pattern))) {
      importance.isKeyContact = true;
    }

    return importance;
  }

  /**
   * Analyze temporal context (when email was sent, thread history, etc.)
   */
  analyzeTemporalContext(email, threadContext) {
    const now = new Date();
    const emailDate = new Date(email.date || Date.now());
    const hoursSinceEmail = (now - emailDate) / (1000 * 60 * 60);
    
    return {
      hoursSinceEmail,
      daysSinceEmail: hoursSinceEmail / 24,
      isRecent: hoursSinceEmail < 24,
      isStale: hoursSinceEmail > 72,
      threadLength: threadContext?.length || 0,
      lastResponseTime: threadContext?.lastResponseTime || null
    };
  }

  /**
   * Calculate score for a specific category
   */
  calculateCategoryScore(category, content, senderAnalysis, temporalAnalysis) {
    const config = this.patterns[category];
    let score = 0;

    // Keyword matching
    const keywordMatches = config.keywords.filter(keyword => 
      content.combined.includes(keyword)
    ).length;
    score += keywordMatches * config.scoreWeight;

    // Sender importance boosts
    if (senderAnalysis.isInvestor && category === 'opportunities') score += 2;
    if (senderAnalysis.isEnterprise && ['urgent_action', 'unread_important'].includes(category)) score += 1.5;
    if (senderAnalysis.isKeyContact && category !== 'general') score += 1;

    // Temporal boosts
    if (temporalAnalysis.isRecent && ['urgent_action', 'hot_leads'].includes(category)) score += 1;
    if (temporalAnalysis.isStale && ['conversations_at_risk', 'missed_follow_ups'].includes(category)) score += 1.5;

    // Normalize score (0-1 range)
    return Math.min(score / 10, 1);
  }

  /**
   * Extract specific signals for a category
   */
  extractSignals(category, content) {
    const signals = [];
    
    switch (category) {
      case 'opportunities':
        if (content.combined.includes('buy') || content.combined.includes('purchase')) signals.push('buying_signals');
        if (content.combined.includes('partnership') || content.combined.includes('collaboration')) signals.push('partnership_interest');
        if (content.combined.includes('invest') || content.combined.includes('funding')) signals.push('investor_curiosity');
        if (content.combined.includes('upgrade') || content.combined.includes('upsell')) signals.push('upsell_potential');
        break;
        
      case 'urgent_action':
        if (content.combined.includes('waiting') || content.combined.includes('expecting')) signals.push('someone_waiting');
        if (content.combined.includes('cold') || content.combined.includes('stalled')) signals.push('deal_going_cold');
        if (content.combined.includes('deadline') || content.combined.includes('asap')) signals.push('deadline_mentioned');
        if (content.combined.includes('angry') || content.combined.includes('frustrated')) signals.push('angry_customer');
        if (content.combined.includes('promised') || content.combined.includes('overdue')) signals.push('promised_followup_overdue');
        break;
        
      case 'hot_leads':
        if (content.combined.includes('opened') && content.combined.includes('multiple')) signals.push('multiple_opens');
        if (content.combined.includes('clicked') || content.combined.includes('link')) signals.push('clicked_links');
        if (content.combined.includes('replied') && content.combined.includes('silence')) signals.push('replied_after_silence');
        if (content.combined.includes('engagement') || content.combined.includes('renewed')) signals.push('renewed_engagement');
        break;
        
      case 'conversations_at_risk':
        if (content.combined.includes('no response') || content.combined.includes('heard back')) signals.push('no_response');
        if (content.combined.includes('negative') || content.combined.includes('frustrated')) signals.push('negative_tone');
        if (content.combined.includes('slow') || content.combined.includes('momentum')) signals.push('deal_momentum_slowed');
        if (content.combined.includes('confusion') || content.combined.includes('unclear')) signals.push('confusion_frustration');
        break;
        
      case 'missed_follow_ups':
        if (content.combined.includes('send') || content.combined.includes('schedule')) signals.push('promised_to_send');
        if (content.combined.includes('reply') || content.combined.includes('update')) signals.push('promised_to_update');
        if (content.combined.includes('get back') || content.combined.includes('follow up')) signals.push('promised_to_followup');
        break;
        
      case 'unread_important':
        if (content.combined.includes('revenue') || content.combined.includes('deal')) signals.push('revenue_impact');
        if (content.combined.includes('enterprise') || content.combined.includes('major')) signals.push('major_accounts');
        if (content.combined.includes('investor') || content.combined.includes('funding')) signals.push('investors');
        if (content.combined.includes('deadline') || content.combined.includes('launch')) signals.push('deadlines');
        break;
    }
    
    return signals;
  }

  /**
   * Generate human-readable reasoning
   */
  generateReasoning(category, content, score) {
    const reasons = [];
    
    if (score > 0.8) reasons.push('Strong indicators detected');
    else if (score > 0.6) reasons.push('Multiple relevant signals');
    else if (score > 0.4) reasons.push('Some relevant patterns found');
    else reasons.push('Potential match');
    
    // Add category-specific reasoning
    switch (category) {
      case 'opportunities':
        reasons.push('buying signals, partnership interest, or investment inquiry detected');
        break;
      case 'urgent_action':
        reasons.push('urgent keywords, waiting responses, or deadline pressure identified');
        break;
      case 'hot_leads':
        reasons.push('high engagement signals and reopening patterns detected');
        break;
      case 'conversations_at_risk':
        reasons.push('communication breakdown or negative sentiment detected');
        break;
      case 'missed_follow_ups':
        reasons.push('promised actions or overdue follow-ups identified');
        break;
      case 'unread_important':
        reasons.push('high-value senders or strategic topics detected');
        break;
    }
    
    return reasons.join(', ');
  }

  /**
   * Calculate priority level
   */
  calculatePriority(category, score, temporalAnalysis) {
    let priority = 'medium';
    
    if (score > 0.8) priority = 'high';
    else if (score < 0.4) priority = 'low';
    
    // Category-specific priority adjustments
    if (['urgent_action', 'missed_follow_ups'].includes(category) && temporalAnalysis.isStale) {
      priority = 'high';
    }
    
    if (category === 'unread_important' && temporalAnalysis.daysSinceEmail > 1) {
      priority = 'high';
    }
    
    return priority;
  }

  /**
   * Get thread context for analysis
   */
  getThreadContext(emails, currentIndex) {
    const currentEmail = emails[currentIndex];
    const threadEmails = emails.filter(e => e.threadId === currentEmail.threadId);
    
    return {
      length: threadEmails.length,
      lastResponseTime: threadEmails.length > 1 ? 
        threadEmails[threadEmails.length - 2].date : null,
      responseDelay: this.calculateResponseDelay(threadEmails)
    };
  }

  /**
   * Calculate response delay in thread
   */
  calculateResponseDelay(threadEmails) {
    if (threadEmails.length < 2) return 0;
    
    const lastTwo = threadEmails.slice(-2);
    const delay = new Date(lastTwo[1].date) - new Date(lastTwo[0].date);
    return delay / (1000 * 60 * 60); // hours
  }

  // Formatting methods for each category
  formatOpportunity(email, classification) {
    const senderName = email.from?.split('<')[0]?.trim() || 'Unknown';
    return {
      id: email.id,
      title: `${senderName} - Investment/Partnership Opportunity`,
      description: `High-potential ${classification.signals.includes('investor_curiosity') ? 'investment' : 'business'} opportunity detected`,
      sender: senderName,
      email: email.from,
      score: Math.round(classification.score * 100),
      signals: classification.signals,
      reasoning: classification.reasoning,
      nextAction: 'Schedule discovery call',
      priority: classification.priority,
      emailId: email.id
    };
  }

  formatUrgentAction(email, classification) {
    return {
      id: email.id,
      subject: email.subject,
      reason: classification.reasoning,
      urgency: classification.score > 0.7 ? 'critical' : 'high',
      recommendedAction: this.getUrgentAction(classification.signals),
      deadline: this.calculateDeadline(classification.signals),
      emailId: email.id
    };
  }

  formatHotLead(email, classification) {
    const senderName = email.from?.split('<')[0]?.trim() || 'Unknown';
    return {
      id: email.id,
      name: senderName,
      email: email.from,
      engagementScore: Math.round(classification.score * 100),
      signals: classification.signals,
      trend: 'heating_up',
      lastActivity: email.date,
      nextAction: 'Engage with personalized follow-up',
      emailId: email.id
    };
  }

  formatAtRisk(email, classification) {
    return {
      id: email.id,
      subject: email.subject,
      riskLevel: classification.score > 0.7 ? 'high' : 'medium',
      riskFactors: classification.signals,
      recommendedAction: 'Immediate personalized outreach',
      emailId: email.id
    };
  }

  formatMissedFollowUp(email, classification) {
    return {
      id: email.id,
      subject: email.subject,
      promisedAction: this.extractPromisedAction(email),
      daysOverdue: Math.floor((new Date() - new Date(email.date)) / (1000 * 60 * 60 * 24)),
      recommendedAction: 'Complete promised action immediately',
      emailId: email.id
    };
  }

  formatUnreadImportant(email, classification) {
    return {
      id: email.id,
      subject: email.subject,
      importance: classification.score > 0.7 ? 'critical' : 'high',
      importanceFactors: classification.signals,
      recommendedAction: 'Review and respond based on strategic value',
      emailId: email.id
    };
  }

  // Helper methods
  getUrgentAction(signals) {
    if (signals.includes('someone_waiting')) return 'Respond immediately';
    if (signals.includes('deal_going_cold')) return 'Revive conversation';
    if (signals.includes('deadline_mentioned')) return 'Meet deadline';
    if (signals.includes('angry_customer')) return 'Address concerns';
    if (signals.includes('promised_followup_overdue')) return 'Honor promise';
    return 'Take appropriate action';
  }

  calculateDeadline(signals) {
    if (signals.includes('deadline_mentioned')) {
      return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    }
    return null;
  }

  extractPromisedAction(email) {
    const content = `${email.subject} ${email.snippet}`.toLowerCase();
    if (content.includes('send')) return 'Send promised materials';
    if (content.includes('schedule')) return 'Schedule promised meeting';
    if (content.includes('reply')) return 'Provide promised response';
    if (content.includes('update')) return 'Send promised update';
    return 'Complete promised action';
  }
}