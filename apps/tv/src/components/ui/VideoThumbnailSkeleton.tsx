import React from 'react';

/**
 * VideoThumbnailSkeleton
 * Placeholder visual durante carga de miniaturas
 * Mejora la percepción de velocidad
 */

interface VideoThumbnailSkeletonProps {
    width?: number;
    className?: string;
}

export const VideoThumbnailSkeleton: React.FC<VideoThumbnailSkeletonProps> = ({
    width = 258,
    className = ''
}) => {
    return (
        <div
            className={`relative aspect-video bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-xl overflow-hidden ${className}`}
            style={{ width: `${width}px` }}
        >
            {/* Shimmer effect animado */}
            <div
                className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
                style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)'
                }}
            />

            {/* Icono de video placeholder */}
            <div className="absolute inset-0 flex items-center justify-center">
                <svg
                    className="w-16 h-16 text-zinc-700"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path d="M8 5v14l11-7z" />
                </svg>
            </div>

            {/* Título placeholder */}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/60 to-transparent p-2 flex items-end">
                <div className="space-y-1.5 w-full">
                    <div className="h-2 bg-zinc-700 rounded animate-pulse w-3/4" />
                    <div className="h-2 bg-zinc-700 rounded animate-pulse w-1/2" />
                </div>
            </div>
        </div>
    );
};

/**
 * CSS para animación shimmer (agregar a globals.css)
 * 
 * @keyframes shimmer {
 *   100% {
 *     transform: translateX(100%);
 *   }
 * }
 */
