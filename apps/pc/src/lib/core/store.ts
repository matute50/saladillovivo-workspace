import { create } from 'zustand';
import { Video, Article } from './types';

export const INTRO_VIDEOS = [
    '/videos_intro/intro1.mp4',
    '/videos_intro/intro2.mp4',
    '/videos_intro/intro3.mp4',
    '/videos_intro/intro4.mp4',
    '/videos_intro/intro5.mp4'
];

export const DAILY_SHOW_INTROS = [
    '/videos_intro/al tanto de todo.mp4',
    '/videos_intro/bien informado.mp4',
    '/videos_intro/en 10 minutos.mp4',
    '/videos_intro/en10minutos.mp4',
    '/videos_intro/estas son las noticias.mp4',
    '/videos_intro/estas son.mp4',
    '/videos_intro/informate mejor.mp4',
    '/videos_intro/lo que paso hoy.mp4',
    '/videos_intro/los hechos.mp4',
    '/videos_intro/rapido.mp4',
    '/videos_intro/resumen.mp4'
];

export const NEWS_INTRO_VIDEO = '/videos_intro/noticias.mp4?v=2';
export const FORBIDDEN_CATEGORY = 'HCD DE SALADILLO - Período 2025';
export const BLOCKED_START_ID = '471';

export interface MediaPlayerState {
    videoPool: Video[];
    isInitialVideoPicked: boolean;
    currentContent: Video | Article | null;
    nextContent: Video | Article | null;
    currentIntroUrl: string | null;
    introQueue: string[];
    introId: number;
    isIntroVisible: boolean;
    shouldPlayContent: boolean;
    dailyShowSequence: any[] | null;
    currentSequenceIndex: number;

    setVideoPool: (videos: Video[], initialTarget?: Video | Article) => void;
    playManual: (item: Video | Article) => void;
    prepareNext: () => void;
    triggerTransition: (delayMs?: number) => void;
    handleIntroEnded: () => void;
    handleContentEnded: (getArticleById: any, getVideoById: any) => Promise<void>;
    loadDailyShow: (id: string, getArticleById: any, getVideoById: any, supabaseClient: any) => Promise<void>;
    startTransition: (nextContent: Video | Article) => void;
    getNextIntroUrl: (isVideo: boolean, currentQueue: string[]) => { url: string; newQueue: string[] };
}

let introTimer: any = null;

export const useMediaPlayerStore = create<MediaPlayerState>((set, get) => ({
    videoPool: [],
    isInitialVideoPicked: false,
    currentContent: null,
    nextContent: null,
    currentIntroUrl: null,
    introQueue: [],
    introId: 0,
    isIntroVisible: true,
    shouldPlayContent: false,
    dailyShowSequence: null,
    currentSequenceIndex: -1,

    getNextIntroUrl: (isVideo, currentQueue) => {
        if (!isVideo) return { url: NEWS_INTRO_VIDEO, newQueue: currentQueue };

        let newQueue = [...currentQueue];
        if (newQueue.length === 0) {
            newQueue = [...INTRO_VIDEOS].sort(() => Math.random() - 0.5);
            const lastIntro = get().currentIntroUrl;
            if (lastIntro && newQueue[0] === lastIntro && newQueue.length > 1) {
                const first = newQueue.shift()!;
                newQueue.push(first);
            }
        }

        const url = newQueue.shift() || INTRO_VIDEOS[0];
        return { url, newQueue };
    },

    handleIntroEnded: () => {
        set({ isIntroVisible: false });
        if (introTimer) clearTimeout(introTimer);
    },

    startTransition: (nextContent) => {
        const isVideo = 'url' in nextContent;
        if (introTimer) clearTimeout(introTimer);

        const { url: nextIntroUrl, newQueue } = get().getNextIntroUrl(isVideo, get().introQueue);

        set({
            currentContent: nextContent as Video | Article,
            nextContent: null,
            currentIntroUrl: nextIntroUrl,
            introQueue: newQueue,
            introId: Date.now(),
            isIntroVisible: true,
            shouldPlayContent: true,
        });

        introTimer = setTimeout(() => {
            get().handleIntroEnded();
        }, 10000);
    },

    setVideoPool: (videos, initialTarget) => {
        set({ videoPool: videos });
        if (initialTarget && !get().isInitialVideoPicked) {
            set({ isInitialVideoPicked: true });
            get().startTransition(initialTarget);
        }
    },

    playManual: (item) => {
        set({ isInitialVideoPicked: true });
        get().startTransition(item);
    },

    prepareNext: () => {
        const state = get();
        if (state.nextContent) return;

        const candidates = state.videoPool.filter(v =>
            v.categoria !== FORBIDDEN_CATEGORY && String(v.id) !== BLOCKED_START_ID
        );

        if (candidates.length === 0) return;

        let filtered = candidates.filter(v => v.categoria !== (state.currentContent as any)?.categoria);
        if (filtered.length === 0) filtered = candidates;

        const next = filtered[Math.floor(Math.random() * filtered.length)];
        if (next) {
            set({ nextContent: next });
        }
    },

    triggerTransition: (delayMs = 0) => {
        const state = get();
        if (!state.nextContent || state.isIntroVisible) return;

        const isVideo = 'url_video' in state.nextContent || 'url' in state.nextContent;
        if (introTimer) clearTimeout(introTimer);

        const { url: nextIntroUrl, newQueue } = state.getNextIntroUrl(isVideo, state.introQueue);

        const SAFETY_DELAY = 800;
        const effectiveDelay = Math.max(delayMs, SAFETY_DELAY);

        set({
            currentIntroUrl: nextIntroUrl,
            introQueue: newQueue,
            introId: Date.now(),
            isIntroVisible: true,
        });

        setTimeout(() => {
            set((prev) => ({
                currentContent: prev.nextContent,
                nextContent: null
            }));
        }, effectiveDelay);

        introTimer = setTimeout(() => {
            get().handleIntroEnded();
        }, 10000);
    },

    handleContentEnded: async (getArticleById, getVideoById) => {
        const state = get();

        if (state.dailyShowSequence && state.currentSequenceIndex !== -1 && state.currentSequenceIndex < state.dailyShowSequence.length - 1) {
            if (state.currentIntroUrl !== NEWS_INTRO_VIDEO) {
                set({
                    currentIntroUrl: NEWS_INTRO_VIDEO,
                    introId: Date.now(),
                    isIntroVisible: true
                });
                return;
            }

            const nextIdx = state.currentSequenceIndex + 1;
            const nextItem = state.dailyShowSequence[nextIdx];

            set({ currentSequenceIndex: nextIdx, isIntroVisible: false });

            if (nextItem.type === 'noticia') {
                const art = await getArticleById(nextItem.id);
                if (art) set({ currentContent: art });
            } else {
                const vid = await getVideoById(nextItem.id);
                if (vid) set({ currentContent: vid });
            }
            return;
        }

        const isNews = state.currentContent && ('url_slide' in state.currentContent || !('url' in state.currentContent && 'url_video' in state.currentContent));

        if (state.nextContent) {
            if (isNews) {
                state.triggerTransition();
            } else {
                set({
                    currentContent: state.nextContent,
                    nextContent: null
                });
            }
        } else {
            get().prepareNext();
            const next = get().nextContent;
            if (next) state.startTransition(next);
        }
    },

    loadDailyShow: async (id, getArticleById, getVideoById, supabaseClient) => {
        const state = get();
        if (state.dailyShowSequence && state.currentSequenceIndex !== -1) return;

        try {
            const { data, error } = await supabaseClient
                .from('resumenes')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !data) return;

            const sequence = data.secuencia;
            if (!Array.isArray(sequence) || sequence.length === 0) return;

            const first = sequence[0];
            let firstContent = null;

            if (first.type === 'noticia') {
                firstContent = await getArticleById(first.id);
            } else {
                firstContent = await getVideoById(first.id);
            }

            if (firstContent) {
                const randomIntro = DAILY_SHOW_INTROS[Math.floor(Math.random() * DAILY_SHOW_INTROS.length)];

                set({ isInitialVideoPicked: true });
                if (introTimer) clearTimeout(introTimer);

                set({
                    dailyShowSequence: sequence,
                    currentSequenceIndex: 0,
                    currentContent: firstContent,
                    currentIntroUrl: randomIntro,
                    isIntroVisible: true,
                    shouldPlayContent: true,
                    introId: Date.now()
                });

                introTimer = setTimeout(() => {
                    get().handleIntroEnded();
                }, 10000);
            }
        } catch (err) {
            console.error("Exception in loadDailyShow (Core Store):", err);
        }
    }
}));
