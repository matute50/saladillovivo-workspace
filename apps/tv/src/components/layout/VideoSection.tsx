'use client';

import React, { useRef, useState, useEffect } from 'react';
import VideoPlayer from '@/components/VideoPlayer';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { usePlayerStore } from '@/store/usePlayerStore';
import { SlideMedia } from '@/lib/types';
import { useNewsPlayerStore } from '@/store/useNewsPlayerStore';
import { useVolumeStore } from '@/store/useVolumeStore';
import CustomControls from '@/components/CustomControls';
import { cn, cleanTitle, isYouTubeVideo } from '@/lib/utils';
import { Play } from 'lucide-react';
import AntiGravityLayer from './AntiGravityLayer';

// VideoSection optimizado para TvMode


const VideoSection: React.FC = () => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const {
    currentVideo,
    isPlaying,
    triggerTransition,
    saveCurrentProgress,
    setIsPlaying,
    isPreRollOverlayActive,
    overlayIntroVideo,
    isContentPlaying,
    pauseForSlide,
    resumeAfterSlide,
    finishIntro
  } = usePlayerStore();

  const { currentSlide, isPlaying: isSlidePlaying, stopSlide } = useNewsPlayerStore();
  const { volume, setVolume, isMuted, unmute } = useVolumeStore(); // Added unmute

  // Auto-Unmute for News or HTML Slides
  const isHtmlSlideActive = isSlidePlaying && currentSlide && currentSlide.type === 'html';
  const isLocalIntro = currentVideo?.url && (
    currentVideo.url.startsWith('/') ||
    currentVideo.url.includes('videos_intro')
  ) || false;
  // No automatic news overlays as per user request

  const [showControls, setShowControls] = useState(false);
  const [thumbnailSrc, setThumbnailSrc] = useState<string>('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');
  const cinematicTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedVideoIdRef = useRef<string | null>(null);
  const [currentDuration, setCurrentDuration] = useState(0);
  const transitionSignaledRef = useRef(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const introVideoRef = useRef<HTMLVideoElement>(null);

  // Sync Persistent Intro Video State
  useEffect(() => {
    const video = introVideoRef.current;
    if (!video) return;

    // 1. Sync Volume
    video.volume = isMuted ? 0 : volume;

    // 2. Play/Pause Management
    if (isPreRollOverlayActive && overlayIntroVideo) {
      if (video.paused) {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error("Intro auto-play prevented:", error);
            // Optional: fallback to mute play if audio policy blocks it
          });
        }
      }
    } else {
      // Not active
      if (!video.paused) {
        video.pause();
        video.currentTime = 0; // Reset for next play
      }
    }
  }, [isPreRollOverlayActive, overlayIntroVideo, volume, isMuted]);


  // --- SLOT MANAGEMENT ---
  const [activeSlot, setActiveSlot] = useState<'A' | 'B'>('A');
  const [slotA, setSlotA] = useState<SlideMedia | null>(null);
  const [slotB, setSlotB] = useState<SlideMedia | null>(null);


  // Determine which slot holds the current video (Target)
  const isSlotATarget = slotA?.id === currentVideo?.id;
  const isSlotBTarget = slotB?.id === currentVideo?.id;

  // If neither holds it directly (e.g. init), fallback to active or next logic, 
  // but usually one matches. If not, we wait for effect to load it.

  useEffect(() => {
    if (!currentVideo) return;

    // Determine target based on state
    // We prefer the 'other' slot if possible for A/B swap
    const targetSlot = (isSlotATarget) ? 'A' :
      (isSlotBTarget) ? 'B' :
        (activeSlot === 'A' ? 'B' : 'A');

    // Load content into target slot if needed - comparison by reference or URL to catch prop updates like startAt
    // Load content into target slot if needed
    // Load content into target slot if needed
    if (targetSlot === 'A') {
      if (slotA !== currentVideo) setSlotA(currentVideo);
      // Give 500ms before cleaning up B to ensure A is mounting correctly
      setTimeout(() => {
        if (usePlayerStore.getState().activeSlot === 'A' && slotB !== null) setSlotB(null);
      }, 500);
    }
    if (targetSlot === 'B') {
      if (slotB !== currentVideo) setSlotB(currentVideo);
      // Give 500ms before cleaning up A to ensure B is mounting correctly
      setTimeout(() => {
        if (usePlayerStore.getState().activeSlot === 'B' && slotA !== null) setSlotA(null);
      }, 500);
    }

    // Transition Logic
    if (targetSlot !== activeSlot) {
      setActiveSlot(targetSlot);
    }
    // RESET CLEAN STATE ON NEW VIDEO WITH INTRO

  }, [currentVideo, isPreRollOverlayActive, activeSlot, isSlotATarget, isSlotBTarget, slotA, slotB]);


  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const transitionTriggeredRef = useRef(false);

  useEffect(() => {
    transitionTriggeredRef.current = false;
    transitionSignaledRef.current = false;
    setCurrentDuration(0);
  }, [currentVideo?.id]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let prefetchTimer: NodeJS.Timeout;

    if (isHtmlSlideActive && currentSlide) {
      // RULE OF GOLD: Pause and save background state
      pauseForSlide();

      const duration = (currentSlide.duration || 15) * 1000;
      console.log(`[VideoSection:TV] Playing News Slide: ${currentSlide.url}. Duration: ${duration}ms (from ${currentSlide.duration}s)`);

      // PRE-LOADING: Disparar pre-carga 3 segundos antes del final
      const prefetchTime = Math.max(0, duration - 3000);
      prefetchTimer = setTimeout(() => {
        const { dailyShowSequence, currentSequenceIndex, preloadNextVideo } = usePlayerStore.getState();
        if (dailyShowSequence && currentSequenceIndex !== -1 && currentSequenceIndex < dailyShowSequence.length - 1) {
          const nextItem = dailyShowSequence[currentSequenceIndex + 1];
          if (nextItem.type === 'video') {
            preloadNextVideo(nextItem.id.toString());
          }
        }
      }, prefetchTime);

      timer = setTimeout(() => {
        stopSlide();
        resumeAfterSlide();
      }, duration);
    }
    return () => {
      clearTimeout(timer);
      clearTimeout(prefetchTimer);
    };
  }, [isHtmlSlideActive, currentSlide, stopSlide, resumeAfterSlide, pauseForSlide]);

  // Cinematic effects removed as per user request

  useEffect(() => {
    if (!currentVideo?.url || isLocalIntro) {
      setThumbnailSrc('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');
      return;
    }
    const cleanUrl = currentVideo.url.trim();
    const match = cleanUrl.match(/(?:youtu\.be\/|youtube\.com\/.*v=)([^&]+)/);
    if (match && match[1]) {
      setThumbnailSrc(`https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`);
    } else {
      setThumbnailSrc('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');
    }
  }, [currentVideo, isLocalIntro]);

  const toggleFullScreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) (document.documentElement as any).requestFullscreen();
    else document.exitFullscreen?.();
  };

  useEffect(() => {
    const handleFs = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFs);
    return () => document.removeEventListener('fullscreenchange', handleFs);
  }, []);

  const handleProgress = (state: { playedSeconds: number, loadedSeconds: number }) => {
    const { playedSeconds } = state;

    if (!isLocalIntro && !isPreRollOverlayActive) {
      saveCurrentProgress(playedSeconds, volume);

      if (
        currentDuration > 0 &&
        currentDuration - playedSeconds <= 1 &&
        !transitionSignaledRef.current &&
        isYouTubeVideo(currentVideo?.url || '')
      ) {
        // YouTube: Transición anticipada (1s antes del final)
        transitionSignaledRef.current = true;
        triggerTransition(setVolume);
      }
    }
  };


  const handleIntroMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video.duration) {
      const rate = video.duration / 4.0;
      video.playbackRate = rate;
    }
  };


  const displayTitle = cleanTitle(currentVideo?.nombre);
  const displaySubtitle = (currentVideo as any)?.resumen || (currentVideo as any)?.description;

  return (
    <div className="w-full h-full overflow-hidden relative">
      <div className="absolute inset-0 w-full h-full">
        <div
          ref={playerContainerRef}
          className={cn(
            "relative w-full h-full bg-black overflow-hidden border-0 shadow-lg",
          )}
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(false)}
        >
          <div className="absolute inset-0 w-full h-full overflow-hidden bg-black">

            {/* === VIDEO UNIVERSE (SCALABLE & IMMERSIVE) === */}
            {/* === VIDEO UNIVERSE (SCALABLE & IMMERSIVE) === */}
            <div
              className={cn(
                "video-universe absolute inset-0 w-full h-full overflow-hidden"
              )}
            >

              {/* HTML Slide (Considered Content/Video) con CROSSFADE */}
              <AnimatePresence mode="wait">
                {isHtmlSlideActive && currentSlide && (
                  <motion.div
                    key={currentSlide.url}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                    className="absolute inset-0 z-40 bg-black"
                  >
                    <iframe
                      src={currentSlide.url}
                      className="w-full h-full border-none pointer-events-none"
                      title="Slide"
                      allow="autoplay"
                    />
                    {currentSlide.audioUrl && (
                      <audio
                        ref={audioRef}
                        src={currentSlide.audioUrl}
                        autoPlay
                        className="hidden"
                        muted={isMuted}
                        onPlay={() => { /* Playing slide audio */ }}
                        onError={(e) => console.error("Error reproduciendo audio de noticia:", e, currentSlide.audioUrl)}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* === SMART SLOT A (v18.0 - Persistent) === */}
              <div
                className={cn(
                  "absolute inset-0 bg-black transition-opacity duration-500",
                  activeSlot === 'A' ? "z-20 opacity-100 pointer-events-auto" : "z-0 opacity-0 pointer-events-none"
                )}
              >
                {/* ALWAYS RENDERED - NO UNMOUNT */}
                <VideoPlayer
                  videoUrl={slotA?.url || ""}
                  autoplay={isPlaying && isContentPlaying && isSlotATarget}
                  onClose={() => {
                    if (activeSlot === 'A' && !transitionSignaledRef.current) triggerTransition(setVolume);
                  }}
                  onProgress={(state) => {
                    if (isSlotATarget) handleProgress(state);
                  }}
                  onDuration={(d) => {
                    if (isSlotATarget) setCurrentDuration(d);
                  }}
                  startAt={(slotA as any)?.startAt || 0}
                  volumen_extra={slotA?.volumen_extra}
                  audioUrl={slotA?.audioSourceUrl}
                />
              </div>

              {/* === SMART SLOT B (v18.0 - Persistent) === */}
              <div
                className={cn(
                  "absolute inset-0 bg-black transition-opacity duration-500",
                  activeSlot === 'B' ? "z-20 opacity-100 pointer-events-auto" : "z-0 opacity-0 pointer-events-none"
                )}
              >
                {/* ALWAYS RENDERED - NO UNMOUNT */}
                <VideoPlayer
                  videoUrl={slotB?.url || ""}
                  autoplay={isPlaying && isContentPlaying && isSlotBTarget}
                  onClose={() => {
                    if (activeSlot === 'B' && !transitionSignaledRef.current) triggerTransition(setVolume);
                  }}
                  onProgress={(state) => {
                    if (isSlotBTarget) handleProgress(state);
                  }}
                  onDuration={(d) => {
                    if (isSlotBTarget) setCurrentDuration(d);
                  }}
                  startAt={(slotB as any)?.startAt || 0}
                  volumen_extra={slotB?.volumen_extra}
                  audioUrl={slotB?.audioSourceUrl}
                />
              </div>

              {/* === PERSISTENT INTRO OVERLAY (Node Persistence v16.0) === */}
              {/* 
                  CRITICAL FOR TV: Never unmount this <video> tag. 
                  Unmounting causes garbage collection spikes that crash low-end WebViews.
                  We toggle visibility instead.
              */}
              <div
                className={cn(
                  "absolute inset-0 z-[999] bg-black transition-opacity duration-500",
                  (isPreRollOverlayActive && overlayIntroVideo)
                    ? "opacity-100 visible pointer-events-auto"
                    : "opacity-0 invisible pointer-events-none"
                )}
              >
                <video
                  ref={introVideoRef}
                  // Keep src if active, otherwise empty to release buffer but keep node
                  src={overlayIntroVideo?.url || ""}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  onEnded={() => {
                    // Intro ended natively
                    finishIntro();
                  }}
                  onError={(e) => {
                    console.error("Intro Error:", e);
                    finishIntro();
                  }}
                />
              </div>

              {
                (!isPlaying) && !isLocalIntro && !isHtmlSlideActive && (
                  <Image
                    src={thumbnailSrc}
                    alt="Fondo"
                    fill
                    className="absolute inset-0 z-10 object-contain opacity-60"
                    priority
                    onError={() => setThumbnailSrc('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=')}
                  />
                )
              }


              {/* === ANTI-GRAVITY UI LAYER (STATIC & PRESERVED) === */}
              <AntiGravityLayer areCinematicBarsActive={false}>

                <AnimatePresence>
                  {showControls && !isHtmlSlideActive && !isLocalIntro && !isPreRollOverlayActive && (
                    <motion.div key="controls" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute bottom-0 left-0 right-0 w-full z-[51] pointer-events-auto">
                      <CustomControls onToggleFullScreen={toggleFullScreen} isFullScreen={isFullScreen} />
                    </motion.div>
                  )}


                  {!isPlaying && !isHtmlSlideActive && !isLocalIntro && currentVideo && (
                    <motion.div
                      key="play"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center z-50 cursor-pointer pointer-events-auto"
                      onClick={() => setIsPlaying(true)}
                    >
                      <div className="p-4 bg-black/60 rounded-full border border-white"><Play size={38} className="text-white/80" fill="white" strokeWidth={1.35} /></div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </AntiGravityLayer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

};

export default VideoSection;