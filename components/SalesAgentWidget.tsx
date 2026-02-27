"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useConversation } from "@elevenlabs/react"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, MicOff, X, Phone, PhoneOff } from "lucide-react"

export function SalesAgentWidget() {
    const [isOpen, setIsOpen] = useState(false)
    const [showTooltip, setShowTooltip] = useState(true)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const animFrameRef = useRef<number>(0)

    const conversation = useConversation({
        onConnect: () => console.log("[Arcus] Connected"),
        onDisconnect: () => console.log("[Arcus] Disconnected"),
        onMessage: (message) => console.log("[Arcus] Message:", message),
        onError: (error) => console.error("[Arcus] Error:", error),
    })

    const isConnected = conversation.status === "connected"
    const isConnecting = conversation.status === "connecting"

    const startConversation = useCallback(async () => {
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true })
            await conversation.startSession({
                agentId: "agent_2501kjf8h6z8fkpacx968p0h978h",
                connectionType: "webrtc",
            })
        } catch (error) {
            console.error("[Arcus] Failed to start:", error)
        }
    }, [conversation])

    const stopConversation = useCallback(async () => {
        try {
            await conversation.endSession()
        } catch (error) {
            console.error("[Arcus] Failed to stop:", error)
        }
    }, [conversation])

    const handleTogglePanel = useCallback(() => {
        setIsOpen((prev) => {
            if (prev && isConnected) {
                stopConversation()
            }
            return !prev
        })
        setShowTooltip(false)
    }, [isConnected, stopConversation])

    // Visualizer animation for speaking state
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas || !isOpen) return

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const dpr = window.devicePixelRatio || 1
        canvas.width = canvas.offsetWidth * dpr
        canvas.height = canvas.offsetHeight * dpr
        ctx.scale(dpr, dpr)

        const w = canvas.offsetWidth
        const h = canvas.offsetHeight
        const centerX = w / 2
        const centerY = h / 2
        const baseRadius = Math.min(w, h) * 0.28

        let time = 0

        const draw = () => {
            ctx.clearRect(0, 0, w, h)
            time += 0.015

            const rings = conversation.isSpeaking ? 4 : 2
            const amplitude = conversation.isSpeaking ? 18 : 4

            for (let r = 0; r < rings; r++) {
                const ringRadius = baseRadius + r * 16
                const opacity = conversation.isSpeaking
                    ? 0.5 - r * 0.1
                    : 0.15 - r * 0.05

                ctx.beginPath()
                for (let angle = 0; angle <= Math.PI * 2; angle += 0.02) {
                    const wave =
                        Math.sin(angle * 6 + time * 3 + r) * amplitude +
                        Math.sin(angle * 3 - time * 2 + r * 1.5) * (amplitude * 0.5)
                    const radius = ringRadius + wave
                    const x = centerX + Math.cos(angle) * radius
                    const y = centerY + Math.sin(angle) * radius

                    if (angle === 0) ctx.moveTo(x, y)
                    else ctx.lineTo(x, y)
                }
                ctx.closePath()
                ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(opacity, 0.03)})`
                ctx.lineWidth = conversation.isSpeaking ? 1.5 : 1
                ctx.stroke()
            }

            // Center pulsing dot
            const pulseScale = conversation.isSpeaking
                ? 1 + Math.sin(time * 5) * 0.3
                : 1 + Math.sin(time * 1.5) * 0.1
            const dotRadius = 4 * pulseScale

            ctx.beginPath()
            ctx.arc(centerX, centerY, dotRadius, 0, Math.PI * 2)
            ctx.fillStyle = conversation.isSpeaking
                ? "rgba(52, 211, 153, 0.9)"
                : isConnected
                    ? "rgba(255, 255, 255, 0.6)"
                    : "rgba(255, 255, 255, 0.2)"
            ctx.fill()

            // Glow around center
            if (conversation.isSpeaking) {
                ctx.beginPath()
                ctx.arc(centerX, centerY, dotRadius + 8, 0, Math.PI * 2)
                ctx.fillStyle = "rgba(52, 211, 153, 0.1)"
                ctx.fill()
            }

            animFrameRef.current = requestAnimationFrame(draw)
        }

        draw()

        return () => {
            cancelAnimationFrame(animFrameRef.current)
        }
    }, [isOpen, isConnected, conversation.isSpeaking])

    return (
        <>
            {/* ── Floating Trigger Button ── */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        onClick={handleTogglePanel}
                        className="fixed bottom-6 right-6 z-[9999] group cursor-pointer"
                        aria-label="Talk to Arcus"
                        id="sales-agent-trigger"
                    >
                        {/* Ambient glow */}
                        <div className="absolute inset-0 rounded-full bg-white/15 blur-xl group-hover:bg-white/25 transition-all duration-500 scale-[2]" />

                        {/* Pulse rings */}
                        <motion.div
                            animate={{ scale: [1, 1.4, 1], opacity: [0.35, 0, 0.35] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute inset-0 rounded-full border-2 border-white/25"
                        />
                        <motion.div
                            animate={{ scale: [1, 1.6, 1], opacity: [0.15, 0, 0.15] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                            className="absolute inset-0 rounded-full border border-white/15"
                        />

                        {/* Button face */}
                        <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-white via-zinc-100 to-zinc-300 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.25),0_8px_32px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_40px_rgba(255,255,255,0.35),0_8px_32px_rgba(0,0,0,0.6)] transition-shadow duration-300">
                            <Mic className="w-6 h-6 text-black group-hover:scale-110 transition-transform duration-200" />
                        </div>

                        {/* Tooltip */}
                        {showTooltip && (
                            <motion.div
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 2, duration: 0.5 }}
                                className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap px-3 py-1.5 rounded-lg bg-zinc-900/90 backdrop-blur-sm border border-white/10 text-xs font-medium text-white shadow-lg pointer-events-none"
                            >
                                <span className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Talk to Arcus
                                </span>
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-2 h-2 bg-zinc-900/90 border-r border-t border-white/10 rotate-45" />
                            </motion.div>
                        )}
                    </motion.button>
                )}
            </AnimatePresence>

            {/* ── Expanded Conversation Panel ── */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.85, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.85, y: 30 }}
                        transition={{ type: "spring", stiffness: 350, damping: 28 }}
                        className="fixed bottom-6 right-6 z-[9999] w-[360px] rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(255,255,255,0.08),0_25px_60px_rgba(0,0,0,0.7)] border border-white/[0.08]"
                        id="sales-agent-panel"
                    >
                        {/* Background */}
                        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black" />
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.04),transparent_60%)]" />

                        {/* Header */}
                        <div className="relative z-10 flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-white to-zinc-300 flex items-center justify-center shadow-md">
                                        <Mic className="w-4 h-4 text-black" />
                                    </div>
                                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-900 ${isConnected ? "bg-emerald-400" : "bg-zinc-600"}`} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white leading-none">Arcus</h3>
                                    <p className={`text-[10px] font-medium mt-0.5 ${isConnected ? "text-emerald-400/80" : isConnecting ? "text-amber-400/80" : "text-zinc-500"}`}>
                                        {isConnected
                                            ? conversation.isSpeaking
                                                ? "Speaking..."
                                                : "Listening..."
                                            : isConnecting
                                                ? "Connecting..."
                                                : "Ready to connect"}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleTogglePanel}
                                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors group cursor-pointer"
                                aria-label="Close panel"
                            >
                                <X className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
                            </button>
                        </div>

                        {/* Visualizer Area */}
                        <div className="relative z-10 flex flex-col items-center justify-center px-6 py-10">
                            {/* Canvas visualizer */}
                            <div className="relative w-full h-52 flex items-center justify-center">
                                <canvas
                                    ref={canvasRef}
                                    className="absolute inset-0 w-full h-full"
                                />
                                {/* Center status icon */}
                                <div className="relative z-10">
                                    {isConnected ? (
                                        <motion.div
                                            animate={conversation.isSpeaking ? { scale: [1, 1.08, 1] } : {}}
                                            transition={{ duration: 1.2, repeat: Infinity }}
                                            className="w-20 h-20 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center backdrop-blur-sm"
                                        >
                                            {conversation.isSpeaking ? (
                                                <div className="flex items-end gap-[3px] h-8">
                                                    {[0, 0.15, 0.3, 0.15, 0].map((delay, i) => (
                                                        <motion.div
                                                            key={i}
                                                            animate={{ height: ["8px", "28px", "8px"] }}
                                                            transition={{ duration: 0.6, repeat: Infinity, delay, ease: "easeInOut" }}
                                                            className="w-[3px] bg-emerald-400 rounded-full"
                                                        />
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex items-end gap-[3px] h-8">
                                                    {[0, 0.2, 0.4, 0.2, 0].map((delay, i) => (
                                                        <motion.div
                                                            key={i}
                                                            animate={{ height: ["4px", "12px", "4px"] }}
                                                            transition={{ duration: 1.2, repeat: Infinity, delay, ease: "easeInOut" }}
                                                            className="w-[3px] bg-white/40 rounded-full"
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </motion.div>
                                    ) : (
                                        <div className="w-20 h-20 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                                            <Mic className="w-8 h-8 text-zinc-600" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Status text */}
                            <p className="text-xs text-zinc-500 mt-4 text-center">
                                {isConnected
                                    ? conversation.isSpeaking
                                        ? "Agent is responding..."
                                        : "Listening — speak naturally"
                                    : isConnecting
                                        ? "Starting conversation..."
                                        : "Press the button below to start a voice call"}
                            </p>
                        </div>

                        {/* Action Bar */}
                        <div className="relative z-10 px-6 pb-6 flex items-center justify-center gap-3">
                            {!isConnected ? (
                                <motion.button
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={startConversation}
                                    disabled={isConnecting}
                                    className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-white text-black font-bold text-sm hover:bg-zinc-100 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.15)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {isConnecting ? (
                                        <>
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full"
                                            />
                                            Connecting...
                                        </>
                                    ) : (
                                        <>
                                            <Phone className="w-4 h-4" />
                                            Start Conversation
                                        </>
                                    )}
                                </motion.button>
                            ) : (
                                <motion.button
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={stopConversation}
                                    className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-red-500/15 border border-red-500/20 text-red-400 font-bold text-sm hover:bg-red-500/25 transition-colors cursor-pointer"
                                >
                                    <PhoneOff className="w-4 h-4" />
                                    End Conversation
                                </motion.button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence >
        </>
    )
}
