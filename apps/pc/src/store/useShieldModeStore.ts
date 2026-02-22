import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface ShieldModeState {
    isShieldMode: boolean;
    toggleShieldMode: () => void;
    setShieldMode: (enabled: boolean) => void;
}

export const useShieldModeStore = create<ShieldModeState>()(
    devtools(
        (set) => ({
            isShieldMode: false,
            toggleShieldMode: () => set((state) => ({ isShieldMode: !state.isShieldMode })),
            setShieldMode: (enabled) => set({ isShieldMode: enabled }),
        }),
        { name: 'ShieldModeStore' }
    )
);
