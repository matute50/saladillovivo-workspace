import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';

/**
 * UI Store - Maneja estado de la interfaz de usuario
 * Separado de NewsStore para mejor organización (State Management Architecture skill)
 */

interface UIState {
    // Theme
    theme: 'light' | 'dark';

    // Modals & Overlays
    isSearchOpen: boolean;
    isMenuOpen: boolean;

    // Toast/Notifications
    toast: {
        message: string;
        type: 'success' | 'error' | 'info';
        visible: boolean;
    } | null;

    // Hydration control
    hasHydrated: boolean;

    // Actions
    setTheme: (theme: 'light' | 'dark') => void;
    toggleTheme: () => void;
    setSearchOpen: (open: boolean) => void;
    setMenuOpen: (open: boolean) => void;
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    hideToast: () => void;
    setHasHydrated: (state: boolean) => void;
}

export const useUIStore = create<UIState>()(
    devtools(
        persist(
            (set, get) => ({
                // Estado inicial
                theme: 'dark',
                isSearchOpen: false,
                isMenuOpen: false,
                toast: null,
                hasHydrated: false,

                // Actions
                setTheme: (theme) => {
                    set({ theme }, false, 'setTheme');
                },

                toggleTheme: () => {
                    const currentTheme = get().theme;
                    set(
                        { theme: currentTheme === 'dark' ? 'light' : 'dark' },
                        false,
                        'toggleTheme'
                    );
                },

                setSearchOpen: (open) => {
                    set({ isSearchOpen: open }, false, 'setSearchOpen');
                },

                setMenuOpen: (open) => {
                    set({ isMenuOpen: open }, false, 'setMenuOpen');
                },

                showToast: (message, type = 'info') => {
                    set(
                        {
                            toast: {
                                message,
                                type,
                                visible: true
                            }
                        },
                        false,
                        'showToast'
                    );

                    // Auto-hide después de 3s
                    setTimeout(() => {
                        get().hideToast();
                    }, 3000);
                },

                hideToast: () => {
                    set({ toast: null }, false, 'hideToast');
                },

                setHasHydrated: (state) => {
                    set({ hasHydrated: state }, false, 'setHasHydrated');
                }
            }),
            {
                name: 'ui-storage',
                storage: createJSONStorage(() => {
                    // SSR-safe: solo usar localStorage en cliente
                    if (typeof window === 'undefined') {
                        return {
                            getItem: () => null,
                            setItem: () => { },
                            removeItem: () => { }
                        };
                    }
                    return localStorage;
                }),

                // Callback cuando termina hidratación
                onRehydrateStorage: () => (state: UIState | undefined) => {
                    state?.setHasHydrated(true);
                }
            }
        ),
        {
            name: 'UIStore',
            enabled: process.env.NODE_ENV === 'development'
        }
    )
);

/**
 * Hook para acceso SSR-safe al store
 * Retorna fallback hasta que el store haya hidratado
 */
export const useHydratedUI = <T>(
    selector: (state: UIState) => T,
    fallback: T
): T => {
    const hasHydrated = useUIStore(state => state.hasHydrated);
    const value = useUIStore(selector);

    return hasHydrated ? value : fallback;
};
