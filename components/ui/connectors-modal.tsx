'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Video,
  CalendarDays,
  Mail,
  X,
  Check,
  Search,
  Plus,
  ChevronDown,
  Database,
  ListTodo,
  Clock,
  ExternalLink,
  Shield,
  Zap,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Custom SVG Brand Icons
const BrandIcons = {
  GoogleCalendar: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 141.7 141.7" id="google-calendar">
      <path fill="#fff" d="M95.8,45.9H45.9V95.8H95.8Z"></path>
      <path fill="#34a853" d="M95.8,95.8H45.9v22.5H95.8Z"></path>
      <path fill="#4285f4" d="M95.8,23.4H30.9a7.55462,7.55462,0,0,0-7.5,7.5V95.8H45.9V45.9H95.8Z"></path>
      <path fill="#188038" d="M23.4,95.8v15a7.55462,7.55462,0,0,0,7.5,7.5h15V95.8Z"></path>
      <path fill="#fbbc04" d="M118.3,45.9H95.8V95.8h22.5Z"></path>
      <path fill="#1967d2" d="M118.3,45.9v-15a7.55462,7.55462,0,0,0-7.5-7.5h-15V45.9Z"></path>
      <path fill="#ea4335" d="M95.8,118.3l22.5-22.5H95.8Z"></path>
      <polygon fill="#2a83f8" points="77.916 66.381 75.53 63.003 84.021 56.868 87.243 56.868 87.243 85.747 82.626 85.747 82.626 62.772 77.916 66.381"></polygon>
      <path fill="#2a83f8" d="M67.29834,70.55785A7.88946,7.88946,0,0,0,70.78,64.12535c0-4.49-4-8.12-8.94-8.12a8.77525,8.77525,0,0,0-8.74548,6.45379l3.96252,1.58258a4.41779,4.41779,0,0,1,4.473-3.51635,4.138,4.138,0,1,1,.06256,8.24426v.00513h-.0559l-.00666.00061-.00964-.00061H59.15v3.87677h2.70642L61.88,72.65a4.70514,4.70514,0,1,1,0,9.37,5.35782,5.35782,0,0,1-3.96588-1.69354,4.59717,4.59717,0,0,1-.80408-1.2442l-.69757-1.69946L52.23005,79c.62,4.33,4.69,7.68,9.61,7.68,5.36,0,9.7-3.96,9.7-8.83A8.63346,8.63346,0,0,0,67.29834,70.55785Z"></path>
    </svg>
  ),
  Notion: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" id="notion">
      <path fill="#000" fillRule="evenodd" d="m5.2,47.56s8,10.37,8.48,10.83c1.16,1.11,2.73,1.69,4.33,1.6,8.37-.42,27.54-1.38,35.57-1.78,3.11-.16,5.55-2.72,5.56-5.83l.1-35.5c0-1.99-1.03-3.83-2.72-4.87t0,0c-2.99-1.84-8.91-5.49-10.7-6.68-1.46-.97-3.2-1.43-4.96-1.32-5.96.38-23.45,1.51-30.85,1.98-2.96.19-5.24,2.62-5.24,5.54v34.78c0,.45.15.89.43,1.24h0Zm50.01-28.91v.02l-.1,33.7c0,.97-.77,1.77-1.74,1.82l-35.57,1.78c-.5.03-.99-.16-1.35-.5-.36-.34-.57-.82-.57-1.32V20.71c0-.97.75-1.77,1.72-1.82l35.67-2.06c.5-.03.99.15,1.36.5.36.34.57.82.57,1.32h0Zm-11.98,21.42v-13.72c-.63-.72-1.63-.67-3.07-1.11-.1-.03-.19-.11-.23-.21-.04-.1-.03-.22.03-.31,1.72-2.53,6.63-.95,9.83-1.96.09-.03.2-.02.28.05.08.07.11.17.09.27-.31,1.39-1.4,2.1-2.95,2.4v22.57c0,.75-.45,1.44-1.15,1.72-.64.26-1.31.54-1.31.54-1.54.8-3.43.29-4.37-1.17l-11.46-17.87v16.27c.62.72,1.63.67,3.07,1.11.1.03.19.11.23.21.04.1.03.22-.03.31-1.73,2.53-6.63.95-9.83,1.96-.09.04-.2.02-.28-.05-.08-.06-.11-.17-.09-.27.31-1.39,1.4-2.1,2.95-2.4v-21.31l-3.02-.29s.21-2.45,3.09-2.73c1.42-.14,5.13-.3,6.47-.36.3-.01.59.13.77.38l10.99,15.95h0ZM15.03,14.28c.55.42,1.24.63,1.93.59,5.09-.29,26.82-1.53,32.21-1.84.17-.01.31-.13.35-.29.04-.16-.03-.33-.17-.42-2.39-1.49-4.74-2.95-5.76-3.63-.73-.48-1.6-.71-2.48-.66,0,0-24.7,1.36-29.78,1.91-.64.07-.78.3-.8.39-.09.31.02.54.27.74,1.02.78,3.07,2.33,4.23,3.21h0Z"></path>
    </svg>
  ),
  NotionCalendar: () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="94.5 88 312.85 325">
      <path d="M398.579 135.841C404.242 141.152 407.35 148.439 407.35 156.355V372.638C407.35 372.725 407.347 372.812 407.343 372.9C407.329 373.178 407.3 373.455 407.3 373.733L407.325 373.859C407.325 386.91 397.107 398.225 384.27 399.798C383.352 399.948 382.433 400.062 381.489 400.125L169.818 412.937C169.151 412.975 168.497 413 167.842 413C167.767 413 167.695 412.994 167.622 412.987C167.55 412.981 167.477 412.975 167.402 412.975C167.251 412.975 167.103 412.981 166.955 412.987C166.807 412.994 166.659 413 166.508 413C158.97 413 151.91 410.231 146.461 405.109C140.559 399.559 137.275 391.944 137.275 383.688V373.405C137.275 371.316 136.872 370.196 134.443 370.196C134.443 370.196 127.786 370.322 127.094 370.322C118.687 370.322 110.822 367.227 104.744 361.513C98.1621 355.32 94.5378 346.837 94.5378 337.638L94.5 136.495C94.5 117.806 109.677 101.658 128.327 100.501L329.264 88.066C338.438 87.4996 347.134 90.5956 353.716 96.7752C360.297 102.955 363.921 111.425 363.921 120.637V126.993C363.921 126.993 363.795 129.12 366.552 129.032L377.563 128.365C385.453 127.861 392.916 130.53 398.579 135.841Z" fill="white"/>
      <path d="M128.454 357.071C122.803 357.008 117.782 355.562 113.881 351.924C113.881 351.924 113.868 351.924 113.856 351.899C113.403 351.458 112.975 351.006 112.572 350.552C109.489 347.028 107.815 342.51 107.815 337.627L107.777 136.484C107.777 124.843 117.593 114.397 129.209 113.679L330.12 101.245C330.561 101.22 330.988 101.207 331.429 101.207C336.45 101.207 341.132 103.019 344.706 106.392C345.196 106.858 345.662 107.336 346.09 107.84C346.837 108.692 347.5 109.602 348.08 110.564C347.501 109.609 346.834 108.702 346.09 107.852C349.098 111.351 350.746 115.806 350.746 120.639V125.787C350.746 125.787 350.872 130.003 346.694 130.28L346.719 130.305L161.928 141.884C148.375 142.727 137.364 154.469 137.364 168.049C137.364 168.049 137.288 353.699 137.275 354C137.137 357.071 134.607 357.071 132.518 357.071H128.454Z" fill="black"/>
      <path d="M394.126 373.546C394.151 373.244 394.176 372.941 394.176 372.639L394.126 155.274C394.05 154.129 393.861 153.009 393.546 151.939C392.817 149.434 391.457 147.182 389.532 145.382C386.776 142.802 383.177 141.405 379.313 141.405C378.974 141.405 378.633 141.417 378.294 141.443L163.854 154.884C163.779 154.889 163.703 154.902 163.628 154.914C163.527 154.93 163.426 154.947 163.326 154.947C156.505 155.652 150.792 161.617 150.326 168.451C150.301 168.753 150.301 169.043 150.301 169.345V382.318C150.301 382.42 150.307 382.519 150.314 382.616C150.32 382.711 150.326 382.804 150.326 382.896C150.464 387.667 152.365 392.021 155.75 395.205C158.77 398.049 162.646 399.66 166.837 399.875H167.504L381.83 386.899C381.893 386.899 381.956 386.889 382.019 386.88C382.065 386.873 382.111 386.866 382.158 386.862C382.174 386.862 382.191 386.861 382.208 386.861C388.538 385.691 393.684 380.002 394.126 373.546ZM183.927 376.339C176.59 376.855 170.096 374.364 170.297 364.748V215.08C170.297 209.946 174.526 206.661 179.194 206.421L365.747 195.233C370.404 194.994 374.216 198.367 374.216 203.036V352.968C374.216 358.455 372.845 365.516 363.406 365.881H363.381L363.368 365.893L183.927 376.339Z" fill="black"/>
      <path d="M227.066 252.787C218.406 253.322 215.462 259.932 215.474 270.09V271.876C214.441 272.119 213.576 272.349 212.53 272.41C206.291 272.799 201.79 267.733 201.778 258.644C201.766 244.744 214.221 231.658 237.952 230.188C259.081 228.875 272.606 239.082 272.631 257.089C272.643 270.636 261.392 280.247 250.311 283.26C271.098 284.282 279.771 295.873 279.795 310.66C279.819 335.97 261.307 350.319 232.722 352.106L232.029 352.154C210.547 353.491 195.465 345.338 195.453 331.255C195.453 323.236 201.327 316.444 210.159 315.897C210.852 315.849 211.545 315.994 212.238 315.946C213.99 330.283 223.697 335.557 233.391 334.961C242.745 334.378 249.325 328.084 249.313 319.165V318.813C249.301 304.901 237.685 304.209 220.193 303.516L217.408 286.93C233.683 283.954 241.82 278.631 241.808 269.008C241.808 258.668 236.067 252.253 227.066 252.811V252.787Z" fill="black"/>
      <path d="M305.181 245.959C287.859 250.965 284.041 243.358 285.938 235.388C296.325 232.958 323.341 224.854 333.558 221.196L333.68 327.987L352.57 330.732C352.57 337.683 348.605 342.032 341.501 342.482C335.614 342.846 321.93 343.345 315.349 343.758C305.132 344.39 286.424 345.921 286.424 345.921C285.901 344.524 285.731 343.114 285.731 341.862C285.731 338.472 287.105 334.998 291.606 333.478L305.29 329.056L305.193 245.971L305.181 245.959Z" fill="black"/>
    </svg>
  ),
  CalCom: () => (
    <svg xmlns="http://www.w3.org/2000/svg" xmlSpace="preserve" viewBox="0 0 512 512">
      <path d="M458 512H56c-30.4 0-55-24.6-55-55V55C1 24.6 25.6 0 56 0h402c30.4 0 55 24.6 55 55v402c0 30.4-24.6 55-55 55" style={{ fill: '#fff' }}/>
      <path d="M162.8 347.3c-50.4 0-88.4-39.9-88.4-89.3s35.9-89.6 88.4-89.6c27.9 0 47 8.6 62.1 28l-24.3 20.1c-10.1-10.8-22.5-16.2-37.8-16.2-34.1 0-52.8 26.1-52.8 57.6s20.5 57.1 52.8 57.1c15.1 0 28-5.3 38.4-16.2l23.9 21c-14.5 18.9-34.3 27.5-62.3 27.5m166.4-131.2h32.7v128.1h-32.7v-18.7c-6.7 13.2-18.1 22.2-39.7 22.2-34.6 0-62.3-30.1-62.3-66.9 0-37 27.7-66.9 62.3-66.9 21.5 0 33 8.9 39.7 22.2zm1.1 64.5c0-20-13.8-36.6-35.4-36.6-20.8 0-34.4 16.7-34.4 36.6 0 19.4 13.6 36.6 34.4 36.6 21.4 0 35.4-16.7 35.4-36.6M385 164.3h32.7v179.6H385z" style={{ fill: '#242424' }}/>
    </svg>
  ),
  GoogleMeet: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" id="google-meet">
      <path fill="#00ac47" d="M24,21.45V25a2.0059,2.0059,0,0,1-2,2H9V21h9V16Z"></path>
      <polygon fill="#31a950" points="24 11 24 21.45 18 16 18 11 24 11"></polygon>
      <polygon fill="#ea4435" points="9 5 9 11 3 11 9 5"></polygon>
      <rect width="6" height="11" x="3" y="11" fill="#4285f4"></rect>
      <path fill="#ffba00" d="M24,7v4h-.5L18,16V11H9V5H22A2.0059,2.0059,0,0,1,24,7Z"></path>
      <path fill="#0066da" d="M9,21v6H5a2.0059,2.0059,0,0,1-2-2V21Z"></path>
      <path fill="#00ac47" d="M29,8.26V23.74a.9989.9989,0,0,1-1.67.74L24,21.45,18,16l5.5-5,.5-.45,3.33-3.03A.9989.9989,0,0,1,29,8.26Z"></path>
      <polygon fill="#188038" points="24 10.55 24 21.45 18 16 23.5 11 24 10.55"></polygon>
    </svg>
  ),
  Slack: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
      <path d="M27.255 80.719c0 7.33-5.978 13.317-13.309 13.317C6.616 94.036.63 88.049.63 80.719s5.987-13.317 13.317-13.317h13.309zm6.709 0c0-7.33 5.987-13.317 13.317-13.317s13.317 5.986 13.317 13.317v33.335c0 7.33-5.986 13.317-13.317 13.317-7.33 0-13.317-5.987-13.317-13.317zm0 0" fill="#de1c59"/>
      <path d="M47.281 27.255c-7.33 0-13.317-5.978-13.317-13.309C33.964 6.616 39.951.63 47.281.63s13.317 5.987 13.317 13.317v13.309zm0 6.709c7.33 0 13.317 5.987 13.317 13.317s-5.986 13.317-13.317 13.317H13.946C6.616 60.598.63 54.612.63 47.281c0-7.33 5.987-13.317 13.317-13.317zm0 0" fill="#35c5f0"/>
      <path d="M100.745 47.281c0-7.33 5.978-13.317 13.309-13.317 7.33 0 13.317 5.987 13.317 13.317s-5.987 13.317-13.317 13.317h-13.309zm-6.709 0c0 7.33-5.987 13.317-13.317 13.317s-13.317-5.986-13.317-13.317V13.946C67.402 6.616 73.388.63 80.719.63c7.33 0 13.317 5.987 13.317 13.317zm0 0" fill="#2eb57d"/>
      <path d="M80.719 100.745c7.33 0 13.317 5.978 13.317 13.309 0 7.33-5.987 13.317-13.317 13.317s-13.317-5.987-13.317-13.317v-13.309zm0-6.709c-7.33 0-13.317-5.987-13.317-13.317s5.986-13.317 13.317-13.317h33.335c7.33 0 13.317 5.986 13.317 13.317 0 7.33-5.987 13.317-13.317 13.317zm0 0" fill="#ebb02e"/>
    </svg>
  )
};

// Definitive list of supported connectors (Phase 4 canonical)
const SUPPORTED_APPS = [
  { 
    id: 'google_calendar', 
    name: 'Google Calendar', 
    icon: BrandIcons.GoogleCalendar, 
    color: '#4285F4',
    description: 'Understand your schedule, manage events, and optimize your time effectively',
    details: 'Sync your Google Calendar to let Arcus schedule meetings, find availability, and manage your daily agenda autonomously.'
  },
  { 
    id: 'google_meet', 
    name: 'Google Meet', 
    icon: BrandIcons.GoogleMeet, 
    color: '#00897B',
    description: 'Automate video conferencing links and manage collaborative calls',
    details: 'Link Google Meet to auto-generate meeting rooms, manage call recordings, and integrate video links into your calendar events.'
  },
  { 
    id: 'notion', 
    name: 'Notion', 
    icon: BrandIcons.Notion, 
    color: '#000000',
    description: 'Create pages, update databases, and organize content straight from Arcus',
    details: 'Link your Notion workspace to enable Arcus to create meeting notes, update project trackers, and append data to your pages.'
  },
  { 
    id: 'notion_calendar', 
    name: 'Notion Calendar', 
    icon: BrandIcons.NotionCalendar, 
    color: '#000000',
    description: 'Unified time management across Notion pages and external timelines',
    details: 'Integrate Notion Calendar to bridge your project timelines with your personal schedule for comprehensive mission planning.'
  },
  { 
    id: 'slack', 
    name: 'Slack', 
    icon: BrandIcons.Slack, 
    color: '#E01E5A',
    description: 'Read and write Slack conversations in Arcus to centralize communication',
    details: 'Connect Slack to allow Arcus to monitor channels, draft messages, and coordinate across your teams.'
  },
  { 
    id: 'cal_com', 
    name: 'Cal.com', 
    icon: BrandIcons.CalCom, 
    color: '#ffffff',
    description: 'Professional scheduling with automated link generation and booking',
    details: 'Integrate Cal.com to let Arcus share your booking links and automatically handle appointment scheduling with external partners.'
  }
];

interface ConnectorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect?: (id: string) => void;
  onDisconnect?: (id: string) => void;
}

export function ConnectorsModal({ 
  isOpen, 
  onClose,
  onConnect,
  onDisconnect
}: ConnectorsModalProps) {
  const [statuses, setStatuses] = useState<any[]>([]);
  const [selectedApp, setSelectedApp] = useState<typeof SUPPORTED_APPS[0] | null>(null);

  // Fetch integration statuses
  useEffect(() => {
    if (isOpen) {
      const fetchStatus = async () => {
        try {
          const res = await fetch('/api/integrations/status');
          if (res.ok) {
            const data = await res.json();
            setStatuses(data.integrations || {});
          }
        } catch (err) {
          console.error('Failed to fetch status:', err);
        }
      };
      fetchStatus();
    }
  }, [isOpen]);

  const handleConnectAction = async (appId: string) => {
    if (onConnect) {
      onConnect(appId);
    } else {
      try {
        const res = await fetch(`/api/integrations/${appId}/auth`);
        if (res.ok) {
          const { url } = await res.json();
          window.location.href = url;
        }
      } catch (err) {
        console.error('Failed to get auth URL:', err);
      }
    }
    setSelectedApp(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 md:p-12 overflow-hidden">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-3xl"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 30 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            y: 0,
            filter: selectedApp ? 'blur(12px) brightness(0.5)' : 'none'
          }}
          exit={{ opacity: 0, scale: 0.98, y: 30 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-[560px] h-full max-h-[720px] bg-[#121212] rounded-[48px] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-6">
            <h2 className="text-[20px] font-bold text-white tracking-tight">Connectors</h2>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-white/5 rounded-lg text-white/30 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation - Apps Only (Tabs removed) */}
          <div className="px-8 flex items-center border-b border-white/[0.03]">
            <button className="pb-4 text-[14px] font-bold text-white relative">
              Apps
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-[3px] bg-white rounded-full" />
            </button>
          </div>

          {/* Grid Area */}
          <div className="flex-1 overflow-y-auto p-8 arcus-scrollbar pb-12">
            <div className="grid grid-cols-1 gap-4">
            {SUPPORTED_APPS.map((app) => {
                const statusObj = Array.isArray(statuses) 
                  ? statuses.find((s: any) => s.provider === app.id)
                  : (statuses as any)?.[app.id];
                const isConnected = statusObj?.connected || false;

                return (
                  <button
                    key={app.id}
                    onClick={() => setSelectedApp(app)}
                    className="flex items-start gap-4 p-4 rounded-[24px] bg-[#222]/40 border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all text-left group"
                  >
                    <div 
                      className={cn(
                        "w-12 h-12 rounded-[16px] flex items-center justify-center border border-white/[0.05] shrink-0 shadow-lg group-hover:scale-105 transition-transform p-1.5",
                        app.id === 'notion' ? "bg-white" : "bg-black/40"
                      )}
                    >
                      <app.icon />
                    </div>
                    <div className="flex-1 pr-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[15px] font-bold text-white/90 tracking-tight">{app.name}</span>
                        {isConnected && (
                          <div className="w-4 h-4 rounded-full bg-transparent flex items-center justify-center">
                            <Check className="w-3 h-3 text-emerald-500/80" />
                          </div>
                        )}
                      </div>
                      <p className="text-[12px] text-white/30 leading-relaxed line-clamp-2">
                        {app.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Sub Modal (Selection) */}
        <AnimatePresence>
          {selectedApp && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className="absolute z-[210] w-full max-w-[380px] bg-[#161616] rounded-[40px] border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.6)] p-10 flex flex-col items-center text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedApp(null)}
                className="absolute top-8 right-8 p-1.5 hover:bg-white/5 rounded-lg text-white/20 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div 
                className="w-20 h-20 rounded-[28px] flex items-center justify-center border border-white/5 shadow-2xl mb-8 mt-2 transition-transform hover:scale-105 bg-black/40 p-4"
              >
                <selectedApp.icon />
              </div>

              <h3 className="text-2xl font-bold text-white mb-3 tracking-tighter">{selectedApp.name}</h3>
              <p className="text-[14px] text-white/40 leading-relaxed mb-10 px-4 font-medium">
                {selectedApp.description}
              </p>

              <button
                onClick={() => handleConnectAction(selectedApp.id)}
                className="w-full py-4 bg-white text-black rounded-2xl font-bold text-[15px] hover:bg-white/90 active:scale-95 transition-all shadow-xl shadow-white/[0.05]"
              >
                Connect to {selectedApp.name}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
}

export default ConnectorsModal;
