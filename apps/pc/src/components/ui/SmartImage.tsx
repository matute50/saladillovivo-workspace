import React from 'react';
import Image, { ImageProps } from 'next/image';
import { cn } from '@/lib/utils';

// Detectar si estamos en entorno WebView/APK (muy básico, ajustable según necesidad)
// Una forma común es que la APK inyecte un UserAgent específico o una variable en window.
// Por ahora, usamos una prop opcional o detección de dominio si fuera necesario.
// Para este caso, asumiremos que si unoptimized es explícito, se respeta.
// Si no, intentaremos usar optimización por defecto salvo que se indique lo contrario globalmente.

interface SmartImageProps extends Omit<ImageProps, 'src'> {
    src: string | undefined | null;
    fallbackSrc?: string;
    isApk?: boolean; // Forzar modo APK si se detecta
}

const DEFAULT_FALLBACK = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const SmartImage = ({
    src,
    fallbackSrc = DEFAULT_FALLBACK,
    className,
    alt,
    isApk = false,
    ...props
}: SmartImageProps) => {
    const [currentSrc, setCurrentSrc] = React.useState<string | undefined | null>(src);
    const [hasError, setHasError] = React.useState(false);

    // Update currentSrc if the src prop changes
    React.useEffect(() => {
        setCurrentSrc(src);
        setHasError(false);
    }, [src]);

    // 1. Determine Optimization Strategy
    const isDataUri = currentSrc?.toString().startsWith('data:');
    const isExternal = currentSrc?.toString().startsWith('http');
    // Forzamos unoptimized si es APK, Data URI o una imagen externa que no sea de nuestro Supabase
    const shouldUnoptimize = isApk || isDataUri || (isExternal && !currentSrc?.includes('supabase.co')) || props.unoptimized;

    return (
        <Image
            src={hasError ? fallbackSrc : (currentSrc || fallbackSrc)}
            alt={alt || "Imagen"}
            className={cn("transition-opacity duration-300", className)}
            unoptimized={shouldUnoptimize}
            onError={() => {
                if (!hasError) {
                    setHasError(true);
                }
            }}
            {...props}
        />
    );
};

export default SmartImage;
