import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface VolumeState {
    volume: number;
    isMuted: boolean;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
    unmute: () => void;
}

export const useVolumeStore = create<VolumeState>()(
    persist(
        (set) => ({
            volume: 0.2,
            isMuted: false,
            setVolume: (newVolume: number) => {
                const clamped = Math.max(0, Math.min(1, newVolume));
                set({ volume: clamped });
                if (clamped > 0) set({ isMuted: false });
            },
            toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
            unmute: () => set({ isMuted: false }),
        }),
        {
            name: 'player-volume-storage',
            partialize: (state) => ({ volume: state.volume }),
        }
    )
);
