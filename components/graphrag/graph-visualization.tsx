'use client';

/**
 * GraphVisualization Component
 * 
 * Interactive graph visualization using force-directed layout.
 * Shows nodes and relationships with glassmorphism styling.
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Network, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface GraphNode {
    id: string;
    label: string;
    type: string;
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
}

interface GraphEdge {
    source: string;
    target: string;
    relation: string;
}

interface GraphVisualizationProps {
    nodes: GraphNode[];
    edges: GraphEdge[];
    width?: number;
    height?: number;
    onNodeClick?: (node: GraphNode) => void;
}

export function GraphVisualization({ 
    nodes, 
    edges, 
    width = 800, 
    height = 400,
    onNodeClick 
}: GraphVisualizationProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [draggedNode, setDraggedNode] = useState<string | null>(null);
    const nodePositions = useRef<Map<string, { x: number; y: number; vx: number; vy: number }>>(new Map());

    // Initialize node positions
    useEffect(() => {
        const centerX = width / 2;
        const centerY = height / 2;
        
        nodes.forEach((node, i) => {
            if (!nodePositions.current.has(node.id)) {
                const angle = (i / nodes.length) * Math.PI * 2;
                const radius = 100;
                nodePositions.current.set(node.id, {
                    x: centerX + Math.cos(angle) * radius,
                    y: centerY + Math.sin(angle) * radius,
                    vx: 0,
                    vy: 0
                });
            }
        });
    }, [nodes, width, height]);

    // Force-directed simulation
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;
        
        const simulate = () => {
            const positions = nodePositions.current;
            
            // Forces
            const repulsionForce = 2000;
            const springLength = 100;
            const springStrength = 0.05;
            const damping = 0.9;
            const centerForce = 0.01;

            // Apply forces
            nodes.forEach((node, i) => {
                const pos = positions.get(node.id);
                if (!pos) return;

                let fx = 0, fy = 0;

                // Repulsion between nodes
                nodes.forEach((other, j) => {
                    if (i === j) return;
                    const otherPos = positions.get(other.id);
                    if (!otherPos) return;

                    const dx = pos.x - otherPos.x;
                    const dy = pos.y - otherPos.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    
                    if (dist < 200) {
                        const force = repulsionForce / (dist * dist);
                        fx += (dx / dist) * force;
                        fy += (dy / dist) * force;
                    }
                });

                // Spring forces for edges
                edges.forEach(edge => {
                    if (edge.source === node.id || edge.target === node.id) {
                        const otherId = edge.source === node.id ? edge.target : edge.source;
                        const otherPos = positions.get(otherId);
                        if (!otherPos) return;

                        const dx = otherPos.x - pos.x;
                        const dy = otherPos.y - pos.y;
                        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                        
                        const force = (dist - springLength) * springStrength;
                        fx += (dx / dist) * force;
                        fy += (dy / dist) * force;
                    }
                });

                // Center gravity
                const centerX = width / 2;
                const centerY = height / 2;
                fx += (centerX - pos.x) * centerForce;
                fy += (centerY - pos.y) * centerForce;

                // Apply forces
                pos.vx = (pos.vx + fx) * damping;
                pos.vy = (pos.vy + fy) * damping;
                pos.x += pos.vx;
                pos.y += pos.vy;
            });

            // Render
            ctx.clearRect(0, 0, width, height);
            
            // Draw edges
            edges.forEach(edge => {
                const sourcePos = positions.get(edge.source);
                const targetPos = positions.get(edge.target);
                if (!sourcePos || !targetPos) return;

                ctx.beginPath();
                ctx.moveTo(sourcePos.x, sourcePos.y);
                ctx.lineTo(targetPos.x, targetPos.y);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 1;
                ctx.stroke();
            });

            // Draw nodes
            nodes.forEach(node => {
                const pos = positions.get(node.id);
                if (!pos) return;

                // Node glow
                const gradient = ctx.createRadialGradient(
                    pos.x, pos.y, 0,
                    pos.x, pos.y, 25
                );
                gradient.addColorStop(0, getNodeColor(node.type, 0.4));
                gradient.addColorStop(1, getNodeColor(node.type, 0));
                
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 25, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();

                // Node circle
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
                ctx.fillStyle = getNodeColor(node.type, 1);
                ctx.fill();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Label
                ctx.font = '12px sans-serif';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.textAlign = 'center';
                ctx.fillText(node.label, pos.x, pos.y + 25);
            });

            animationId = requestAnimationFrame(simulate);
        };

        simulate();

        return () => cancelAnimationFrame(animationId);
    }, [nodes, edges, width, height]);

    const getNodeColor = (type: string, alpha: number) => {
        const colors: Record<string, string> = {
            person: `rgba(59, 130, 246, ${alpha})`,
            project: `rgba(168, 85, 247, ${alpha})`,
            decision: `rgba(34, 197, 94, ${alpha})`,
            agreement: `rgba(16, 185, 129, ${alpha})`,
            bug: `rgba(239, 68, 68, ${alpha})`,
            deadline: `rgba(249, 115, 22, ${alpha})`,
            default: `rgba(156, 163, 175, ${alpha})`
        };
        return colors[type] || colors.default;
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;

        // Check if clicking a node
        for (const [id, pos] of nodePositions.current) {
            const dx = x - pos.x;
            const dy = y - pos.y;
            if (Math.sqrt(dx * dx + dy * dy) < 15) {
                setDraggedNode(id);
                setIsDragging(true);
                return;
            }
        }

        setIsDragging(true);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;

        if (draggedNode) {
            const pos = nodePositions.current.get(draggedNode);
            if (pos) {
                pos.x = x;
                pos.y = y;
                pos.vx = 0;
                pos.vy = 0;
            }
        } else {
            setOffset(prev => ({
                x: prev.x + e.movementX / scale,
                y: prev.y + e.movementY / scale
            }));
        }
    };

    const handleMouseUp = () => {
        if (draggedNode && onNodeClick) {
            const node = nodes.find(n => n.id === draggedNode);
            if (node) onNodeClick(node);
        }
        setIsDragging(false);
        setDraggedNode(null);
    };

    const zoomIn = () => setScale(s => Math.min(s * 1.2, 3));
    const zoomOut = () => setScale(s => Math.max(s / 1.2, 0.5));
    const resetView = () => {
        setScale(1);
        setOffset({ x: 0, y: 0 });
    };

    return (
        <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 rounded-lg">
                    <Network className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-white/70">{nodes.length} nodes</span>
                </div>
            </div>

            <div className="absolute top-4 right-4 z-10 flex items-center gap-1">
                <button
                    onClick={zoomIn}
                    className="p-2 bg-black/40 hover:bg-black/60 rounded-lg text-white/70 hover:text-white transition-colors"
                >
                    <ZoomIn className="w-4 h-4" />
                </button>
                <button
                    onClick={zoomOut}
                    className="p-2 bg-black/40 hover:bg-black/60 rounded-lg text-white/70 hover:text-white transition-colors"
                >
                    <ZoomOut className="w-4 h-4" />
                </button>
                <button
                    onClick={resetView}
                    className="p-2 bg-black/40 hover:bg-black/60 rounded-lg text-white/70 hover:text-white transition-colors"
                >
                    <Maximize className="w-4 h-4" />
                </button>
            </div>

            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                    cursor: isDragging ? 'grabbing' : 'grab'
                }}
                className="transition-transform"
            />
        </div>
    );
}

export default GraphVisualization;
