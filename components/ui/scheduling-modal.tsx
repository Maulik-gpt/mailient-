'use client';

import { useState, useEffect } from 'react';
import { Button } from './button';
import { X, Calendar as CalendarIcon, Clock, Users, Video, CheckCircle, Info, Sparkles, Send, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { UsageLimitModal } from './usage-limit-modal';
import { triggerSuccessConfetti } from '@/lib/confetti';

interface SchedulingModalProps {
    isOpen: boolean;
    onClose: () => void;
    emailId: string;
}

export function SchedulingModal({ isOpen, onClose, emailId }: SchedulingModalProps) {
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Topic/Duration, 2: Provider, 3: Success, 4: Details
    const [recommendation, setRecommendation] = useState<any>(null);
    const [provider, setProvider] = useState<'google' | 'zoom'>('google');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedTime, setSelectedTime] = useState('10:00');
    const [isScheduling, setIsScheduling] = useState(false);
    const [notifySender, setNotifySender] = useState(true);
    const [scheduledEvent, setScheduledEvent] = useState<any>(null);
    const [isUsageLimitModalOpen, setIsUsageLimitModalOpen] = useState(false);
    const [usageLimitModalData, setUsageLimitModalData] = useState<{
        featureName: string;
        currentUsage: number;
        limit: number;
        period: 'daily' | 'monthly';
        currentPlan: 'starter' | 'pro' | 'none';
    } | null>(null);

    useEffect(() => {
        if (isOpen && emailId) {
            setStep(1);
            setRecommendation(null);
            setNotifySender(true);
            setScheduledEvent(null);

            // Set default time to next hour
            const now = new Date();
            now.setHours(now.getHours() + 1);
            now.setMinutes(0);
            setSelectedTime(now.toTimeString().split(' ')[0].substring(0, 5));
            setSelectedDate(now.toISOString().split('T')[0]);

            fetchRecommendation();
        }
    }, [isOpen, emailId]);

    const fetchRecommendation = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/calendar/recommend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emailId })
            });
            const data = await response.json();
            if (!response.ok) {
                if (data?.error === 'limit_reached') {
                    setUsageLimitModalData({
                        featureName: 'Schedule Call',
                        currentUsage: data.usage || 0,
                        limit: data.limit || 0,
                        period: data.period || 'monthly',
                        currentPlan: data.planType || 'starter'
                    });
                    setIsUsageLimitModalOpen(true);
                    return;
                }
                throw new Error(data?.error || 'Failed to get recommendation');
            }
            if (data.success) {
                setRecommendation(data.recommendation);
            }
        } catch (error) {
            console.error('Failed to fetch recommendation', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSchedule = async () => {
        setIsScheduling(true);
        const startTime = new Date(`${selectedDate}T${selectedTime}:00`);
        const endTime = new Date(startTime.getTime() + (recommendation?.suggested_duration || 30) * 60000);

        try {
            const response = await fetch('/api/calendar/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    summary: recommendation?.suggested_title,
                    description: recommendation?.suggested_description,
                    startTime: startTime.toISOString(),
                    endTime: endTime.toISOString(),
                    notifySender,
                    emailId,
                    provider
                })
            });

            const data = await response.json();
            if (!response.ok) {
                if (data?.error === 'limit_reached') {
                    setUsageLimitModalData({
                        featureName: 'Schedule Call',
                        currentUsage: data.usage || 0,
                        limit: data.limit || 0,
                        period: data.period || 'monthly',
                        currentPlan: data.planType || 'starter'
                    });
                    setIsUsageLimitModalOpen(true);
                    return;
                }
                toast.error(data.error || 'Failed to schedule meeting');
                return;
            }
            if (data.success) {
                setScheduledEvent(data.event);
                setStep(3);
                toast.success('Meeting scheduled successfully!');
                triggerSuccessConfetti(); // Dopamine boost!
            }
        } catch (error) {
            toast.error('Failed to schedule meeting');
        } finally {
            setIsScheduling(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <UsageLimitModal
                isOpen={isUsageLimitModalOpen}
                onClose={() => setIsUsageLimitModalOpen(false)}
                featureName={usageLimitModalData?.featureName || 'Schedule Call'}
                currentUsage={usageLimitModalData?.currentUsage || 0}
                limit={usageLimitModalData?.limit || 0}
                period={usageLimitModalData?.period || 'monthly'}
                currentPlan={usageLimitModalData?.currentPlan || 'starter'}
            />
            <div className="fixed inset-0 z-[100] flex items-center justify-center">
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-black/80 backdrop-blur-xl transition-opacity animate-in fade-in duration-500"
                    onClick={onClose}
                />

                {/* Modal */}
                <div
                    className="relative bg-[#0d0d0d] border border-neutral-800 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500"
                >
                    {/* Header */}
                    <div className="p-8 border-b border-neutral-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-500/10 rounded-2xl">
                                <CalendarIcon className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-medium text-white tracking-tight">
                                    {step === 4 ? 'Meeting Details' : 'Schedule Call'}
                                </h3>
                                <p className="text-sm text-neutral-500 font-light">
                                    {step === 4 ? 'Complete event metadata' : 'Intelligent Calendar Assist'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-neutral-800 rounded-full transition-colors text-neutral-500 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-8">
                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center text-center">
                                <div className="relative mb-6">
                                    <Sparkles className="w-12 h-12 text-indigo-400 animate-pulse" />
                                    <div className="absolute inset-0 bg-indigo-400/20 blur-2xl rounded-full" />
                                </div>
                                <p className="text-neutral-400 font-light text-lg">AI is analyzing context...</p>
                            </div>
                        ) : step === 1 ? (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                {/* AI Recommendation Card */}
                                <div className="bg-gradient-to-br from-neutral-900/60 to-[#0a0a0a] rounded-3xl p-6 border border-neutral-800/50 hover:border-neutral-700/50 transition-all duration-500 shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[50px] rounded-full -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-colors duration-700" />
                                    <div className="flex items-center gap-2 mb-4 relative z-10">
                                        <Sparkles className="w-4 h-4 text-indigo-400" />
                                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Recommended by AI</span>
                                    </div>
                                    <div className="space-y-4 relative z-10">
                                        <input
                                            type="text"
                                            value={recommendation?.suggested_title}
                                            onChange={(e) => setRecommendation({ ...recommendation, suggested_title: e.target.value })}
                                            className="w-full bg-transparent text-white text-xl font-medium focus:outline-none placeholder:text-neutral-600"
                                            placeholder="Meeting Title"
                                        />
                                        <textarea
                                            value={recommendation?.suggested_description}
                                            onChange={(e) => setRecommendation({ ...recommendation, suggested_description: e.target.value })}
                                            className="w-full bg-transparent text-neutral-400 font-light focus:outline-none resize-none h-20 text-sm leading-relaxed"
                                            placeholder="Call objective..."
                                        />
                                    </div>
                                </div>

                                {/* Settings */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider ml-1">Date</label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                value={selectedDate}
                                                onChange={(e) => setSelectedDate(e.target.value)}
                                                className="w-full bg-neutral-900/30 border border-neutral-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-neutral-700 transition-colors"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider ml-1">Time</label>
                                        <input
                                            type="time"
                                            value={selectedTime}
                                            onChange={(e) => setSelectedTime(e.target.value)}
                                            className="w-full bg-neutral-900/30 border border-neutral-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-neutral-700 transition-colors"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 py-2">
                                    <div className="flex-1 h-px bg-neutral-800" />
                                    <span className="text-[10px] font-medium text-neutral-600 uppercase tracking-widest">Duration</span>
                                    <div className="flex-1 h-px bg-neutral-800" />
                                </div>

                                <div className="flex gap-2">
                                    {[15, 30, 60].map((dur) => (
                                        <button
                                            key={dur}
                                            onClick={() => setRecommendation({ ...recommendation, suggested_duration: dur })}
                                            className={`flex-1 py-3 rounded-2xl border transition-all duration-300 font-medium ${recommendation?.suggested_duration === dur
                                                ? 'bg-white text-black border-white'
                                                : 'bg-neutral-900/30 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                                                }`}
                                        >
                                            {dur} min
                                        </button>
                                    ))}
                                </div>

                                <Button
                                    onClick={() => setStep(2)}
                                    className="w-full h-14 bg-[#fafafa] hover:bg-neutral-200 text-black rounded-2xl font-medium text-lg mt-4 shadow-xl shadow-white/5"
                                >
                                    Continue to Provider
                                </Button>
                            </div>
                        ) : step === 2 ? (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="space-y-4">
                                    <h4 className="text-sm font-medium text-neutral-400 ml-1">Select Video Provider</h4>
                                    <div className="space-y-3">
                                        <button
                                            onClick={() => setProvider('google')}
                                            className={`w-full p-5 rounded-3xl border transition-all duration-300 flex items-center justify-between group ${provider === 'google'
                                                ? 'bg-blue-500/10 border-blue-500/50'
                                                : 'bg-neutral-900/30 border-neutral-800 hover:border-neutral-700'
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-2xl ${provider === 'google' ? 'bg-blue-500 text-white' : 'bg-neutral-800 text-neutral-400 group-hover:bg-neutral-700'}`}>
                                                    <Video className="w-5 h-5" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-white font-medium">Google Meet</p>
                                                    <p className="text-xs text-neutral-500 font-light">Primary connected account</p>
                                                </div>
                                            </div>
                                            {provider === 'google' && <CheckCircle className="w-5 h-5 text-blue-500" />}
                                        </button>

                                        <button
                                            onClick={() => setProvider('zoom')}
                                            className={`w-full p-5 rounded-3xl border transition-all duration-300 flex items-center justify-between group ${provider === 'zoom'
                                                ? 'bg-blue-400/10 border-blue-400/50'
                                                : 'bg-neutral-900/30 border-neutral-800 hover:border-neutral-700 opacity-60'
                                                }`}
                                            disabled={true}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-2xl ${provider === 'zoom' ? 'bg-blue-400 text-white' : 'bg-neutral-800 text-neutral-400'}`}>
                                                    <Video className="w-5 h-5" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-white font-medium">Zoom Video</p>
                                                    <p className="text-xs text-neutral-500 font-light italic">Coming Soon</p>
                                                </div>
                                            </div>
                                            {provider === 'zoom' && <CheckCircle className="w-5 h-5 text-blue-400" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="p-5 bg-neutral-900/30 rounded-3xl border border-neutral-800 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-neutral-800 rounded-xl">
                                            <Send className="w-4 h-4 text-neutral-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">Notify Guest</p>
                                            <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-light">Send email confirmation</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setNotifySender(!notifySender)}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${notifySender ? 'bg-indigo-500' : 'bg-neutral-800'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notifySender ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>

                                <div className="flex gap-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => setStep(1)}
                                        className="h-14 flex-1 border-neutral-800 rounded-2xl text-neutral-400 hover:bg-neutral-800"
                                    >
                                        Back
                                    </Button>
                                    <Button
                                        onClick={handleSchedule}
                                        disabled={isScheduling}
                                        className="h-14 flex-[2] bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl font-medium text-lg leading-none shadow-xl shadow-indigo-500/10"
                                    >
                                        {isScheduling ? 'Scheduling...' : 'Confirm Call'}
                                    </Button>
                                </div>
                            </div>
                        ) : step === 3 ? (
                            <div className="py-12 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-700">
                                <div className="relative mb-8">
                                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/30 animate-in spin-in-12 duration-1000">
                                        <CheckCircle className="w-10 h-10 text-green-500" />
                                    </div>
                                    <div className="absolute inset-0 bg-green-500/10 blur-3xl rounded-full" />
                                </div>
                                <h4 className="text-2xl font-medium text-white mb-2">Meeting Booked!</h4>
                                <p className="text-neutral-500 font-light max-w-xs mx-auto mb-10 text-sm leading-relaxed">
                                    Your call is confirmed and synced to your Google Calendar. {notifySender && "We've notified the guest via email."}
                                </p>

                                <div className="flex gap-4 w-full">
                                    <Button
                                        variant="outline"
                                        onClick={() => setStep(4)}
                                        className="h-14 flex-1 border-neutral-800 hover:bg-neutral-800 text-neutral-400 rounded-2xl font-medium transition-all duration-500"
                                    >
                                        View Details
                                    </Button>
                                    <Button
                                        onClick={onClose}
                                        className="h-14 flex-[1.5] bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 rounded-2xl font-medium transition-all duration-500"
                                    >
                                        Done
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            /* Step 4: Details View */
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-700">
                                <div className="bg-gradient-to-br from-neutral-900/60 to-[#0a0a0a] rounded-[2.5rem] p-8 border border-neutral-800/50 space-y-8 shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full -mr-32 -mt-32" />

                                    <div>
                                        <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 ml-1">Title</h4>
                                        <p className="text-2xl text-white font-medium tracking-tight">{scheduledEvent?.summary}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-1">Time</h4>
                                            <div className="flex items-center gap-3 px-4 py-3 bg-neutral-800/30 rounded-2xl border border-neutral-700/30">
                                                <Clock className="w-4 h-4 text-indigo-400" />
                                                <span className="text-white font-medium">{new Date(scheduledEvent?.start?.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-1">Date</h4>
                                            <div className="flex items-center gap-3 px-4 py-3 bg-neutral-800/30 rounded-2xl border border-neutral-700/30">
                                                <CalendarIcon className="w-4 h-4 text-indigo-400" />
                                                <span className="text-white font-medium">{new Date(scheduledEvent?.start?.dateTime).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-1">Attendees</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {scheduledEvent?.attendees?.map((att: any, i: number) => (
                                                <div key={i} className="flex items-center gap-2 px-4 py-2 bg-neutral-800/50 rounded-2xl border border-neutral-700/30 hover:border-indigo-500/30 transition-colors duration-500">
                                                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                                                    <span className="text-sm text-neutral-300 font-light">{att.email}</span>
                                                </div>
                                            ))}
                                            {!scheduledEvent?.attendees?.length && (
                                                <p className="text-sm text-neutral-600 italic ml-1">No additional attendees</p>
                                            )}
                                        </div>
                                    </div>

                                    {scheduledEvent?.hangoutLink && (
                                        <div className="space-y-3">
                                            <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest ml-1">Meeting Link</h4>
                                            <a
                                                href={scheduledEvent.hangoutLink}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center justify-between p-5 bg-blue-500/5 border border-blue-500/20 rounded-2xl hover:bg-blue-500/10 hover:border-blue-500/40 transition-all duration-500 group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2.5 bg-blue-500/10 rounded-xl">
                                                        <Video className="w-5 h-5 text-blue-400" />
                                                    </div>
                                                    <span className="text-sm text-blue-400 font-medium truncate max-w-[220px]">{scheduledEvent.hangoutLink}</span>
                                                </div>
                                                <ArrowRight className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-transform duration-500" />
                                            </a>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-4">
                                    <Button
                                        onClick={() => setStep(3)}
                                        className="h-14 flex-1 bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 rounded-2xl font-medium transition-all duration-500"
                                    >
                                        Back
                                    </Button>
                                    <Button
                                        onClick={onClose}
                                        className="h-14 flex-1 bg-[#fafafa] hover:bg-neutral-200 text-black rounded-2xl font-medium transition-all duration-500"
                                    >
                                        Close
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
