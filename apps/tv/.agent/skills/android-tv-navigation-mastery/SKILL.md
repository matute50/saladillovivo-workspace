---
name: android-tv-navigation-mastery
description: Domina la navegación espacial en Android TV con focus management, KeyEvent handling optimizado, debouncing strategies y architectural patterns para UIs complejas.
---

# Android TV Navigation Mastery v1.0

Sistema completo de navegación espacial para Android TV usando control remoto. Incluye patrones de focus management, estrategias de debouncing y arquitectura escalable para aplicaciones Next.js.

## 1. Fundamentos de Navegación Espacial

### Concepto Core
A diferencia de aplicaciones web estándar (mouse/touch), Android TV requiere:
- **Navegación D-Pad**: Arriba, Abajo, Izquierda, Derecha
- **Focus Management**: Un elemento debe tener focus visible en todo momento
- **KeyEvent Handling**: Interceptar y procesar eventos del control remoto
- **Visual Feedback**: Indicadores claros de qué está seleccionado

### Arquitectura de 3 Capas
```
┌──────────────────────────────────┐
│  1. Global KeyEvent Handler      │ ← Hook centralizado (useRemoteControl)
│     (useRemoteControl.ts)         │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│  2. Navigation State Manager     │ ← Zustand store (useNavigationStore)
│     (useNavigationStore.ts)       │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│  3. Focusable Components         │ ← Componentes con data-focusable
│     (TvContentRail, VideoCard)    │
└──────────────────────────────────┘
```

## 2. Navigation Store Pattern

### A. Estructura del Store
```typescript
// src/store/useNavigationStore.ts
import { create } from 'zustand';

interface FocusableElement {
  id: string;
  element: HTMLElement;
  category?: string;
  index?: number;
}

interface NavigationState {
  // Focus State
  focusedId: string | null;
  focusedCategory: string | null;
  focusableElements: Map<string, FocusableElement>;
  
  // Controls Visibility
  isControlsVisible: boolean;
  lastActivity: number;
  
  // Actions
  registerFocusable: (id: string, element: HTMLElement, metadata?: object) => void;
  unregisterFocusable: (id: string) => void;
  setFocus: (id: string) => void;
  navigateDirection: (direction: 'up' | 'down' | 'left' | 'right') => void;
  selectFocused: () => void;
  updateActivity: () => void;
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  focusedId: null,
  focusedCategory: null,
  focusableElements: new Map(),
  isControlsVisible: true,
  lastActivity: Date.now(),

  registerFocusable: (id, element, metadata = {}) => {
    const { focusableElements } = get();
    focusableElements.set(id, { id, element, ...metadata });
    set({ focusableElements: new Map(focusableElements) });
  },

  unregisterFocusable: (id) => {
    const { focusableElements, focusedId } = get();
    focusableElements.delete(id);
    
    // Si el elemento eliminado tenía focus, mover a otro
    if (focusedId === id) {
      const firstElement = Array.from(focusableElements.values())[0];
      if (firstElement) {
        get().setFocus(firstElement.id);
      } else {
        set({ focusedId: null });
      }
    }
    
    set({ focusableElements: new Map(focusableElements) });
  },

  setFocus: (id) => {
    const { focusableElements } = get();
    const element = focusableElements.get(id);
    
    if (!element) return;

    // Blur anterior
    const prevFocused = get().focusedId;
    if (prevFocused) {
      const prevElement = focusableElements.get(prevFocused);
      prevElement?.element.classList.remove('tv-focused');
    }

    // Focus nuevo
    element.element.classList.add('tv-focused');
    element.element.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest'
    });

    set({ 
      focusedId: id,
      focusedCategory: element.category || null
    });
  },

  navigateDirection: (direction) => {
    const { focusedId, focusableElements } = get();
    
    if (!focusedId) {
      // Si no hay focus, tomar el primer elemento
      const first = Array.from(focusableElements.values())[0];
      if (first) get().setFocus(first.id);
      return;
    }

    const current = focusableElements.get(focusedId);
    if (!current) return;

    // Calcular siguiente elemento según dirección
    const next = findNextElement(current, direction, focusableElements);
    if (next) get().setFocus(next.id);
  },

  selectFocused: () => {
    const { focusedId, focusableElements } = get();
    if (!focusedId) return;

    const element = focusableElements.get(focusedId);
    if (element) {
      // Disparar click en el elemento
      element.element.click();
    }
  },

  updateActivity: () => {
    set({ 
      lastActivity: Date.now(),
      isControlsVisible: true
    });
  }
}));

/**
 * Encuentra el siguiente elemento según la dirección
 */
function findNextElement(
  current: FocusableElement,
  direction: 'up' | 'down' | 'left' | 'right',
  elements: Map<string, FocusableElement>
): FocusableElement | null {
  const currentRect = current.element.getBoundingClientRect();
  const allElements = Array.from(elements.values());
  
  // Filtrar elementos en la dirección correcta
  const candidates = allElements.filter(el => {
    const rect = el.element.getBoundingClientRect();
    
    switch (direction) {
      case 'up':
        return rect.bottom <= currentRect.top;
      case 'down':
        return rect.top >= currentRect.bottom;
      case 'left':
        return rect.right <= currentRect.left;
      case 'right':
        return rect.left >= currentRect.right;
    }
  });

  if (candidates.length === 0) return null;

  // Encontrar el más cercano usando distancia euclidiana
  const nearest = candidates.reduce((closest, candidate) => {
    const candidateRect = candidate.element.getBoundingClientRect();
    const closestRect = closest.element.getBoundingClientRect();
    
    const candidateDistance = getDistance(currentRect, candidateRect, direction);
    const closestDistance = getDistance(currentRect, closestRect, direction);
    
    return candidateDistance < closestDistance ? candidate : closest;
  });

  return nearest;
}

/**
 * Calcula distancia ponderada según dirección
 */
function getDistance(
  from: DOMRect,
  to: DOMRect,
  direction: 'up' | 'down' | 'left' | 'right'
): number {
  const fromCenterX = from.left + from.width / 2;
  const fromCenterY = from.top + from.height / 2;
  const toCenterX = to.left + to.width / 2;
  const toCenterY = to.top + to.height / 2;

  // Distancia euclidiana con peso en el eje principal
  const dx = toCenterX - fromCenterX;
  const dy = toCenterY - fromCenterY;

  // Penalizar movimientos no alineados en el eje perpendicular
  const axisPenalty = (direction === 'up' || direction === 'down') 
    ? Math.abs(dx) * 2  // Penalizar desalineación horizontal
    : Math.abs(dy) * 2; // Penalizar desalineación vertical

  return Math.sqrt(dx * dx + dy * dy) + axisPenalty;
}
```

## 3. Remote Control Hook Pattern

### Mejoras sobre tu implementación actual:

```typescript
// src/hooks/useRemoteControl.ts (VERSIÓN MEJORADA)
import { useEffect, useCallback, useRef } from 'react';
import { useNavigationStore } from '@/store/useNavigationStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useVolumeStore } from '@/store/useVolumeStore';

export const TV_KEYS = {
  ENTER: [13, 10252],
  BACK: [8, 461, 10009],
  UP: [38],
  DOWN: [40],
  LEFT: [37],
  RIGHT: [39],
  PLAY_PAUSE: [415, 19, 179],
  VOLUME_UP: [447],
  VOLUME_DOWN: [448],
  MUTE: [449],
  RED: [403],
  GREEN: [404],
  YELLOW: [405],
  BLUE: [406]
} as const;

const isKeyCode = (keyCode: number, codes: readonly number[]): boolean => {
  return codes.includes(keyCode);
};

interface RemoteControlOptions {
  enabled?: boolean;
  debounceMs?: number; // ⭐ NUEVO: Debouncing configurable
  enableRepeat?: boolean; // ⭐ NUEVO: Permitir key-repeat
}

export const useRemoteControl = ({
  enabled = true,
  debounceMs = 150,
  enableRepeat = false
}: RemoteControlOptions = {}) => {
  const navigationStore = useNavigationStore();
  const { togglePlayPause } = usePlayerStore();
  const { volume, setVolume, toggleMute } = useVolumeStore();
  
  // ⭐ NUEVO: Debouncing state
  const lastKeyTime = useRef<Record<string, number>>({});
  const repeatTimer = useRef<NodeJS.Timeout | null>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    const keyCode = e.keyCode || e.which;
    const now = Date.now();
    const keyIdentifier = `${keyCode}`;

    // ⭐ DEBOUNCING: Ignorar keys muy rápidas
    if (!enableRepeat && lastKeyTime.current[keyIdentifier]) {
      const timeSinceLastPress = now - lastKeyTime.current[keyIdentifier];
      if (timeSinceLastPress < debounceMs) {
        e.preventDefault();
        return;
      }
    }

    lastKeyTime.current[keyIdentifier] = now;
    navigationStore.updateActivity();

    // Detectar si focus está en input/textarea
    const activeElement = document.activeElement;
    const tag = activeElement?.tagName.toLowerCase();
    const isInputFocused = tag === 'input' || tag === 'textarea';

    // ⭐ MEJORA: Permitir escape con UP/DOWN desde inputs
    if (isInputFocused) {
      if (isKeyCode(keyCode, TV_KEYS.UP) || isKeyCode(keyCode, TV_KEYS.DOWN)) {
        // Blur el input y mover focus a navegación espacial
        (activeElement as HTMLElement)?.blur();
        navigationStore.navigateDirection(
          isKeyCode(keyCode, TV_KEYS.UP) ? 'up' : 'down'
        );
        e.preventDefault();
        return;
      }
      // Dejar que el input maneje otras teclas
      return;
    }

    // ⭐ NAVEGACIÓN DIRECCIONAL
    if (isKeyCode(keyCode, TV_KEYS.UP)) {
      e.preventDefault();
      navigationStore.navigateDirection('up');
    } else if (isKeyCode(keyCode, TV_KEYS.DOWN)) {
      e.preventDefault();
      navigationStore.navigateDirection('down');
    } else if (isKeyCode(keyCode, TV_KEYS.LEFT)) {
      e.preventDefault();
      navigationStore.navigateDirection('left');
    } else if (isKeyCode(keyCode, TV_KEYS.RIGHT)) {
      e.preventDefault();
      navigationStore.navigateDirection('right');
    }
    // ⭐ SELECCIÓN
    else if (isKeyCode(keyCode, TV_KEYS.ENTER)) {
      e.preventDefault();
      navigationStore.selectFocused();
    }
    // ⭐ BACK (con lógica mejorada)
    else if (isKeyCode(keyCode, TV_KEYS.BACK)) {
      e.preventDefault();
      handleBackNavigation();
    }
    // ⭐ MULTIMEDIA
    else if (isKeyCode(keyCode, TV_KEYS.PLAY_PAUSE)) {
      e.preventDefault();
      togglePlayPause();
    }
    else if (isKeyCode(keyCode, TV_KEYS.VOLUME_UP)) {
      e.preventDefault();
      setVolume(Math.min(1, volume + 0.1));
    }
    else if (isKeyCode(keyCode, TV_KEYS.VOLUME_DOWN)) {
      e.preventDefault();
      setVolume(Math.max(0, volume - 0.1));
    }
    else if (isKeyCode(keyCode, TV_KEYS.MUTE)) {
      e.preventDefault();
      toggleMute();
    }
  }, [enabled, debounceMs, enableRepeat, navigationStore, volume, setVolume, togglePlayPause, toggleMute]);

  // ⭐ NUEVO: Lógica de navegación BACK mejorada
  const handleBackNavigation = () => {
    // Prioridad de cierre:
    // 1. Modales abiertos
    // 2. Búsqueda activa
    // 3. Navegación de página

    // Ejemplo: Cerrar búsqueda si está activa
    const { isSearching, setSearchQuery } = useNewsStore.getState();
    if (isSearching) {
      setSearchQuery('');
      return;
    }

    // Si no hay nada especial, volver en historial
    if (window.history.length > 1) {
      window.history.back();
    }
  };

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        if (repeatTimer.current) clearTimeout(repeatTimer.current);
      };
    }
  }, [enabled, handleKeyDown]);

  return {
    lastActivity: navigationStore.lastActivity,
    isControlsVisible: navigationStore.isControlsVisible
  };
};
```

## 4. Focusable Component Pattern

### Hook para registrar elementos
```typescript
// src/hooks/useFocusable.ts
import { useEffect, useRef } from 'react';
import { useNavigationStore } from '@/store/useNavigationStore';

interface UseFocusableOptions {
  id: string;
  category?: string;
  index?: number;
  onSelect?: () => void;
  autoFocus?: boolean;
}

export const useFocusable = <T extends HTMLElement = HTMLDivElement>({
  id,
  category,
  index,
  onSelect,
  autoFocus = false
}: UseFocusableOptions) => {
  const ref = useRef<T>(null);
  const { registerFocusable, unregisterFocusable, setFocus, focusedId } = useNavigationStore();

  useEffect(() => {
    if (!ref.current) return;

    // Registrar elemento
    registerFocusable(id, ref.current, { category, index });

    // Auto-focus si es requerido
    if (autoFocus) {
      setFocus(id);
    }

    // Cleanup al desmontar
    return () => unregisterFocusable(id);
  }, [id, category, index]);

  // Manejar click (para selección manual)
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleClick = () => {
      setFocus(id);
      onSelect?.();
    };

    element.addEventListener('click', handleClick);
    return () => element.removeEventListener('click', handleClick);
  }, [id, onSelect]);

  return {
    ref,
    isFocused: focusedId === id,
    focusProps: {
      'data-focusable': 'true',
      'data-focus-id': id,
      'data-focus-category': category,
      tabIndex: -1 // Evitar focus nativo del navegador
    }
  };
};
```

### Ejemplo de uso en componente
```tsx
// src/components/tv/VideoCard.tsx
import { useFocusable } from '@/hooks/useFocusable';

interface VideoCardProps {
  video: Video;
  category: string;
  index: number;
  onPlay: (video: Video) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  category,
  index,
  onPlay
}) => {
  const { ref, isFocused, focusProps } = useFocusable({
    id: `video-${category}-${index}`,
    category,
    index,
    onSelect: () => onPlay(video),
    autoFocus: category === 'featured' && index === 0 // ⭐ Auto-focus en primer destacado
  });

  return (
    <div
      ref={ref}
      {...focusProps}
      className={cn(
        'video-card transition-all duration-200',
        isFocused && 'tv-focused scale-110 ring-4 ring-red-500 z-10'
      )}
    >
      <img src={video.thumbnail} alt={video.title} />
      <h3>{video.title}</h3>
    </div>
  );
};
```

## 5. Styling Patterns

### Global CSS para Focus States
```css
/* src/styles/tv-navigation.css */

/* Estado base de focusable */
[data-focusable="true"] {
  outline: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

/* Estado focused */
.tv-focused {
  transform: scale(1.1);
  z-index: 10;
  box-shadow: 
    0 0 0 4px rgb(220 38 38),     /* Ring rojo */
    0 10px 30px rgba(0, 0, 0, 0.5); /* Sombra profunda */
}

/* Focused con animación de pulso (opcional) */
.tv-focused::after {
  content: '';
  position: absolute;
  inset: -8px;
  border-radius: inherit;
  border: 2px solid rgb(220 38 38);
  animation: focus-pulse 2s ease-in-out infinite;
  pointer-events: none;
}

@keyframes focus-pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.05);
  }
}

/* Variantes por categoría */
[data-focus-category="video"] .tv-focused {
  --focus-color: rgb(220 38 38); /* Rojo */
}

[data-focus-category="news"] .tv-focused {
  --focus-color: rgb(59 130 246); /* Azul */
}

[data-focus-category="controls"] .tv-focused {
  --focus-color: rgb(34 197 94); /* Verde */
}
```

## 6. Advanced Patterns

### A. Grid Navigation (Videos en cuadrícula)
```typescript
// Adaptación para grids con posiciones calculadas
function findNextInGrid(
  current: FocusableElement,
  direction: 'up' | 'down' | 'left' | 'right',
  elements: Map<string, FocusableElement>,
  columns: number
): FocusableElement | null {
  const currentIndex = current.index || 0;
  const allInCategory = Array.from(elements.values())
    .filter(el => el.category === current.category)
    .sort((a, b) => (a.index || 0) - (b.index || 0));

  let targetIndex: number;

  switch (direction) {
    case 'up':
      targetIndex = currentIndex - columns;
      break;
    case 'down':
      targetIndex = currentIndex + columns;
      break;
    case 'left':
      targetIndex = currentIndex - 1;
      break;
    case 'right':
      targetIndex = currentIndex + 1;
      break;
  }

  return allInCategory.find(el => el.index === targetIndex) || null;
}
```

### B. Circular Navigation (Sin salir de categoría)
```typescript
function navigateCircular(
  current: FocusableElement,
  direction: 'left' | 'right',
  elements: Map<string, FocusableElement>
): FocusableElement | null {
  const sameCategory = Array.from(elements.values())
    .filter(el => el.category === current.category)
    .sort((a, b) => (a.index || 0) - (b.index || 0));

  const currentIndexInCategory = sameCategory.findIndex(el => el.id === current.id);
  
  let nextIndex: number;
  if (direction === 'right') {
    nextIndex = (currentIndexInCategory + 1) % sameCategory.length; // Wrap around
  } else {
    nextIndex = (currentIndexInCategory - 1 + sameCategory.length) % sameCategory.length;
  }

  return sameCategory[nextIndex];
}
```

### C. Auto-Hide Controls
```typescript
// src/hooks/useAutoHideControls.ts
import { useEffect } from 'react';
import { useNavigationStore } from '@/store/useNavigationStore';

export const useAutoHideControls = (timeoutMs = 5000) => {
  const { lastActivity, isControlsVisible } = useNavigationStore();

  useEffect(() => {
    const checkInactivity = () => {
      const inactiveDuration = Date.now() - lastActivity;
      if (inactiveDuration > timeoutMs && isControlsVisible) {
        useNavigationStore.setState({ isControlsVisible: false });
      }
    };

    const interval = setInterval(checkInactivity, 1000);
    return () => clearInterval(interval);
  }, [lastActivity, timeoutMs, isControlsVisible]);
};
```

## 7. Troubleshooting

### Problema: Focus se pierde al cambiar de categoría
**Solución:** Implementar focus restoration
```typescript
const { focusedCategory } = useNavigationStore();

useEffect(() => {
  // Guardar última posición por categoría
  const lastFocusMap = JSON.parse(
    sessionStorage.getItem('lastFocus') || '{}'
  );
  
  if (focusedCategory && focusableElements.size > 0) {
    lastFocusMap[focusedCategory] = focusedId;
    sessionStorage.setItem('lastFocus', JSON.stringify(lastFocusMap));
  }
}, [focusedId, focusedCategory]);
```

### Problema: Navegación se "traba" en elementos ocultos
**Solución:** Filtrar elementos no visibles
```typescript
const isElementVisible = (element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect();
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    window.getComputedStyle(element).visibility !== 'hidden' &&
    window.getComputedStyle(element).display !== 'none'
  );
};

// Usar en findNextElement
const candidates = allElements.filter(el => 
  isElementVisible(el.element) && /* resto de lógica */
);
```

### Problema: Scroll no sigue al focus
**Solución:** Mejorar scrollIntoView
```typescript
element.element.scrollIntoView({
  behavior: 'smooth',
  block: 'center', // Centrar verticalmente
  inline: 'center' // Centrar horizontalmente
});

// O usar scroll manual para más control
const container = element.element.closest('[data-scroll-container]');
if (container) {
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.element.getBoundingClientRect();
  
  const scrollTop = elementRect.top - containerRect.top - (containerRect.height / 2) + (elementRect.height / 2);
  container.scrollTo({ top: scrollTop, behavior: 'smooth' });
}
```

---

## Checklist de Implementación

- [ ] ✅ Store de navegación creado (`useNavigationStore.ts`)
- [ ] ✅ Hook de control remoto implementado (`useRemoteControl.ts`)
- [ ] ✅ Hook de elementos focusables (`useFocusable.ts`)
- [ ] ✅ Estilos globales de focus (`tv-navigation.css`)
- [ ] ✅ Componentes adaptados con data-focusable
- [ ] ✅ Auto-focus en primer elemento visible
- [ ] ✅ Debouncing en navegación implementado
- [ ] ✅ Back navigation con lógica multi-nivel
- [ ] ✅ Visual feedback claro en todos los estados
- [ ] ✅ Probado en Android TV físico

---

**Versión del Skill:** v1.0  
**Última actualización:** 2026-02-15  
**Proyecto:** Saladillo Vivo TV
