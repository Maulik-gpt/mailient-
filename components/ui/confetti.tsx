"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ConfettiPiece {
    id: number;
    x: number;
    delay: number;
    duration: number;
    color: string;
    size: number;
    rotation: number;
}

const COLORS = [
    "#f97316", // orange
    "#eab308", // yellow
    "#22c55e", // green
    "#3b82f6", // blue
    "#a855f7", // purple
    "#ec4899", // pink
    "#06b6d4", // cyan
];

export function Confetti({
    trigger,
    duration = 3000,
    particleCount = 50
}: {
    trigger: boolean;
    duration?: number;
    particleCount?: number;
}) {
    const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        if (trigger && !isActive) {
            setIsActive(true);
            const newPieces: ConfettiPiece[] = [];

            for (let i = 0; i < particleCount; i++) {
                newPieces.push({
                    id: i,
                    x: Math.random() * 100,
                    delay: Math.random() * 0.5,
                    duration: 2 + Math.random() * 2,
                    color: COLORS[Math.floor(Math.random() * COLORS.length)],
                    size: 6 + Math.random() * 8,
                    rotation: Math.random() * 360,
                });
            }

            setPieces(newPieces);

            setTimeout(() => {
                setIsActive(false);
                setPieces([]);
            }, duration);
        }
    }, [trigger, duration, particleCount, isActive]);

    if (!isActive || pieces.length === 0) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
            {pieces.map((piece) => (
                <div
                    key={piece.id}
                    className="absolute animate-confetti-fall"
                    style={{
                        left: `${piece.x}%`,
                        top: "-20px",
                        width: piece.size,
                        height: piece.size * 0.6,
                        backgroundColor: piece.color,
                        borderRadius: "2px",
                        transform: `rotate(${piece.rotation}deg)`,
                        animationDelay: `${piece.delay}s`,
                        animationDuration: `${piece.duration}s`,
                    }}
                />
            ))}
        </div>
    );
}

// Confetti burst from a specific point (for badge unlock)
export function ConfettiBurst({
    trigger,
    x = 50,
    y = 50,
    particleCount = 30
}: {
    trigger: boolean;
    x?: number;
    y?: number;
    particleCount?: number;
}) {
    const [pieces, setPieces] = useState<any[]>([]);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        if (trigger && !isActive) {
            setIsActive(true);
            const newPieces = [];

            for (let i = 0; i < particleCount; i++) {
                const angle = (i / particleCount) * 360;
                const velocity = 50 + Math.random() * 100;
                newPieces.push({
                    id: i,
                    angle,
                    velocity,
                    color: COLORS[Math.floor(Math.random() * COLORS.length)],
                    size: 4 + Math.random() * 6,
                });
            }

            setPieces(newPieces);

            setTimeout(() => {
                setIsActive(false);
                setPieces([]);
            }, 2000);
        }
    }, [trigger, particleCount, isActive]);

    if (!isActive || pieces.length === 0) return null;

    return (
        <div
            className="fixed pointer-events-none z-[9999]"
            style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
        >
            {pieces.map((piece) => (
                <div
                    key={piece.id}
                    className="absolute animate-confetti-burst"
                    style={{
                        width: piece.size,
                        height: piece.size,
                        backgroundColor: piece.color,
                        borderRadius: "50%",
                        "--angle": `${piece.angle}deg`,
                        "--velocity": `${piece.velocity}px`,
                    } as any}
                />
            ))}
        </div>
    );
}
