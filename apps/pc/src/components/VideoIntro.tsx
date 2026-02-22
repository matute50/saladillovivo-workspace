import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface VideoIntroProps {
  videoSrc: string;
  onEnd: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  style?: React.CSSProperties; // NUEVO: para controlar la opacidad inicial
}

const VideoIntro: React.FC<VideoIntroProps & { isVisible?: boolean }> = ({ videoSrc, onEnd, videoRef, style, isVisible = true }) => {
  useEffect(() => {
    // Solo gestionar carga/play si tenemos src y estamos visibles
    if (videoRef && videoRef.current && videoSrc && isVisible) {
      // Si la URL cambió o acabamos de hacernos visibles
      const videoEl = videoRef.current;

      // Chequear si necesitamos recargar (src diferente) o solo play
      // Nota: videoEl.src devuelve la absoluta, videoSrc puede ser relativa
      if (!videoEl.currentSrc.endsWith(videoSrc) && videoSrc !== videoEl.currentSrc) {
        videoEl.src = videoSrc;
        videoEl.load();
      }

      videoEl.play().catch((error) => {
        console.warn("Autoplay intro bloqued:", error);
      });
    } else if (videoRef && videoRef.current && !isVisible) {
      // Si no es visible, aseguramos pausa y reset para liberar recursos pero mantenemos el nodo
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [videoSrc, videoRef, isVisible]);

  return (
    <video
      ref={videoRef}
      className={cn("absolute inset-0 w-full h-full object-contain", !isVisible && "opacity-0 pointer-events-none")}
      muted
      playsInline
      onEnded={onEnd}
      style={{
        ...style,
        zIndex: 999, // Z-Index Supremacy (v23.0)
        display: 'block' // Ensure it's never 'none' unless intent
      }}
    />
  );
};

export default VideoIntro;