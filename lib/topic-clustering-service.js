/**
 * Topic Clustering Service
 * Analyzes email content to identify and cluster conversation topics
 */

export class TopicClusteringService {
  constructor() {
    // Enhanced topic definitions with keywords and patterns
    this.topicDefinitions = {
      business: {
        name: 'Business & Strategy',
        keywords: [
          'business', 'company', 'corporate', 'enterprise', 'industry', 'market',
          'revenue', 'profit', 'sales', 'growth', 'expansion', 'strategy',
          'planning', 'vision', 'mission', 'goals', 'objectives', 'kpi',
          'metrics', 'performance', 'results', 'outcome', 'target', 'budget',
          'finance', 'investment', 'funding', 'capital', 'valuation', 'merger',
          'acquisition', 'partnership', 'collaboration', 'alliance', 'joint venture'
        ],
        patterns: [
          /\$\d+/, // Money amounts
          /\d+%/, // Percentages
          /\b\d+\s*(million|billion|k|m)\b/i, // Large numbers
          /\b(q[1-4]|quarter|annual|yearly)\b/i // Time periods
        ]
      },
      technical: {
        name: 'Technical & Development',
        keywords: [
          'technical', 'development', 'code', 'software', 'api', 'system',
          'server', 'database', 'programming', 'algorithm', 'framework',
          'platform', 'infrastructure', 'architecture', 'design', 'implementation',
          'deployment', 'integration', 'testing', 'debugging', 'optimization',
          'performance', 'scalability', 'security', 'reliability', 'maintenance',
          'update', 'upgrade', 'migration', 'automation', 'script', 'tool'
        ],
        patterns: [
          /\b(function|class|method|variable|object)\b/i,
          /\b(html|css|javascript|python|java|php|ruby|swift)\b/i,
          /\b(github|gitlab|bitbucket|jira|trello|slack)\b/i,
          /\b(api|rest|graphql|json|xml|http|https)\b/i
        ]
      },
      project: {
        name: 'Project Management',
        keywords: [
          'project', 'deadline', 'milestone', 'deliverable', 'timeline',
          'schedule', 'task', 'work', 'progress', 'status', 'update',
          'meeting', 'call', 'discussion', 'review', 'feedback', 'approval',
          'launch', 'release', 'deployment', 'implementation', 'execution',
          'planning', 'roadmap', 'sprint', 'iteration', 'phase', 'stage'
        ],
        patterns: [
          /\b(due|deadline|by)\s+\d+/i,
          /\b(meeting|call|sync)\s+(at|on)\b/i,
          /\b(todo|task|deliverable|milestone)\b/i,
          /\b(week|month|quarter)\s+\d+/i
        ]
      },
      personal: {
        name: 'Personal & Social',
        keywords: [
          'personal', 'family', 'weekend', 'vacation', 'holiday', 'birthday',
          'celebration', 'party', 'event', 'social', 'friend', 'relationship',
          'health', 'wellness', 'fitness', 'exercise', 'food', 'restaurant',
          'movie', 'music', 'book', 'hobby', 'interest', 'passion', 'fun',
          'relaxation', 'leisure', 'entertainment', 'travel', 'trip', 'journey'
        ],
        patterns: [
          /\b(happy|congrats|congratulations)\b/i,
          /\b(birthday|anniversary|celebration)\b/i,
          /\b(weekend|vacation|holiday|trip)\b/i,
          /\b(family|friend|spouse|partner)\b/i
        ]
      },
      sales: {
        name: 'Sales & Marketing',
        keywords: [
          'sale', 'deal', 'pricing', 'contract', 'proposal', 'quote',
          'customer', 'client', 'prospect', 'lead', 'pipeline', 'conversion',
          'marketing', 'campaign', 'promotion', 'advertising', 'brand',
          'product', 'service', 'solution', 'benefit', 'value', 'proposition',
          'negotiation', 'closing', 'agreement', 'terms', 'conditions'
        ],
        patterns: [
          /\$\d+/, // Pricing
          /\b(customer|client|prospect)\b/i,
          /\b(deal|contract|agreement)\b/i,
          /\b(proposal|quote|pricing)\b/i
        ]
      },
      support: {
        name: 'Support & Issues',
        keywords: [
          'support', 'help', 'issue', 'problem', 'troubleshoot', 'bug',
          'error', 'fix', 'solution', 'workaround', 'resolution', 'answer',
          'question', 'inquiry', 'request', 'complaint', 'feedback', 'concern',
          'challenge', 'obstacle', 'barrier', 'difficulty', 'trouble', 'crisis'
        ],
        patterns: [
          /\b(error|bug|issue|problem)\b/i,
          /\b(help|support|assist)\b/i,
          /\b(fix|resolve|solution)\b/i,
          /\b(question|inquiry|request)\b/i
        ]
      },
      meeting: {
        name: 'Meetings & Coordination',
        keywords: [
          'meeting', 'call', 'conference', 'discussion', 'sync', 'catch up',
          'touch base', 'check in', 'follow up', 'coordinate', 'organize',
          'schedule', 'calendar', 'availability', 'time', 'date', 'location',
          'venue', 'room', 'zoom', 'teams', 'skype', 'phone', 'video'
        ],
        patterns: [
          /\b(meeting|call|sync)\b/i,
          /\b(at|on)\s+\d+/i,
          /\b(zoom|teams|skype|phone)\b/i,
          /\b(schedule|calendar|availability)\b/i
        ]
      },
      career: {
        name: 'Career & Professional Development',
        keywords: [
          'career', 'job', 'role', 'position', 'title', 'responsibility',
          'promotion', 'advancement', 'growth', 'development', 'skill', 'training',
          'education', 'certification', 'experience', 'background', 'resume',
          'interview', 'hiring', 'recruitment', 'team', 'department', 'manager',
          'leadership', 'management', 'supervisor', 'mentor', 'coaching'
        ],
        patterns: [
          /\b(job|role|position)\b/i,
          /\b(team|department|manager)\b/i,
          /\b(skill|training|development)\b/i,
          /\b(career|promotion|advancement)\b/i
        ]
      }
    };

    // Stop words to ignore
    this.stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'may', 'might', 'must', 'can', 'shall', 'this', 'that', 'these', 'those',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us',
      'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'mine', 'yours'
    ]);
  }

  /**
   * Extract topics from email content
   */
  extractTopics(text) {
    if (!text || typeof text !== 'string') {
      return ['general'];
    }

    const cleanText = text.toLowerCase().trim();
    if (cleanText.length === 0) {
      return ['general'];
    }

    // Tokenize text
    const tokens = this.tokenize(cleanText);

    // Score each topic
    const topicScores = new Map();

    Object.entries(this.topicDefinitions).forEach(([topicKey, topicDef]) => {
      const score = this.scoreTopic(cleanText, tokens, topicDef);
      if (score > 0) {
        topicScores.set(topicKey, {
          name: topicDef.name,
          score: score,
          confidence: this.calculateTopicConfidence(score, topicDef)
        });
      }
    });

    // Sort topics by score and return top topics
    const sortedTopics = Array.from(topicScores.entries())
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 3) // Return top 3 topics
      .filter(([_, data]) => data.confidence > 30); // Only confident topics

    if (sortedTopics.length === 0) {
      return ['general'];
    }

    return sortedTopics.map(([key, data]) => key);
  }

  /**
   * Score a topic based on text content
   */
  scoreTopic(text, tokens, topicDef) {
    let score = 0;

    // Keyword matching
    tokens.forEach(token => {
      if (this.stopWords.has(token)) return;

      topicDef.keywords.forEach(keyword => {
        if (token.includes(keyword) || keyword.includes(token)) {
          score += 2; // Base score for keyword match
        }
      });
    });

    // Pattern matching
    topicDef.patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        score += matches.length * 3; // Higher score for pattern matches
      }
    });

    // Boost score for multiple mentions of the same topic
    const topicKeywordCount = tokens.filter(token =>
      topicDef.keywords.some(keyword => token.includes(keyword))
    ).length;

    if (topicKeywordCount > 1) {
      score += topicKeywordCount * 0.5; // Bonus for multiple mentions
    }

    return score;
  }

  /**
   * Calculate confidence in topic detection
   */
  calculateTopicConfidence(score, topicDef) {
    const maxPossibleScore = topicDef.keywords.length * 2 + topicDef.patterns.length * 3;
    const confidence = (score / Math.max(1, maxPossibleScore)) * 100;
    return Math.min(100, confidence);
  }

  /**
   * Tokenize text into words
   */
  tokenize(text) {
    return text.split(/[\s.,!?;:"()[\]{}\n\r\t]+/)
      .map(token => token.trim().toLowerCase())
      .filter(token => token.length > 2); // Filter out very short tokens
  }

  /**
   * Cluster topics for a contact across multiple emails
   */
  clusterContactTopics(userId, contactEmail, emails) {
    const topicClusters = new Map();

    emails.forEach(email => {
      const content = `${email.subject} ${email.snippet || ''}`.trim();
      if (!content) return;

      const topics = this.extractTopics(content);

      topics.forEach(topic => {
        if (!topicClusters.has(topic)) {
          topicClusters.set(topic, {
            name: this.topicDefinitions[topic]?.name || topic,
            emailCount: 0,
            totalScore: 0,
            firstMention: email.sent_date,
            lastMention: email.sent_date,
            keywords: new Set(),
            relatedTopics: new Set(),
            avgSentiment: 50,
            sentimentSum: 0,
            sentimentCount: 0
          });
        }

        const cluster = topicClusters.get(topic);
        cluster.emailCount++;

        // Extract keywords for this topic from this email
        const tokens = this.tokenize(content);
        tokens.forEach(token => {
          if (!this.stopWords.has(token) &&
              this.topicDefinitions[topic]?.keywords.some(kw => token.includes(kw))) {
            cluster.keywords.add(token);
          }
        });

        // Update date range
        if (new Date(email.sent_date) < new Date(cluster.firstMention)) {
          cluster.firstMention = email.sent_date;
        }
        if (new Date(email.sent_date) > new Date(cluster.lastMention)) {
          cluster.lastMention = email.sent_date;
        }

        // Track sentiment if available
        if (email.sentiment_score !== undefined) {
          cluster.sentimentSum += email.sentiment_score;
          cluster.sentimentCount++;
        }
      });
    });

    // Calculate final metrics for each cluster
    topicClusters.forEach((cluster, topic) => {
      cluster.avgSentiment = cluster.sentimentCount > 0
        ? cluster.sentimentSum / cluster.sentimentCount
        : 50;

      cluster.keywords = Array.from(cluster.keywords).slice(0, 10); // Top 10 keywords
      cluster.strength = this.calculateClusterStrength(cluster);
      cluster.recency = this.calculateRecency(cluster.lastMention);
      cluster.duration = this.calculateDuration(cluster.firstMention, cluster.lastMention);
    });

    return Array.from(topicClusters.entries()).map(([topic, cluster]) => ({
      topic,
      ...cluster
    }));
  }

  /**
   * Calculate cluster strength based on various factors
   */
  calculateClusterStrength(cluster) {
    const { emailCount, keywords, duration, avgSentiment } = cluster;

    // Base score from email count
    let strength = Math.min(100, emailCount * 10);

    // Bonus for keyword diversity
    strength += Math.min(20, keywords.length * 2);

    // Bonus for longer duration (sustained conversation)
    const durationDays = duration;
    if (durationDays > 30) strength += 15;
    else if (durationDays > 7) strength += 10;
    else if (durationDays > 1) strength += 5;

    // Bonus for positive sentiment
    if (avgSentiment > 60) strength += 10;
    else if (avgSentiment < 40) strength -= 10;

    return Math.max(0, Math.min(100, strength));
  }

  /**
   * Calculate recency score (more recent = higher score)
   */
  calculateRecency(lastMentionDate) {
    const now = new Date();
    const lastMention = new Date(lastMentionDate);
    const daysDiff = Math.floor((now - lastMention) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) return 100;
    if (daysDiff <= 1) return 90;
    if (daysDiff <= 3) return 80;
    if (daysDiff <= 7) return 60;
    if (daysDiff <= 14) return 40;
    if (daysDiff <= 30) return 20;
    return 0;
  }

  /**
   * Calculate duration in days
   */
  calculateDuration(firstMention, lastMention) {
    const first = new Date(firstMention);
    const last = new Date(lastMention);
    return Math.floor((last - first) / (1000 * 60 * 60 * 24));
  }

  /**
   * Analyze topic evolution over time
   */
  analyzeTopicEvolution(emails) {
    if (emails.length === 0) {
      return { evolution: [], trends: [], summary: 'No data available' };
    }

    // Sort emails by date
    const sortedEmails = emails.sort((a, b) => new Date(a.sent_date) - new Date(b.sent_date));

    // Group emails by time periods (weekly)
    const weeklyGroups = new Map();

    sortedEmails.forEach(email => {
      const date = new Date(email.sent_date);
      const weekKey = this.getWeekKey(date);

      if (!weeklyGroups.has(weekKey)) {
        weeklyGroups.set(weekKey, []);
      }
      weeklyGroups.get(weekKey).push(email);
    });

    // Analyze topics for each week
    const evolution = [];
    const topicTrends = new Map();

    Array.from(weeklyGroups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([week, weekEmails]) => {
        const weekTopics = new Map();

        weekEmails.forEach(email => {
          const content = `${email.subject} ${email.snippet || ''}`;
          const topics = this.extractTopics(content);

          topics.forEach(topic => {
            weekTopics.set(topic, (weekTopics.get(topic) || 0) + 1);
          });
        });

        // Store weekly topic data
        evolution.push({
          week,
          topics: Array.from(weekTopics.entries()).map(([topic, count]) => ({
            topic,
            count,
            name: this.topicDefinitions[topic]?.name || topic
          }))
        });

        // Track topic trends
        weekTopics.forEach((count, topic) => {
          if (!topicTrends.has(topic)) {
            topicTrends.set(topic, []);
          }
          topicTrends.get(topic).push({ week, count });
        });
      });

    // Calculate trends
    const trends = Array.from(topicTrends.entries()).map(([topic, data]) => ({
      topic,
      name: this.topicDefinitions[topic]?.name || topic,
      trend: this.calculateTopicTrend(data),
      totalMentions: data.reduce((sum, d) => sum + d.count, 0),
      firstMention: data[0]?.week,
      lastMention: data[data.length - 1]?.week
    }));

    return {
      evolution,
      trends: trends.sort((a, b) => b.totalMentions - a.totalMentions),
      summary: this.generateEvolutionSummary(evolution, trends)
    };
  }

  /**
   * Calculate trend for a specific topic
   */
  calculateTopicTrend(data) {
    if (data.length < 2) return 'stable';

    const firstHalf = data.slice(0, Math.ceil(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const firstAvg = firstHalf.reduce((sum, d) => sum + d.count, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.count, 0) / secondHalf.length;

    const change = secondAvg - firstAvg;

    if (change > 0.5) return 'increasing';
    if (change < -0.5) return 'decreasing';
    return 'stable';
  }

  /**
   * Generate summary of topic evolution
   */
  generateEvolutionSummary(evolution, trends) {
    if (trends.length === 0) return 'No topics detected';

    const topTopics = trends.slice(0, 3);
    const increasingTopics = trends.filter(t => t.trend === 'increasing');
    const decreasingTopics = trends.filter(t => t.trend === 'decreasing');

    let summary = `Conversation covers ${trends.length} main topics. `;

    if (topTopics.length > 0) {
      summary += `Most discussed: ${topTopics.map(t => t.name).join(', ')}. `;
    }

    if (increasingTopics.length > 0) {
      summary += `Growing topics: ${increasingTopics.slice(0, 2).map(t => t.name).join(', ')}. `;
    }

    if (decreasingTopics.length > 0) {
      summary += `Declining topics: ${decreasingTopics.slice(0, 2).map(t => t.name).join(', ')}. `;
    }

    return summary.trim();
  }

  /**
   * Get week key for grouping
   */
  getWeekKey(date) {
    const year = date.getFullYear();
    const week = Math.ceil((date.getDate() - date.getDay() + 1) / 7);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }

  /**
   * Find related topics based on co-occurrence
   */
  findRelatedTopics(emails) {
    const topicCooccurrence = new Map();

    emails.forEach(email => {
      const content = `${email.subject} ${email.snippet || ''}`;
      const topics = this.extractTopics(content);

      // Count co-occurrences
      for (let i = 0; i < topics.length; i++) {
        for (let j = i + 1; j < topics.length; j++) {
          const pair = [topics[i], topics[j]].sort().join('-');

          if (!topicCooccurrence.has(pair)) {
            topicCooccurrence.set(pair, 0);
          }
          topicCooccurrence.set(pair, topicCooccurrence.get(pair) + 1);
        }
      }
    });

    // Convert to array and sort by co-occurrence strength
    return Array.from(topicCooccurrence.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([pair, count]) => ({
        topics: pair.split('-'),
        topicNames: pair.split('-').map(t => this.topicDefinitions[t]?.name || t),
        cooccurrenceCount: count
      }));
  }
}