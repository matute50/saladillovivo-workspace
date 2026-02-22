'use client';

import React, { useState, useEffect } from 'react';
import VideoSection from './VideoSection';
import VideoControls from '../VideoControls';
import TvContentRail from '../tv/TvContentRail';
import { useNewsStore } from '@/store/useNewsStore';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useNewsPlayerStore } from '@/store/useNewsPlayerStore';
import { CategoryMapping } from '@/lib/categoryMappings';
import { useRemoteControl } from '@/hooks/useRemoteControl';
import { useNavigationStore } from '@/store/useNavigationStore';

// Definir las categorías elegibles para el inicio aleatorio
const INITIAL_TV_CATEGORIES: CategoryMapping[] = [
  { display: 'Saladillo Canta', dbCategory: 'clips' },
  { display: 'Gente de Acá', dbCategory: 'export' },
  { display: 'Sembrando Futuro', dbCategory: 'SEMBRANDO FUTURO' },
];

const TvModeLayout = ({ resumenId }: { resumenId?: string }) => {
  const { handleSearch, searchResults, isSearching } = useNewsStore();
  const { isPlaying, loadInitialPlaylist } = usePlayerStore();
  const { isPlaying: isNewsPlaying, currentSlide } = useNewsPlayerStore();
  const isHtmlSlide = isNewsPlaying && currentSlide && currentSlide.type === 'html';
  const [initialTvCategory, setInitialTvCategory] = useState<CategoryMapping | undefined>(undefined);

  // Integración con sistema de navegación espacial
  const { lastActivity } = useRemoteControl(true);
  const { isControlsVisible, setControlsVisible, updateActivity } = useNavigationStore();

  useEffect(() => {
    // Seleccionar una categoría aleatoria al montar
    const randomIndex = Math.floor(Math.random() * INITIAL_TV_CATEGORIES.length);
    setInitialTvCategory(INITIAL_TV_CATEGORIES[randomIndex]);

    // STARTUP LOGIC: Intro -> Daily Show OR Random Video
    if (resumenId) {
      const { loadDailyShow } = usePlayerStore.getState();
      loadDailyShow(resumenId);
    } else {
      loadInitialPlaylist(null);
    }
  }, [loadInitialPlaylist, resumenId]); // El array vacío asegura que se ejecute solo una vez al montar

  // LIMPIEZA: No forzamos controles visibles al inicio.
  // La UI debe estar oculta hasta que el usuario interactúe.
  useEffect(() => {
    updateActivity();
  }, [updateActivity]);

  // Detectar movimiento del mouse para mostrar controles
  useEffect(() => {
    const handleMouseMove = () => {
      if (!isControlsVisible) {
        setControlsVisible(true);
      }
      updateActivity();
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isControlsVisible, setControlsVisible, updateActivity]);


  // Manejo de teclado para ENTER (Mostrar overlay instantáneamente)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyCode = e.keyCode || e.which;
      if (e.key === 'Enter' || keyCode === 13) {
        if (!isControlsVisible) {
          setControlsVisible(true);
          updateActivity();
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isControlsVisible, setControlsVisible, updateActivity]);

  // Auto-ocultamiento ESTRICTO:
  // - Nunca aparece solo (ni en Intro, ni en Random).
  // - Si el usuario activó la UI (isControlsVisible=true), se oculta a los 10s.
  useEffect(() => {
    if (!isControlsVisible) return;

    const INACTIVITY_TIMEOUT = 10000; // 10 segundos

    const timer = setTimeout(() => {
      setControlsVisible(false);
    }, INACTIVITY_TIMEOUT);

    return () => clearTimeout(timer);
  }, [lastActivity, setControlsVisible, isControlsVisible]);

  return (

    <div

      className="relative h-screen w-screen overflow-hidden bg-black"

    >

      <div className="absolute inset-0 z-0">
        <VideoSection />
      </div>

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
        className={`absolute inset-0 z-30 flex flex-col justify-between h-full transition-opacity duration-500 ease-in-out pointer-events-none ${isControlsVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* TOP BAR - Padding reducido para no invadir video */}
        <div
          className="bg-gradient-to-b from-black/80 to-transparent pt-6 px-8 pointer-events-auto"
        >
          {!isHtmlSlide && (
            <Image
              src="/FONDO_OSCURO.png"
              alt="Saladillo Vivo Logo"
              width={288}
              height={72}
              className="object-contain drop-shadow-[0_0_20px_rgba(0,0,0,1)] drop-shadow-[0_0_45px_rgba(0,0,0,1)]"
              style={{ width: '14rem', height: 'auto' }}
              priority
            />
          )}
        </div>

        {/* BOTTOM RAIL - Sin padding excesivo para acercar al borde */}
        <div
          className="bg-gradient-to-t from-black/80 to-transparent pb-6 px-8 pointer-events-auto w-full"
          style={{ transform: 'translateY(100px)' }}
        >
          <div className="flex flex-col items-center w-full">
            <div
              className="pointer-events-auto w-full" // Permitir eventos de mouse en este div
            >
              <TvContentRail
                searchResults={searchResults}
                isSearching={isSearching}
                initialCategory={initialTvCategory} // Pasa la categoría inicial aleatoria
                isVisible={isControlsVisible} // Pasa la visibilidad al carrusel
              />
            </div>
          </div>
        </div>

        <div
          className="absolute top-4 right-4 z-[60] flex items-center gap-2 pointer-events-auto"
        >
          <div className="rounded-xl p-2 bg-gray-900 border border-white/10 shadow-lg shadow-black/80">
            <VideoControls
              showControls={isControlsVisible}
              onSearchSubmit={handleSearch}
              isSearching={isSearching}
            />
          </div>
        </div>
      </div>
    </div>
  );

};

export default TvModeLayout;