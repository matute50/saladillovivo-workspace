'use client';

import React from 'react';
import NewsCard from '../NewsCard';
import type { Article } from '@/lib/types';

interface MoreNewsGridProps {
  news: Article[];
}

const MoreNewsGrid: React.FC<MoreNewsGridProps> = ({ news }) => {
  if (!news || news.length === 0) {
    return null;
  }

  return (
    <section className="mt-8" aria-label="Más noticias">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {news.map((noticia, index) => (
          <NewsCard
            key={noticia.id}
            newsItem={noticia}
            index={index} // El delay de animación se reinicia para esta sección
          />
        ))}
      </div>
    </section>
  );
};

export default MoreNewsGrid;
