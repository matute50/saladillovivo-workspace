'use client';

import React from 'react';
import { Share2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Video, Article } from '@/lib/types';

interface ShareButtonProps {
    content?: Video | Article | null;
    className?: string;
    iconSize?: number;
    variant?: 'player-control' | 'floating' | 'simple';
    customUrl?: string;
    customTitle?: string;
}

export const ShareButton = ({
    content,
    className,
    iconSize = 24,
    variant = 'player-control',
    customUrl,
    customTitle
}: ShareButtonProps) => {
    const [copied, setCopied] = React.useState(false);

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();

        const siteUrl = 'https://m.saladillovivo.com.ar';
        let shareUrl = customUrl || siteUrl;
        let shareTitle = customTitle || "Saladillo ViVo";

        if (content) {
            if ('url_slide' in content) {
                shareUrl = `${siteUrl}/?id=${content.id}`;
                shareTitle = content.titulo;
            } else if ('url' in content) {
                shareUrl = `${siteUrl}/?v=${content.id}`;
                shareTitle = content.nombre;
            }
        }

        // WhatsApp genera el preview automáticamente (imagen + título) desde los metadatos OG.
        // Solo se envía la URL para evitar duplicación del link y texto innecesario.
        const whatsappText = shareUrl;

        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappText)}`, '_blank');

        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (variant === 'player-control') {
        return (
            <button
                onClick={handleShare}
                className={cn(
                    "group flex items-center justify-center rounded-full p-6 active:scale-90 transition-all duration-200 border bg-white/10 border-white/30 backdrop-blur-md",
                    className
                )}
            >
                {copied ? <Check size={36} className="text-green-400" /> : <Share2 size={36} stroke="white" strokeWidth={2.5} />}
            </button>
        );
    }

    if (variant === 'floating') {
        return (
            <button
                onClick={handleShare}
                className={cn(
                    "p-3 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white active:scale-95 transition-all shadow-lg",
                    className
                )}
            >
                {copied ? <Check size={iconSize} className="text-green-400" /> : <Share2 size={iconSize} />}
            </button>
        );
    }

    // Variant 'simple'
    return (
        <button
            onClick={handleShare}
            className={cn(
                "p-2 rounded-full hover:bg-white/10 transition-colors active:scale-95",
                className
            )}
        >
            {copied ? <Check size={iconSize} className="text-green-500" /> : <Share2 size={iconSize} />}
        </button>
    );
};
