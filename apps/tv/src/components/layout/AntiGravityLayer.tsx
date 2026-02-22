'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AntiGravityLayerProps {
    children: React.ReactNode;
    areCinematicBarsActive: boolean;
    className?: string;
}

const AntiGravityLayer = ({ children, areCinematicBarsActive, className }: AntiGravityLayerProps) => {
    return (
        <motion.div
            className={cn("absolute inset-0 z-[2147483647] pointer-events-none", className)}
            initial={{ opacity: 1 }}
            animate={{ opacity: areCinematicBarsActive ? 0 : 1 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            style={{
                transform: 'translateZ(0)', // Force GPU Layer
                willChange: 'opacity'
            }}
        >
            {/* 
        Anti-Gravity Logic:
        - Parent has pointer-events: none (Passthrough)
        - Children MUST have pointer-events-auto to be interactive
        - z-index MAX_INT forces UI above everything (Youtube Popups, etc)
      */}
            {children}
        </motion.div>
    );
};

export default AntiGravityLayer;
