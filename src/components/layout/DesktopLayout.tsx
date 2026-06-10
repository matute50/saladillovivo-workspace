'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';

const AdsSection = dynamic(() => import('./AdsSection'), { ssr: false });
const VideoSection = dynamic(() => import('./VideoSection'), { ssr: false });
const NewsTicker = dynamic(() => import('../NewsTicker'), { ssr: false });

import type { PageData, Video } from '@/lib/types';
import CategoryCycler from './CategoryCycler';
import { categoryMappings, type CategoryMapping } from '@/lib/categoryMappings';
import { useNewsStore } from '@/store/useNewsStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useVolumeStore } from '@/store/useVolumeStore';
import NoResultsCard from './NoResultsCard';
import NewsCard from '../NewsCard';
import { shuffleArray } from '@/lib/utils';

interface DesktopLayoutProps {
  data: PageData;
}

const DesktopLayout = ({ data }: DesktopLayoutProps) => {
  const {
    articles,
    ads,
    tickerTexts = []
  } = data || {};

  const { isSearching, searchResults, searchLoading, handleSearch } = useNewsStore();

  const { playSpecificVideo, loadInitialPlaylist } = usePlayerStore();
  const { volume, setVolume } = useVolumeStore();

  // --- VIDEOS PARA EL CARRUSEL (cargados en el cliente) ---
  const [carouselVideos, setCarouselVideos] = useState<Video[]>([]);

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://otwvfihzaznyjvjtkvvd.supabase.co';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90d3ZmaWh6YXpueWp2anRrdnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxMDQ3OTAsImV4cCI6MjA2MDY4MDc5MH0.YbKdivZM6gJCdXAf51Xctn8IpKhQCrMch89NoHwP0Z4';
    if (!supabaseUrl || !supabaseAnonKey) return;

    fetch(
      `${supabaseUrl}/rest/v1/videos?select=id,nombre,url,createdAt,categoria,imagen,novedad,forzar_video,volumen_extra&order=createdAt.desc&limit=500`,
      {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
      }
    )
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        const videos: Video[] = (data || []).map((v: any) => ({
          ...v,
          id: String(v.id),
          createdAt: v.createdAt ? new Date(v.createdAt).toISOString() : new Date().toISOString(),
        }));
        setCarouselVideos(shuffleArray(videos));
      })
      .catch(() => { });
  }, []);

  // AUTOPLAY: Lanzar playlist al montar el layout (modo diario)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const requestedUrl = urlParams.get('url');
    const requestedId = urlParams.get('v');
    const videoUrl = requestedUrl || requestedId || null;
    loadInitialPlaylist(videoUrl);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchResultClick = (video: any) => {
    playSpecificVideo(video, volume, setVolume);
    setTimeout(() => { handleSearch(''); }, 500);
  };

  // Categorías disponibles (según los videos del carrusel)
  const availableCategoryMappings = useMemo(() => {
    if (carouselVideos.length === 0) return categoryMappings; // Mostrar todas mientras carga
    return categoryMappings.filter(category => {
      // Bloqueo total de NOVEDADES y NOTICIAS
      if (category.dbCategory === '__NOVEDADES__' || category.dbCategory === '__NOTICIAS__') return false;

      const targets = Array.isArray(category.dbCategory)
        ? category.dbCategory.map(c => c.trim().toLowerCase())
        : [category.dbCategory.trim().toLowerCase()];
      const present = new Set(carouselVideos.map(v => (v.categoria || '').trim().toLowerCase()));
      return targets.some(t => Array.from(present).some(pc => pc.includes(t) || t.includes(pc)));
    });
  }, [carouselVideos]);

  const [categoryIndex, setCategoryIndex] = useState(0);
  const [shuffleNonce, setShuffleNonce] = useState(0); // v26.1: Forzar reshuffle
  const [hasInitializedPosition, setHasInitializedPosition] = useState(false);

  // Mezclar videos cada vez que cambia la categoría o el nonce
  const currentCategoryVideos = useMemo(() => {
    if (carouselVideos.length === 0) return [];
    return shuffleArray([...carouselVideos]);
  }, [carouselVideos, categoryIndex, shuffleNonce]);

  useEffect(() => {
    if (!hasInitializedPosition && availableCategoryMappings.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableCategoryMappings.length);
      setCategoryIndex(randomIndex);
      setHasInitializedPosition(true);
    }
  }, [availableCategoryMappings, hasInitializedPosition]);

  // Fix out of bounds index when availableCategoryMappings shrinks after data load
  useEffect(() => {
    if (availableCategoryMappings.length > 0 && categoryIndex >= availableCategoryMappings.length) {
      setCategoryIndex(0);
    }
  }, [availableCategoryMappings.length, categoryIndex]);

  const handleNextCategory = useCallback(() => {
    const total = availableCategoryMappings.length;
    setCategoryIndex(prevIndex => (prevIndex + 1) % total);
    setShuffleNonce(n => n + 1); // Forzar nuevo orden
  }, [availableCategoryMappings.length]);

  const handlePrevCategory = useCallback(() => {
    const total = availableCategoryMappings.length;
    setCategoryIndex(prevIndex => (prevIndex - 1 + total) % total);
    setShuffleNonce(n => n + 1); // Forzar nuevo orden
  }, [availableCategoryMappings.length]);

  const searchCategoryMapping: CategoryMapping = {
    display: 'Tu Búsqueda',
    dbCategory: 'search',
  };

  return (
    <>
      <main className="w-full pt-[calc(var(--desktop-header-height)-65px)]">
        <div className="container mx-auto px-2">
          <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-4 relative">

            {/* === COLUMNA IZQUIERDA: NOTICIAS === */}
            <div className="col-span-1 lg:col-span-5">
              <div className="mb-4">
                <NewsTicker tickerTexts={tickerTexts} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-8">
                {articles?.featuredNews && (
                  <div className="sm:col-span-2">
                    <NewsCard newsItem={articles.featuredNews} index={0} isFeatured={true} />
                  </div>
                )}
                {articles?.secondaryNews?.map((noticia, index) => (
                  <NewsCard key={noticia.id} newsItem={noticia} index={index} />
                ))}
                {articles?.tertiaryNews?.map((noticia, index) => (
                  <NewsCard key={noticia.id} newsItem={noticia} index={index} />
                ))}
                {articles?.otherNews?.map((noticia, index) => (
                  <NewsCard key={noticia.id} newsItem={noticia} index={index} />
                ))}
              </div>
            </div>

            {/* === COLUMNA CENTRAL: VIDEO + CARRUSEL (FIJA) === */}
            <div className="hidden lg:block col-span-5 sticky top-0 h-screen">
              <div className="flex flex-col h-full gap-6 pt-0">
                <div className="flex-shrink-0">
                  <VideoSection />
                </div>

                <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] mt-[-9px] mb-4">
                  {isSearching ? (
                    searchLoading ? (
                      <div className="text-center p-4 text-foreground">Buscando...</div>
                    ) : searchResults.length > 0 ? (
                      <CategoryCycler
                        allVideos={searchResults}
                        activeCategory={searchCategoryMapping}
                        isSearchResult={true}
                        instanceId="search"
                        onCardClick={handleSearchResultClick}
                      />
                    ) : (
                      <NoResultsCard message="No se encontraron videos para tu búsqueda." onClearSearch={() => handleSearch('')} />
                    )
                  ) : (
                    availableCategoryMappings[categoryIndex] && (
                      <CategoryCycler
                        allVideos={currentCategoryVideos}
                        activeCategory={availableCategoryMappings[categoryIndex]}
                        onNext={handleNextCategory}
                        onPrev={handlePrevCategory}
                        instanceId="1"
                        loop={true}
                      />
                    )
                  )}
                </div>
              </div>
            </div>

            {/* === COLUMNA DERECHA: ANUNCIOS === */}
            <div className="hidden lg:block col-span-2">
              <AdsSection activeAds={ads} isLoading={false} />
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default DesktopLayout;