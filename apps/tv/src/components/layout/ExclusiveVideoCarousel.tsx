'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';

import { usePlayerStore } from '@/store/usePlayerStore';
import { useVolumeStore } from '@/store/useVolumeStore';
import { useToast } from '@/components/ui/use-toast';
import { Video, ExclusiveVideoCarouselProps } from '@/lib/types';
import { cleanTitle } from '@/lib/utils';
import { Focusable } from '@/components/ui/Focusable';
import { VideoThumbnailSkeleton } from '@/components/ui/VideoThumbnailSkeleton';
import { getOptimizedThumbnail, TRANSPARENT_PLACEHOLDER } from '@/lib/thumbnailUtils';

// Memoized static classes
const SLIDE_CLASSES = "transition-all duration-300 ease-in-out opacity-100 blur-none";
const TITLE_OVERLAY_CLASSES = "absolute inset-0 p-2 bg-gradient-to-t from-black/80 to-transparent flex justify-center items-end text-center opacity-100 z-20 transition-opacity duration-300 ease-in-out";

const ExclusiveVideoCarousel: React.FC<ExclusiveVideoCarouselProps> = ({
  videos,
  isLoading,
  carouselId,
  isLive = false,
  onVideoClick,
  layer,
  loop = true,
  isSearchResult = false
}) => {
  const { playManual, playLiveStream, streamStatus } = usePlayerStore();
  const { volume, setVolume } = useVolumeStore();
  const { toast } = useToast();
  const swiperRef = useRef<any>(null);

  // Estado de carga de imágenes
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  // Multiplicar elementos si son pocos para asegurar que el loop de Swiper siempre esté "lleno"
  const displayVideos = React.useMemo(() => {
    if (!videos || videos.length === 0) return [];
    if (!loop) return videos;
    if (videos.length === 1) return videos; // No repetir si es solo uno

    let result = [...videos];
    while (result.length > 0 && result.length < 15) {
      result = [...result, ...videos];
    }
    return result;
  }, [videos, loop]);

  const middleInitialSlide = React.useMemo(() => {
    if (!displayVideos.length) return 0;
    if (!loop) return 0;

    const originalLength = videos.length;
    const middleIndex = Math.floor(displayVideos.length / 2);
    return middleIndex - (middleIndex % originalLength);
  }, [displayVideos, videos, loop]);

  const handleVideoClick = (video: Video) => {
    if (onVideoClick) {
      onVideoClick(video);
      return;
    }

    if (isLive || video.isLiveThumbnail) {
      if (streamStatus) {
        playLiveStream(streamStatus);
      }
    } else if (video.isEvent) {
      toast({
        title: "Próximo Evento",
        description: "Este es un evento futuro. ¡Vuelve pronto para verlo en vivo!",
      });
    } else {
      playManual(video, volume, setVolume);
    }
  };

  const handleImageLoad = (videoId: string) => {
    setLoadedImages(prev => {
      if (prev.has(videoId)) return prev;
      const next = new Set(prev);
      next.add(videoId);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="relative w-full flex items-center justify-center gap-3 p-4 rounded-xl">
        {[...Array(5)].map((_, i) => (
          <VideoThumbnailSkeleton key={i} width={258} />
        ))}
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return <div className="relative w-full flex items-center justify-center min-h-[126px] text-muted-foreground rounded-lg bg-muted/20">No hay contenido disponible.</div>;
  }

  return (
    <div className="relative w-full flex items-center justify-center rounded-xl p-4">
      <Swiper
        ref={swiperRef}
        className="w-full will-change-transform" // Hint GPU promotion
        slidesPerView={'auto'}
        centeredSlides={!isSearchResult}
        initialSlide={middleInitialSlide}
        spaceBetween={isSearchResult ? 32 : 12}
        loop={displayVideos.length > 1 && loop}
        observer={true}
        observeParents={true}
        watchSlidesProgress={true}
        centerInsufficientSlides={true}
        touchReleaseOnEdges={true}
        speed={400} // Slightly faster transition for remote response
        navigation={{
          prevEl: `#prev-${carouselId}`,
          nextEl: `#next-${carouselId}`,
        }}
        modules={[Navigation]}
      >
        {displayVideos.map((video, index) => {
          const isLiveOrEvent = isLive || video.isLiveThumbnail || video.isEvent;
          const videoKey = `${carouselId}-${video.id || index}-${index}`;
          const isImageLoaded = loadedImages.has(videoKey);

          const thumbnail = getOptimizedThumbnail(
            video.imagen,
            video.url,
            'hq'
          );

          const isPriority = index < 4;

          return (
            <SwiperSlide
              key={videoKey}
              style={{ width: 'auto' }}
              className={SLIDE_CLASSES}
            >
              <Focusable
                id={`video-card-${carouselId}-${video.id || 'no-id'}-${index}`}
                group={`carousel-${carouselId}`}
                onSelect={() => handleVideoClick(video)}
                onFocus={() => {
                  if (swiperRef.current?.swiper) {
                    swiperRef.current.swiper.slideToLoop(index);
                  }
                }}
                focusClassName=""
                layer={layer || 3}
              >
                {({ isFocused }) => (
                  <div className="relative">
                    {isFocused && (
                      <div className="absolute inset-0 border-8 border-white rounded-xl pointer-events-none z-50" />
                    )}

                    <div className="relative w-[258px] cursor-pointer group rounded-xl overflow-hidden border border-white/5 transition-transform duration-200">
                      <div className="relative w-[258px] aspect-video flex items-center justify-center bg-black">
                        {!isImageLoaded && (
                          <div className="absolute inset-0 z-5">
                            <VideoThumbnailSkeleton width={258} className="w-full h-full rounded-none" />
                          </div>
                        )}

                        <Image
                          src={thumbnail.src}
                          alt={cleanTitle(video.nombre) || "Miniatura de video"}
                          fill
                          sizes="258px" // Fixed size for TV rail
                          priority={isPriority}
                          unoptimized={true} // Obligatorio para rendimiento APK/TWA
                          className={`${(isLiveOrEvent || isSearchResult) ? 'object-contain' : 'object-cover'} transition-all duration-500 group-hover:scale-110 ${isImageLoaded ? 'opacity-100' : 'opacity-0'
                            }`}
                          placeholder="blur"
                          blurDataURL={thumbnail.blurDataURL}
                          onLoad={() => handleImageLoad(videoKey)}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = TRANSPARENT_PLACEHOLDER;
                            handleImageLoad(videoKey);
                          }}
                        />
                      </div>

                      <div className={TITLE_OVERLAY_CLASSES}>
                        <p className="text-white font-bold uppercase leading-tight text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">{cleanTitle(video.nombre)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </Focusable>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
};

export default ExclusiveVideoCarousel;