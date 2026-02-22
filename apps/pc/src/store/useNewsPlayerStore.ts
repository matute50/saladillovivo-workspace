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
    isNewsIntroActive: boolean;
    playSlide: (slide: SlideData) => void;
    stopSlide: () => void;
    setIsNewsIntroActive: (active: boolean) => void;
}

export const useNewsPlayerStore = create<NewsPlayerState>()(
    devtools(
        (set) => ({
            currentSlide: null,
            isPlaying: false,
            isNewsIntroActive: false,
            playSlide: (slide) => {
                // Interrumpir video principal dinámicamente si es posible sin require prohibido
                // Nota: La circularidad se maneja en los componentes o mediante eventos si es necesario
                set({ currentSlide: slide, isPlaying: true, isNewsIntroActive: true });
            },
            stopSlide: () => set({ currentSlide: null, isPlaying: false, isNewsIntroActive: false }),
            setIsNewsIntroActive: (active) => set({ isNewsIntroActive: active }),
        }),
        { name: 'NewsPlayerStore' }
    )
);
