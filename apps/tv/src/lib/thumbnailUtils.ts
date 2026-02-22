/**
 * Thumbnail Optimization Utilities
 * Centraliza lógica de URLs optimizadas para miniaturas
 */

export interface ThumbnailQuality {
    youtube: 'maxresdefault' | 'hqdefault' | 'mqdefault' | 'sddefault';
    width: number;
    height: number;
}

export const THUMBNAIL_QUALITIES = {
    max: { youtube: 'maxresdefault', width: 1280, height: 720 } as ThumbnailQuality,
    hq: { youtube: 'hqdefault', width: 480, height: 360 } as ThumbnailQuality,
    mq: { youtube: 'mqdefault', width: 320, height: 180 } as ThumbnailQuality,
    sd: { youtube: 'sddefault', width: 640, height: 480 } as ThumbnailQuality,
};

/**
 * Blur placeholder optimizado con gradiente Saladillo
 * Base64 SVG para Next.js Image blurDataURL
 */
export const BLUR_PLACEHOLDER =
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNkYzI2MjYiIHN0b3Atb3BhY2l0eT0iMC4zIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMDAwMDAwIiBzdG9wLW9wYWNpdHk9IjAuOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZykiLz48L3N2Zz4=';

/**
 * Fallback placeholder transparente
 */
export const TRANSPARENT_PLACEHOLDER =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

/**
 * Extrae el video ID de YouTube de cualquier URL
 */
export const extractYouTubeId = (url: string): string | null => {
    if (!url) return null;

    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/  // Solo ID
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) return match[1];
    }

    return null;
};

/**
 * Obtiene URL optimizada de thumbnail de YouTube
 * Prioriza WebP cuando sea posible
 */
export const getOptimizedYoutubeThumbnail = (
    videoId: string | null,
    quality: keyof typeof THUMBNAIL_QUALITIES = 'hq'
): string => {
    if (!videoId) {
        return 'https://via.placeholder.com/320x180.png?text=No+disponible';
    }

    const qualityConfig = THUMBNAIL_QUALITIES[quality];

    // YouTube soporta WebP desde 2020 con mejor compresión
    // Next.js Image detectará automáticamente soporte WebP del navegador y optimizará
    // Por ahora retornamos JPG como base
    const jpgUrl = `https://img.youtube.com/vi/${videoId}/${qualityConfig.youtube}.jpg`;

    return jpgUrl;
};

/**
 * Procesa URL de thumbnail con todas las optimizaciones
 */
export const getOptimizedThumbnail = (
    imageUrl: string | undefined,
    videoUrl: string | undefined,
    quality: keyof typeof THUMBNAIL_QUALITIES = 'hq'
): {
    src: string;
    blurDataURL: string;
    width: number;
    height: number;
} => {
    const qualityConfig = THUMBNAIL_QUALITIES[quality];

    // 1. Intentar extraer de video.url primero
    if (videoUrl) {
        const videoId = extractYouTubeId(videoUrl);
        if (videoId) {
            return {
                src: getOptimizedYoutubeThumbnail(videoId, quality),
                blurDataURL: BLUR_PLACEHOLDER,
                width: qualityConfig.width,
                height: qualityConfig.height
            };
        }
    }

    // 2. Procesar imageUrl
    const cleanImageUrl = (imageUrl || '').trim();

    if (!cleanImageUrl) {
        return {
            src: 'https://via.placeholder.com/320x180.png?text=Miniatura',
            blurDataURL: BLUR_PLACEHOLDER,
            width: 320,
            height: 180
        };
    }

    // 3. Si imageUrl es YouTube, extraer miniatura
    if (cleanImageUrl.includes('youtube.com') || cleanImageUrl.includes('youtu.be')) {
        const videoId = extractYouTubeId(cleanImageUrl);
        if (videoId) {
            return {
                src: getOptimizedYoutubeThumbnail(videoId, quality),
                blurDataURL: BLUR_PLACEHOLDER,
                width: qualityConfig.width,
                height: qualityConfig.height
            };
        }
    }

    // 4. Data URI - retornar tal cual
    if (cleanImageUrl.startsWith('data:image')) {
        return {
            src: cleanImageUrl,
            blurDataURL: TRANSPARENT_PLACEHOLDER,
            width: 320,
            height: 180
        };
    }

    // 5. URL absoluta
    if (cleanImageUrl.match(/^(http|https):\/\//)) {
        return {
            src: cleanImageUrl,
            blurDataURL: BLUR_PLACEHOLDER,
            width: qualityConfig.width,
            height: qualityConfig.height
        };
    }

    // 6. URL relativa - agregar base
    const baseUrl = process.env.NEXT_PUBLIC_MEDIA_URL || '';
    const separator = cleanImageUrl.startsWith('/') ? '' : '/';

    return {
        src: `${baseUrl}${separator}${cleanImageUrl}`,
        blurDataURL: BLUR_PLACEHOLDER,
        width: qualityConfig.width,
        height: qualityConfig.height
    };
};
