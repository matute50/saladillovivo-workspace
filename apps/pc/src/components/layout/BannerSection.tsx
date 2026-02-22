'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

// Definición de tipos para las props
interface Banner {
  imageUrl: string;
  linkUrl?: string;
  nombre?: string;
}

interface BannerSectionProps {
  activeBanners: Banner[];
  isLoadingBanners: boolean;
  className?: string;
}

const BannerSection: React.FC<BannerSectionProps> = ({ activeBanners, isLoadingBanners, className = "w-full" }) => {

  if (isLoadingBanners && (!activeBanners || activeBanners.length === 0)) {
    return <div className={`${className} animate-pulse bg-muted dark:bg-muted h-24 rounded-md`}></div>;
  }

  if (!activeBanners || activeBanners.length === 0) {
    return null;
  }

  // Solo se muestra el primer banner del array
  const banner = activeBanners[0];

  return (
    <div className={`${className} mb-4 lg:mb-0`}>
      <Link href={banner.linkUrl || "#"} target="_blank" rel="noopener noreferrer" className="block">
        <Image
          src={banner.imageUrl}
          alt={banner.nombre || "Banner publicitario"}
          width={1200} // Proporciona un ancho base para evitar CLS
          height={150} // Proporciona un alto base para evitar CLS
          priority // El primer banner debe cargar rápidamente
          className="w-full h-auto object-cover rounded-md"
        />
      </Link>
    </div>
  );
};

export default BannerSection;