import { useEffect, useRef } from 'react';
import { useNavigationStore } from '@/store/useNavigationStore';

interface SpatialNavigationOptions {
    onFocus?: () => void;
    onBlur?: () => void;
    onSelect?: () => void;
    layer?: number;
    disabled?: boolean;
}

export const useSpatialNavigation = (
    elementId: string,
    group?: string,
    options?: SpatialNavigationOptions
) => {
    const elementRef = useRef<HTMLElement>(null);
    const { registerElement, unregisterElement, focusedId } = useNavigationStore();

    useEffect(() => {
        if (elementRef.current && !options?.disabled) {
            const rect = elementRef.current.getBoundingClientRect();
            registerElement({
                id: elementId,
                ref: elementRef,
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                width: rect.width,
                height: rect.height,
                group,
                layer: options?.layer
            });
        }

        if (options?.disabled) {
            unregisterElement(elementId);
        }

        return () => unregisterElement(elementId);
    }, [elementId, group, registerElement, unregisterElement, options?.disabled, options?.layer]);

    const isFocused = focusedId === elementId;

    useEffect(() => {
        if (isFocused) {
            options?.onFocus?.();
            elementRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            options?.onBlur?.();
        }
    }, [isFocused, options]);

    return {
        elementRef,
        isFocused,
        onSelect: options?.onSelect
    };
};
