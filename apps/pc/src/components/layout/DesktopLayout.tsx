'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';

const AdsSection = dynamic(() => import('./AdsSection'), { ssr: false });
const VideoSection = dynamic(() => import('./VideoSection'), { ssr: false });
const NewsTicker = dynamic(() => import('../NewsTicker'), { ssr: false });

import type { PageData } from '@/lib/types';
import CategoryCycler from './CategoryCycler';
import { categoryMappings, type CategoryMapping } from '@/lib/categoryMappings';
import { useNewsStore } from '@/store/useNewsStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useVolumeStore } from '@/store/useVolumeStore';
import NoResultsCard from './NoResultsCard';
import NewsCard from '../NewsCard';
import { shuffleArray } from '@/lib/utils'; // Import shuffleArray

interface DesktopLayoutProps {
  data: PageData;
}

const DesktopLayout = ({ data }: DesktopLayoutProps) => {
  const {
    articles,
    videos = { allVideos: [] },
    ads,
    tickerTexts = []
  } = data || {};

  const { isSearching, searchResults, searchLoading, handleSearch } = useNewsStore();
  const { allVideos: rawVideos } = videos; // Rename to rawVideos

  // --- RANDOMIZATION LOGIC (V.SHUFFLE) ---
  // 1. Shuffle Videos on Mount (so every reload feels different)
  const shuffledVideos = useMemo(() => {
    return shuffleArray(rawVideos || []);
  }, [rawVideos]);

  const { playManual } = usePlayerStore();
  const { volume, setVolume } = useVolumeStore();

  const handleSearchResultClick = (video: any) => {
    // Interaction Stability (v23.2) - 500ms Rule
    playManual(video, volume, setVolume);
    setTimeout(() => {
      handleSearch('');
    }, 500);
  };

  const availableCategoryMappings = useMemo(() => {
    if (!shuffledVideos.length) return [];

    // Pre-calculate presence of categories for O(1) lookup
    const presentCategories = new Set(shuffledVideos.map(v => (v.categoria || '').trim().toLowerCase()));
    const hasNovedad = shuffledVideos.some(v => v.novedad === true);

    return categoryMappings.filter(category => {
      if (category.dbCategory === '__NOVEDADES__') return hasNovedad;
      if (category.dbCategory === '__NOTICIAS__') return true;

      const targets = Array.isArray(category.dbCategory)
        ? category.dbCategory.map(c => c.trim().toLowerCase())
        : [category.dbCategory.trim().toLowerCase()];

      return targets.some(t => presentCategories.has(t));
    });
  }, [shuffledVideos]);


  // 2. Random Start Category
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [hasInitializedPosition, setHasInitializedPosition] = useState(false);

  useEffect(() => {
    // Only randomize if we haven't done it yet and have categories
    if (!hasInitializedPosition && availableCategoryMappings.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableCategoryMappings.length);
      setCategoryIndex(randomIndex);
      setHasInitializedPosition(true); // Lock it so re-renders don't jump around
    }
  }, [availableCategoryMappings, hasInitializedPosition]);

  const handleNextCategory = useCallback(() => {
    const total = availableCategoryMappings.length;
    setCategoryIndex(prevIndex => (prevIndex + 1) % total);
  }, [availableCategoryMappings.length]);

  const handlePrevCategory = useCallback(() => {
    const total = availableCategoryMappings.length;
    setCategoryIndex(prevIndex => (prevIndex - 1 + total) % total);
  }, [availableCategoryMappings.length]);

  const searchCategoryMapping: CategoryMapping = {
    display: "Tu Búsqueda",
    dbCategory: "search",
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
                        allVideos={shuffledVideos}
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