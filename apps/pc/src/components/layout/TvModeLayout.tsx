'use client';

import React, { useState, useEffect, useCallback } from 'react';
import VideoSection from './VideoSection';
import VideoControls from '../VideoControls';
import TvContentRail from '../tv/TvContentRail';
import { useNewsStore } from '@/store/useNewsStore';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useNewsPlayerStore } from '@/store/useNewsPlayerStore';
import { CategoryMapping } from '@/lib/categoryMappings';

// Definir las categorías elegibles para el inicio aleatorio
const INITIAL_TV_CATEGORIES: CategoryMapping[] = [
  { display: 'Saladillo Canta', dbCategory: 'clips' },
  { display: 'Gente de Acá', dbCategory: 'export' },
  { display: 'Sembrando Futuro', dbCategory: 'SEMBRANDO FUTURO' },
];

const TvModeLayout = () => {
  const { handleSearch, searchResults, isSearching, searchLoading } = useNewsStore();
  const { isPlaying, setViewMode } = usePlayerStore(); // Obtener el video actual y el estado de reproducción
  const { isPlaying: isNewsPlaying } = useNewsPlayerStore(); // Estado de reproducción de noticias
  const [initialTvCategory, setInitialTvCategory] = useState<CategoryMapping | undefined>(undefined); // Nuevo estado

  useEffect(() => {
    // Seleccionar una categoría aleatoria al montar
    const randomIndex = Math.floor(Math.random() * INITIAL_TV_CATEGORIES.length);
    setInitialTvCategory(INITIAL_TV_CATEGORIES[randomIndex]);
  }, []); // El array vacío asegura que se ejecute solo una vez al montar


  const onSearchSubmit = useCallback((term: string) => {
    handleSearch(term);
  }, [handleSearch]);

  // Estado inicial: overlays visibles
  const [isOverlayVisible, setIsOverlayVisible] = useState(true);
  const [isCarouselVisible, setIsCarouselVisible] = useState(true);

  // Toggle overlays con tecla ENTER
  const toggleOverlays = useCallback(() => {
    setIsOverlayVisible(prev => !prev);
    setIsCarouselVisible(prev => !prev);
  }, []);



  // Ocultar overlays (al elegir contenido)
  const hideOverlays = useCallback(() => {
    setIsOverlayVisible(false);
    setIsCarouselVisible(false);
  }, []);



  // Handler para tecla ENTER
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        toggleOverlays();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [toggleOverlays]);

  const [isFullScreen, setIsFullScreen] = useState(false);





  const toggleFullScreen = useCallback(() => {

    if (!document.fullscreenElement) {

      document.documentElement.requestFullscreen()

        .then(() => setIsFullScreen(true))

        .catch((e) => console.log("Fullscreen requiere interacción:", e));

    } else {

      document.exitFullscreen().then(() => setIsFullScreen(false)).catch(() => { });

    }

  }, []);





  const handleSwitchToDailyMode = useCallback(() => {
    setViewMode('diario');
  }, [setViewMode]);











  return (

    <div
      className="relative h-screen w-screen overflow-hidden bg-black"
    >
      <div className="absolute inset-0 z-0">
        <VideoSection />
        {/* Capa transparente para capturar clicks y mostrar/ocultar overlays */}
        <div className="absolute inset-0 z-10" onClick={toggleOverlays} />
      </div>



      {/* Cinematic bars */}



      <AnimatePresence>
        {!isPlaying && !isNewsPlaying && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.0, ease: "easeOut" }}
            className="absolute inset-0 z-20 pointer-events-none"
          >
            <div className="absolute top-0 left-0 w-full bg-black h-[15%] pointer-events-auto" />
            <div className="absolute bottom-0 left-0 w-full bg-black h-[15%] pointer-events-auto" />
          </motion.div>
        )}
      </AnimatePresence>



      {/* 3. UI Overlay - IMPORTANTE: pointer-events-none para no bloquear el fondo */}
      <div
        className={`absolute inset-0 z-30 flex flex-col justify-between h-full transition-opacity duration-500 ease-in-out pointer-events-none will-change-[opacity] ${isOverlayVisible ? 'opacity-100' : 'opacity-0'}`}

      >
        <div
          className={`bg-gradient-to-b from-black/80 to-transparent p-8 ${isOverlayVisible ? 'pointer-events-auto' : 'pointer-events-none'}`}

        >
          <div className="bg-black/10 backdrop-blur-lg shadow-lg shadow-black/50 rounded-md p-4 inline-block">
            <Image
              src="/FONDO_OSCURO.png"
              alt="Saladillo Vivo Logo"
              width={288}
              height={72}
              className="h-auto w-72 object-contain"
              priority
            />
          </div>
        </div>

        <div
          className={`bg-gradient-to-t from-black/80 to-transparent p-8 ${isOverlayVisible ? 'pointer-events-auto' : 'pointer-events-none'}`}

        >
          <div className="flex justify-between items-end">
            <div
              className={isOverlayVisible ? 'pointer-events-auto' : 'pointer-events-none'} // Permitir eventos de mouse solo si es visible

            >
              <TvContentRail
                searchResults={searchResults}
                isSearching={isSearching}
                searchLoading={searchLoading}
                initialCategory={initialTvCategory} // Pasa la categoría inicial aleatoria
                isVisible={isCarouselVisible} // Pasa la visibilidad al carrusel
                onVideoSelect={hideOverlays} // Ocultar overlays al elegir video
              />
            </div>
          </div>
        </div>

        <div
          className={`absolute top-4 right-4 z-[60] flex items-center gap-2 ${isOverlayVisible ? 'pointer-events-auto' : 'pointer-events-none'}`}

        >
          <div className="rounded-md p-2 bg-black/10 backdrop-blur-lg shadow-lg shadow-black/50">
            <VideoControls
              showControls={isOverlayVisible}
              onToggleFullScreen={toggleFullScreen}
              isFullScreen={isFullScreen}
              onSwitchToDailyMode={handleSwitchToDailyMode}
              onSearchSubmit={onSearchSubmit}
            />
          </div>
        </div>
      </div>
    </div>
  );

};

export default TvModeLayout;