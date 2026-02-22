'use client';

import { motion } from "framer-motion";


import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNewsStore } from '@/store/useNewsStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useNewsPlayerStore } from '@/store/useNewsPlayerStore';
import { useVolumeStore } from '@/store/useVolumeStore';
import { useNavigationStore } from '@/store/useNavigationStore';
import CategoryCycler from '@/components/layout/CategoryCycler';
import { Video, Article } from '@/lib/types';
import { categoryMappings, type CategoryMapping } from '@/lib/categoryMappings';
import { cleanTitle } from '@/lib/utils';

const TRANSPARENT_PNG_DATA_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

interface TvContentRailProps {
  searchResults: Video[];
  isSearching: boolean;
  initialCategory?: CategoryMapping; // Nuevo prop para la categoría inicial
  isVisible?: boolean; // Nuevo prop para controlar la visibilidad
}

const TvContentRail: React.FC<TvContentRailProps> = ({ searchResults, isSearching, initialCategory, isVisible = true }) => {
  const { galleryVideos, allNews, isLoading: isLoadingNews, handleSearch } = useNewsStore();
  const { playManual, playTemporaryVideo, setIsPlaying } = usePlayerStore();
  const { playSlide } = useNewsPlayerStore();
  const { volume, setVolume } = useVolumeStore();
  const { setControlsVisible } = useNavigationStore();

  const [categoryIndex, setCategoryIndex] = useState(0);

  const availableCategoryMappings = useMemo(() => {
    if (isLoadingNews) return [];

    return categoryMappings.filter(category => {
      // Excluir explícitamente la categoría "Noticias (Slides)" del modo TV
      if (category.display === 'Noticias (Slides)') return false;

      if (category.dbCategory === '__NOTICIAS__') return allNews.length > 0;
      if (category.dbCategory === '__NOVEDADES__') return galleryVideos.some(video => video.novedad === true);

      const dbCategories = Array.isArray(category.dbCategory) ? category.dbCategory : [category.dbCategory];
      return galleryVideos.some(video => dbCategories.includes(video.categoria));
    });
  }, [galleryVideos, allNews, isLoadingNews]);

  useEffect(() => {
    if (availableCategoryMappings.length > 0) {
      if (initialCategory) {
        const initialIndex = availableCategoryMappings.findIndex(
          (cat) =>
            cat.display === initialCategory.display &&
            JSON.stringify(cat.dbCategory) === JSON.stringify(initialCategory.dbCategory)
        );
        if (initialIndex !== -1) {
          setCategoryIndex(initialIndex);
        } else {
          // Fallback if initialCategory is not found in available mappings
          const newsIndex = availableCategoryMappings.findIndex(c => c.dbCategory === '__NOTICIAS__');
          setCategoryIndex(newsIndex !== -1 ? newsIndex : 0);
        }
      } else {
        const newsIndex = availableCategoryMappings.findIndex(c => c.dbCategory === '__NOTICIAS__');
        setCategoryIndex(newsIndex !== -1 ? newsIndex : 0);
      }
    }
  }, [availableCategoryMappings, initialCategory]); // Add initialCategory to dependencies

  const handleNextCategory = useCallback(() => {
    setCategoryIndex(prev => (prev + 1) % availableCategoryMappings.length);
  }, [availableCategoryMappings.length]);

  const handlePrevCategory = useCallback(() => {
    setCategoryIndex(prev => (prev - 1 + availableCategoryMappings.length) % availableCategoryMappings.length);
  }, [availableCategoryMappings.length]);

  // Manejo de Clics
  const handleCardClick = useCallback((item: Video | Article) => {
    const isArticle = 'slug' in item || 'titulo' in item || 'url_slide' in item;

    const getProcessedAudioUrl = (inputUrl: string | undefined | null): string | null => {
      if (!inputUrl) return null;
      const cleanUrl = inputUrl.trim();
      if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
        return cleanUrl;
      }
      return `${process.env.NEXT_PUBLIC_MEDIA_URL || ''}${cleanUrl.startsWith('/') ? cleanUrl : `/${cleanUrl}`}`;
    };

    if (isArticle) {
      const newsItem = item as any;
      const title = cleanTitle(newsItem.title || newsItem.titulo);
      const imageUrl = newsItem.imageUrl || newsItem.image_url || newsItem.imagen || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      const urlSlide = newsItem.url_slide || newsItem.urlSlide;
      const audioUrl = getProcessedAudioUrl(newsItem.audio_url || newsItem.audioUrl);
      const duration = newsItem.animation_duration || 15;
      const isHtmlSlide = urlSlide && urlSlide.endsWith('.html');

      if (isHtmlSlide) {
        // Pausar video de fondo y reproducir slide
        setIsPlaying(false);
        // AQUÍ PASAMOS EL TÍTULO Y EL AUDIO
        usePlayerStore.getState().triggerIntro(true);
        playSlide({ url: urlSlide, type: 'html', duration, title, audioUrl });
      } else if (urlSlide) {
        // Video temporal
        playTemporaryVideo({
          id: (newsItem.id || Date.now()).toString(),
          type: 'video',
          url: urlSlide,
          nombre: title,
          categoria: 'Noticias',
          imagen: imageUrl,
          duration: duration,
          createdAt: new Date().toISOString(),
          novedad: false // Added to satisfy SlideMedia interface
        });
      }
    } else {
      playManual(item as Video, volume, setVolume);
    }

    // Limpiar búsqueda al elegir contenido (handleSearch('') resetea isSearching a false)
    handleSearch('');

    // Ocultar el overlay inmediatamente al elegir contenido
    setControlsVisible(false);

  }, [playManual, playTemporaryVideo, playSlide, setIsPlaying, volume, setVolume, setControlsVisible, handleSearch]);

  const processThumbnails = useCallback((items: any[]) => {
    return items.map(item => {
      let thumb = item.imageUrl || item.image_url || item.imagen;
      // Only use url_slide if it's not an HTML file (prevent broken images)
      if (!thumb && item.url_slide && !item.url_slide.endsWith('.html')) {
        thumb = item.url_slide;
      }
      thumb = thumb || TRANSPARENT_PNG_DATA_URI;
      if ((thumb === TRANSPARENT_PNG_DATA_URI || !thumb) && item.url) {
        const match = item.url.match(/(?:youtu\.be\/|youtube\.com\/.*v=)([^&]+)/);
        if (match && match[1]) thumb = `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
      }

      // Map title/titulo to nombre for ExclusiveVideoCarousel
      const nombre = cleanTitle(item.nombre || item.title || item.titulo || '');

      return { ...item, imageUrl: thumb, imagen: thumb, nombre };
    });
  }, []); // galleryVideos removed from dependencies as it's not directly used inside

  const processedAllNews = useMemo(() => processThumbnails(allNews), [allNews, processThumbnails]);

  // Determine activeCategory and rawItems only if availableCategoryMappings is not empty
  const activeCategory = availableCategoryMappings.length > 0 ? availableCategoryMappings[categoryIndex] : undefined;

  const rawItems = useMemo(() => {
    return activeCategory ? (activeCategory.dbCategory === '__NOTICIAS__' ? allNews : galleryVideos) : [];
  }, [activeCategory, allNews, galleryVideos]);

  const processedItems = useMemo(() => processThumbnails(rawItems), [rawItems, processThumbnails]);

  if (isLoadingNews || availableCategoryMappings.length === 0) {
    return <div className="text-white p-4 bg-white/10 rounded-lg flex justify-center items-center h-[145px]">Cargando...</div>;
  }

  // --- RENDERIZADO ---
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? (isSearching ? -165 : -75) : 20 }}
      transition={{ duration: 0.5 }}
      style={{ pointerEvents: isVisible ? 'auto' : 'none' }}
      className="w-full mx-auto px-4"
    >
      <div className="mt-0 w-full relative z-0 flex flex-col gap-6">
        {/* Static Latest News Carousel OR Search Results */}
        {isSearching ? (
          <CategoryCycler
            allVideos={processThumbnails(searchResults)}
            activeCategory={{ display: 'TU BÚSQUEDA', dbCategory: 'search_results' }}
            onNext={undefined}
            onPrev={undefined}
            onCardClick={handleCardClick}
            instanceId="tv-search-results"
            contentLayer={11}
            isSearchResult={true}
            carouselMt="-mt-[35px]"
            isInfinite={false}
            isFocusable={false}
          />
        ) : (
          <CategoryCycler
            allVideos={processedAllNews}
            activeCategory={{ display: 'ÚLTIMAS NOTICIAS', dbCategory: '__NOTICIAS__' }}
            onNext={undefined}
            onPrev={undefined}
            onCardClick={handleCardClick}
            instanceId="tv-latest-news"
            contentLayer={1}
            isFocusable={false}
          />
        )}

        {/* Dynamic Category Cycler - Hidden during search */}
        {
          !isSearching && activeCategory && (
            <div className="-mt-[20px]">
              <CategoryCycler
                allVideos={processedItems}
                activeCategory={activeCategory}
                onNext={handleNextCategory}
                onPrev={handlePrevCategory}
                onCardClick={handleCardClick}
                instanceId="tv-carousel"
                carouselMt="-mt-[30px]"
                contentLayer={3}
              />
            </div>
          )
        }
      </div >
    </motion.div >
  );
};

export default TvContentRail;