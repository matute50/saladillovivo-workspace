import { useEffect, useRef } from 'react';
import { useNavigationStore } from '@/store/useNavigationStore';

/**
 * useFocusable Hook
 * Registra un elemento en el sistema de navegación espacial
 * Basado en Android TV Navigation Mastery skill
 */

export interface UseFocusableOptions {
    id: string;
    group?: string;
    layer?: number;
    onSelect?: () => void;
    autoFocus?: boolean;
    enabled?: boolean;
}

export const useFocusable = <T extends HTMLElement = HTMLDivElement>({
    id,
    group,
    layer = 0,
    onSelect,
    autoFocus = false,
    enabled = true
}: UseFocusableOptions) => {
    const ref = useRef<T>(null);
    const { registerElement, unregisterElement, setFocused, focusedId } = useNavigationStore();

    useEffect(() => {
        if (!enabled || !ref.current) return;

        const element = ref.current;
        const rect = element.getBoundingClientRect();

        // Registrar elemento en el store
        registerElement({
            id,
            ref: ref as React.RefObject<HTMLElement>,
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            width: rect.width,
            height: rect.height,
            group,
            layer
        });

        // Auto-focus si es requerido
        if (autoFocus) {
            setFocused(id);
        }

        // Cleanup al desmontar
        return () => {
            unregisterElement(id);
        };
    }, [id, group, layer, autoFocus, enabled, registerElement, unregisterElement, setFocused]);

    // Manejar click manual
    useEffect(() => {
        const element = ref.current;
        if (!element || !enabled) return;

        const handleClick = () => {
            setFocused(id);
            onSelect?.();
        };

        element.addEventListener('click', handleClick);
        return () => element.removeEventListener('click', handleClick);
    }, [id, onSelect, enabled, setFocused]);

    const isFocused = focusedId === id;

    return {
        ref,
        isFocused,

        // Props to spread on your element
        focusProps: {
            'data-focusable': 'true',
            'data-focus-id': id,
            'data-focus-group': group,
            'data-focus-layer': layer,
            tabIndex: -1, // Evitar focus nativo del navegador
            className: isFocused ? 'tv-focused' : ''
        }
    };
};
