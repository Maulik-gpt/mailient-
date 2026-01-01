/**
 * Engagement Level Service
 * Calculates engagement scores based on email content, interaction patterns, and communication depth
 */

export class EngagementLevelService {
  constructor() {
    // Engagement thresholds
    this.engagementThresholds = {
      wordCount: {
        low: 20,
        medium: 100,
        high: 300
      },
      characterCount: {
        low: 100,
        medium: 500,
        high: 2000
      },
      responseTime: {
        excellent: 2,    // hours
        good: 6,
        fair: 24,
        poor: 72
      }
    };

    // Engagement indicators and their weights
    this.engagementIndicators = {
      contentLength: 0.25,
      responseSpeed: 0.20,
      interactionDepth: 0.20,
      attachmentUsage: 0.15,
      questionFrequency: 0.10,
      linkSharing: 0.10
    };
  }

  /**
   * Calculate engagement level for a contact
   */
  calculateEngagementLevel(userId, contactEmail, emails) {
    if (!emails || emails.length === 0) {
      return {
        overallScore: 0,
        indicators: {},
        insights: ['No email data available for engagement analysis'],
        trends: null
      };
    }

    // Calculate individual engagement indicators
    const indicators = {
      contentLength: this.calculateContentLengthScore(emails),
      responseSpeed: this.calculateResponseSpeedScore(emails),
      interactionDepth: this.calculateInteractionDepthScore(emails),
      attachmentUsage: this.calculateAttachmentUsageScore(emails),
      questionFrequency: this.calculateQuestionFrequencyScore(emails),
      linkSharing: this.calculateLinkSharingScore(emails)
    };

    // Calculate overall engagement score
    const overallScore = this.calculateOverallEngagementScore(indicators);

    // Analyze engagement trends
    const trends = this.analyzeEngagementTrends(emails);

    // Generate insights
    const insights = this.generateEngagementInsights(indicators, overallScore);

    return {
      overallScore: Math.round(overallScore),
      indicators: Object.fromEntries(
        Object.entries(indicators).map(([key, value]) => [key, Math.round(value)])
      ),
      insights,
      trends,
      details: {
        totalEmails: emails.length,
        avgWordCount: this.calculateAverageWordCount(emails),
        avgResponseTime: this.calculateAverageResponseTime(emails),
        attachmentRate: this.calculateAttachmentRate(emails),
        questionRate: this.calculateQuestionRate(emails)
      }
    };
  }

  /**
   * Calculate content length engagement score
   */
  calculateContentLengthScore(emails) {
    if (emails.length === 0) return 0;

    let totalScore = 0;

    emails.forEach(email => {
      const wordCount = email.word_count || 0;
      const characterCount = email.character_count || 0;

      // Score based on word count
      let wordScore = 0;
      if (wordCount >= this.engagementThresholds.wordCount.high) {
        wordScore = 100;
      } else if (wordCount >= this.engagementThresholds.wordCount.medium) {
        wordScore = 70 + ((wordCount - this.engagementThresholds.wordCount.medium) /
          (this.engagementThresholds.wordCount.high - this.engagementThresholds.wordCount.medium)) * 30;
      } else if (wordCount >= this.engagementThresholds.wordCount.low) {
        wordScore = 30 + ((wordCount - this.engagementThresholds.wordCount.low) /
          (this.engagementThresholds.wordCount.medium - this.engagementThresholds.wordCount.low)) * 40;
      } else {
        wordScore = Math.max(0, (wordCount / this.engagementThresholds.wordCount.low) * 30);
      }

      // Bonus for character count (indicates detailed content)
      let characterBonus = 0;
      if (characterCount >= this.engagementThresholds.characterCount.high) {
        characterBonus = 20;
      } else if (characterCount >= this.engagementThresholds.characterCount.medium) {
        characterBonus = 10;
      }

      const emailScore = Math.min(100, wordScore + characterBonus);
      totalScore += emailScore;
    });

    return totalScore / emails.length;
  }

  /**
   * Calculate response speed engagement score
   */
  calculateResponseSpeedScore(emails) {
    const responseTimes = emails
      .filter(email => email.response_time_hours !== null && email.response_time_hours !== undefined)
      .map(email => email.response_time_hours);

    if (responseTimes.length === 0) return 50; // Neutral score if no response data

    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;

    // Score based on response time
    let score = 0;
    if (avgResponseTime <= this.engagementThresholds.responseTime.excellent) {
      score = 100;
    } else if (avgResponseTime <= this.engagementThresholds.responseTime.good) {
      score = 80 + ((this.engagementThresholds.responseTime.good - avgResponseTime) /
        this.engagementThresholds.responseTime.good) * 20;
    } else if (avgResponseTime <= this.engagementThresholds.responseTime.fair) {
      score = 50 + ((this.engagementThresholds.responseTime.fair - avgResponseTime) /
        this.engagementThresholds.responseTime.fair) * 30;
    } else if (avgResponseTime <= this.engagementThresholds.responseTime.poor) {
      score = 20 + ((this.engagementThresholds.responseTime.poor - avgResponseTime) /
        this.engagementThresholds.responseTime.poor) * 30;
    } else {
      score = Math.max(0, 20 - ((avgResponseTime - this.engagementThresholds.responseTime.poor) /
        this.engagementThresholds.responseTime.poor) * 20);
    }

    return score;
  }

  /**
   * Calculate interaction depth score
   */
  calculateInteractionDepthScore(emails) {
    if (emails.length === 0) return 0;

    // Group emails by thread
    const threadGroups = new Map();
    emails.forEach(email => {
      if (!email.thread_id) return;

      if (!threadGroups.has(email.thread_id)) {
        threadGroups.set(email.thread_id, []);
      }
      threadGroups.get(email.thread_id).push(email);
    });

    let totalDepthScore = 0;
    let threadCount = 0;

    threadGroups.forEach((threadEmails, threadId) => {
      const threadLength = threadEmails.length;

      // Score based on thread length (longer threads = deeper engagement)
      let threadScore = 0;
      if (threadLength >= 5) {
        threadScore = 100;
      } else if (threadLength >= 3) {
        threadScore = 60 + ((threadLength - 3) / 2) * 40;
      } else if (threadLength >= 2) {
        threadScore = 30 + (threadLength - 2) * 30;
      } else {
        threadScore = 20; // Single emails get minimal score
      }

      totalDepthScore += threadScore;
      threadCount++;
    });

    // Add score for emails not in threads (standalone emails)
    const standaloneEmails = emails.filter(email => !email.thread_id);
    totalDepthScore += standaloneEmails.length * 10; // Lower score for standalone emails
    threadCount += standaloneEmails.length;

    return threadCount > 0 ? totalDepthScore / threadCount : 0;
  }

  /**
   * Calculate attachment usage score
   */
  calculateAttachmentUsageScore(emails) {
    if (emails.length === 0) return 0;

    const emailsWithAttachments = emails.filter(email => email.has_attachments).length;
    const attachmentRate = emailsWithAttachments / emails.length;

    // Score based on attachment usage (moderate usage is best)
    if (attachmentRate >= 0.5) {
      return Math.min(100, 60 + (attachmentRate - 0.5) * 80); // 50%+ gets bonus
    } else if (attachmentRate >= 0.2) {
      return 40 + (attachmentRate - 0.2) * 100; // 20-50% is good range
    } else {
      return Math.max(0, attachmentRate * 200); // Below 20% gets lower score
    }
  }

  /**
   * Calculate question frequency score
   */
  calculateQuestionFrequencyScore(emails) {
    if (emails.length === 0) return 0;

    const emailsWithQuestions = emails.filter(email => email.has_questions).length;
    const questionRate = emailsWithQuestions / emails.length;

    // Score based on question frequency (indicates engagement and curiosity)
    return Math.min(100, questionRate * 200); // Scale to 0-100 (50% questions = 100 score)
  }

  /**
   * Calculate link sharing score
   */
  calculateLinkSharingScore(emails) {
    if (emails.length === 0) return 0;

    const emailsWithLinks = emails.filter(email => email.has_links).length;
    const linkRate = emailsWithLinks / emails.length;

    // Score based on link sharing (indicates resource sharing and collaboration)
    return Math.min(100, linkRate * 150); // Scale to 0-100 (67% links = 100 score)
  }

  /**
   * Calculate overall engagement score from indicators
   */
  calculateOverallEngagementScore(indicators) {
    let totalScore = 0;

    Object.entries(this.engagementIndicators).forEach(([indicator, weight]) => {
      totalScore += indicators[indicator] * weight;
    });

    return Math.max(0, Math.min(100, totalScore));
  }

  /**
   * Analyze engagement trends over time
   */
  analyzeEngagementTrends(emails) {
    if (emails.length < 3) {
      return null;
    }

    // Sort emails by date
    const sortedEmails = emails.sort((a, b) => new Date(a.sent_date) - new Date(b.sent_date));

    // Create time windows (monthly)
    const monthlyGroups = new Map();

    sortedEmails.forEach(email => {
      const date = new Date(email.sent_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyGroups.has(monthKey)) {
        monthlyGroups.set(monthKey, []);
      }
      monthlyGroups.get(monthKey).push(email);
    });

    // Calculate engagement for each month
    const monthlyEngagement = [];

    Array.from(monthlyGroups.entries()).forEach(([month, monthEmails]) => {
      const monthIndicators = {
        contentLength: this.calculateContentLengthScore(monthEmails),
        responseSpeed: this.calculateResponseSpeedScore(monthEmails),
        interactionDepth: this.calculateInteractionDepthScore(monthEmails),
        attachmentUsage: this.calculateAttachmentUsageScore(monthEmails),
        questionFrequency: this.calculateQuestionFrequencyScore(monthEmails),
        linkSharing: this.calculateLinkSharingScore(monthEmails)
      };

      const monthScore = this.calculateOverallEngagementScore(monthIndicators);

      monthlyEngagement.push({
        month,
        score: monthScore,
        emailCount: monthEmails.length,
        indicators: monthIndicators
      });
    });

    // Calculate trend
    if (monthlyEngagement.length < 2) {
      return { trend: 'stable', data: monthlyEngagement };
    }

    const scores = monthlyEngagement.map(m => m.score);
    const firstHalfAvg = scores.slice(0, Math.ceil(scores.length / 2)).reduce((sum, s) => sum + s, 0) /
                        Math.ceil(scores.length / 2);
    const secondHalfAvg = scores.slice(Math.floor(scores.length / 2)).reduce((sum, s) => sum + s, 0) /
                         Math.floor(scores.length / 2);

    const trendValue = secondHalfAvg - firstHalfAvg;
    let trend = 'stable';

    if (trendValue > 5) trend = 'increasing';
    else if (trendValue < -5) trend = 'decreasing';

    return {
      trend,
      trendValue: Math.round(trendValue * 10) / 10,
      data: monthlyEngagement
    };
  }

  /**
   * Generate engagement insights
   */
  generateEngagementInsights(indicators, overallScore) {
    const insights = [];

    // Overall engagement level
    if (overallScore >= 80) {
      insights.push('Exceptionally high engagement - this contact is very invested in communication');
    } else if (overallScore >= 60) {
      insights.push('Good engagement level - communication is active and meaningful');
    } else if (overallScore >= 40) {
      insights.push('Moderate engagement - there is room for improvement in communication depth');
    } else {
      insights.push('Low engagement - consider ways to increase interaction and communication depth');
    }

    // Content length insights
    if (indicators.contentLength >= 80) {
      insights.push('Detailed, thoughtful communication style with substantial content');
    } else if (indicators.contentLength <= 30) {
      insights.push('Communication tends to be brief - may benefit from more detailed exchanges');
    }

    // Response speed insights
    if (indicators.responseSpeed >= 80) {
      insights.push('Very responsive communication pattern indicates high priority and attentiveness');
    } else if (indicators.responseSpeed <= 30) {
      insights.push('Slower response times suggest this may not be a high-priority relationship');
    }

    // Interaction depth insights
    if (indicators.interactionDepth >= 80) {
      insights.push('Deep engagement in email threads shows sustained interest and investment');
    } else if (indicators.interactionDepth <= 30) {
      insights.push('Limited thread engagement suggests more transactional communication style');
    }

    // Attachment usage insights
    if (indicators.attachmentUsage >= 70) {
      insights.push('Frequent sharing of documents and files indicates collaborative work style');
    } else if (indicators.attachmentUsage <= 20) {
      insights.push('Limited document sharing - mostly text-based communication');
    }

    // Question frequency insights
    if (indicators.questionFrequency >= 70) {
      insights.push('High frequency of questions indicates curiosity and active learning mindset');
    }

    // Link sharing insights
    if (indicators.linkSharing >= 70) {
      insights.push('Frequent resource sharing suggests collaborative and helpful communication style');
    }

    return insights;
  }

  /**
   * Helper function to calculate average word count
   */
  calculateAverageWordCount(emails) {
    if (emails.length === 0) return 0;

    const totalWords = emails.reduce((sum, email) => sum + (email.word_count || 0), 0);
    return Math.round(totalWords / emails.length);
  }

  /**
   * Helper function to calculate average response time
   */
  calculateAverageResponseTime(emails) {
    const responseTimes = emails
      .filter(email => email.response_time_hours !== null)
      .map(email => email.response_time_hours);

    if (responseTimes.length === 0) return null;

    return Math.round((responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length) * 10) / 10;
  }

  /**
   * Helper function to calculate attachment rate
   */
  calculateAttachmentRate(emails) {
    if (emails.length === 0) return 0;

    const emailsWithAttachments = emails.filter(email => email.has_attachments).length;
    return Math.round((emailsWithAttachments / emails.length) * 100);
  }

  /**
   * Helper function to calculate question rate
   */
  calculateQuestionRate(emails) {
    if (emails.length === 0) return 0;

    const emailsWithQuestions = emails.filter(email => email.has_questions).length;
    return Math.round((emailsWithQuestions / emails.length) * 100);
  }

  /**
   * Analyze engagement patterns by topic
   */
  analyzeEngagementByTopic(emails) {
    const topicEngagement = new Map();

    emails.forEach(email => {
      const topics = email.topic_categories || [];

      topics.forEach(topic => {
        if (!topicEngagement.has(topic)) {
          topicEngagement.set(topic, {
            emails: [],
            totalScore: 0,
            count: 0
          });
        }

        const engagement = topicEngagement.get(topic);
        engagement.emails.push(email);
        engagement.count++;

        // Calculate engagement score for this email in this topic
        const emailScore = (
          this.calculateContentLengthScore([email]) * 0.4 +
          this.calculateResponseSpeedScore([email]) * 0.3 +
          this.calculateQuestionFrequencyScore([email]) * 0.3
        );
        engagement.totalScore += emailScore;
      });
    });

    // Calculate average engagement per topic
    const result = [];
    topicEngagement.forEach((data, topic) => {
      result.push({
        topic,
        avgEngagementScore: data.count > 0 ? data.totalScore / data.count : 0,
        emailCount: data.count,
        totalEmails: data.emails.length
      });
    });

    return result.sort((a, b) => b.avgEngagementScore - a.avgEngagementScore);
  }

  /**
   * Compare engagement levels between contacts
   */
  compareEngagementLevels(contactEngagementData) {
    const contacts = Object.entries(contactEngagementData);

    if (contacts.length < 2) {
      return { comparison: 'insufficient_data' };
    }

    // Sort by overall engagement score
    const sortedContacts = contacts
      .map(([email, data]) => ({ email, ...data }))
      .sort((a, b) => b.overallScore - a.overallScore);

    // Calculate percentiles
    const scores = sortedContacts.map(c => c.overallScore);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    sortedContacts.forEach(contact => {
      contact.percentile = Math.round(((contact.overallScore - minScore) / (maxScore - minScore)) * 100);
      contact.rank = sortedContacts.findIndex(c => c.email === contact.email) + 1;
    });

    return {
      comparison: 'ranked',
      contacts: sortedContacts,
      summary: this.generateComparisonSummary(sortedContacts)
    };
  }

  /**
   * Generate comparison summary
   */
  generateComparisonSummary(sortedContacts) {
    if (sortedContacts.length === 0) return 'No data available';

    const topContact = sortedContacts[0];
    const bottomContact = sortedContacts[sortedContacts.length - 1];

    let summary = `Highest engagement: ${topContact.email} (${topContact.overallScore}/100). `;

    if (sortedContacts.length > 1) {
      summary += `Lowest engagement: ${bottomContact.email} (${bottomContact.overallScore}/100). `;
    }

    // Identify engagement patterns
    const highEngagementCount = sortedContacts.filter(c => c.overallScore >= 70).length;
    const lowEngagementCount = sortedContacts.filter(c => c.overallScore <= 30).length;

    if (highEngagementCount > sortedContacts.length / 2) {
      summary += 'Most contacts show high engagement levels. ';
    } else if (lowEngagementCount > sortedContacts.length / 2) {
      summary += 'Many contacts show low engagement levels - consider nurturing strategies. ';
    }

    return summary.trim();
  }
}