import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface SpatialElement {
    id: string;
    ref: React.RefObject<HTMLElement>;
    x: number;
    y: number;
    width: number;
    height: number;
    group?: string;
    layer?: number;
}

interface NavigationState {
    // Estado
    elements: Map<string, SpatialElement>;
    focusedId: string | null;
    focusedElementId: string | null; // Agregado para acceso externo
    lastActivity: number;
    isControlsVisible: boolean;

    // Acciones
    registerElement: (element: SpatialElement) => void;
    unregisterElement: (id: string) => void;
    setFocused: (id: string | null) => void;
    navigateDirection: (direction: 'up' | 'down' | 'left' | 'right') => void;
    selectFocused: () => void;
    updateActivity: () => void;
    setControlsVisible: (visible: boolean) => void;
}

export const useNavigationStore = create<NavigationState>()(
    devtools(
        (set, get) => ({
            // Estado inicial
            elements: new Map(),
            focusedId: null,
            focusedElementId: null,
            lastActivity: Date.now(),
            isControlsVisible: true,

            registerElement: (element) => {
                set((state) => {
                    const newElements = new Map(state.elements);
                    newElements.set(element.id, element);

                    // Si no hay foco aún, o si el foco actual no existe en el mapa, enfocar el nuevo
                    const currentFocusedExists = state.focusedId ? newElements.has(state.focusedId) : false;
                    const newFocusedId = currentFocusedExists ? state.focusedId : element.id;

                    return {
                        elements: newElements,
                        focusedId: newFocusedId,
                        focusedElementId: newFocusedId
                    };
                });
            },

            unregisterElement: (id) => {
                set((state) => {
                    const newElements = new Map(state.elements);
                    const removedElement = newElements.get(id);
                    newElements.delete(id);

                    let newFocusedId = state.focusedId;

                    // Si se desregistra el elemento enfocado, buscar el reemplazo más inteligente
                    if (state.focusedId === id && removedElement) {
                        let nearest: SpatialElement | null = null;
                        let minDistance = Infinity;

                        newElements.forEach((candidate) => {
                            // Buscar preferiblemente en la misma capa y grupo
                            const isSameLayer = candidate.layer === removedElement.layer;
                            const isSameGroup = candidate.group === removedElement.group;

                            const dx = candidate.x - removedElement.x;
                            const dy = candidate.y - removedElement.y;

                            // Preferir elementos cercanos al centro de la pantalla si perdemos el foco
                            const centerX = typeof window !== 'undefined' ? window.innerWidth / 2 : 960;
                            const absCenterX = Math.abs(candidate.x - centerX);

                            const distance = Math.sqrt(dx * dx + dy * dy) * (isSameLayer ? 1 : 4) * (isSameGroup ? 1 : 2) + absCenterX;

                            if (distance < minDistance) {
                                minDistance = distance;
                                nearest = candidate;
                            }
                        });

                        newFocusedId = (nearest as SpatialElement | null)?.id ?? (newElements.size > 0 ? Array.from(newElements.keys())[0] : null);
                    }

                    return {
                        elements: newElements,
                        focusedId: newFocusedId,
                        focusedElementId: newFocusedId
                    };
                });
            },

            setFocused: (id) => set({ focusedId: id, focusedElementId: id }),

            navigateDirection: (direction) => {
                const { elements, focusedId } = get();
                if (!focusedId || elements.size === 0) return;

                const currentElement = elements.get(focusedId);
                if (!currentElement || !currentElement.ref.current) return;

                const currentRect = currentElement.ref.current.getBoundingClientRect();
                const currentPos = {
                    x: currentRect.left + currentRect.width / 2,
                    y: currentRect.top + currentRect.height / 2,
                    layer: currentElement.layer ?? 0
                };

                // --- PASO 1: Filtrar candidatos por dirección y obtener posiciones REALES ---
                const candidates: { element: SpatialElement, x: number, y: number, layer: number }[] = [];
                elements.forEach((candidate) => {
                    if (candidate.id === focusedId || !candidate.ref.current) return;

                    const rect = candidate.ref.current.getBoundingClientRect();
                    const x = rect.left + rect.width / 2;
                    const y = rect.top + rect.height / 2;
                    const layer = candidate.layer ?? 0;

                    const dx = x - currentPos.x;
                    const dy = y - currentPos.y;

                    let isInDirection = false;
                    switch (direction) {
                        case 'up': isInDirection = dy < -5; break;
                        case 'down': isInDirection = dy > 5; break;
                        case 'left': isInDirection = dx < -5; break;
                        case 'right': isInDirection = dx > 5; break;
                    }

                    if (isInDirection) {
                        candidates.push({ element: candidate, x, y, layer });
                    }
                });

                if (candidates.length === 0) return;

                // --- PASO 2: Si es UP/DOWN, priorizar la CAPA más cercana ---
                let filteredCandidates = candidates;
                if (direction === 'up' || direction === 'down') {
                    const layers = candidates
                        .map(c => c.layer)
                        .filter(l => direction === 'up' ? l < currentPos.layer : l > currentPos.layer);

                    if (layers.length > 0) {
                        const targetLayer = direction === 'up' ? Math.max(...layers) : Math.min(...layers);
                        filteredCandidates = candidates.filter(c => c.layer === targetLayer);
                    }
                }

                // --- PASO 3: Encontrar el más cercano entre los filtrados ---
                let nearestId: string | null = null;
                let minDistance = Infinity;

                filteredCandidates.forEach((candidate) => {
                    const dx = candidate.x - currentPos.x;
                    const dy = candidate.y - currentPos.y;

                    // Centralidad absoluta (distancia al centro de la pantalla)
                    const centerX = typeof window !== 'undefined' ? window.innerWidth / 2 : 960;
                    const absCenterX = Math.abs(candidate.x - centerX);

                    let distance = 0;

                    if (direction === 'up' || direction === 'down') {
                        // REGLA DE ORO: Priorizar el alineamiento horizontal (centrado)
                        // Penalizamos absCenterX para que el foco caiga siempre al centro
                        // Reducimos dx vs dy para permitir saltos más diagonales entre buscador y carrusel
                        distance = Math.abs(dx * 5) + Math.abs(dy) + (absCenterX * 80);
                    } else {
                        // Priorizar alineamiento vertical en navegación horizontal
                        distance = Math.abs(dx) + Math.abs(dy * 2);
                    }

                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestId = candidate.element.id;
                    }
                });

                // Lógica de Wrapping Horizontal
                if (!nearestId && (direction === 'left' || direction === 'right')) {
                    const sameLayerElements = candidates.filter(c => c.layer === currentPos.layer);
                    if (sameLayerElements.length > 0) {
                        if (direction === 'right') {
                            nearestId = sameLayerElements.reduce((prev, curr) => (curr.x < prev.x ? curr : prev)).element.id;
                        } else {
                            nearestId = sameLayerElements.reduce((prev, curr) => (curr.x > prev.x ? curr : prev)).element.id;
                        }
                    }
                }

                if (nearestId) {
                    set({ focusedId: nearestId, focusedElementId: nearestId });
                }
            },

            selectFocused: () => {
                const { elements, focusedId } = get();
                if (!focusedId) return;

                const element = elements.get(focusedId);
                if (element?.ref.current) {
                    // Simular click en el elemento
                    const clickEvent = new MouseEvent('click', {
                        view: window,
                        bubbles: true,
                        cancelable: true
                    });
                    element.ref.current.dispatchEvent(clickEvent);
                }
            },

            updateActivity: () => {
                set({
                    lastActivity: Date.now(),
                    isControlsVisible: true
                });
            },

            setControlsVisible: (visible) => set({ isControlsVisible: visible })
        }),
        { name: 'NavigationStore' }
    )
);
