'use client';

import React, { useMemo } from 'react';
import ExclusiveVideoCarousel from './ExclusiveVideoCarousel';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Video } from '@/lib/types';

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
  loop?: boolean;
}

const CategoryCycler: React.FC<CategoryCyclerProps> = ({
  allVideos = [],
  activeCategory,
  onNext,
  onPrev,
  instanceId,
  isSearchResult = false,
  onCardClick,
  loop = false
}) => {

  const filteredVideos = useMemo(() => {
    const safeVideos = allVideos || [];

    if (isSearchResult) return safeVideos;
    if (!activeCategory) return [];

    const dbCategoryTarget = activeCategory.dbCategory;

    // --- VIRTUAL CATEGORIES ---
    if (dbCategoryTarget === '__NOTICIAS__') {
      return safeVideos;
    }

    if (dbCategoryTarget === '__NOVEDADES__') {
      return safeVideos.filter(video => video.novedad === true);
    }

    // --- STANDARD CATEGORIES (ROBUST MATCHING) ---
    const targetCategories = Array.isArray(dbCategoryTarget)
      ? dbCategoryTarget.map(c => c.trim().toLowerCase())
      : [dbCategoryTarget.trim().toLowerCase()];

    return safeVideos.filter(video => {
      const videoCat = (video.categoria || '').trim().toLowerCase();
      return targetCategories.includes(videoCat);
    });
  }, [allVideos, activeCategory, isSearchResult]);

  if (!activeCategory) return null;

  return (
    <div className="w-full flex flex-col gap-4 -mt-[11px] mb-2">
      <div className="flex items-baseline justify-center w-full z-10 mt-[10px]">
        {!isSearchResult && onPrev && (
          <motion.button
            onClick={onPrev}
            className="carousel-nav-button-title p-0.5 rounded-md border-[1.5px] text-white border-white shadow-lg shadow-black/50 backdrop-blur-md"
            animate={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
            whileHover={{ backgroundColor: '#012078' }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <ChevronLeft size="20" />
          </motion.button>
        )}
        <h2 className={`text-xl lg:text-3xl font-bold tracking-tight text-white truncate text-center mx-2 drop-shadow-[0_4px_6px_rgba(0,0,0,0.9)] ${instanceId.startsWith('tv') ? 'bg-black/10 backdrop-blur-lg shadow-lg shadow-black/50 rounded-md px-6 py-2' : ''}`}>
          {activeCategory.display}
        </h2>
        {!isSearchResult && onNext && (
          <motion.button
            onClick={onNext}
            className="carousel-nav-button-title p-0.5 rounded-md border-[1.5px] text-white border-white shadow-lg shadow-black/50 backdrop-blur-md"
            animate={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
            whileHover={{ backgroundColor: '#012078' }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <ChevronRight size="20" />
          </motion.button>
        )}
      </div>

      <div className="-mt-[5px] w-full relative z-0">
        <ExclusiveVideoCarousel
          key={activeCategory.display}
          videos={filteredVideos}
          isLoading={false}
          carouselId={`category-cycler-${instanceId}`}
          onVideoClick={onCardClick}
          loop={loop}
        />
      </div>
    </div>
  );
};

export default CategoryCycler;