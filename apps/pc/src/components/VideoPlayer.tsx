'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import ReactPlayer from 'react-player';
import { useVolumeStore } from '@/store/useVolumeStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { isYouTubeVideo } from '@/lib/utils';

interface VideoPlayerProps {
  videoUrl: string;
  autoplay?: boolean;
  onClose?: () => void;
  onProgress?: (state: { playedSeconds: number, loadedSeconds: number }) => void;
  onDuration?: (duration: number) => void;
  startAt?: number;
  imageUrl?: string;
  audioUrl?: string;
  playerVolume?: number;
  volumen_extra?: number;
  muted?: boolean; // New prop to force mute locally
}

export default function VideoPlayer({
  id, // New ID prop for mutex
  videoUrl,
  autoplay = false,
  onClose,
  onProgress,
  onDuration,
  startAt,
  playerVolume,
  volumen_extra = 1,
  audioUrl,
  muted: forceMuted // Alias to avoid conflict with global isMuted
}: VideoPlayerProps & { id: string }) {
  const [isMounted, setIsMounted] = useState(false);
  const playerRef = useRef<ReactPlayer>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasSeeked = useRef(false);
  const [localVolume, setLocalVolume] = useState(0); // Absolute zero volume start
  const isFadingIn = useRef(false); // Ref to track if fade-in is active
  const [isPlayingInternal, setIsPlayingInternal] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false); // Flag for fade-out at the end
  const durationRef = useRef(0);
  const playStartTimeRef = useRef<number | null>(null); // Track when playback actually started
  const [appOrigin, setAppOrigin] = useState('https://www.saladillovivo.com.ar');
  const [shouldPlay, setShouldPlay] = useState(autoplay);
  const sessionStartPlayedSecondsRef = useRef<number | null>(null);

  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fadeOutIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const kickIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Consumimos el estado global del volumen y el mutex
  const { volume, isMuted } = useVolumeStore();
  const { activeContentId } = usePlayerStore();

  const isAudioActive = id === activeContentId;

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      setAppOrigin(window.location.origin);
    }
  }, []);

  // Track player instances in console for debugging (v24.0)
  useEffect(() => {
    (window as any).__VIDEO_PLAYER_COUNT = ((window as any).__VIDEO_PLAYER_COUNT || 0) + 1;
    console.log(`[VideoPlayer:${id}] MOUNTED. Total Players: ${(window as any).__VIDEO_PLAYER_COUNT}`);
    return () => {
      (window as any).__VIDEO_PLAYER_COUNT -= 1;
      console.log(`[VideoPlayer:${id}] UNMOUNTED. Total Players: ${(window as any).__VIDEO_PLAYER_COUNT}`);
    };
  }, [id]);

  // Sync shouldPlay strictly when autoplay prop changes
  useEffect(() => {
    setShouldPlay(autoplay);
    if (autoplay && isMounted && isAudioActive && playerRef.current) {
      const internal = playerRef.current.getInternalPlayer();
      if (internal && typeof internal.playVideo === 'function') internal.playVideo();
    }
  }, [autoplay, isMounted, isAudioActive]);

  // Command Sync (v24.1) - Extreme manual enforcement for YouTube Iframe
  const finalPlaying = shouldPlay && isAudioActive;
  const finalMuted = isMuted || forceMuted || !isAudioActive;

  useEffect(() => {
    if (playerRef.current && isMounted) {
      const internal = playerRef.current.getInternalPlayer();
      if (internal) {
        if (finalPlaying) {
          console.log(`[VideoPlayer:${id}] Command: PLAY / UNMUTE`);
          if (typeof internal.playVideo === 'function') internal.playVideo();
          if (typeof internal.unMute === 'function') internal.unMute();
          if (typeof internal.setVolume === 'function') internal.setVolume(localVolume * 100);
        } else {
          console.log(`[VideoPlayer:${id}] Command: PAUSE / MUTE`);
          if (typeof internal.pauseVideo === 'function') internal.pauseVideo();
          if (typeof internal.mute === 'function') internal.mute();
          if (typeof internal.setVolume === 'function') internal.setVolume(0);
        }
      }
    }
  }, [finalPlaying, isMounted, id, localVolume]);

  // Chemical Death on Video URL change or Unmount
  useEffect(() => {
    return () => {
      // --- CHEMICAL DEATH (v23.8) ---
      if (playerRef.current) {
        const internal = playerRef.current.getInternalPlayer();
        if (internal) {
          try {
            if (typeof internal.pauseVideo === 'function') internal.pauseVideo();
            if (typeof internal.mute === 'function') internal.mute();
            if (typeof internal.stopVideo === 'function') internal.stopVideo();
          } catch (e) {
            console.warn("Error cleaning up internal player:", e);
          }
        }
      }
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      if (fadeOutIntervalRef.current) clearInterval(fadeOutIntervalRef.current);
      if (kickIntervalRef.current) clearInterval(kickIntervalRef.current);
    };
  }, [videoUrl]);

  // RESET STATE ON VIDEO SWAP
  useEffect(() => {
    setLocalVolume(0);
    setIsFadingOut(false);
    playStartTimeRef.current = null;
    hasSeeked.current = false;
    sessionStartPlayedSecondsRef.current = null;
    if (startAt && startAt > 0 && playerRef.current) {
      playerRef.current.seekTo(startAt, 'seconds');
    }
  }, [videoUrl, startAt]);

  const baseVolume = typeof playerVolume === 'number' ? playerVolume : volume;
  const effectiveVolume = Math.min(1, baseVolume * (volumen_extra || 1));

  useEffect(() => {
    const target = finalMuted ? 0 : effectiveVolume;
    if (!isFadingIn.current && !isFadingOut && localVolume !== target) {
      setLocalVolume(target);
    }
  }, [effectiveVolume, finalMuted, isFadingOut]);

  // Sync external audio
  useEffect(() => {
    if (audioRef.current) {
      if (finalPlaying) {
        audioRef.current.play().catch(() => { });
        audioRef.current.muted = finalMuted;
      } else {
        audioRef.current.pause();
        audioRef.current.muted = true;
      }
    }
  }, [finalPlaying, finalMuted]);

  // Reintento agresivo
  useEffect(() => {
    let retryInterval: NodeJS.Timeout;
    if (isMounted && autoplay && isAudioActive && isYouTubeVideo(videoUrl)) {
      let kickAttempts = 0;
      retryInterval = setInterval(() => {
        if (playerRef.current) {
          const internal = playerRef.current.getInternalPlayer();
          if (internal && typeof internal.playVideo === 'function') {
            const state = typeof internal.getPlayerState === 'function' ? internal.getPlayerState() : -1;
            if (state === 2 || state === 5 || state === -1 || state === 0 || (state === 3 && !isPlayingInternal)) {
              if (kickAttempts >= 4) {
                if (typeof internal.mute === 'function') internal.mute();
              }
              internal.playVideo();
              kickAttempts += 1;
            } else if (state === 1) {
              kickAttempts = 0;
              if (!isPlayingInternal) {
                setIsPlayingInternal(true);
                if (playStartTimeRef.current === null) playStartTimeRef.current = Date.now();
                if (!isFadingIn.current) {
                  isFadingIn.current = true;
                  const fadeDuration = 1000;
                  const fadeSteps = 20;
                  const targetVol = effectiveVolume;
                  const increment = targetVol / fadeSteps;
                  let currentVol = 0;
                  let step = 0;
                  if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
                  fadeIntervalRef.current = setInterval(() => {
                    step++;
                    currentVol = Math.min(targetVol, currentVol + increment);
                    setLocalVolume(currentVol);
                    if (step >= fadeSteps) {
                      clearInterval(fadeIntervalRef.current!);
                      isFadingIn.current = false;
                      setLocalVolume(targetVol);
                    }
                  }, fadeDuration / fadeSteps);
                }
              }
            }
          }
        }
      }, 250);
      kickIntervalRef.current = retryInterval;
    }
    return () => { if (retryInterval) clearInterval(retryInterval); };
  }, [isMounted, autoplay, isAudioActive, videoUrl, isPlayingInternal, effectiveVolume]);

  const handleProgressInternal = (state: { playedSeconds: number, loadedSeconds: number }) => {
    if (onProgress) onProgress(state);
    if (isYouTubeVideo(videoUrl) && durationRef.current > 0 && !isFadingOut && isAudioActive) {
      const timeLeft = durationRef.current - state.playedSeconds;
      if (timeLeft <= 1 && timeLeft > 0) {
        setIsFadingOut(true);
        const fadeDuration = 1000;
        const fadeSteps = 10;
        const decrement = localVolume / fadeSteps;
        let currentFadeVolume = localVolume;
        let step = 0;
        if (fadeOutIntervalRef.current) clearInterval(fadeOutIntervalRef.current);
        fadeOutIntervalRef.current = setInterval(() => {
          step++;
          currentFadeVolume = Math.max(0, currentFadeVolume - decrement);
          setLocalVolume(currentFadeVolume);
          if (step >= fadeSteps || currentFadeVolume <= 0) {
            clearInterval(fadeOutIntervalRef.current!);
            setLocalVolume(0);
          }
        }, fadeDuration / fadeSteps);
      }
    }
  };

  const handleDurationInternal = (duration: number) => {
    durationRef.current = duration;
    if (onDuration) onDuration(duration);
  };

  const handleReady = useCallback(() => {
    if (autoplay && isAudioActive && playerRef.current) {
      const internalPlayer = playerRef.current.getInternalPlayer();
      if (internalPlayer && typeof internalPlayer.playVideo === 'function') internalPlayer.playVideo();
    }
    if (startAt && startAt > 0 && playerRef.current) {
      playerRef.current.seekTo(startAt, 'seconds');
      hasSeeked.current = true;
    }
  }, [autoplay, isAudioActive, startAt]);

  const handleError = useCallback((e: any) => {
    console.error("VideoPlayer Error:", videoUrl, e);
    if (onClose) onClose();
  }, [videoUrl, onClose]);

  if (!isMounted) return null;

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <div className="absolute inset-0 z-10 bg-transparent" />
      <div className="w-full h-full transform-gpu overflow-hidden">
        <ReactPlayer
          ref={playerRef}
          url={videoUrl}
          playing={finalPlaying}
          controls={false}
          volume={localVolume}
          muted={finalMuted}
          width="100%"
          height="100%"
          progressInterval={500}
          onEnded={onClose}
          onProgress={handleProgressInternal}
          onDuration={handleDurationInternal}
          onReady={handleReady}
          onError={handleError}
          onPlay={() => {
            setIsPlayingInternal(true);
            if (playStartTimeRef.current === null) playStartTimeRef.current = Date.now();
            if (startAt && startAt > 0 && !hasSeeked.current && playerRef.current) {
              playerRef.current.seekTo(startAt, 'seconds');
              hasSeeked.current = true;
            }
          }}
          onPause={() => {
            if (autoplay && isAudioActive) {
              const now = Date.now();
              const playDuration = playStartTimeRef.current ? (now - playStartTimeRef.current) : 0;
              if (playDuration < 5000) {
                if (playerRef.current) {
                  const internal = playerRef.current.getInternalPlayer();
                  if (internal && typeof internal.playVideo === 'function') internal.playVideo();
                }
              } else {
                setIsPlayingInternal(false);
              }
            } else {
              setIsPlayingInternal(false);
            }
          }}
          config={{
            youtube: {
              playerVars: {
                showinfo: 0,
                modestbranding: 1,
                rel: 0,
                autoplay: 1,
                playsinline: 1,
                controls: 0,
                disablekb: 1,
                fs: 0,
                iv_load_policy: 3,
                cc_load_policy: 0,
                origin: appOrigin,
                enablejsapi: 1,
                widget_referrer: appOrigin,
                host: 'https://www.youtube.com'
              }
            },
            file: {
              attributes: {
                controlsList: 'nodownload',
                playsInline: true,
                style: { objectFit: 'contain', width: '100%', height: '100%' }
              }
            }
          }}
        />
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            autoPlay={finalPlaying}
            muted={finalMuted}
            className="hidden"
          />
        )}
      </div>
    </div>
  );
}