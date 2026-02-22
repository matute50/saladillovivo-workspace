'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useSpatialNavigation } from '@/hooks/useSpatialNavigation';
import { cn } from '@/lib/utils';

interface FocusableProps {
    id: string;
    children: React.ReactNode | ((props: { isFocused: boolean }) => React.ReactNode);
    group?: string;
    onSelect?: () => void;
    className?: string;
    focusClassName?: string;
    disabled?: boolean;
    layer?: number;
    onFocus?: () => void;
    onBlur?: () => void;
}

export const Focusable: React.FC<FocusableProps> = ({
    id,
    children,
    group,
    onSelect,
    className,
    focusClassName = 'outline outline-[4px] outline-white scale-[1.1] z-50 ring-offset-2 ring-offset-black ring-2 ring-white/50',
    disabled = false,
    layer,
    onFocus,
    onBlur
}) => {
    const { elementRef, isFocused } = useSpatialNavigation(
        id,
        group,
        {
            onSelect: disabled ? undefined : onSelect,
            layer,
            disabled,
            onFocus,
            onBlur
        }
    );

    return (
        <motion.div
            ref={elementRef as any}
            onClick={disabled ? undefined : onSelect}
            className={cn(
                'transition-all duration-200 outline-none',
                isFocused && !disabled && focusClassName,
                isFocused && !disabled && 'relative z-[9999]',
                disabled && 'opacity-50 cursor-not-allowed',
                className
            )}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{
                opacity: 1,
                scale: 1
            }}
            transition={{ duration: 0.2 }}
            tabIndex={disabled ? -1 : 0}
        >
            {typeof children === 'function' ? children({ isFocused }) : children}
        </motion.div>
    );
};
