import { useEffect, useCallback } from 'react';
import { useNavigationStore } from '@/store/useNavigationStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useVolumeStore } from '@/store/useVolumeStore';

// KeyCodes estándar de Smart TV
export const TV_KEYS = {
    ENTER: [13, 10252], // Samsung también usa 10252
    BACK: [8, 461, 10009], // Back/ESC en diferentes plataformas
    UP: [38],
    DOWN: [40],
    LEFT: [37],
    RIGHT: [39],
    PLAY_PAUSE: [415, 19, 179], // MediaPlayPause en diferentes TVs  
    VOLUME_UP: [447],
    VOLUME_DOWN: [448],
    MUTE: [449],
    RED: [403],
    GREEN: [404],
    YELLOW: [405],
    BLUE: [406]
} as const;

// Helper function para chequear keycodes
const isKeyCode = (keyCode: number, codes: readonly number[]): boolean => {
    return codes.includes(keyCode);
};

export const useRemoteControl = (enabled = true) => {
    const { navigateDirection, selectFocused, lastActivity, updateActivity, isControlsVisible } = useNavigationStore();
    const { togglePlayPause } = usePlayerStore();
    const { volume, setVolume, toggleMute } = useVolumeStore();

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!enabled) return;

        const keyCode = e.keyCode || e.which;

        // Actualizar timestamp de actividad
        updateActivity();

        // Si el foco está en un input o textarea, dejar que el navegador maneje las teclas estándar
        const activeElement = document.activeElement;
        const tag = activeElement?.tagName.toLowerCase();
        const isInputFocused = tag === 'input' || tag === 'textarea';

        if (isInputFocused) {
            // Permitir que Arriba/Abajo escapen del input para navegación espacial
            if (isKeyCode(keyCode, TV_KEYS.UP)) {
                navigateDirection('up');
                e.preventDefault();
                return;
            }
            if (isKeyCode(keyCode, TV_KEYS.DOWN)) {
                navigateDirection('down');
                e.preventDefault();
                return;
            }

            // Dejar pasar Enter para capturas locales y Left/Right para mover el cursor
            return;
        }

        // Navegación Direccional
        if (isKeyCode(keyCode, TV_KEYS.UP)) {
            e.preventDefault();
            navigateDirection('up');
        } else if (isKeyCode(keyCode, TV_KEYS.DOWN)) {
            e.preventDefault();
            navigateDirection('down');
        } else if (isKeyCode(keyCode, TV_KEYS.LEFT)) {
            e.preventDefault();
            navigateDirection('left');
        } else if (isKeyCode(keyCode, TV_KEYS.RIGHT)) {
            e.preventDefault();
            navigateDirection('right');
        }
        // Selección (Solo si los controles son visibles)
        else if (isKeyCode(keyCode, TV_KEYS.ENTER)) {
            e.preventDefault();
            if (isControlsVisible) {
                selectFocused();
            }
        }
        // Back
        else if (isKeyCode(keyCode, TV_KEYS.BACK)) {
            e.preventDefault();
            // Lógica de navegación hacia atrás (cerrar modales, etc.)
            window.history.back();
        }
        // Teclas de atajo multimedia
        else if (isKeyCode(keyCode, TV_KEYS.PLAY_PAUSE)) {
            e.preventDefault();
            togglePlayPause();
        }
        else if (isKeyCode(keyCode, TV_KEYS.VOLUME_UP) || e.key === 'VolumeUp' || e.key === '+') {
            e.preventDefault();
            updateActivity(); // Mostrar controles como feedback
            setVolume(Math.min(1, volume + 0.1));
        }
        else if (isKeyCode(keyCode, TV_KEYS.VOLUME_DOWN) || e.key === 'VolumeDown' || e.key === '-') {
            e.preventDefault();
            updateActivity(); // Mostrar controles como feedback
            setVolume(Math.max(0, volume - 0.1));
        }
        else if (isKeyCode(keyCode, TV_KEYS.MUTE) || e.key === 'VolumeMute') {
            e.preventDefault();
            updateActivity(); // Mostrar controles como feedback
            toggleMute();
        }
    }, [enabled, navigateDirection, selectFocused, updateActivity, isControlsVisible, volume, setVolume, togglePlayPause, toggleMute]);

    useEffect(() => {
        if (enabled) {
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [enabled, handleKeyDown]);

    return { lastActivity };
};
