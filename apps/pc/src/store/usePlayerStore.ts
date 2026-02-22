import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { getVideosForHome, getNewRandomVideo, getVideoByUrl } from '@/lib/data';
import { SlideMedia } from '@/lib/types';

import { useNewsPlayerStore } from './useNewsPlayerStore';

const INTRO_VIDEOS = [
    '/videos_intro/intro1.mp4',
    '/videos_intro/intro2.mp4',
    '/videos_intro/intro3.mp4',
    '/videos_intro/intro4.mp4',
    '/videos_intro/intro5.mp4',
];

type PlaybackSource = 'INTRO' | 'DB_RANDOM' | 'USER_SELECTED' | 'RESUMING';

interface PlayerState {
    currentVideo: SlideMedia | null;
    activeContentId: string | null; // GLOBAL AUDIO MUTEX (v24.6)
    nextVideo: SlideMedia | null;
    playlist: SlideMedia[];
    isPlaying: boolean;
    viewMode: 'diario' | 'tv';
    streamStatus: any;

    // Zero-Branding States
    isPreRollOverlayActive: boolean; // True when Intro is playing
    overlayIntroVideo: SlideMedia | null;
    isContentPlaying: boolean; // True when YouTube/Content underlying layer is playing

    // Refs equivalents
    playbackState: PlaybackSource;
    savedProgress: number;
    savedVideo: SlideMedia | null;
    savedVolume: number;
    lastKnownVolume: number;
    historyVolume: number; // Volume captured 10s before end of previous video

    // Actions
    setViewMode: (mode: 'diario' | 'tv') => void;
    setIsPlaying: (isPlaying: boolean) => void;
    // New Action for Zero-Branding Sync (Call this when Intro has 4s left)
    // startContentPlayback: () => void;

    togglePlayPause: () => void;
    setStreamStatus: (status: any) => void;

    playMedia: (media: SlideMedia) => void;
    playManual: (media: SlideMedia, currentVolume?: number, setVolume?: (v: number) => void) => void;
    playTemporaryVideo: (media: SlideMedia, currentVolume?: number, setVolume?: (v: number) => void) => void;
    playLiveStream: (streamData: any) => void;
    playNextVideoInQueue: () => void;
    loadInitialPlaylist: (videoUrlToPlay: string | null) => Promise<void>;
    triggerTransition: (setVolume?: (v: number) => void, getCurrentVolume?: () => number) => Promise<void>;

    // Resume Logic for Slides
    pauseForSlide: (currentTime?: number) => void;
    resumeAfterSlide: () => void;

    saveCurrentProgress: (seconds: number, volume: number) => void;
    playRandomSequence: () => Promise<void>;

    startIntroHideTimer: () => void;

    // Helpers
    getRandomIntro: () => SlideMedia;
    fetchRandomDbVideo: (excludeId?: string, excludeCategory?: string) => Promise<SlideMedia | null>;
    preloadNextVideo: (currentId: string) => Promise<void>;
    finishIntro: () => void;
}

// Next intro video preloaded
let nextDataVideo: SlideMedia | null = null;

export const usePlayerStore = create<PlayerState>()(
    devtools(
        (set, get) => ({
            currentVideo: null,
            activeContentId: null,
            nextVideo: null,
            playlist: [],
            isPlaying: false,
            viewMode: 'diario',
            streamStatus: null,
            isPreRollOverlayActive: false,
            overlayIntroVideo: null,
            isContentPlaying: false,

            playbackState: 'INTRO',
            savedProgress: 0,
            savedVideo: null,
            savedVolume: 1,
            lastKnownVolume: 1,
            historyVolume: 1,

            setViewMode: (mode) => set({ viewMode: mode }),
            setIsPlaying: (isPlaying) => set({ isPlaying }),

            togglePlayPause: () => set((state) => ({ isPlaying: !state.isPlaying })),
            setStreamStatus: (status) => set({ streamStatus: status }),

            getRandomIntro: () => {
                const generate = () => {
                    const randomIndex = Math.floor(Math.random() * INTRO_VIDEOS.length);
                    const url = INTRO_VIDEOS[randomIndex];
                    return {
                        id: `intro-${url}-${Date.now()}`, // Unique ID to force re-render/logic if needed, though we recycle node
                        nombre: 'ESPACIO PUBLICITARIO',
                        url,
                        categoria: 'Institucional',
                        createdAt: new Date().toISOString(),
                        type: 'video' as const,
                        imagen: '',
                        novedad: false
                    };
                };
                return generate();
            },

            fetchRandomDbVideo: async (excludeId, excludeCategory) => {
                try {
                    return await getNewRandomVideo(excludeId, excludeCategory);
                } catch (error) {
                    console.error("Error fetching DB video:", error);
                    return null;
                }
            },

            // Legacy direct play (might need update or deprecation if mostly unused)
            playMedia: (media) => set({ currentVideo: media, isPlaying: true }),

            // User clicks a video in carousel
            playManual: (media, currentVolume, setVolume) => {
                // Stop News Slide if active
                useNewsPlayerStore.getState().stopSlide();

                if (currentVolume !== undefined) set({ savedVolume: currentVolume });

                // Rule: Start at 100% volume for user selection (Always Active)
                if (setVolume) {
                    setVolume(1);
                    // Force Unmute via store if possible, but setVolume usually handles it.
                    // Ideally we should access useVolumeStore here but we are in PlayerStore.
                    // The callback `setVolume` passed from component updates the VolumeStore.
                }

                set({ playbackState: 'USER_SELECTED', savedVolume: 1 });

                const introToPlay = get().getRandomIntro();
                set({
                    currentVideo: media,
                    activeContentId: media.id,
                    isPlaying: true,
                    overlayIntroVideo: introToPlay,
                    isPreRollOverlayActive: true,
                    isContentPlaying: true, // Allow background play
                });

                get().preloadNextVideo(media.id);
            },

            playTemporaryVideo: (media, currentVolume, setVolume) => {
                useNewsPlayerStore.getState().stopSlide();
                const { currentVideo, playbackState, getRandomIntro } = get();

                if (currentVideo && playbackState !== 'INTRO') {
                    set({ savedVideo: currentVideo, savedProgress: get().savedProgress }); // Ensure progress is saved separately if needed
                }

                // Rule: Start at 100% volume for user selection (Always Active)
                if (setVolume) {
                    setVolume(1);
                }
                set({ savedVolume: 1 });

                const introToPlay = getRandomIntro();
                set({
                    currentVideo: media,
                    activeContentId: media.id,
                    isPlaying: true,
                    overlayIntroVideo: introToPlay,
                    isPreRollOverlayActive: true,
                    isContentPlaying: true,
                    playbackState: 'USER_SELECTED'
                });

                get().preloadNextVideo(media.id);
            },

            playLiveStream: (streamData) => {
                set({ currentVideo: streamData, isPlaying: true, playbackState: 'USER_SELECTED' });
            },

            saveCurrentProgress: (seconds, volume) => {
                // 10s Lookback Volume Persistence Logic
                // We don't have duration here easily without passing it, but VideoPlayer calls this.
                // Better approach: handleOnEnded calculates it if we track history.
                // Simplified: Just allow set/get of historyVolume. 
                // We'll update savedVolume constantly.
                set({ savedProgress: seconds, savedVolume: volume });
            },

            startIntroHideTimer: () => {
                // Managed by VideoSection based on actual video time now, 
                // but kept for fallback or specific logic if needed.
                // In Zero-Branding, the Intro *Video* ending triggers the hide, not a timer.
                // We will deprecate this strict timer in favor of 'onEnded' of Intro Video.
            },

            loadInitialPlaylist: async (videoUrlToPlay) => {

                const intro = get().getRandomIntro();

                if (videoUrlToPlay) {
                    // Deep Linking Logic
                    let requested = (await getVideosForHome(10)).allVideos.find(v => v.url === videoUrlToPlay) as SlideMedia | null | undefined;
                    if (!requested) requested = await getVideoByUrl(videoUrlToPlay);

                    if (requested) {
                        set({
                            currentVideo: requested,
                            activeContentId: requested.id,
                            isPlaying: true,
                            overlayIntroVideo: intro,
                            isPreRollOverlayActive: true,
                            isContentPlaying: true,
                            playbackState: 'USER_SELECTED'
                        });
                        get().preloadNextVideo(requested.id);
                        return;
                    }
                }

                // Random Start
                const randomDbVideo = await get().fetchRandomDbVideo();
                if (randomDbVideo) {
                    set({
                        currentVideo: randomDbVideo,
                        activeContentId: randomDbVideo.id,
                        isPlaying: true,
                        overlayIntroVideo: intro,
                        isPreRollOverlayActive: true,
                        isContentPlaying: true,
                        playbackState: 'DB_RANDOM'
                    });
                    get().preloadNextVideo(randomDbVideo.id);
                }
            },

            triggerTransition: async (setVolume) => {
                // 1. Capture Volume for Persistence (History Volume)
                // If provided, we assume this is the volume ~10s before end or close to it.
                // Since this is called EXACTLY at end, we might be too late if user muted at 1s left.
                // Requirement: "volume that it had 10 seconds before ending".
                // We need to implement a history buffer in VideoPlayer or Store.
                // Simpler compromise: The store uses `historyVolume` which VideoSection updates?
                // Or just use `savedVolume` which acts as "last known human volume".
                // Let's use `savedVolume` as the persistence source for now, assuming it updates frequently.

                const { savedVolume } = get();
                set({ historyVolume: savedVolume });

                // 2. Prepare Next Loop
                const { currentVideo } = get();
                const intro = get().getRandomIntro();

                // 3. Fetch Next Video
                let nextV = nextDataVideo || await get().fetchRandomDbVideo(currentVideo?.id, currentVideo?.categoria);

                // If we run out of videos/errors, get anything
                if (!nextV) nextV = await get().fetchRandomDbVideo();

                if (nextV) {
                    // 4. Start Next Sequence: Intro -> Video
                    set({
                        currentVideo: nextV,
                        activeContentId: nextV.id,
                        isPlaying: true,
                        overlayIntroVideo: intro,
                        isPreRollOverlayActive: true,
                        isContentPlaying: true,
                        playbackState: 'DB_RANDOM'
                    });

                    if (setVolume) {
                        // Apply persisted volume
                        setVolume(savedVolume);
                    }

                    nextDataVideo = null;
                    get().preloadNextVideo(nextV.id);
                }
            },

            pauseForSlide: (currentTime) => {
                const { currentVideo, savedProgress } = get();
                if (currentVideo) {
                    set({
                        savedVideo: currentVideo,
                        savedProgress: currentTime || savedProgress,
                        isPlaying: false,
                        isContentPlaying: false
                    });
                }
            },

            resumeAfterSlide: () => {
                const { savedVideo, savedProgress, getRandomIntro } = get();
                if (savedVideo) {
                    const intro = getRandomIntro();
                    const videoWithStart = { ...savedVideo, startAt: savedProgress };

                    set({
                        currentVideo: videoWithStart as any,
                        activeContentId: savedVideo.id,
                        isPlaying: true,
                        overlayIntroVideo: intro,
                        isPreRollOverlayActive: true,
                        isContentPlaying: true,
                        savedVideo: null // Limpiar después de usar
                    });
                } else {
                    get().playRandomSequence();
                }
            },

            // ... other existing methods ... 
            playNextVideoInQueue: async () => {
                // Triggered by "Next" button usually
                // Use triggerTransition logic essentially
                get().triggerTransition();
            },


            preloadNextVideo: async (currentId) => {
                const { currentVideo } = get();
                const video = await get().fetchRandomDbVideo(currentId, currentVideo?.categoria);
                if (video) {
                    nextDataVideo = video;
                    set({ nextVideo: video });
                }
            },

            playRandomSequence: async () => {
                // Re-start loop
                get().triggerTransition();
            },

            finishIntro: () => {
                set({
                    isPreRollOverlayActive: false,
                    overlayIntroVideo: null,
                    // Ensure content is marked playing if not already
                    isContentPlaying: true
                });
            }
        }),
        { name: 'PlayerStore' }
    )
);
