"use client";

import { PricingCard } from "./pricing-card";
import { motion, AnimatePresence } from "framer-motion";

interface PricingOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

export function PricingOverlay({ isOpen, onClose }: PricingOverlayProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative z-10 w-full max-w-[450px]"
                    >
                        <PricingCard onClose={onClose} />
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
