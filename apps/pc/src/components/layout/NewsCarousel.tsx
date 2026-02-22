'use client';

import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Article } from '@/lib/types';
import NewsCard from '@/components/NewsCard';
import { useThemeButtonColors } from '@/hooks/useThemeButtonColors';

interface NewsCarouselProps {
  items: Article[];
  carouselId: string;
}

const NewsCarousel: React.FC<NewsCarouselProps> = ({ items, carouselId }) => {
  const { buttonColor, buttonBorderColor } = useThemeButtonColors();

  if (!items || items.length === 0) {
    return <div className="relative w-full flex items-center justify-center min-h-[126px] text-muted-foreground rounded-lg bg-muted/20">No hay noticias disponibles.</div>;
  }

  return (
    <div className="relative w-full flex items-center justify-center rounded-xl p-4">
      <Swiper
        slidesPerView={'auto'}
        centeredSlides={false}
        initialSlide={0}
        spaceBetween={16}
        loop={items.length > 4}
        navigation={{
          prevEl: `#prev-${carouselId}`,
          nextEl: `#next-${carouselId}`,
        }}
        modules={[Navigation]}
        className="w-full"
      >
        {items.map((article) => (
          <SwiperSlide
            key={article.id}
            style={{ width: 'auto' }}
            className="h-full"
          >
            <div className="h-full">
              <NewsCard newsItem={article} className="w-64 h-full" />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
      <>
        <motion.button
          id={`prev-${carouselId}`}
          className="carousel-nav-button absolute top-1/2 -translate-y-1/2 left-0 z-20 rounded-md p-1 cursor-pointer border shadow-lg shadow-black/50 backdrop-blur-md"
          animate={{ color: buttonColor, borderColor: buttonBorderColor, backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
          whileHover={{ backgroundColor: '#012078' }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <ChevronLeft size={30} />
        </motion.button>
        <motion.button
          id={`next-${carouselId}`}
          className="carousel-nav-button absolute top-1/2 -translate-y-1/2 right-0 z-20 rounded-md p-1 cursor-pointer border shadow-lg shadow-black/50 backdrop-blur-md"
          animate={{ color: buttonColor, borderColor: buttonBorderColor, backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
          whileHover={{ backgroundColor: '#012078' }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <ChevronRight size={30} />
        </motion.button>
      </>
    </div>
  );
};

export default NewsCarousel;
