'use client';

import React from 'react';
import Image from 'next/image';

interface Banner {
  id?: string | number;
  image_url: string;
  link?: string;
  title?: string;
}

interface BannerCarouselProps {
  banners: Banner[];
}

const BannerCarousel: React.FC<BannerCarouselProps> = ({ banners }) => {
  const validBanners = Array.isArray(banners) 
    ? banners.filter(b => b.image_url && b.image_url.trim() !== '') 
    : [];

  if (validBanners.length === 0) {
    return (
      <div className="w-full aspect-[4/3] bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 text-xs text-center border border-dashed border-gray-300 dark:border-gray-700">
        Espacio Publicitario
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {validBanners.map((banner, index) => {
        const isFirstBanner = index === 0;
        const imageProps = {
          src: banner.image_url,
          fill: true,
          className: `object-cover ${banner.link ? 'transition-transform duration-500 group-hover:scale-105' : ''}`,
          sizes: "(max-width: 768px) 100vw, 400px",
          priority: isFirstBanner,
          loading: isFirstBanner ? undefined : 'lazy' as const,
          // AGREGA ESTO SIEMPRE MIENTRAS TENGAS EL ERROR 402:
          unoptimized: true, 
        };

        return (
          <div 
            key={banner.id || index} 
            className="relative w-full aspect-[4/3] rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow group border border-gray-100 dark:border-gray-700"
          >
            {banner.link ? (
              <a 
                href={banner.link} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="block w-full h-full"
              >
                <Image {...imageProps} alt={banner.title || 'Publicidad'} />
              </a>
            ) : (
              <Image {...imageProps} alt={banner.title || 'Publicidad'} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default BannerCarousel;