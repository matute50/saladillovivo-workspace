'use client';

import React from 'react';
import NewsCard from '../NewsCard';
import BannerSection from './BannerSection';
import type { Article } from '@/lib/types';

// Copied from BannerSection.tsx
interface Banner {
  imageUrl: string;
  linkUrl?: string;
  nombre?: string;
}

interface NewsColumnProps {
  news: Article[];
  banners: Banner[];
}

const NewsColumn: React.FC<NewsColumnProps> = ({ news, banners }) => {
  if (!news || news.length === 0) {
    return null;
  }

  // Dividimos las noticias en los grupos requeridos
  const featuredNews = news.length > 0 ? news[0] : null;
  const secondaryNews = news.slice(1, 3);
  const tertiaryNews = news.slice(3, 7);

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Noticia Destacada */}
                {featuredNews && (
                  <NewsCard
                    newsItem={featuredNews}
                    className="col-span-1 md:col-span-2"
                    isFeatured={true}
                  />
                )}
      {/* 2. Noticias Secundarias */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {secondaryNews.map((noticia, index) => (
                      <NewsCard
                        key={noticia.id}
                        newsItem={noticia}
                        index={index}
                      />
                    ))}      </div>

      {/* Banner Section */}
      <BannerSection activeBanners={banners} isLoadingBanners={false} />

      {/* 3. Noticias Terciarias (sin jerarquía) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tertiaryNews.map((noticia, index) => (
                      <NewsCard
                        key={noticia.id}
                        newsItem={noticia}
                        index={index + 2} // Continuamos el delay de la animación
                      />
                    ))}      </div>
    </div>
  );
};

export default NewsColumn;
