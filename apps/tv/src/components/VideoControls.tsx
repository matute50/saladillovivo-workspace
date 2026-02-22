'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useNewsStore } from '@/store/useNewsStore';
import { Play, Pause, VolumeX, Volume2, Volume1, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVolumeStore } from '@/store/useVolumeStore';
import { useDebounce } from '@/hooks/useDebounce';
import { Focusable } from '@/components/ui/Focusable';
import WeatherWidget from '@/components/ui/WeatherWidget';

interface VideoControlsProps {
  showControls: boolean;
  onSearchSubmit: (term: string) => void;
  isSearching?: boolean;
}

// ... interfaces

const VideoControls: React.FC<VideoControlsProps> = ({ showControls, onSearchSubmit, isSearching }) => {
  const { isPlaying, togglePlayPause } = usePlayerStore();
  const { volume, isMuted, toggleMute } = useVolumeStore();
  const { searchQuery } = useNewsStore();

  const [localQuery, setLocalQuery] = useState(searchQuery);
  const debouncedQuery = useDebounce(localQuery, 400);

  const inputRef = useRef<HTMLInputElement>(null);

  // Synchronize local state ONLY when the global query changes from outside (e.g. cleared)
  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  // Execute search when the debounced value changes
  useEffect(() => {
    // Only submit if debouncedQuery is different from current global searchQuery
    // This prevents re-triggering search if NewsContext already updated searchQuery
    // and also prevents empty search submission on initial render if searchQuery is empty
    if (debouncedQuery !== searchQuery) {
      // GUARD: If store was cleared (external reset) but our debouncer is still lagging with old text,
      // skip this cycle. Sync effect already updated localQuery, so debouncedQuery will catch up.
      if (searchQuery === '' && debouncedQuery !== '') {
        return;
      }
      onSearchSubmit(debouncedQuery);
    }
  }, [debouncedQuery, onSearchSubmit, searchQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalQuery(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Solo detener propagación para teclas que NO sean Arriba/Abajo 
    // para permitir que useRemoteControl maneje el escape del input
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') {
      e.stopPropagation();
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (localQuery.trim()) {
        onSearchSubmit(localQuery.trim());
      }
    }
  };

  const clearSearch = () => {
    setLocalQuery('');
    onSearchSubmit('');
  };

  if (!showControls) {
    return null;
  }

  return (
    <AnimatePresence>
      {showControls && (
        <motion.div
          className="flex items-center gap-10 w-full h-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center gap-4">
            <Focusable
              id="btn-play-pause"
              group="video-controls"
              onSelect={togglePlayPause}
              layer={0}
            >
              <button className="text-white transition-colors" aria-label="Play/Pause">
                {isPlaying ? <Pause size={28} fill="white" /> : <Play size={28} fill="white" />}
              </button>
            </Focusable>

            <div className="flex items-center gap-2">
              <Focusable
                id="btn-mute"
                group="video-controls"
                onSelect={toggleMute}
                layer={0}
              >
                <button className="text-white transition-colors" aria-label="Mute">
                  {isMuted ? <VolumeX size={24} fill="red" /> : (volume <= 0.5 ? <Volume1 size={24} /> : <Volume2 size={24} />)}
                </button>
              </Focusable>
            </div>
          </div>

          <div className="flex items-center gap-8">
            {/* Search Box */}
            <Focusable
              id="tv-search-input"
              group="video-controls"
              onFocus={() => {
                inputRef.current?.focus();
              }}
              onBlur={() => {
                inputRef.current?.blur();
              }}
              layer={isSearching ? 10 : 0}
            >
              {({ isFocused }) => (
                <div className={`relative flex items-center transition-all duration-300 ${isFocused ? 'scale-105' : ''}`}>
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Buscar..."
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`bg-gray-800 text-white rounded-md pl-3 pr-10 py-1 focus:outline-none w-72 border transition-all duration-300 ${isFocused ? 'border-white/40 bg-gray-700' : 'border-white/10'}`}
                    value={localQuery}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    maxLength={20}
                  />
                  {localQuery && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-3 flex items-center justify-center text-gray-500 hover:text-white"
                      aria-label="Limpiar búsqueda"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                  {!localQuery && <Search size={20} className={`absolute right-3 transition-colors ${isFocused ? 'text-white' : 'text-white/70'}`} />}
                </div>
              )}
            </Focusable>

            {/* Widget de Clima */}
            <WeatherWidget />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VideoControls;