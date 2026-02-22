'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import ReactPlayer from 'react-player';
import { useVolumeStore } from '@/store/useVolumeStore';
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
}: VideoPlayerProps) {
  const [isMounted, setIsMounted] = useState(false);
  const playerRef = useRef<ReactPlayer>(null);
  const hasSeeked = useRef(false);
  const [localVolume, setLocalVolume] = useState(0); // Absolute zero volume start
  const isFadingIn = useRef(false); // Ref to track if fade-in is active
  const [isPlayingInternal, setIsPlayingInternal] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false); // Flag for fade-out at the end
  const durationRef = useRef(0);
  const playStartTimeRef = useRef<number | null>(null); // Track when playback actually started
  const [appOrigin, setAppOrigin] = useState('https://www.saladillovivo.com.ar');
  const [shouldPlay, setShouldPlay] = useState(autoplay);
  const [isRevealed, setIsRevealed] = useState(false); // Cinematic Shield state
  const revealTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Consumimos el estado global del volumen
  const { volume, isMuted } = useVolumeStore();

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      setAppOrigin(window.location.origin);
    }
  }, []);

  // Sync shouldPlay immediately when autoplay prop changes
  useEffect(() => {
    setShouldPlay(autoplay);

    // Immediate Force Play when autoplay becomes true
    if (autoplay && playerRef.current) {
      const internal = playerRef.current.getInternalPlayer();
      if (internal && typeof internal.playVideo === 'function') {
        internal.playVideo();
      }
    }
  }, [autoplay]);

  // RESET STATE ON VIDEO SWAP (Smart Slots Support)
  useEffect(() => {
    setLocalVolume(0);
    setIsFadingOut(false);
    playStartTimeRef.current = null;
    hasSeeked.current = false; // RESET ALWAYS ON URL/STARTAT CHANGE
    // Initial seek attempt
    if (startAt && startAt > 0 && playerRef.current) {
      playerRef.current.seekTo(startAt, 'seconds');
    }
  }, [videoUrl, startAt, autoplay]);

  // Determine the base volume based on props or global context
  const baseVolume = typeof playerVolume === 'number' ? playerVolume : volume;
  // Apply the extra volume multiplier (normalization v23.1)
  const effectiveVolume = Math.min(1, baseVolume * (volumen_extra || 1));

  // Efecto para sincronizar el volumen base cuando no hay fade activo
  useEffect(() => {
    const clampedVolume = Math.max(0, Math.min(1, effectiveVolume));
    if (!isFadingIn.current && !isFadingOut && localVolume !== clampedVolume) {
      setLocalVolume(clampedVolume);
    }
  }, [effectiveVolume, localVolume, isFadingOut, isMuted, playerVolume, volumen_extra]);

  // Audio Element Ref for volume sync
  const audioRef = useRef<HTMLAudioElement>(null);

  // Sync volume to audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = localVolume;
    }
  }, [localVolume]);

  // --- REINTENTO AGRESIVO DE AUTOPLAY PARA YOUTUBE ---

  const kickAttemptsRef = useRef(0);

  useEffect(() => {
    let retryInterval: NodeJS.Timeout;

    if (isMounted && autoplay && isYouTubeVideo(videoUrl)) {
      // INTERVALO AGRESIVO (250ms) - Para producción donde la latencia varía
      retryInterval = setInterval(() => {
        if (playerRef.current) {
          const internal = playerRef.current.getInternalPlayer();
          if (internal && typeof internal.playVideo === 'function') {
            const state = typeof internal.getPlayerState === 'function' ? internal.getPlayerState() : -1;

            // Si está pausado (2), canteado (5), no iniciado (-1, 0) o BUFFERING (3 - Force Kick)
            if (state === 2 || state === 5 || state === -1 || state === 0 || (state === 3 && !isPlayingInternal)) {
              // AUTOPLAY POLICY FALLBACK:
              // If we are stuck in unstarted state for > 1s (4 attempts), usually means unmuted autoplay is blocked.
              // We try to MUTE and play again.
              if (kickAttemptsRef.current >= 4) {
                if (typeof internal.mute === 'function') internal.mute();
                // Optionally update local state to reflect mute, though internal iframe update is priority
              }

              internal.playVideo();
              kickAttemptsRef.current += 1;
            } else if (state === 1) {
              kickAttemptsRef.current = 0; // Reset on success

              if (!isPlayingInternal) {
                setIsPlayingInternal(true);
                if (playStartTimeRef.current === null) playStartTimeRef.current = Date.now();

                // Cinematic Reveal: Delay showing the video to hide initial YouTube flashes
                if (!isRevealed) {
                  if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
                  revealTimerRef.current = setTimeout(() => {
                    setIsRevealed(true);
                  }, 400); // 400ms safety shield
                }

                // Trigger Fade In explicitly (only if not already fading)
                if (!isFadingIn.current) {
                  isFadingIn.current = true;
                  const fadeDuration = 1200; // Slightly slower for elegance
                  const fadeSteps = 24;
                  // Ducking Support: Start at target volume or ducked volume if audio is present
                  const targetBase = (typeof playerVolume === 'number' ? playerVolume : useVolumeStore.getState().volume) * (volumen_extra || 1);
                  const targetVol = audioUrl ? targetBase * 0.3 : targetBase; // Duck if news audio exists
                  const increment = targetVol / fadeSteps;
                  let currentVol = 0;
                  let step = 0;

                  const fadeInterval = setInterval(() => {
                    step++;
                    currentVol = Math.min(targetVol, currentVol + increment);
                    setLocalVolume(currentVol);

                    if (step >= fadeSteps) {
                      clearInterval(fadeInterval);
                      isFadingIn.current = false;
                      setLocalVolume(targetVol);
                    }
                  }, fadeDuration / fadeSteps);
                }
              }
            } else if (state === 3) {
              // En BUFFERING (3), mantenemos isPlayingInternal en true
              if (!isPlayingInternal) setIsPlayingInternal(true);
              // Reset kicks if buffering, as it means it accepted the command
              kickAttemptsRef.current = 0;
            }
          }
        }
      }, 250); // Restore to 250ms as intended
    }

    return () => {
      if (retryInterval) clearInterval(retryInterval);
    };
  }, [isMounted, autoplay, videoUrl, isPlayingInternal, playerVolume, volumen_extra]);

  // Handle Fade-out effect (UNIVERSAL - Works for YouTube, Video Files, and Audio Slides)
  const handleProgressInternal = (state: { playedSeconds: number, loadedSeconds: number }) => {
    if (onProgress) onProgress(state);

    // FADE OUT LOGIC (Last 1 second)
    // We check against durationRef which is populated by onDuration
    if (durationRef.current > 0 && !isFadingOut) {
      const timeLeft = durationRef.current - state.playedSeconds;

      // Start fade-out when 1 second remains
      if (timeLeft <= 1.0 && timeLeft > 0) {
        setIsFadingOut(true);

        const fadeDuration = 1000;
        const fadeSteps = 10; // Less steps for smoother performance on TV
        const decrement = localVolume / fadeSteps;
        let currentFadeVolume = localVolume;
        let step = 0;

        const fadeOutInterval = setInterval(() => {
          step++;
          currentFadeVolume = Math.max(0, currentFadeVolume - decrement);
          setLocalVolume(currentFadeVolume);

          if (step >= fadeSteps || currentFadeVolume <= 0) {
            clearInterval(fadeOutInterval);
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

  // Handle player ready state and seeking
  const handleReady = useCallback(() => {
    // Si es YouTube y debe ser autoplay, forzamos el play de forma explícita
    if (autoplay && playerRef.current) {
      const internalPlayer = playerRef.current.getInternalPlayer();
      if (internalPlayer && typeof internalPlayer.playVideo === 'function') {
        internalPlayer.playVideo();
      }
    }

    if (startAt && startAt > 0 && playerRef.current) {
      playerRef.current.seekTo(startAt, 'seconds');
      hasSeeked.current = true;
    }
  }, [autoplay, startAt]);

  const handleError = useCallback((e: any) => {
    console.error("VideoPlayer Error:", videoUrl, e);
    if (onClose) onClose();
  }, [videoUrl, onClose]);

  if (!isMounted) return null;

  // --- TRUE PERSISTENT MODE (v18.0) ---
  // If no videoUrl -> Render BLACK screen but keep component mounted.
  // This avoids unmounting the heavy ReactPlayer/Iframe during slot swaps.
  if (!videoUrl) {
    return (
      <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
        {/* Idle State - Ready for Injection */}
        <div className="absolute inset-0 bg-black z-20" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* CAPA DE BLOQUEO (REGLA DE ORO) 
          Evita cualquier interacción directa con el iframe de YouTube */}
      <div className="absolute inset-0 z-10 bg-transparent" />

      <div className="w-full h-full transform-gpu overflow-hidden">
        <ReactPlayer
          ref={playerRef}
          url={videoUrl}
          playing={shouldPlay}
          controls={false} // Desactivamos controles nativos
          volume={localVolume}
          muted={isMuted || forceMuted} // Merge global and local mute
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

            // RULE OF GOLD: Persistent seek on actual play start
            if (startAt && startAt > 0 && !hasSeeked.current && playerRef.current) {
              playerRef.current.seekTo(startAt, 'seconds');
              hasSeeked.current = true;
            }

            // Cinematic Reveal (Backup for non-YouTube or normal play)
            if (!isRevealed) {
              if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
              revealTimerRef.current = setTimeout(() => setIsRevealed(true), 400);
            }

            // Trigger Fade In on normal Play
            if (!isFadingIn.current && localVolume === 0) {
              isFadingIn.current = true;
              const fadeDuration = 1200;
              const fadeSteps = 24;
              const targetBase = (typeof playerVolume === 'number' ? playerVolume : useVolumeStore.getState().volume) * (volumen_extra || 1);
              const targetVol = audioUrl ? targetBase * 0.3 : targetBase;
              const increment = targetVol / fadeSteps;
              let currentVol = 0;
              let step = 0;

              const fadeInterval = setInterval(() => {
                step++;
                currentVol = Math.min(targetVol, currentVol + increment);
                setLocalVolume(currentVol);

                if (step >= fadeSteps) {
                  clearInterval(fadeInterval);
                  isFadingIn.current = false;
                  setLocalVolume(targetVol);
                }
              }, fadeDuration / fadeSteps);
            }
          }}
          onPause={() => {
            if (autoplay) {
              // BLOQUEADOR DE PAUSAS: Si se pausa durante los primeros 5 segundos de vida
              // y es autoplay, es probable que sea un bloqueo del navegador o error de estado.
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
                cc_load_policy: 1, // Force captions off explicitly if possible, or 1 to invoke logic? 0=default.
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
            autoPlay={shouldPlay}
            muted={isMuted || forceMuted}
            className="hidden"
            onPlay={() => {
              // Ensure we track this as playing
              setIsPlayingInternal(true);
              if (playStartTimeRef.current === null) playStartTimeRef.current = Date.now();

              // Trigger Fade In if starting from silence
              if (!isFadingIn.current && localVolume === 0) {
                isFadingIn.current = true;
                const fadeDuration = 1000;
                const fadeSteps = 10;
                const targetVol = Math.min(1, (typeof playerVolume === 'number' ? playerVolume : useVolumeStore.getState().volume) * (volumen_extra || 1));
                const increment = targetVol / fadeSteps;
                let currentVol = 0;
                let step = 0;
                const fadeInterval = setInterval(() => {
                  step++;
                  currentVol = Math.min(targetVol, currentVol + increment);
                  setLocalVolume(currentVol);
                  if (step >= fadeSteps) {
                    clearInterval(fadeInterval);
                    isFadingIn.current = false;
                    setLocalVolume(targetVol);
                  }
                }, fadeDuration / fadeSteps);
              }
            }}
            // Drive progress for Audio Slides (where videoUrl is not YouTube/Video)
            onTimeUpdate={(e) => {
              if (!isYouTubeVideo(videoUrl)) {
                const currentTime = e.currentTarget.currentTime;
                const duration = e.currentTarget.duration || durationRef.current;

                // Apply fade-out logic via common handler
                handleProgressInternal({
                  playedSeconds: currentTime,
                  loadedSeconds: e.currentTarget.buffered.length ? e.currentTarget.buffered.end(e.currentTarget.buffered.length - 1) : duration
                });

                // Ensure duration is set if missing
                if ((durationRef.current === 0 || durationRef.current === Infinity) && duration > 0 && duration !== Infinity) {
                  handleDurationInternal(duration);
                }
              }
            }}
            onEnded={onClose}
            onError={(e) => console.error("VideoPlayer: Error en audio externo:", e)}
          />
        )}

        {/* SHIELD OF GOLD (Zero-Branding) */}
        {!isRevealed && isYouTubeVideo(videoUrl) && (
          <div className="absolute inset-0 z-30 bg-black flex items-center justify-center animate-fadeInMedium">
            <div className="w-16 h-1 w-32 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 animate-loading-bar" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}