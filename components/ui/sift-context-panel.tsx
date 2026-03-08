"use client";

import React, { useState } from 'react';
import { Mail, Phone, Calendar, User, TrendingUp, Lightbulb, X, MessageCircle, Share, Bookmark, Send, Paperclip, Clock, AlertCircle } from 'lucide-react';
import { Button } from './button';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';
import { SiftCard } from './sift-card';

type ContextPanelType = 'inbox-thread' | 'founder-profile' | 'opportunity-details' | 'progress-stats' | 'intelligence-report' | 'empty' | 'email-composer';

interface SiftContextPanelProps {
  type: ContextPanelType;
  data: any;
  onClose: () => void;
  onAction?: (action: string, data?: any) => void;
  onSendEmail?: (emailData: { to: string; subject: string; body: string }) => void;
  onScheduleCall?: (callData: { attendee: string; title: string; time: string }) => void;
}

export const SiftContextPanel: React.FC<SiftContextPanelProps> = ({
  type,
  data,
  onClose,
  onAction,
  onSendEmail,
  onScheduleCall
}) => {
  const [composerData, setComposerData] = useState({
    to: '',
    subject: '',
    body: '',
    isHtml: false
  });

  const renderContent = () => {
    switch (type) {
      case 'inbox-thread':
        return renderInboxThread(data);
      case 'founder-profile':
        return renderFounderProfile(data);
      case 'opportunity-details':
        return renderOpportunityDetails(data);
      case 'progress-stats':
        return renderProgressStats(data);
      case 'intelligence-report':
        return renderIntelligenceReport(data);
      case 'email-composer':
        return renderEmailComposer(data);
      case 'empty':
      default:
        return renderEmptyState();
    }
  };

  const renderEmailComposer = (emailData: any) => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">Compose Email</h3>
        <Button onClick={onClose} variant="ghost" size="sm" className="text-gray-400 hover:text-white">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {/* To Field */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">To</label>
          <input
            type="email"
            value={composerData.to}
            onChange={(e) => setComposerData({ ...composerData, to: e.target.value })}
            placeholder="recipient@example.com"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Subject Field */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Subject</label>
          <input
            type="text"
            value={composerData.subject}
            onChange={(e) => setComposerData({ ...composerData, subject: e.target.value })}
            placeholder="Email subject"
            className="w-full bg-[#404040] border border-[#606060] rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Body Field */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Message</label>
          <textarea
            value={composerData.body}
            onChange={(e) => setComposerData({ ...composerData, body: e.target.value })}
            placeholder="Write your message..."
            rows={8}
            className="w-full bg-[#404040] border border-[#606060] rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none resize-none"
          />
        </div>

        {/* HTML Toggle */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="html-toggle"
            checked={composerData.isHtml}
            onChange={(e) => setComposerData({ ...composerData, isHtml: e.target.checked })}
            className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="html-toggle" className="text-sm text-gray-300">
            Send as HTML
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4 border-t border-gray-700">
          <Button
            onClick={() => {
              if (composerData.to && composerData.subject && composerData.body) {
                onSendEmail?.(composerData);
                onClose();
              } else {
                alert('Please fill in all required fields');
              }
            }}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Send className="w-4 h-4 mr-2" />
            Send Email
          </Button>
          <Button
            onClick={() => setComposerData({ to: '', subject: '', body: '', isHtml: false })}
            variant="secondary"
            className="px-4"
          >
            Clear
          </Button>
        </div>
      </div>
    </div>
  );

  const renderInboxThread = (threadData: any) => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">Email Thread</h3>
        <Button onClick={onClose} variant="ghost" size="sm" className="text-gray-400 hover:text-white">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-start space-x-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={threadData.sender?.avatar} alt={threadData.sender?.name} />
              <AvatarFallback>{threadData.sender?.name?.charAt(0) || '?'}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="font-medium text-white">{threadData.sender?.name || 'Unknown'}</span>
                  <span className="text-sm text-gray-400 ml-2">{threadData.sender?.email || ''}</span>
                </div>
                <span className="text-xs text-gray-400">{threadData.timestamp || ''}</span>
              </div>
              <p className="text-gray-300 text-sm mb-3">{threadData.subject || ''}</p>
              <p className="text-gray-300 text-sm mb-4">{threadData.body || ''}</p>

              {threadData.attachments && threadData.attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Attachments</p>
                  {threadData.attachments.map((attachment: any, index: number) => (
                    <div key={index} className="flex items-center space-x-2 text-sm text-blue-400 hover:text-blue-300 cursor-pointer">
                      <Paperclip className="w-4 h-4" />
                      <span className="truncate max-w-[200px]">{attachment.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-300 uppercase tracking-wide">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => {
                setComposerData({
                  to: threadData.sender?.email || '',
                  subject: `Re: ${threadData.subject || ''}`,
                  body: `Hi ${threadData.sender?.name || 'there'},\n\nThank you for your message.\n\nBest regards`,
                  isHtml: false
                });
                onAction?.('open-composer', threadData);
              }}
              variant="secondary"
              size="sm"
              className="justify-start space-x-2"
            >
              <Mail className="w-4 h-4" />
              <span>Reply</span>
            </Button>
            <Button
              onClick={() => onAction?.('schedule', threadData)}
              variant="secondary"
              size="sm"
              className="justify-start space-x-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Schedule Call</span>
            </Button>
            <Button
              onClick={() => onAction?.('crm', threadData)}
              variant="secondary"
              size="sm"
              className="justify-start space-x-2"
            >
              <User className="w-4 h-4" />
              <span>Add to CRM</span>
            </Button>
            <Button
              onClick={() => onAction?.('snooze', threadData)}
              variant="secondary"
              size="sm"
              className="justify-start space-x-2"
            >
              <Clock className="w-4 h-4" />
              <span>Snooze</span>
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-300 uppercase tracking-wide">Email Intelligence</h4>
          <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700">
            <div className="flex items-start space-x-2">
              <Lightbulb className="w-4 h-4 text-yellow-400 mt-1" />
              <div>
                <p className="text-sm text-gray-300 mb-1">AI Analysis</p>
                <p className="text-xs text-gray-400">
                  This email shows signs of interest. Consider scheduling a follow-up call within 2-3 days.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFounderProfile = (profileData: any) => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">Founder Profile</h3>
        <Button onClick={onClose} variant="ghost" size="sm" className="text-gray-400 hover:text-white">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div className="text-center">
          <Avatar className="w-20 h-20 mx-auto mb-4">
            <AvatarImage src={profileData.avatar} alt={profileData.name} />
            <AvatarFallback>{profileData.name?.charAt(0) || '?'}</AvatarFallback>
          </Avatar>
          <h4 className="text-lg font-semibold text-white">{profileData.name || 'Unknown'}</h4>
          <p className="text-sm text-gray-400">@{profileData.username || 'unknown'}</p>
          <p className="text-sm text-gray-300 mt-1">{profileData.title || ''}</p>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h5 className="text-sm font-medium text-gray-300 uppercase tracking-wide mb-3">About</h5>
          <p className="text-gray-300 text-sm mb-4">{profileData.bio || 'No bio available'}</p>

          <div className="space-y-3">
            <div>
              <h6 className="text-xs text-gray-400 uppercase tracking-wide mb-1">Startup</h6>
              <p className="text-sm text-gray-300">{profileData.startup || 'Not specified'}</p>
            </div>

            <div>
              <h6 className="text-xs text-gray-400 uppercase tracking-wide mb-1">Industry</h6>
              <p className="text-sm text-gray-300">{profileData.industry || 'Not specified'}</p>
            </div>

            <div>
              <h6 className="text-xs text-gray-400 uppercase tracking-wide mb-1">Location</h6>
              <p className="text-sm text-gray-300">{profileData.location || 'Not specified'}</p>
            </div>
          </div>
        </div>

        {profileData.links && profileData.links.length > 0 && (
          <div className="space-y-3">
            <h5 className="text-sm font-medium text-gray-300 uppercase tracking-wide">Links & Tools</h5>
            <div className="space-y-2">
              {profileData.links.map((link: any, index: number) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-sm text-blue-400 hover:text-blue-300 truncate"
                >
                  <span className="w-4 h-4">{link.icon}</span>
                  <span>{link.label}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h5 className="text-sm font-medium text-gray-300 uppercase tracking-wide">Actions</h5>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => {
                setComposerData({
                  to: profileData.email || '',
                  subject: `Connection from ${profileData.name}`,
                  body: `Hi ${profileData.name},\n\nI'd love to connect and learn more about your work at ${profileData.startup || 'your company'}.\n\nBest regards`,
                  isHtml: false
                });
                onAction?.('open-composer', profileData);
              }}
              variant="secondary"
              size="sm"
              className="justify-start space-x-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Message</span>
            </Button>
            <Button
              onClick={() => onAction?.('connect', profileData)}
              variant="secondary"
              size="sm"
              className="justify-start space-x-2"
            >
              <User className="w-4 h-4" />
              <span>Connect</span>
            </Button>
            <Button
              onClick={() => onAction?.('follow', profileData)}
              variant="secondary"
              size="sm"
              className="justify-start space-x-2"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Follow</span>
            </Button>
            <Button
              onClick={() => onAction?.('save', profileData)}
              variant="secondary"
              size="sm"
              className="justify-start space-x-2"
            >
              <Bookmark className="w-4 h-4" />
              <span>Save</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderOpportunityDetails = (opportunityData: any) => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">Opportunity Details</h3>
        <Button onClick={onClose} variant="ghost" size="sm" className="text-gray-400 hover:text-white">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h4 className="text-lg font-semibold text-white mb-2">{opportunityData.title || ''}</h4>
          <p className="text-gray-300 text-sm mb-4">{opportunityData.description || ''}</p>

          <div className="space-y-3">
            <div>
              <h5 className="text-xs text-gray-400 uppercase tracking-wide mb-1">Type</h5>
              <p className="text-sm text-gray-300">{opportunityData.type || 'Not specified'}</p>
            </div>

            <div>
              <h5 className="text-xs text-gray-400 uppercase tracking-wide mb-1">Priority</h5>
              <p className="text-sm text-gray-300">{opportunityData.priority || 'Not specified'}</p>
            </div>

            <div>
              <h5 className="text-xs text-gray-400 uppercase tracking-wide mb-1">Deadline</h5>
              <p className="text-sm text-gray-300">{opportunityData.deadline || 'Not specified'}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-300 uppercase tracking-wide">Suggested Actions</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => {
                setComposerData({
                  to: opportunityData.email || '',
                  subject: `Re: ${opportunityData.title}`,
                  body: `Hi there,\n\nThank you for your interest. I'd be happy to discuss this opportunity further.\n\nBest regards`,
                  isHtml: false
                });
                onAction?.('open-composer', opportunityData);
              }}
              variant="secondary"
              size="sm"
              className="justify-start space-x-2"
            >
              <Mail className="w-4 h-4" />
              <span>Draft Reply</span>
            </Button>
            <Button
              onClick={() => onAction?.('schedule', opportunityData)}
              variant="secondary"
              size="sm"
              className="justify-start space-x-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Schedule</span>
            </Button>
            <Button
              onClick={() => onAction?.('deck', opportunityData)}
              variant="secondary"
              size="sm"
              className="justify-start space-x-2"
            >
              <User className="w-4 h-4" />
              <span>Send Deck</span>
            </Button>
            <Button
              onClick={() => onAction?.('remind', opportunityData)}
              variant="secondary"
              size="sm"
              className="justify-start space-x-2"
            >
              <Lightbulb className="w-4 h-4" />
              <span>Set Reminder</span>
            </Button>
          </div>
        </div>

        {opportunityData.relatedEmails && opportunityData.relatedEmails.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-300 uppercase tracking-wide">Related Emails</h4>
            <div className="space-y-2">
              {opportunityData.relatedEmails.map((email: any, index: number) => (
                <div
                  key={index}
                  className="bg-gray-800/30 rounded-lg p-3 border border-gray-700 cursor-pointer hover:bg-gray-800/50 transition-colors"
                  onClick={() => onAction?.('view-email', email)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300 truncate">{email.subject || 'No subject'}</span>
                    </div>
                    <span className="text-xs text-gray-400">{email.date || ''}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-300 uppercase tracking-wide">Opportunity Score</h4>
          <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">Fit Score</span>
              <span className="text-sm font-medium text-green-400">85%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-green-400 h-2 rounded-full" style={{ width: '85%' }}></div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              High potential opportunity based on email patterns and engagement
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderProgressStats = (statsData: any) => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">Your Progress</h3>
        <Button onClick={onClose} variant="ghost" size="sm" className="text-gray-400 hover:text-white">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 text-center">
            <div className="text-2xl font-bold text-white mb-1">{statsData.postsThisWeek || 0}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">Posts This Week</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 text-center">
            <div className="text-2xl font-bold text-white mb-1">{statsData.connectionsGained || 0}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">New Connections</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 text-center">
            <div className="text-2xl font-bold text-white mb-1">{statsData.opportunitiesCreated || 0}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">Opportunities</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 text-center">
            <div className="text-2xl font-bold text-white mb-1">{statsData.engagementRate || 0}%</div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">Engagement Rate</div>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h4 className="text-sm font-medium text-gray-300 uppercase tracking-wide mb-3">Activity Chart</h4>
          <div className="h-32 bg-gray-900 rounded-lg flex items-end justify-between p-2">
            {statsData.activityChart?.map((value: number, index: number) => (
              <div key={index} className="flex flex-col items-center">
                <div
                  className="bg-blue-500 rounded-t-sm transition-all duration-300"
                  style={{ height: `${value}%`, width: '12px' }}
                ></div>
                <span className="text-xs text-gray-400 mt-1">{statsData.activityLabels?.[index] || ''}</span>
              </div>
            )) || (
              <div className="text-gray-400 text-sm">No activity data available</div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-300 uppercase tracking-wide">Recent Activity</h4>
          <div className="space-y-2">
            {statsData.recentActivity?.map((activity: any, index: number) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-800/30 rounded-lg border border-gray-700">
                <div className="p-2 bg-gray-700 rounded-lg">
                  {activity.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-300">{activity.description}</p>
                  <p className="text-xs text-gray-400 mt-1">{activity.timestamp}</p>
                </div>
              </div>
            )) || (
              <div className="text-gray-400 text-sm">No recent activity</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderIntelligenceReport = (reportData: any) => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">Weekly Intelligence</h3>
        <Button onClick={onClose} variant="ghost" size="sm" className="text-gray-400 hover:text-white">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h4 className="text-lg font-semibold text-white mb-3">Your Week in 10 Seconds</h4>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400 mb-1">{reportData.opportunities || 0}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">Opportunities</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400 mb-1">{reportData.overdue || 0}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">Follow-ups Overdue</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400 mb-1">{reportData.dealsWon || 0}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">Won Deals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400 mb-1">{reportData.insights || 0}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">Inbox Insights</div>
            </div>
          </div>

          <Button
            onClick={() => onAction?.('view-full-report')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            View Full Report
          </Button>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-300 uppercase tracking-wide">Key Insights</h4>
          <div className="space-y-2">
            {reportData.keyInsights?.map((insight: string, index: number) => (
              <div key={index} className="flex items-start space-x-2 p-3 bg-gray-800/30 rounded-lg border border-gray-700">
                <Lightbulb className="w-4 h-4 text-yellow-400 mt-1" />
                <p className="text-sm text-gray-300">{insight}</p>
              </div>
            )) || (
              <div className="text-gray-400 text-sm">No key insights available</div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-300 uppercase tracking-wide">Suggested Actions</h4>
          <div className="space-y-2">
            {reportData.suggestedActions?.map((action: any, index: number) => (
              <SiftCard
                key={index}
                type="arcus-suggestion"
                title={action.title}
                content={action.description}
                actions={[
                  {
                    label: 'Apply',
                    icon: <TrendingUp className="w-4 h-4" />,
                    onClick: () => onAction?.('apply-suggestion', action)
                  },
                  {
                    label: 'Snooze',
                    icon: <Lightbulb className="w-4 h-4" />,
                    onClick: () => onAction?.('snooze-suggestion', action)
                  }
                ]}
                onClick={() => onAction?.('view-suggestion', action)}
              />
            )) || (
              <div className="text-gray-400 text-sm">No suggested actions available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
        <Lightbulb className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-300 mb-2">Select a card to see details</h3>
      <p className="text-sm text-gray-400">Click on any card in the main feed to view more information and take action.</p>
    </div>
  );

  return (
    <div className="w-96 h-full bg-[#1f1f1f] border-l border-[#505050] overflow-y-auto scrollbar-hide p-6">
      {renderContent()}
    </div>
  );
};
