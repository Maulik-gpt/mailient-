"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Send, Archive, Trash2, Plus, ChevronRight, Bot, Brain, Settings, Plug, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const GmailSidebar = ({ currentLabel, onLabelChange, labelCounts = {}, onCompose, onIntegrationsClick }) => {
  const [aiFeaturesExpanded, setAiFeaturesExpanded] = useState(true);
  const router = useRouter();

  const mainLabels = [
    { id: 'INBOX', name: 'Inbox', icon: Mail, count: labelCounts.INBOX || 12 },
    { id: 'CHATS', name: 'Chat', icon: MessageCircle, count: 0, isRoute: true, route: '/dashboard/chats' },
    { id: 'SENT', name: 'Sent', icon: Send, count: 0 },
    { id: 'ARCHIVE', name: 'Archive', icon: Archive, count: 0 },
    { id: 'TRASH', name: 'Trash', icon: Trash2, count: 3 },
  ];

  const aiFeatures = [
    { id: 'REPLY_ASSISTANT', name: 'Reply Assistant', icon: Bot },
    { id: 'CONTEXT_MEMORY', name: 'Context Memory', icon: Brain },
  ];

  const handleLabelClick = (labelId) => {
    const label = mainLabels.find(l => l.id === labelId);
    if (label?.isRoute && label?.route) {
      router.push(label.route);
    } else if (onLabelChange) {
      onLabelChange(labelId);
    }
  };

  return (
    <div className="h-full bg-[#0a0a0a] border-r border-neutral-800/50 flex flex-col" style={{ fontFamily: "'Satoshi', sans-serif" }}>
      {/* Header */}
      <div className="p-6 pb-2">
        <h2 className="text-[#fafafa] text-xl font-semibold tracking-tight">Mailbox</h2>
      </div>

      {/* Compose Button */}
      <div className="px-4 py-4">
        <Button
          onClick={onCompose}
          className="w-full bg-[#fafafa] hover:bg-neutral-200 text-black font-medium py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Compose
        </Button>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto py-2 px-3">
        <div className="space-y-1">
          {mainLabels.map((label) => {
            const Icon = label.icon;
            const isActive = currentLabel === label.id;

            return (
              <button
                key={label.id}
                onClick={() => handleLabelClick(label.id)}
                className={`flex items-center justify-between w-full p-2.5 text-sm rounded-xl transition-all duration-200 ${isActive
                    ? 'bg-neutral-900 text-[#fafafa]'
                    : 'text-neutral-400 hover:text-[#fafafa] hover:bg-neutral-900/50'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#fafafa]' : 'text-neutral-500'}`} strokeWidth={1.5} />
                  <span className="font-medium">{label.name}</span>
                </div>
                {label.count > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-[#fafafa] text-black' : 'bg-neutral-800 text-neutral-400'}`}>
                    {label.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* AI Features Section */}
        <div className="mt-8">
          <button
            onClick={() => setAiFeaturesExpanded(!aiFeaturesExpanded)}
            className="flex items-center justify-between w-full px-2.5 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider hover:text-neutral-300 transition-colors"
          >
            <span>AI Features</span>
            <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${aiFeaturesExpanded ? 'rotate-90' : ''}`} />
          </button>

          {aiFeaturesExpanded && (
            <div className="mt-1 space-y-1">
              {aiFeatures.map((feature) => {
                const Icon = feature.icon;

                return (
                  <button
                    key={feature.id}
                    onClick={() => handleLabelClick(feature.id)}
                    className="flex items-center w-full p-2.5 text-sm text-neutral-400 hover:text-[#fafafa] hover:bg-neutral-900/50 rounded-xl transition-colors"
                  >
                    <Icon className="w-4 h-4 mr-3 text-neutral-500" strokeWidth={1.5} />
                    <span className="font-medium">{feature.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-neutral-800/50 space-y-1">
        <button className="flex items-center w-full p-2.5 text-sm text-neutral-400 hover:text-[#fafafa] hover:bg-neutral-900/50 rounded-xl transition-colors">
          <Settings className="w-4 h-4 mr-3 text-neutral-500" strokeWidth={1.5} />
          <span>Settings</span>
        </button>
        <button onClick={onIntegrationsClick} className="flex items-center w-full p-2.5 text-sm text-neutral-400 hover:text-[#fafafa] hover:bg-neutral-900/50 rounded-xl transition-colors">
          <Plug className="w-4 h-4 mr-3 text-neutral-500" strokeWidth={1.5} />
          <span>Integrations</span>
        </button>
      </div>
    </div>
  );
};

export default GmailSidebar;