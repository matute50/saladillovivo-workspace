'use client';

import React, { useState, useEffect } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useNewsStore } from '@/store/useNewsStore'; // Use news store
import { Play, Pause, Maximize, Minimize, VolumeX, Volume2, Volume1, Search, Newspaper, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVolumeStore } from '@/store/useVolumeStore'; // Use volume store
import { useDebounce } from '@/hooks/useDebounce'; // Import useDebounce hook


interface VideoControlsProps {
  showControls: boolean;
  onToggleFullScreen: () => void;
  isFullScreen: boolean;
  onSwitchToDailyMode: () => void; // New prop for switching to daily mode
  onSearchSubmit: (term: string) => void; // New prop for submitting search
}



// ... interfaces

const VideoControls: React.FC<VideoControlsProps> = ({ showControls, onToggleFullScreen, isFullScreen, onSwitchToDailyMode, onSearchSubmit }) => {
  const { isPlaying, togglePlayPause } = usePlayerStore();
  const { volume, isMuted, setVolume, toggleMute } = useVolumeStore();
  const { searchQuery } = useNewsStore();



  const [localQuery, setLocalQuery] = useState(searchQuery);
  const debouncedQuery = useDebounce(localQuery, 400);

  // Synchronize local state if the global query clears from elsewhere
  useEffect(() => {
    if (searchQuery !== localQuery) {
      setLocalQuery(searchQuery);
    }
  }, [searchQuery, localQuery]);

  // Execute search when the debounced value changes
  useEffect(() => {
    // Only submit if debouncedQuery is different from current global searchQuery
    // This prevents re-triggering search if NewsContext already updated searchQuery
    // and also prevents empty search submission on initial render if searchQuery is empty
    if (debouncedQuery !== searchQuery) {
      onSearchSubmit(debouncedQuery);
    }
  }, [debouncedQuery, onSearchSubmit, searchQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalQuery(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
          className="flex items-center justify-between w-full h-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center gap-4">
            <button onClick={togglePlayPause} className="text-white transition-colors">
              {isPlaying ? <Pause size={28} fill="white" /> : <Play size={28} fill="white" />}
            </button>

            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="text-white transition-colors">
                {isMuted ? <VolumeX size={24} fill="red" /> : (volume <= 0.5 ? <Volume1 size={24} /> : <Volume2 size={24} />)}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                onInput={(e) => setVolume(parseFloat((e.target as HTMLInputElement).value))}
                className="
                  w-20 h-1
                  appearance-none bg-white/30 rounded-full cursor-pointer
                  accent-[#6699ff] hover:accent-[#4d88ff]
                "
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Search Box */}
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Buscar..."
                className="bg-black/20 text-white rounded-md pl-3 pr-10 py-1 focus:outline-none focus:ring-1 focus:ring-white/50"
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
              {!localQuery && <Search size={20} className="absolute right-3 text-white/70" />}
            </div>



            <button onClick={onSwitchToDailyMode} className="text-white transition-colors">
              <Newspaper size={24} />
            </button>
            <button onClick={onToggleFullScreen} className="text-white transition-colors">
              {isFullScreen ? <Minimize size={24} /> : <Maximize size={24} />}
            </button>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VideoControls;