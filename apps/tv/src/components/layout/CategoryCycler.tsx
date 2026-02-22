'use client';

import React, { useMemo, useEffect, memo } from 'react';
import ExclusiveVideoCarousel from './ExclusiveVideoCarousel';
import { Video } from '@/lib/types';
import { Focusable } from '@/components/ui/Focusable';
import { useNavigationStore } from '@/store/useNavigationStore';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface CategoryMapping {
  display: string;
  dbCategory: string | string[];
}

interface CategoryCyclerProps {
  allVideos: Video[];
  activeCategory: CategoryMapping;
  onNext?: () => void;
  onPrev?: () => void;
  instanceId: string;
  isSearchResult?: boolean;
  onCardClick?: (item: any) => void;
  contentLayer?: number;
  carouselMt?: string;
  isFocusable?: boolean;
  isInfinite?: boolean;
}

const CategoryCycler: React.FC<CategoryCyclerProps> = memo(({
  allVideos = [],
  activeCategory,
  onNext,
  onPrev,
  instanceId,
  isSearchResult = false,
  onCardClick,
  contentLayer = 3,
  carouselMt = "-mt-[5px]",
  isFocusable = true,
  isInfinite = true
}) => {
  const { focusedElementId } = useNavigationStore();
  const titleId = `category-title-${instanceId}`;

  const [activeArrow, setActiveArrow] = React.useState<'left' | 'right' | null>(null);

  // Interceptar teclas laterales cuando el título está enfocado
  useEffect(() => {
    const isTitleFocused = focusedElementId === titleId;
    if (!isTitleFocused) {
      setActiveArrow(null);
      return;
    }

    let arrowTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && onPrev) {
        e.preventDefault();
        e.stopPropagation();
        setActiveArrow('left');
        onPrev();

        if (arrowTimeout) clearTimeout(arrowTimeout);
        arrowTimeout = setTimeout(() => setActiveArrow(null), 200);
      } else if (e.key === 'ArrowRight' && onNext) {
        e.preventDefault();
        e.stopPropagation();
        setActiveArrow('right');
        onNext();

        if (arrowTimeout) clearTimeout(arrowTimeout);
        arrowTimeout = setTimeout(() => setActiveArrow(null), 200);
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      if (arrowTimeout) clearTimeout(arrowTimeout);
    };
  }, [focusedElementId, titleId, onNext, onPrev]);

  const filteredVideos = useMemo(() => {
    const safeVideos = allVideos || [];

    if (isSearchResult) return safeVideos;
    if (!activeCategory) return [];

    // Si es NOTICIAS, devolvemos todo (TvContentRail ya lo filtró)
    if (activeCategory.dbCategory === '__NOTICIAS__') {
      return safeVideos;
    }

    if (activeCategory.dbCategory === '__NOVEDADES__') {
      return safeVideos.filter(video => video.novedad === true);
    }

    const dbCategories = Array.isArray(activeCategory.dbCategory)
      ? activeCategory.dbCategory
      : [activeCategory.dbCategory];

    return safeVideos.filter(video => dbCategories.includes(video.categoria));
  }, [allVideos, activeCategory, isSearchResult]);

  if (!activeCategory) return null;

  return (
    <div className="w-full flex flex-col gap-4 mt-[-1px] mb-2">
      <div className="flex items-baseline justify-center w-full z-10 mt-[25px]">
        <Focusable
          id={`category-title-${instanceId}`}
          group="category-nav"
          className="w-fit"
          focusClassName=""
          layer={2}
          disabled={!isFocusable}
          onSelect={() => { /* No action */ }}
        >
          {({ isFocused }) => {
            return (
              <div
                style={{
                  transform: (activeCategory.dbCategory === '__NOTICIAS__' || activeCategory.dbCategory === 'search_results') ? 'translateY(15px)' : 'translateY(-10px)',
                  willChange: isFocused ? 'transform' : 'auto'
                }}
                className={`flex items-center justify-center gap-4 px-6 py-2 transition-all duration-300 rounded-xl bg-gray-900 border border-white/10 shadow-lg shadow-black/80 w-fit ${isFocused ? 'bg-gray-800 scale-105 border-white/30' : ''
                  }`}>
                <ChevronLeft
                  size={40}
                  style={{
                    willChange: isFocused ? 'opacity, transform' : 'auto',
                    transform: 'translateZ(0)' // Force GPU layer
                  }}
                  className={`transition-all duration-200 ${isFocused ? 'opacity-100 scale-110' : 'opacity-0'} ${activeArrow === 'left' ? 'text-yellow-400' : 'text-white'
                    }`}
                />
                <h2 className="text-xl lg:text-3xl font-bold tracking-tight text-white uppercase whitespace-nowrap text-center mx-2 drop-shadow-[0_4px_8px_rgba(0,0,0,1)]">
                  {activeCategory.display}
                </h2>
                <ChevronRight
                  size={40}
                  style={{
                    willChange: isFocused ? 'opacity, transform' : 'auto',
                    transform: 'translateZ(0)' // Force GPU layer
                  }}
                  className={`transition-all duration-200 ${isFocused ? 'opacity-100 scale-110' : 'opacity-0'} ${activeArrow === 'right' ? 'text-yellow-400' : 'text-white'
                    }`}
                />
              </div>
            );
          }}
        </Focusable>
      </div>

      <div className={`${carouselMt} w-full relative z-0`}>
        <ExclusiveVideoCarousel
          key={activeCategory.display}
          videos={filteredVideos}
          isLoading={false}
          carouselId={`category-cycler-${instanceId}`}
          onVideoClick={onCardClick}
          layer={contentLayer}
          loop={isInfinite}
          isSearchResult={isSearchResult}
        />
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo optimization
  return (
    prevProps.activeCategory?.display === nextProps.activeCategory?.display &&
    prevProps.allVideos.length === nextProps.allVideos.length &&
    prevProps.instanceId === nextProps.instanceId &&
    prevProps.isSearchResult === nextProps.isSearchResult &&
    prevProps.isFocusable === nextProps.isFocusable
  );
});

CategoryCycler.displayName = 'CategoryCycler';

export default CategoryCycler;