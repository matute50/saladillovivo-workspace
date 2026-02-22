import { create } from 'zustand';

interface WeatherUIState {
    isWeatherOverlayOpen: boolean;
    selectedDayPayload: any | null;
    toggleWeatherOverlay: () => void;
    openWithDetails: (day: any) => void;
    closeWeatherOverlay: () => void;
}

export const useWeatherUIStore = create<WeatherUIState>((set) => ({
    isWeatherOverlayOpen: false,
    selectedDayPayload: null,
    toggleWeatherOverlay: () => set((state) => ({
        isWeatherOverlayOpen: !state.isWeatherOverlayOpen,
        selectedDayPayload: null // Reset payload on toggle
    })),
    openWithDetails: (day) => set({
        isWeatherOverlayOpen: true,
        selectedDayPayload: day
    }),
    closeWeatherOverlay: () => set({
        isWeatherOverlayOpen: false,
        selectedDayPayload: null
    }),
}));
