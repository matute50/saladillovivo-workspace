---
name: state-management-architecture
description: Patrones de State Management con Zustand y Context API optimizados para Next.js. Prevención de errores de hidratación, performance patterns y debugging strategies.
---

# State Management Architecture v1.0

Sistema robusto de gestión de estado para aplicaciones Next.js usando Zustand como store principal y Context API para casos específicos. Incluye prevención de errores de hidratación y optimización de re-renders.

## 1. Arquitectura de State Management

### Filosofía de Separación de Concerns
```
┌─────────────────────────────────┐
│  SERVER STATE                   │
│  (API Data, DB Queries)         │
│  ↓ Zustand Stores               │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  CLIENT STATE                   │
│  (UI State, User Interactions)  │
│  ↓ Zustand Stores + Context     │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  EPHEMERAL STATE                │
│  (Form Inputs, Modals, Toasts)  │
│  ↓ useState / useReducer        │
└─────────────────────────────────┘
```

### Principios Core
1. **Zustand por defecto** - Para state global persistente
2. **Context solo cuando necesario** - Para state que requiere composición profunda
3. **useState para local** - Para state completamente local del componente
4. **Nunca mezclar server/client** - Evitar hidratación inconsistente

## 2. Zustand Store Patterns

### A. Store Base Pattern (Inspirado en tu useNewsStore)

```typescript
// src/store/template.store.ts
import { create } from 'zustand';

// ✅ PASO 1: Definir tipos claramente
interface DataItem {
  id: string;
  title: string;
  // ... otros campos
}

interface DataState {
  // Data
  items: DataItem[];
  filteredItems: DataItem[];
  
  // Loading states (granular)
  isLoading: boolean;
  isLoadingMore: boolean;
  
  // Error handling
  error: string | null;
  
  // Actions (verbos descriptivos)
  fetchItems: () => Promise<void>;
  addItem: (item: DataItem) => void;
  updateItem: (id: string, updates: Partial<DataItem>) => void;
  deleteItem: (id: string) => void;
  
  // Getters (funciones que computan datos)
  getItemById: (id: string) => DataItem | undefined;
  
  // Filters/Search
  setFilter: (filter: string) => void;
}

// ✅ PASO 2: Crear store con estado inicial limpio
export const useDataStore = create<DataState>((set, get) => ({
  // Estado inicial
  items: [],
  filteredItems: [],
  isLoading: false,
  isLoadingMore: false,
  error: null,

  // Actions
  fetchItems: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch('/api/items');
      const data = await response.json();
      
      set({ 
        items: data,
        filteredItems: data,
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false 
      });
    }
  },

  addItem: (item) => {
    set((state) => ({
      items: [...state.items, item],
      filteredItems: [...state.filteredItems, item]
    }));
  },

  updateItem: (id, updates) => {
    set((state) => ({
      items: state.items.map(item => 
        item.id === id ? { ...item, ...updates } : item
      ),
      filteredItems: state.filteredItems.map(item =>
        item.id === id ? { ...item, ...updates } : item
      )
    }));
  },

  deleteItem: (id) => {
    set((state) => ({
      items: state.items.filter(item => item.id !== id),
      filteredItems: state.filteredItems.filter(item => item.id !== id)
    }));
  },

  getItemById: (id) => {
    return get().items.find(item => item.id === id);
  },

  setFilter: (filter) => {
    const { items } = get();
    const filtered = filter
      ? items.filter(item => 
          item.title.toLowerCase().includes(filter.toLowerCase())
        )
      : items;
    
    set({ filteredItems: filtered });
  }
}));
```

### B. Hydration-Safe Store Pattern

**PROBLEMA:** Zustand puede causar errores de hidratación si el estado inicial difiere entre servidor/cliente.

**SOLUCIÓN:**
```typescript
// src/store/hydration-safe.store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface HydrationSafeState {
  // Cliente-only state
  hasHydrated: boolean;
  
  // State que puede persistir
  theme: 'light' | 'dark';
  volume: number;
  
  // Actions
  setHasHydrated: (state: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setVolume: (volume: number) => void;
}

export const useHydrationSafeStore = create<HydrationSafeState>()(
  persist(
    (set) => ({
      hasHydrated: false,
      theme: 'dark',
      volume: 0.7,

      setHasHydrated: (state) => set({ hasHydrated: state }),
      setTheme: (theme) => set({ theme }),
      setVolume: (volume) => set({ volume })
    }),
    {
      name: 'app-storage', // Nombre en localStorage
      storage: createJSONStorage(() => {
        // ⭐ CRÍTICO: Solo usar localStorage en cliente
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {}
          };
        }
        return localStorage;
      }),
      
      // ⭐ Callback cuando termina de hidratar
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      }
    }
  )
);

// ✅ Hook para usar solo después de hidratación
export const useHydratedStore = <T>(
  selector: (state: HydrationSafeState) => T,
  fallback: T
): T => {
  const hasHydrated = useHydrationSafeStore(state => state.hasHydrated);
  const value = useHydrationSafeStore(selector);
  
  // Retornar fallback hasta que hidrate
  return hasHydrated ? value : fallback;
};
```

**Uso en componentes:**
```tsx
'use client';

import { useHydratedStore, useHydrationSafeStore } from '@/store/hydration-safe.store';

export const ThemeToggle = () => {
  // ✅ Así se previene hidration mismatch
  const theme = useHydratedStore(
    state => state.theme,
    'dark' // Fallback para SSR
  );
  
  const setTheme = useHydrationSafeStore(state => state.setTheme);

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? '🌙' : '☀️'}
    </button>
  );
};
```

### C. Slice Pattern (Para stores grandes)

```typescript
// src/store/slices/news.slice.ts
export interface NewsSlice {
  allNews: Article[];
  featuredNews: Article[];
  isLoadingNews: boolean;
  fetchNews: () => Promise<void>;
}

export const createNewsSlice = (set, get) => ({
  allNews: [],
  featuredNews: [],
  isLoadingNews: false,
  
  fetchNews: async () => {
    set({ isLoadingNews: true });
    const data = await getArticlesForHome();
    set({ 
      allNews: data.allNews,
      featuredNews: data.allNews.filter(n => n.featureStatus === 'featured'),
      isLoadingNews: false
    });
  }
});

// src/store/slices/videos.slice.ts
export interface VideosSlice {
  allVideos: Video[];
  isLoadingVideos: boolean;
  fetchVideos: () => Promise<void>;
}

export const createVideosSlice = (set, get) => ({
  allVideos: [],
  isLoadingVideos: false,
  
  fetchVideos: async () => {
    set({ isLoadingVideos: true });
    const data = await getVideosForHome();
    set({ 
      allVideos: data.allVideos,
      isLoadingVideos: false
    });
  }
});

// src/store/useAppStore.ts (Store combinado)
import { create } from 'zustand';
import { createNewsSlice, NewsSlice } from './slices/news.slice';
import { createVideosSlice, VideosSlice } from './slices/videos.slice';

type AppState = NewsSlice & VideosSlice;

export const useAppStore = create<AppState>()((...args) => ({
  ...createNewsSlice(...args),
  ...createVideosSlice(...args)
}));
```

## 3. Context API Patterns (Solo cuando necesario)

### Cuándo usar Context vs Zustand

**✅ USA CONTEXT para:**
- Estado que solo vive en un subtree específico
- Props drilling de 3+ niveles
- Providers que wrappean rutas específicas

**❌ NO USES CONTEXT para:**
- Estado global de la app
- Estado que necesita performance extrema
- Estado que se actualiza frecuentemente

### Pattern: Context + Zustand Híbrido

```typescript
// src/context/VideoPlayerContext.tsx
'use client';

import { createContext, useContext, useRef, ReactNode } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';

interface VideoPlayerContextType {
  videoRef: React.RefObject<HTMLVideoElement>;
  slotARe: React.RefObject<HTMLVideoElement>;
  slotBRef: React.RefObject<HTMLVideoElement>;
}

const VideoPlayerContext = createContext<VideoPlayerContextType | null>(null);

// ✅ Provider que solo maneja refs (no causa re-renders)
export const VideoPlayerProvider = ({ children }: { children: ReactNode }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const slotARef = useRef<HTMLVideoElement>(null);
  const slotBRef = useRef<HTMLVideoElement>(null);

  // ⚠️ IMPORTANTE: No poner state reactivo aquí, solo refs/callbacks
  const value = {
    videoRef,
    slotARef,
    slotBRef
  };

  return (
    <VideoPlayerContext.Provider value={value}>
      {children}
    </VideoPlayerContext.Provider>
  );
};

// Hook de consumo
export const useVideoPlayer = () => {
  const context = useContext(VideoPlayerContext);
  if (!context) {
    throw new Error('useVideoPlayer must be used within VideoPlayerProvider');
  }
  return context;
};

// ✅ Estado reactivo va en Zustand
// src/store/usePlayerStore.ts
interface PlayerState {
  currentVideoId: string | null;
  isPlaying: boolean;
  volume: number;
  
  play: (videoId: string) => void;
  pause: () => void;
  setVolume: (volume: number) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentVideoId: null,
  isPlaying: false,
  volume: 0.7,
  
  play: (videoId) => set({ currentVideoId: videoId, isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  setVolume: (volume) => set({ volume })
}));
```

## 4. Performance Optimization Patterns

### A. Selector Pattern (Evitar re-renders innecesarios)

```typescript
// ❌ MAL: Causa re-render en CADA cambio del store
const VideoList = () => {
  const store = useNewsStore(); // Todo el objeto
  
  return store.galleryVideos.map(video => <VideoCard key={video.id} video={video} />);
};

// ✅ BIEN: Solo re-render cuando galleryVideos cambia
const VideoList = () => {
  const galleryVideos = useNewsStore(state => state.galleryVideos);
  
  return galleryVideos.map(video => <VideoCard key={video.id} video={video} />);
};

// ✅ MEJOR: Selector con comparación shallow
import { shallow } from 'zustand/shallow';

const VideoList = () => {
  const { galleryVideos, isLoadingVideos } = useNewsStore(
    state => ({ 
      galleryVideos: state.galleryVideos,
      isLoadingVideos: state.isLoadingVideos
    }),
    shallow // Solo re-render si estos campos específicos cambian
  );
  
  if (isLoadingVideos) return <Loader />;
  return galleryVideos.map(video => <VideoCard key={video.id} video={video} />);
};
```

### B. Computed Values Pattern

```typescript
// ❌ MAL: Computar en cada render
const NewsSection = () => {
  const allNews = useNewsStore(state => state.allNews);
  const featured = allNews.filter(n => n.featureStatus === 'featured'); // Recalcula siempre
  
  return <NewsList news={featured} />;
};

// ✅ BIEN: Pre-computar en el store
interface NewsState {
  allNews: Article[];
  featuredNews: Article[]; // ← Pre-computado
  
  fetchNews: () => Promise<void>;
}

export const useNewsStore = create<NewsState>((set) => ({
  allNews: [],
  featuredNews: [],
  
  fetchNews: async () => {
    const data = await getArticlesForHome();
    set({
      allNews: data.allNews,
      featuredNews: data.allNews.filter(n => n.featureStatus === 'featured') // Computar 1 vez
    });
  }
}));

// Uso simple
const NewsSection = () => {
  const featured = useNewsStore(state => state.featuredNews); // Ya filtrado
  return <NewsList news={featured} />;
};
```

### C. Devtools Integration

```typescript
// src/store/useNewsStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useNewsStore = create<NewsState>()(
  devtools(
    (set, get) => ({
      // ... tu store
    }),
    {
      name: 'NewsStore', // Nombre en DevTools
      enabled: process.env.NODE_ENV === 'development'
    }
  )
);
```

## 5. Debugging Strategies

### A. Action Logger Middleware

```typescript
// src/store/middleware/logger.ts
export const logger = (config) => (set, get, api) =>
  config(
    (...args) => {
      console.group('🔄 State Update');
      console.log('  Previous:', get());
      set(...args);
      console.log('  Next:', get());
      console.groupEnd();
    },
    get,
    api
  );

// Uso:
import { logger } from './middleware/logger';

export const useNewsStore = create<NewsState>()(
  logger((set, get) => ({
    // ... tu store
  }))
);
```

### B. State Snapshot Tool

```typescript
// src/lib/debug.ts
export const captureStateSnapshot = () => {
  const snapshot = {
    news: useNewsStore.getState(),
    player: usePlayerStore.getState(),
    navigation: useNavigationStore.getState(),
    timestamp: new Date().toISOString()
  };
  
  console.log('📸 State Snapshot:', snapshot);
  
  // Guardar en localStorage para debugging
  localStorage.setItem('last-state-snapshot', JSON.stringify(snapshot));
  
  return snapshot;
};

// Usar en errores
window.addEventListener('error', (event) => {
  console.error('💥 Error detected, capturing state...');
  captureStateSnapshot();
});
```

### C. React DevTools Profiler Integration

```tsx
// src/components/ProfiledComponent.tsx
import { Profiler, ProfilerOnRenderCallback } from 'react';

const onRenderCallback: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) => {
  if (actualDuration > 16) { // Más de 1 frame (60fps)
    console.warn(`⚠️ Slow render in ${id}:`, {
      phase,
      actualDuration: `${actualDuration}ms`,
      baseDuration: `${baseDuration}ms`
    });
  }
};

export const ProfiledNewsList = () => (
  <Profiler id="NewsList" onRender={onRenderCallback}>
    <NewsList />
  </Profiler>
);
```

## 6. Anti-Patterns (Qué evitar)

### ❌ Anti-Pattern 1: Mutación Directa
```typescript
// MAL
const addItem = (item) => {
  get().items.push(item); // ❌ Mutación directa
  set({ items: get().items });
};

// BIEN
const addItem = (item) => {
  set((state) => ({
    items: [...state.items, item] // ✅ Inmutabilidad
  }));
};
```

### ❌ Anti-Pattern 2: Estado Derivado Duplicado
```typescript
// MAL
interface State {
  items: Item[];
  itemCount: number; // ❌ Derivado de items.length
}

// BIEN
interface State {
  items: Item[];
  // itemCount se calcula on-demand con selector
}

const itemCount = useStore(state => state.items.length);
```

### ❌ Anti-Pattern 3: Fetch en Render
```typescript
// MAL
const Component = () => {
  const fetchData = useStore(state => state.fetchData);
  fetchData(); // ❌ Se ejecuta en cada render
  
  return <div>...</div>;
};

// BIEN
const Component = () => {
  const fetchData = useStore(state => state.fetchData);
  
  useEffect(() => {
    fetchData(); // ✅ Solo al montar
  }, []);
  
  return <div>...</div>;
};
```

### ❌ Anti-Pattern 4: Demasiados Stores
```typescript
// MAL: 20 stores diferentes para cosas relacionadas
useUserStore()
useUserPreferencesStore()
useUserSettingsStore()
useUserProfileStore()
// ...

// BIEN: Un store con slices
const user = useAppStore(state => state.user);
const preferences = useAppStore(state => state.preferences);
```

## 7. Migration Strategy (De tu código actual)

### Paso 1: Auditar Estado Actual
```bash
# Encontrar todos los stores
grep -r "create<.*>(" src/store/

# Encontrar todos los Context providers
grep -r "createContext" src/
```

### Paso 2: Consolidar Stores Relacionados
```typescript
// Antes: 3 stores separados
useNewsStore()
useVideoStore()
useTickerStore()

// Después: 1 store con mejor organización
useContentStore() // Con slices news/videos/ticker
```

### Paso 3: Eliminar Estado Redundante
```typescript
// Antes en useNewsStore.ts
const isDarkTheme = useNewsStore(state => state.isDarkTheme); // ❌ No relacionado con news

// Después: Mover a store de UI
const isDarkTheme = useUIStore(state => state.theme === 'dark');
```

### Paso 4: Agregar Middleware Progresivamente
```typescript
// Empezar con devtools en development
export const useNewsStore = create<NewsState>()(
  devtools(
    (set, get) => ({ /* ... */ }),
    { name: 'NewsStore', enabled: process.env.NODE_ENV === 'development' }
  )
);

// Luego agregar persist para datos que lo necesiten
export const usePreferencesStore = create<PreferencesState>()(
  persist(
    devtools(
      (set, get) => ({ /* ... */ }),
      { name: 'PreferencesStore' }
    ),
    { name: 'preferences-storage' }
  )
);
```

## 8. Testing Strategies

### Unit Testing Stores
```typescript
// src/store/__tests__/useNewsStore.test.ts
import { renderHook, act } from '@testing-library/react';
import { useNewsStore } from '../useNewsStore';

describe('useNewsStore', () => {
  beforeEach(() => {
    // Reset store antes de cada test
    useNewsStore.setState({
      allNews: [],
      featuredNews: [],
      isLoading: false
    });
  });

  it('should fetch news successfully', async () => {
    const { result } = renderHook(() => useNewsStore());
    
    await act(async () => {
      await result.current.fetchInitialData();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.allNews.length).toBeGreaterThan(0);
  });

  it('should filter featured news', () => {
    const mockNews = [
      { id: 1, title: 'News 1', featureStatus: 'featured' },
      { id: 2, title: 'News 2', featureStatus: null }
    ];

    act(() => {
      useNewsStore.setState({ allNews: mockNews });
    });

    const { result } = renderHook(() => 
      useNewsStore(state => state.featuredNews)
    );

    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe(1);
  });
});
```

---

## Checklist de Estado Saludable

- [ ] ✅ Stores organizados por dominio (news, player, navigation, UI)
- [ ] ✅ No hay estado duplicado entre stores
- [ ] ✅ Se usan selectores en vez de todo el store
- [ ] ✅ Estado derivado se computa en el store, no en componentes
- [ ] ✅ Hydration-safe para estado persistido
- [ ] ✅ DevTools habilitado en development
- [ ] ✅ No hay mutaciones directas del estado
- [ ] ✅ Context solo para refs y callbacks
- [ ] ✅ Tests unitarios para stores críticos
- [ ] ✅ Performance monitoreada con Profiler

---

**Versión del Skill:** v1.0  
**Última actualización:** 2026-02-15  
**Proyecto:** Saladillo Vivo TV
