'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { SiftCard } from './sift-card';
import { Button } from './button';
import { Badge } from './badge';
import { RefreshCw, AlertCircle, TrendingUp, Clock, Users, Target, Zap, Mail, Lightbulb } from 'lucide-react';

interface SiftInsight {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  content: string;
  timestamp: string;
  metadata: any;
  section: string;
  user?: {
    name: string;
    company?: string;
    avatar: string;
    username?: string;
    title?: string;
  };
}

interface SiftInsightsResponse {
  success: boolean;
  insights: SiftInsight[];
  timestamp: string;
  userEmail: string;
  ai_version: string;
  sift_intelligence_summary?: {
    opportunities_detected: number;
    urgent_action_required: number;
    hot_leads_heating_up: number;
    conversations_at_risk: number;
    missed_follow_ups: number;
    unread_but_important: number;
  };
  error?: string;
  fallback?: any;
}

export function GmailInterface() {
  const { data: session } = useSession();
  const [insights, setInsights] = useState<SiftInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [summary, setSummary] = useState<SiftInsightsResponse['sift_intelligence_summary']>();

  const fetchSiftInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🤖 Fetching Sift AI insights...');
      const response = await fetch('/api/home-feed/insights', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch insights: ${response.statusText}`);
      }

      const data: SiftInsightsResponse = await response.json();
      
      if (data.success) {
        console.log('📊 Raw API response:', data);
        console.log('📈 Insights count:', data.insights?.length || 0);
        console.log('📋 Insights data:', data.insights);

        setInsights(data.insights || []);
        setSummary(data.sift_intelligence_summary);
        setLastUpdated(new Date().toLocaleString());
        console.log('✅ Sift AI insights loaded successfully');
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load insights';
      setError(errorMessage);
      console.error('❌ Error fetching Sift AI insights:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.email) {
      fetchSiftInsights();
    }
  }, [session]);

  useEffect(() => {
    console.log('🎨 Insights state changed:', insights);
    console.log('📊 Insights length:', insights.length);
  }, [insights]);

  const refreshInsights = () => {
    fetchSiftInsights();
  };

  const getCardType = (insight: SiftInsight) => {
    switch (insight.section) {
      case 'opportunities':
        return 'opportunity' as const;
      case 'inbox-intelligence':
        return 'inbox-intelligence' as const;
      case 'ai-highlights':
        if (insight.title.includes('Week In 10 Seconds')) {
          return 'weekly-intelligence' as const;
        } else {
          return 'arcus-suggestion' as const;
        }
      case 'founder-execution':
        return 'founder-progress' as const;
      default:
        return 'inbox-intelligence' as const;
    }
  };

  const formatInsightContent = (insight: SiftInsight) => {
    if (insight.content.length > 200) {
      return insight.content.substring(0, 200) + '...';
    }
    return insight.content;
  };

  const getActionsForInsight = (insight: SiftInsight) => {
    const actions = [];
    
    if (insight.section === 'opportunities') {
      actions.push({
        label: 'View Details',
        icon: <Target className="w-3 h-3" />,
        onClick: () => console.log('View opportunity details:', insight.id)
      });
    } else if (insight.section === 'inbox-intelligence') {
      actions.push({
        label: 'Take Action',
        icon: <Zap className="w-3 h-3" />,
        onClick: () => console.log('Take action:', insight.id)
      });
    } else if (insight.title.includes('Hot Leads')) {
      actions.push({
        label: 'Engage Now',
        icon: <TrendingUp className="w-3 h-3" />,
        onClick: () => console.log('Engage with lead:', insight.id)
      });
    } else if (insight.section === 'ai-highlights') {
      actions.push({
        label: 'View Analytics',
        icon: <Lightbulb className="w-3 h-3" />,
        onClick: () => console.log('View analytics:', insight.id)
      });
    }
    
    return actions;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-lg font-medium text-gray-700">Loading Sift AI Intelligence...</p>
          <p className="text-sm text-gray-500">Analyzing your emails for opportunities and insights</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mailient Sift AI</h1>
              <p className="text-gray-600 mt-1">Your intelligent email insights dashboard</p>
            </div>
            <div className="flex items-center space-x-4">
              {lastUpdated && (
                <p className="text-sm text-gray-500">
                  Last updated: {lastUpdated}
                </p>
              )}
              <Button 
                onClick={refreshInsights}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Sift AI Summary */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700">Opportunities</p>
                    <p className="text-2xl font-bold text-green-900">{summary.opportunities_detected || 0}</p>
                  </div>
                  <Target className="h-8 w-8 text-green-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-red-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-700">Urgent Action</p>
                    <p className="text-2xl font-bold text-red-900">{summary.urgent_action_required || 0}</p>
                  </div>
                  <Zap className="h-8 w-8 text-red-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-orange-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-700">Hot Leads</p>
                    <p className="text-2xl font-bold text-orange-900">{summary.hot_leads_heating_up || 0}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-yellow-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-700">At Risk</p>
                    <p className="text-2xl font-bold text-yellow-900">{summary.conversations_at_risk || 0}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-yellow-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-purple-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700">Missed Follow-ups</p>
                    <p className="text-2xl font-bold text-purple-900">{summary.missed_follow_ups || 0}</p>
                  </div>
                  <Clock className="h-8 w-8 text-purple-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700">Unread Important</p>
                    <p className="text-2xl font-bold text-blue-900">{summary.unread_but_important || 0}</p>
                  </div>
                  <Mail className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 border border-red-200 bg-red-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Sift AI Insights Cards */}
        {insights.length > 0 ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Sift AI Insights</h2>
              <div className="flex space-x-2">
                <Badge variant="outline" className="bg-white">
                  {insights.length} insights
                </Badge>
                <Badge variant="outline" className="bg-white">
                  {summary ? Object.values(summary).reduce((a, b) => a + b, 0) : 0} items
                </Badge>
              </div>
            </div>

            {insights.map((insight, index) => {
              console.log(`🎯 Rendering insight ${index}:`, insight);
              return (
                <SiftCard
                  key={insight.id}
                  type={getCardType(insight)}
                  title={insight.title}
                  subtitle={insight.subtitle}
                  content={formatInsightContent(insight)}
                  actions={getActionsForInsight(insight)}
                  metadata={insight.metadata}
                  timestamp={new Date(insight.timestamp).toLocaleDateString()}
                  user={insight.user ? {
                    ...insight.user,
                    username: insight.user.username || insight.user.name
                  } : undefined}
                  onClick={() => console.log('Card clicked:', insight.id)}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Mail className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Sift AI Insights Available</h3>
            <p className="text-gray-600 mb-6">
              {error 
                ? "There was an error loading your email insights." 
                : "Connect your Gmail account to get started with Sift AI intelligence."}
            </p>
            <Button 
              onClick={refreshInsights}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                'Try Again'
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
