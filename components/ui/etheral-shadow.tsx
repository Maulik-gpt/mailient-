'use client';

import React, { useId, CSSProperties } from 'react';

// Type definitions
interface ResponsiveImage {
    src: string;
    alt?: string;
    srcSet?: string;
}

interface AnimationConfig {
    preview?: boolean;
    scale: number;
    speed: number;
}

interface NoiseConfig {
    opacity: number;
    scale: number;
}

interface ShadowOverlayProps {
    type?: 'preset' | 'custom';
    presetIndex?: number;
    customImage?: ResponsiveImage;
    sizing?: 'fill' | 'stretch';
    color?: string;
    animation?: AnimationConfig;
    noise?: NoiseConfig;
    style?: CSSProperties;
    className?: string;
    showTitle?: boolean;
}

function mapRange(
    value: number,
    fromLow: number,
    fromHigh: number,
    toLow: number,
    toHigh: number
): number {
    if (fromLow === fromHigh) {
        return toLow;
    }
    const percentage = (value - fromLow) / (fromHigh - fromLow);
    return toLow + percentage * (toHigh - toLow);
}

export function Component({
    sizing = 'fill',
    color = 'rgba(128, 128, 128, 1)',
    animation,
    noise,
    style,
    className,
    showTitle = true
}: ShadowOverlayProps) {
    const animationEnabled = animation && animation.scale > 0;
    const animationDuration = animation ? mapRange(animation.speed, 1, 100, 1000, 50) : 1;

    return (
        <div
            className={className}
            style={{
                overflow: "hidden",
                position: "relative",
                width: "100%",
                height: "100%",
                ...style
            }}
        >
            <div
                style={{
                    position: "absolute",
                    inset: -200,
                    filter: "blur(100px)",
                    background: `radial-gradient(circle at 50% 50%, ${color} 0%, transparent 60%)`,
                    animation: animationEnabled ? `ethereal-float ${animationDuration / 50}s ease-in-out infinite alternate` : "none",
                    opacity: 0.5,
                    willChange: "transform, filter",
                }}
            />

            <style jsx global>{`
                @keyframes ethereal-float {
                    0% {
                        transform: translate(0, 0) scale(1.1);
                        filter: blur(80px);
                    }
                    33% {
                        transform: translate(5%, 3%) scale(1.2);
                        filter: blur(100px);
                    }
                    66% {
                        transform: translate(-4%, 6%) scale(1);
                        filter: blur(90px);
                    }
                    100% {
                        transform: translate(2%, -4%) scale(1.15);
                        filter: blur(110px);
                    }
                }
            `}</style>

            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    backgroundColor: color,
                    maskImage: `url('https://framerusercontent.com/images/ceBGguIpUU8luwByxuQz79t7To.png')`,
                    maskSize: sizing === "stretch" ? "100% 100%" : "cover",
                    maskRepeat: "no-repeat",
                    maskPosition: "center",
                    width: "100%",
                    height: "100%",
                    opacity: 0.3
                }}
            />

            {showTitle && (
                <div
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        textAlign: "center",
                        zIndex: 10
                    }}
                >
                    <h1 className="md:text-7xl text-6xl lg:text-8xl font-bold text-center text-foreground relative z-20">
                        Etheral Shadows
                    </h1>
                </div>
            )}

            {noise && noise.opacity > 0 && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        backgroundImage: `url("https://framerusercontent.com/images/g0QcWrxr87K0ufOxIUFBakwYA8.png")`,
                        backgroundSize: noise.scale * 200,
                        backgroundRepeat: "repeat",
                        opacity: noise.opacity / 2,
                        pointerEvents: "none"
                    }}
                />
            )}
        </div>
    );
}

export { Component as EtherealShadow };
