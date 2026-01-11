"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  TrendingUp, 
  AlertCircle, 
  Clock, 
  Target, 
  Zap, 
  Sparkles, 
  CheckCircle,
  ArrowRight,
  BarChart3,
  Filter,
  Search,
  User,
  Calendar,
  DollarSign,
  Star,
  Bell,
  Settings,
  Plus,
  ChevronRight,
  ExternalLink,
  Reply,
  Forward,
  Archive,
  Trash2
} from 'lucide-react';

const MailientScreenshot = () => {
  const [activeTab, setActiveTab] = useState('opportunities');
  const [isAnimating, setIsAnimating] = useState(false);

  const emailData = {
    opportunities: [
      {
        id: 1,
        sender: "Sarah Chen",
        senderEmail: "sarah@acme-corp.com",
        subject: "Enterprise Contract - $50,000 Deal Ready",
        preview: "Hi! We're ready to move forward with the enterprise plan. The legal team has approved the contract and we'd like to schedule the onboarding call...",
        amount: "$50,000",
        priority: "high",
        time: "2 hours ago",
        avatar: "SC",
        status: "hot-lead"
      },
      {
        id: 2,
        sender: "Marcus Johnson",
        senderEmail: "marcus@techstart.io",
        subject: "Partnership Opportunity - Strategic Alliance",
        preview: "Following up on our conversation about the strategic partnership. We believe our integration could drive significant value for both our user bases...",
        amount: "$25,000",
        priority: "medium",
        time: "5 hours ago",
        avatar: "MJ",
        status: "warm-lead"
      },
      {
        id: 3,
        sender: "Elena Rodriguez",
        senderEmail: "elena@venturecap.com",
        subject: "Investment Interest - Series A Round",
        preview: "Our team is impressed with your traction and would like to schedule a call to discuss potential investment in your next funding round...",
        amount: "$500,000",
        priority: "high",
        time: "1 day ago",
        avatar: "ER",
        status: "hot-lead"
      }
    ],
    urgent: [
      {
        id: 1,
        sender: "Alex Thompson",
        senderEmail: "alex@client.com",
        subject: "URGENT: Production Server Down",
        preview: "We're experiencing a critical outage and need immediate assistance. All services are offline and impacting our customers...",
        priority: "critical",
        time: "15 min ago",
        avatar: "AT",
        status: "urgent"
      },
      {
        id: 2,
        sender: "Legal Team",
        senderEmail: "legal@company.com",
        subject: "Contract Review Required - EOD Today",
        preview: "Please review and sign the attached NDA before 5 PM today. The client is waiting to proceed with the partnership...",
        priority: "high",
        time: "1 hour ago",
        avatar: "LT",
        status: "deadline"
      }
    ],
    followups: [
      {
        id: 1,
        sender: "David Park",
        senderEmail: "david@startup.com",
        subject: "Re: Demo Follow-up Questions",
        preview: "Thanks for the great demo yesterday! I have a few questions about the integration capabilities and pricing model...",
        priority: "medium",
        time: "3 days ago",
        avatar: "DP",
        status: "followup"
      },
      {
        id: 2,
        sender: "Lisa Wang",
        senderEmail: "lisa@enterprise.co",
        subject: "Re: Proposal Feedback",
        preview: "The team reviewed your proposal and we're interested in moving forward. Can we schedule a call to discuss implementation timeline?",
        priority: "medium",
        time: "1 week ago",
        avatar: "LW",
        status: "followup"
      }
    ]
  };

  const stats = {
    totalProcessed: 1247,
    revenueFound: "$2.4M",
    timeSaved: "47 hours",
    accuracy: "98.5%"
  };

  const tabs = [
    { id: 'opportunities', label: 'Opportunities', icon: TrendingUp, count: 12 },
    { id: 'urgent', label: 'Urgent', icon: AlertCircle, count: 3 },
    { id: 'followups', label: 'Follow-ups', icon: Clock, count: 8 }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'hot-lead':
        return 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400';
      case 'warm-lead':
        return 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400';
      case 'critical':
      case 'urgent':
        return 'bg-gradient-to-r from-red-500/20 to-rose-500/20 border-red-500/30 text-red-400';
      case 'deadline':
        return 'bg-gradient-to-r from-orange-500/20 to-amber-500/20 border-orange-500/30 text-orange-400';
      case 'followup':
        return 'bg-gradient-to-r from-purple-500/20 to-violet-500/20 border-purple-500/30 text-purple-400';
      default:
        return 'bg-neutral-800/50 border-neutral-700 text-neutral-400';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
      case 'critical':
        return <AlertCircle className="w-3 h-3 text-red-400" />;
      case 'medium':
        return <Clock className="w-3 h-3 text-yellow-400" />;
      default:
        return <CheckCircle className="w-3 h-3 text-green-400" />;
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 500);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-['Satoshi'] overflow-hidden">
      {/* Background Pattern */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-neutral-900 to-black">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.03),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.02),transparent_50%)]" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 flex h-screen">
        {/* Sidebar */}
        <motion.div 
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-80 bg-neutral-950/50 backdrop-blur-xl border-r border-neutral-800/50 flex flex-col"
        >
          {/* Logo Section */}
          <div className="p-6 border-b border-neutral-800/50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-white to-neutral-300 rounded-xl flex items-center justify-center">
                <Mail className="w-5 h-5 text-black" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Mailient</h1>
                <p className="text-xs text-neutral-400">AI Email Command Center</p>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="p-6 border-b border-neutral-800/50">
            <h3 className="text-sm font-semibold text-neutral-400 mb-4">This Month</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-neutral-900/50 rounded-lg p-3 border border-neutral-800/50">
                <div className="flex items-center justify-between mb-1">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-green-400">+23%</span>
                </div>
                <div className="text-lg font-bold text-white">{stats.totalProcessed}</div>
                <div className="text-xs text-neutral-500">Emails Processed</div>
              </div>
              <div className="bg-neutral-900/50 rounded-lg p-3 border border-neutral-800/50">
                <div className="flex items-center justify-between mb-1">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-green-400">+45%</span>
                </div>
                <div className="text-lg font-bold text-white">{stats.revenueFound}</div>
                <div className="text-xs text-neutral-500">Revenue Found</div>
              </div>
              <div className="bg-neutral-900/50 rounded-lg p-3 border border-neutral-800/50">
                <div className="flex items-center justify-between mb-1">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-green-400">+12h</span>
                </div>
                <div className="text-lg font-bold text-white">{stats.timeSaved}</div>
                <div className="text-xs text-neutral-500">Time Saved</div>
              </div>
              <div className="bg-neutral-900/50 rounded-lg p-3 border border-neutral-800/50">
                <div className="flex items-center justify-between mb-1">
                  <Target className="w-4 h-4 text-orange-400" />
                  <span className="text-xs text-green-400">+2.1%</span>
                </div>
                <div className="text-lg font-bold text-white">{stats.accuracy}</div>
                <div className="text-xs text-neutral-500">Accuracy</div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 p-6">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <motion.button
                    key={tab.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                      activeTab === tab.id
                        ? 'bg-white text-black'
                        : 'bg-neutral-900/50 text-neutral-400 hover:bg-neutral-800/50 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{tab.label}</span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      activeTab === tab.id ? 'bg-black/20 text-black' : 'bg-neutral-800 text-neutral-300'
                    }`}>
                      {tab.count}
                    </span>
                  </motion.button>
                );
              })}
            </nav>
          </div>

          {/* User Section */}
          <div className="p-6 border-t border-neutral-800/50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-white">Maulik Founder</div>
                <div className="text-xs text-neutral-400">Premium Plan</div>
              </div>
              <Settings className="w-4 h-4 text-neutral-400 cursor-pointer hover:text-white transition-colors" />
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <motion.header 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-neutral-950/30 backdrop-blur-xl border-b border-neutral-800/50 px-8 py-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-2xl font-bold text-white capitalize">{activeTab}</h2>
                <div className="flex items-center space-x-2 text-sm text-neutral-400">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span>AI-Powered Analysis</span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 bg-neutral-900/50 rounded-lg hover:bg-neutral-800/50 transition-colors"
                >
                  <Search className="w-4 h-4 text-neutral-400" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 bg-neutral-900/50 rounded-lg hover:bg-neutral-800/50 transition-colors"
                >
                  <Filter className="w-4 h-4 text-neutral-400" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-medium text-white flex items-center space-x-2 hover:shadow-lg hover:shadow-blue-500/25 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Compose</span>
                </motion.button>
              </div>
            </div>
          </motion.header>

          {/* Email List */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex-1 overflow-y-auto p-6 space-y-4"
          >
            <AnimatePresence mode="wait">
              {emailData[activeTab as keyof typeof emailData].map((email, index) => (
                <motion.div
                  key={email.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ scale: 1.01 }}
                  className={`bg-neutral-900/30 backdrop-blur-xl rounded-2xl border border-neutral-800/50 p-6 hover:border-neutral-700/50 transition-all cursor-pointer ${
                    isAnimating ? 'animate-pulse' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${getStatusColor(email.status)}`}>
                        {email.avatar}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-white">{email.sender}</h3>
                          {getPriorityIcon(email.priority)}
                          {email.amount && (
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs font-bold">
                              {email.amount}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-neutral-400">{email.senderEmail}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-neutral-500">{email.time}</p>
                      <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs mt-1 ${getStatusColor(email.status)}`}>
                        <span className="capitalize">{email.status.replace('-', ' ')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <h4 className="font-medium text-white mb-2">{email.subject}</h4>
                  <p className="text-sm text-neutral-400 line-clamp-2 mb-4">{email.preview}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-2 bg-neutral-800/50 rounded-lg hover:bg-neutral-700/50 transition-colors"
                      >
                        <Reply className="w-4 h-4 text-neutral-400" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-2 bg-neutral-800/50 rounded-lg hover:bg-neutral-700/50 transition-colors"
                      >
                        <Forward className="w-4 h-4 text-neutral-400" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-2 bg-neutral-800/50 rounded-lg hover:bg-neutral-700/50 transition-colors"
                      >
                        <Archive className="w-4 h-4 text-neutral-400" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-2 bg-neutral-800/50 rounded-lg hover:bg-neutral-700/50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-neutral-400" />
                      </motion.button>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-medium text-white hover:shadow-lg hover:shadow-blue-500/25 transition-all"
                    >
                      <Zap className="w-4 h-4" />
                      <span>AI Assist</span>
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {/* AI Insights Bar */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-xl border-t border-blue-500/20 px-8 py-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  <span className="font-medium text-white">AI Insights</span>
                </div>
                <p className="text-sm text-neutral-400">
                  3 high-value opportunities detected. Total potential revenue: <span className="text-green-400 font-bold">$575,000</span>
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center space-x-2 px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-neutral-100 transition-colors"
              >
                <span>View Analysis</span>
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default MailientScreenshot;
