import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type SlideType = 'html' | 'video' | 'image';

export interface SlideData {
    url: string;
    type: SlideType;
    duration?: number;
    title?: string;
    subtitle?: string;
    audioUrl?: string | null;
}

interface NewsPlayerState {
    currentSlide: SlideData | null;
    isPlaying: boolean;
    playSlide: (slide: SlideData) => void;
    stopSlide: () => void;
}

export const useNewsPlayerStore = create<NewsPlayerState>()(
    devtools(
        (set) => ({
            currentSlide: null,
            isPlaying: false,
            isNewsIntroActive: false,
            playSlide: (slide) => {
                set({ currentSlide: slide, isPlaying: true });
            },
            stopSlide: () => set({ currentSlide: null, isPlaying: false }),
        }),
        { name: 'NewsPlayerStore' }
    )
);
