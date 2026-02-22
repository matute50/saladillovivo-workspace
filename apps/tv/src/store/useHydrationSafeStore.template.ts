import { create } from 'zustand';
import { persist, createJSONStorage, devtools } from 'zustand/middleware';

/**
 * Template para stores con persistencia SSR-safe
 * Basado en State Management Architecture skill
 * 
 * USO:
 * 1. Copiar este template
 * 2. Renombrar interface y store
 * 3. Agregar tu estado y acciones
 * 4. Configurar qué campos persistir
 */

interface HydrationSafeState {
    // Hydration control (requerido)
    hasHydrated: boolean;

    // Tu estado aquí
    exampleValue: string;

    // Acciones
    setHasHydrated: (state: boolean) => void;
    setExampleValue: (value: string) => void;
}

export const useHydrationSafeStore = create<HydrationSafeState>()(
    devtools(
        persist(
            (set) => ({
                // Estado inicial
                hasHydrated: false,
                exampleValue: 'default',

                // Actions
                setHasHydrated: (state) => set({ hasHydrated: state }),
                setExampleValue: (value) => set({ exampleValue: value })
            }),
            {
                name: 'hydration-safe-storage',
                storage: createJSONStorage(() => {
                    // ⭐ CRÍTICO: Solo usar localStorage en cliente
                    if (typeof window === 'undefined') {
                        return {
                            getItem: () => null,
                            setItem: () => { },
                            removeItem: () => { }
                        };
                    }
                    return localStorage;
                }),

                // ⭐ Callback cuando termina de hidratar
                onRehydrateStorage: () => (state) => {
                    state?.setHasHydrated(true);
                }
            }
        ),
        {
            name: 'HydrationSafeStore',
            enabled: process.env.NODE_ENV === 'development'
        }
    )
);

/**
 * Hook para acceso SSR-safe
 * Retorna fallback hasta que el store haya hidratado
 * 
 * EJEMPLO:
 * const value = useHydratedValue(
 *   state => state.exampleValue,
 *   'fallback-for-ssr'
 * );
 */
export const useHydratedValue = <T>(
    selector: (state: HydrationSafeState) => T,
    fallback: T
): T => {
    const hasHydrated = useHydrationSafeStore(state => state.hasHydrated);
    const value = useHydrationSafeStore(selector);

    // Retornar fallback hasta que hidrate
    return hasHydrated ? value : fallback;
};
