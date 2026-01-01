"use client";

import React from 'react';
import { Home, Users, User, BarChart, Lightbulb, Settings, Mail, TrendingUp, Search } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './tooltip';
import { Button } from './button';

interface SiftSidebarProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  userAvatar?: string;
  userName?: string;
}

export const SiftSidebar: React.FC<SiftSidebarProps> = ({
  activeSection,
  onNavigate,
  userAvatar,
  userName
}) => {
  // Navigation items with Linear-style thin icons
  const navItems = [
    { id: 'home', icon: <Home className="w-5 h-5" />, label: 'Home', tooltip: 'Signal Feed' },
    { id: 'opportunities', icon: <TrendingUp className="w-5 h-5" />, label: 'Opportunities', tooltip: 'Detected Opportunities' },
    { id: 'people', icon: <Users className="w-5 h-5" />, label: 'People', tooltip: 'Founder Network' },
    { id: 'progress', icon: <BarChart className="w-5 h-5" />, label: 'My Progress', tooltip: 'Your Execution' },
    { id: 'intelligence', icon: <Lightbulb className="w-5 h-5" />, label: 'Weekly Intelligence', tooltip: 'AI Insights' },
    { id: 'arcus', icon: <Mail className="w-5 h-5" />, label: 'Arcus', tooltip: 'AI Assistant' },
    { id: 'settings', icon: <Settings className="w-5 h-5" />, label: 'Settings', tooltip: 'Preferences' }
  ];

  return (
    <TooltipProvider>
      <div className="fixed left-0 top-0 h-screen w-16 bg-black border-r border-gray-800 flex flex-col items-center py-6 z-30">
        {/* Logo/Brand */}
        <div className="mb-8 group cursor-pointer" onClick={() => (window.location.href = '/home-feed')}>
          <div className="w-8 h-8 bg-black border border-white/10 rounded-lg flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:scale-110 shadow-lg">
            <img src="/mailient-logo.png" alt="Mailient" className="w-full h-full object-cover scale-110" />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col items-center space-y-6">
          {navItems.map((item) => (
            <Tooltip key={item.id} delayDuration={100}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`p-3 rounded-lg transition-all duration-200 ${activeSection === item.id
                    ? 'bg-gray-800 text-white border border-gray-600'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  aria-label={item.tooltip}
                >
                  {React.cloneElement(item.icon, {
                    className: `w-5 h-5 ${activeSection === item.id ? 'text-white' : 'text-gray-400 group-hover:text-white'
                      }`
                  })}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-gray-900 border-gray-700">
                <p className="text-white text-sm">{item.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </nav>



        {/* Search/Discovery Trigger */}
        <div className="mb-4">
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onNavigate('discovery')}
                className="p-3 rounded-lg transition-all duration-200 text-gray-400 hover:text-white hover:bg-gray-800"
                aria-label="Discovery"
              >
                <Search className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-gray-900 border-gray-700">
              <p className="text-white text-sm">Discovery</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};