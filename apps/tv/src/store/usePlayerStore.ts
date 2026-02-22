import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/lib/supabaseClient';
import { getVideosForHome, getNewRandomVideo, getVideoByUrl, getVideoById, getArticleById } from '@/lib/data';
import { SlideMedia, Video } from '@/lib/types';

import { useNewsPlayerStore } from './useNewsPlayerStore';
import { useNewsStore } from './useNewsStore';

const INTRO_VIDEOS = [
    '/videos_intro/intro1.mp4',
    '/videos_intro/intro2.mp4',
    '/videos_intro/intro3.mp4',
    '/videos_intro/intro4.mp4',
    '/videos_intro/intro5.mp4',
];

const NOTICIAS_INTRO = '/videos_intro/noticias.mp4';

type PlaybackSource = 'INTRO' | 'DB_RANDOM' | 'USER_SELECTED' | 'RESUMING';

interface PlayerState {
    currentVideo: SlideMedia | null;
    nextVideo: SlideMedia | null;
    isPlaying: boolean;
    viewMode: 'tv' | 'diario';
    streamStatus: any;

    // Zero-Branding States
    isPreRollOverlayActive: boolean; // True when Intro is playing
    overlayIntroVideo: SlideMedia | null;
    isContentPlaying: boolean; // True when YouTube/Content underlying layer is playing

    // Slots Management (Smart Slots v18.0)
    activeSlot: 'A' | 'B';
    slotAContent: SlideMedia | null;
    slotBContent: SlideMedia | null;

    // Refs equivalents
    playbackState: PlaybackSource;
    savedProgress: number;
    savedVideo: SlideMedia | null;
    savedVolume: number;
    lastKnownVolume: number;
    historyVolume: number; // Volume captured 10s before end of previous video

    // Actions
    setViewMode: (mode: 'tv' | 'diario') => void;
    setIsPlaying: (isPlaying: boolean) => void;
    togglePlayPause: () => void;
    setStreamStatus: (status: any) => void;

    playMedia: (media: SlideMedia) => void;
    playManual: (media: SlideMedia, currentVolume?: number, setVolume?: (v: number) => void) => void;
    playTemporaryVideo: (media: SlideMedia) => void;
    playLiveStream: (streamData: any) => void;
    playNextVideoInQueue: () => void;
    loadInitialPlaylist: (videoUrlToPlay: string | null) => Promise<void>;
    triggerTransition: (setVolume?: (v: number) => void, getCurrentVolume?: () => number) => Promise<void>;

    finishIntro: () => void;
    triggerIntro: (isNews: boolean) => void;

    // Resume Logic for Slides
    pauseForSlide: (currentTime?: number) => void;
    resumeAfterSlide: () => void;

    saveCurrentProgress: (seconds: number, volume: number) => void;
    playRandomSequence: () => Promise<void>;

    startIntroHideTimer: () => void;

    // Helpers
    getRandomIntro: (isNews?: boolean) => SlideMedia;
    fetchRandomDbVideo: (excludeId?: string, excludeCategory?: string) => Promise<SlideMedia | null>;
    preloadNextVideo: (currentId: string) => Promise<void>;

    // Daily Show / Programmed Sequences
    dailyShowSequence: any[] | null;
    currentSequenceIndex: number;
    loadDailyShow: (id: string) => Promise<void>;
}

// Next intro video preloaded
let nextDataVideo: SlideMedia | null = null;

export const usePlayerStore = create<PlayerState>()(
    devtools(
        (set, get) => ({
            currentVideo: null,
            nextVideo: null,
            isPlaying: false,
            viewMode: 'tv',
            streamStatus: null,
            isPreRollOverlayActive: false,
            overlayIntroVideo: null,
            isContentPlaying: false,
            activeSlot: 'A',
            slotAContent: null,
            slotBContent: null,

            playbackState: 'INTRO',
            savedProgress: 0,
            savedVideo: null,
            savedVolume: 1,
            lastKnownVolume: 1,
            historyVolume: 1,

            dailyShowSequence: null,
            currentSequenceIndex: -1,

            setViewMode: (mode: 'tv' | 'diario') => set({ viewMode: mode }),
            setIsPlaying: (isPlayingState: boolean) => set({ isPlaying: isPlayingState }),

            togglePlayPause: () => set((state) => ({ isPlaying: !state.isPlaying })),
            setStreamStatus: (status) => set({ streamStatus: status }),

            getRandomIntro: (isNews?: boolean) => {
                const generate = () => {
                    const url = isNews ? NOTICIAS_INTRO : INTRO_VIDEOS[Math.floor(Math.random() * INTRO_VIDEOS.length)];
                    return {
                        id: `intro-${url}-${Date.now()}`,
                        nombre: isNews ? 'NOTICIAS' : 'ESPACIO PUBLICITARIO',
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

            playMedia: (media) => set({ currentVideo: media, isPlaying: true }),

            // User clicks a video in carousel
            playManual: (media, currentVolume, setVolume) => {
                // 500ms Rule (Interaction Stability v23.2)
                // Stop News Slide if active
                useNewsPlayerStore.getState().stopSlide();

                if (currentVolume !== undefined) set({ savedVolume: currentVolume });

                // Rule: Start at 20% volume for user selection
                if (setVolume) setVolume(0.2);

                set({ playbackState: 'USER_SELECTED', isPlaying: true });

                const isNews = media.categoria === 'Noticias' || media.categoria === '__NOTICIAS__';
                const introToPlay = get().getRandomIntro(isNews);

                // Phase 1: Cover First (Safety Delay v23.0)
                set({
                    overlayIntroVideo: introToPlay,
                    isPreRollOverlayActive: true,
                });

                // Phase 2: Swap Subjacent Content after 800ms
                setTimeout(() => {
                    const currentActive = get().activeSlot;
                    const nextSlot = currentActive === 'A' ? 'B' : 'A';

                    set({
                        [nextSlot === 'A' ? 'slotAContent' : 'slotBContent']: media,
                        activeSlot: nextSlot,
                        currentVideo: media,
                        isContentPlaying: false, // Ensure it's ready but hidden
                    });

                    get().preloadNextVideo(media.id);
                }, 800);
            },

            playTemporaryVideo: (media) => {
                useNewsPlayerStore.getState().stopSlide();
                const { currentVideo, playbackState, getRandomIntro } = get();

                if (currentVideo && playbackState !== 'INTRO') {
                    set({ savedVideo: currentVideo, savedProgress: get().savedProgress });
                }

                // Inject into NewsStore pool to ensure navigation works
                useNewsStore.getState().addVideoToPool(media);

                set({ isPlaying: true, playbackState: 'USER_SELECTED' });

                const isNews = media.categoria === 'Noticias' || media.categoria === '__NOTICIAS__';
                const introToPlay = get().getRandomIntro(isNews);

                // Phase 1: Cover
                set({
                    overlayIntroVideo: introToPlay,
                    isPreRollOverlayActive: true,
                });

                // Phase 2: Swap after Safety Delay
                setTimeout(() => {
                    const currentActive = get().activeSlot;
                    const nextSlot = currentActive === 'A' ? 'B' : 'A';

                    set({
                        [nextSlot === 'A' ? 'slotAContent' : 'slotBContent']: media,
                        activeSlot: nextSlot,
                        currentVideo: media,
                        isContentPlaying: false,
                    });

                    get().preloadNextVideo(media.id);
                }, 800);
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


            loadInitialPlaylist: async (videoUrlToPlay) => {
                // Zero-Branding Sequence initialized
                const intro = get().getRandomIntro();
                set({ isPlaying: true });

                if (videoUrlToPlay) {
                    // Deep Linking Logic - Try URL first, then ID
                    let requested: SlideMedia | null | undefined = null;

                    // 1. Try to find in initial batch of 10
                    const initialBatch = await getVideosForHome(10);
                    requested = initialBatch.allVideos.find(v => v.url === videoUrlToPlay || v.id.toString() === videoUrlToPlay) as SlideMedia;

                    // 2. Fetch-On-Demand if not found in cache
                    if (!requested) {
                        requested = await getVideoByUrl(videoUrlToPlay) as SlideMedia;
                        if (!requested) {
                            requested = await getVideoById(videoUrlToPlay) as SlideMedia;
                        }
                    }

                    if (requested) {
                        // Inject into NewsStore pool to ensure navigation works
                        useNewsStore.getState().addVideoToPool(requested);

                        const isNews = requested.categoria === 'Noticias' || requested.categoria === '__NOTICIAS__';
                        set({
                            overlayIntroVideo: get().getRandomIntro(isNews),
                            isPreRollOverlayActive: true,
                            isContentPlaying: false,
                            playbackState: 'USER_SELECTED'
                        });

                        setTimeout(() => {
                            set({
                                slotAContent: requested,
                                activeSlot: 'A',
                                currentVideo: requested,
                            });
                            get().preloadNextVideo(requested!.id);
                        }, 800);
                        return;
                    }
                }

                // Random Start
                const randomDbVideo = await get().fetchRandomDbVideo();
                if (randomDbVideo) {
                    const isNews = randomDbVideo.categoria === 'Noticias' || randomDbVideo.categoria === '__NOTICIAS__';
                    set({
                        overlayIntroVideo: get().getRandomIntro(isNews),
                        isPreRollOverlayActive: true,
                        isContentPlaying: false,
                        playbackState: 'DB_RANDOM'
                    });

                    setTimeout(() => {
                        set({
                            slotAContent: randomDbVideo,
                            activeSlot: 'A',
                            currentVideo: randomDbVideo,
                        });
                        get().preloadNextVideo(randomDbVideo.id);
                    }, 800);
                }
            },

            triggerTransition: async (setVolume) => {
                const { savedVolume, currentVideo, savedVideo, savedProgress, dailyShowSequence, currentSequenceIndex } = get();
                set({ historyVolume: savedVolume });

                // Daily Show Logic: Advance in sequence if active
                if (dailyShowSequence && currentSequenceIndex !== -1 && currentSequenceIndex < dailyShowSequence.length - 1) {
                    const nextIndex = currentSequenceIndex + 1;
                    const nextItem = dailyShowSequence[nextIndex];
                    set({ currentSequenceIndex: nextIndex });

                    let nextMedia: SlideMedia | null = null;
                    if (nextItem.type === 'noticia') {
                        const art = await getArticleById(nextItem.id);
                        if (art) nextMedia = { ...art, type: 'noticia' } as any;
                    } else {
                        const vid = await getVideoById(nextItem.id.toString());
                        if (vid) nextMedia = { ...vid, type: 'video' } as any;
                    }

                    if (nextMedia) {
                        set({
                            overlayIntroVideo: get().getRandomIntro(nextItem.type === 'noticia'),
                            isPreRollOverlayActive: true,
                            isContentPlaying: false
                        });

                        setTimeout(() => {
                            const nextSlot = get().activeSlot === 'A' ? 'B' : 'A';
                            set({
                                [nextSlot === 'A' ? 'slotAContent' : 'slotBContent']: nextMedia,
                                activeSlot: nextSlot,
                                currentVideo: nextMedia,
                                playbackState: 'USER_SELECTED'
                            });
                        }, 800);
                        return;
                    }
                }

                // Normal Random / Resume Logic
                let nextV: SlideMedia | null = null;
                let isResuming = false;

                if (savedVideo) {
                    // Resuming saved video
                    nextV = { ...savedVideo, startAt: savedProgress } as any;
                    isResuming = true;
                    set({ savedVideo: null, savedProgress: 0 }); // Clean up
                } else {
                    nextV = nextDataVideo || await get().fetchRandomDbVideo(currentVideo?.id, currentVideo?.categoria);
                    if (!nextV) nextV = await get().fetchRandomDbVideo();
                }

                if (nextV) {
                    const isNews = nextV.categoria === 'Noticias' || nextV.categoria === '__NOTICIAS__';
                    const intro = get().getRandomIntro(isNews);

                    // 2. Cover Immediately
                    set({
                        overlayIntroVideo: intro,
                        isPreRollOverlayActive: true,
                        isContentPlaying: false
                    });

                    // 3. Swap after Safety Delay
                    setTimeout(() => {
                        const currentActive = get().activeSlot;
                        const nextSlot = currentActive === 'A' ? 'B' : 'A';

                        set({
                            [nextSlot === 'A' ? 'slotAContent' : 'slotBContent']: nextV,
                            activeSlot: nextSlot,
                            currentVideo: nextV,
                            playbackState: isResuming ? 'RESUMING' : 'DB_RANDOM'
                        });

                        if (setVolume) setVolume(savedVolume);

                        nextDataVideo = null;
                        if (!isResuming) {
                            get().preloadNextVideo(nextV!.id);
                        }
                    }, 800);
                }
            },

            loadDailyShow: async (id) => {
                const { data, error } = await supabase
                    .from('resumenes')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error || !data) {
                    console.error("Error loading daily show:", error);
                    return;
                }

                const sequence = data.secuencia;
                set({
                    dailyShowSequence: sequence,
                    currentSequenceIndex: 0,
                    isPlaying: true,
                    playbackState: 'USER_SELECTED'
                });

                // Play first item
                const first = sequence[0];
                let firstMedia: SlideMedia | null = null;

                if (first.type === 'noticia') {
                    const { getArticleById } = await import('@/lib/data');
                    const art = await getArticleById(first.id);
                    if (art) firstMedia = { ...art, type: 'noticia' } as any;
                } else {
                    const { getVideoById } = await import('@/lib/data');
                    const vid = await getVideoById(first.id);
                    if (vid) firstMedia = { ...vid, type: 'video' } as any;
                }

                if (firstMedia) {
                    set({
                        overlayIntroVideo: get().getRandomIntro(first.type === 'noticia'),
                        isPreRollOverlayActive: true,
                        isContentPlaying: false
                    });

                    setTimeout(() => {
                        set({
                            slotAContent: firstMedia,
                            activeSlot: 'A',
                            currentVideo: firstMedia,
                        });
                    }, 800);
                }
            },

            pauseForSlide: (currentTime?: number) => {
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
                        isPlaying: true,
                        overlayIntroVideo: intro,
                        isPreRollOverlayActive: true,
                        isContentPlaying: false,
                        savedVideo: null // Limpiar después de usar
                    });
                } else {
                    get().playRandomSequence();
                }
            },

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

            triggerIntro: (isNews: boolean) => {
                const intro = get().getRandomIntro(isNews);
                set({
                    overlayIntroVideo: intro,
                    isPreRollOverlayActive: true,
                    isContentPlaying: false
                });
            },

            finishIntro: () => {
                set({
                    isPreRollOverlayActive: false,
                    overlayIntroVideo: null,
                    isContentPlaying: true
                });
            },
        }),
        { name: 'PlayerStore' }
    )
);
