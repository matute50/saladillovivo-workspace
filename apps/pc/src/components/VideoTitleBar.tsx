'use client';

import React from 'react';
import { useNewsPlayerStore } from '@/store/useNewsPlayerStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn, cleanTitle } from '@/lib/utils';
import { getDisplayCategory } from '@/lib/categoryMappings'; // Importar la función
import { usePlayerStore } from '@/store/usePlayerStore';

interface VideoTitleBarProps {
  className?: string;
}

const VideoTitleBar: React.FC<VideoTitleBarProps> = ({ className }) => {
  const { currentVideo, nextVideo: preloadedNextVideo, playNextVideoInQueue, savedVideo, resumeAfterSlide } = usePlayerStore();
  const { currentSlide, isPlaying: isSlidePlaying, stopSlide } = useNewsPlayerStore();

  const isSlideActive = isSlidePlaying && currentSlide;

  const handleCloseSlide = () => {
    resumeAfterSlide();
    stopSlide();
  };

  // --- DATOS ACTUALES ---
  const currentVideoName = cleanTitle(currentVideo?.nombre || currentVideo?.title);

  const currentCategoryDb = currentVideo?.categoria || 'VIDEO';
  const currentDisplayCategory = getDisplayCategory(currentCategoryDb);

  const currentDisplay = isSlideActive
    ? "ULTIMAS NOTICIAS"
    : (currentVideoName === 'ESPACIO PUBLICITARIO'
      ? currentDisplayCategory.toUpperCase()
      : `${currentDisplayCategory.toUpperCase()}, ${currentVideoName}`);

  // --- DATOS PRÓXIMOS / CONTINUAR ---
  // --- DATOS PRÓXIMOS / CONTINUAR ---
  const nextVideoName = preloadedNextVideo ? cleanTitle(preloadedNextVideo.nombre || preloadedNextVideo.title) : null;
  const nextCategoryDb = preloadedNextVideo ? (preloadedNextVideo.categoria || 'VIDEO') : null;
  const nextDisplayCategory = nextCategoryDb ? getDisplayCategory(nextCategoryDb) : null;

  const nextVideoDisplay = nextVideoName === 'ESPACIO PUBLICITARIO'
    ? nextDisplayCategory?.toUpperCase()
    : nextVideoName ? `${nextDisplayCategory?.toUpperCase()}, ${nextVideoName}` : '';

  // Continuar Viendo (solo durante slide)
  // Continuar Viendo (solo durante slide)
  const savedVideoName = savedVideo ? cleanTitle(savedVideo.nombre || savedVideo.title) : '';
  const savedCategoryDb = savedVideo ? (savedVideo.categoria || 'VIDEO') : null;
  const savedDisplayCategory = savedCategoryDb ? getDisplayCategory(savedCategoryDb) : '';
  const continueVideoDisplay = savedVideoName === 'ESPACIO PUBLICITARIO'
    ? savedDisplayCategory.toUpperCase()
    : `${savedDisplayCategory.toUpperCase()}, ${savedVideoName}`;

  const showNextVideoLine = !isSlideActive && preloadedNextVideo;
  const showContinueLine = isSlideActive && savedVideo;

  const showBar = !!(currentVideo || preloadedNextVideo || isSlideActive);

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        .force-legend-color { color: #003399 !important; }
        html.dark .force-legend-color { color: #6699ff !important; }
      `}} />

      <AnimatePresence>
        {showBar && (
          <motion.div
            className={cn(
              "w-full py-0.5 px-2 card text-right flex flex-col gap-0 shadow-lg",
              className
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            {/* LÍNEA 1: TÍTULO ACTUAL */}
            <div className="flex items-center justify-end gap-2 w-full min-w-0">
              <p className="font-semibold text-black dark:text-white truncate uppercase text-[10px] drop-shadow-sm leading-tight flex-1 min-w-0">
                <span className="force-legend-color font-bold">ESTÁS VIENDO:</span> {currentDisplay}
              </p>
              <button
                onClick={isSlideActive ? handleCloseSlide : playNextVideoInQueue}
                className="text-red-500 hover:text-red-700 transition-colors"
                title={isSlideActive ? "Cerrar" : "Siguiente"}
              >
                <X size={14} />
              </button>
            </div>

            {/* LÍNEA 2: PRÓXIMO VIDEO o CONTINUAR VIENDO */}
            {showNextVideoLine && (
              <div className="flex items-center justify-end gap-2">
                <p className="font-semibold text-black dark:text-white truncate uppercase text-[10px] drop-shadow-sm leading-tight">
                  <span className="force-legend-color font-bold">PRÓXIMO VIDEO:</span> {nextVideoDisplay}
                </p>
              </div>
            )}

            {showContinueLine && (
              <div className="flex items-center justify-end gap-2">
                <p className="font-semibold text-black dark:text-white truncate uppercase text-[10px] drop-shadow-sm leading-tight">
                  <span className="force-legend-color font-bold">CONTINUAR VIENDO:</span> {continueVideoDisplay}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default React.memo(VideoTitleBar);