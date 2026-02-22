'use client';

import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import VideoPlayer from '@/components/VideoPlayer';
import Image from 'next/image';
import { useVolumeStore } from '@/store/useVolumeStore';
import { motion, AnimatePresence } from 'framer-motion';

// Subcomponent to Isolate Timer Logic from Parent Re-renders
const IntroLayer = ({
  video,
  onFinish
}: {
  video: any,
  onFinish: () => void
}) => {
  // Use a ref to keep the latest callback without triggering effect re-runs
  const onFinishRef = useRef(onFinish);

  // Update ref on every render when onFinish changes
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    // STRICT TIMER: 4100ms Hard Cut
    // This effect runs EXACTLY ONCE when the component mounts.
    // We intentionally ignore dependency changes to prevent timer reset.
    console.log("[IntroLayer] MOUNTED. Timer started: 4100ms (Immutable)");

    const timer = setTimeout(() => {
      console.log("[IntroLayer] TIMER DONE. Executing Finish (via Ref).");
      if (onFinishRef.current) {
        onFinishRef.current();
      }
    }, 4100);

    return () => {
      console.log("[IntroLayer] UNMOUNTED. Clearing Timer.");
      clearTimeout(timer);
    };
  }, []); // EMPTY ARRAY: NEVER RESET

  if (!video) return null;

  return (
    <div className="absolute inset-0 z-30 bg-black pointer-events-none">
      <video
        src={video.url}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain"
        onError={(e) => console.error("Intro Error (Ignored):", e)}
      />
    </div>
  );
};

const TvBackgroundPlayer = () => {
  const {
    currentVideo,
    triggerTransition,
    isPlaying,

    // Zero-Branding State
    isPreRollOverlayActive,
    overlayIntroVideo,
    isContentPlaying,

    // Actions
    finishIntro
  } = usePlayerStore();

  const { volume, isMuted, setVolume } = useVolumeStore();

  // Combine actions for the timer callback
  const handleIntroFinish = () => {
    finishIntro();
  };

  if (!currentVideo) {
    return (
      <div className="absolute inset-0 z-0">
        <Image
          src="/FONDO OSCURO.PNG"
          alt="Background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0 bg-black">

      {/* CAPA SUPERIOR: Intro Overlay (Zero-Branding) */}
      {/* We use a key on IntroLayer to force full remount if video ID changes */}
      <AnimatePresence>
        {isPreRollOverlayActive && overlayIntroVideo && (
          <IntroLayer
            key={overlayIntroVideo.id}
            video={overlayIntroVideo}
            onFinish={handleIntroFinish}
          />
        )}
      </AnimatePresence>

      {/* CAPA INFERIOR: Video principal (Content) */}
      {currentVideo && (
        <div className="absolute inset-0 z-20">
          <VideoPlayer
            key={currentVideo.id}
            videoUrl={currentVideo.url}
            autoplay={isPlaying && isContentPlaying}
            onClose={() => triggerTransition(setVolume)}
            playerVolume={isMuted || isPreRollOverlayActive ? 0 : volume}
            muted={isPreRollOverlayActive}
            startAt={currentVideo.startAt}
          />
        </div>
      )}

      <div className="absolute inset-0 bg-black/20 pointer-events-none z-40" />

      {/* Cinematic Bars Overlay */}
      <AnimatePresence>
        {!isPlaying && (
          <>
            <motion.div
              key="tv-top-bar"
              className="absolute top-0 left-0 w-full h-[12%] bg-black z-50 pointer-events-none"
              initial={{ y: "-100%" }}
              animate={{ y: "0%" }}
              exit={{ y: "-100%" }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
            <motion.div
              key="tv-bottom-bar"
              className="absolute bottom-0 left-0 w-full h-[12%] bg-black z-50 pointer-events-none"
              initial={{ y: "100%" }}
              animate={{ y: "0%" }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TvBackgroundPlayer;