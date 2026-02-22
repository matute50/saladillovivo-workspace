'use client';

import React from 'react';
import MediaPlayerWrapper from '@/components/MediaPlayerWrapper';
import { usePlayerStore } from '@/store/usePlayerStore';
import VideoPlayer from '../VideoPlayer';

const FullScreenTvPlayer = () => {
  const { currentVideo, isPlaying } = usePlayerStore();

  return (
    <div className='absolute inset-0 w-full h-full z-0'>
      <MediaPlayerWrapper>
        {currentVideo && (
          <VideoPlayer
            videoUrl={currentVideo.type === 'video' || currentVideo.type === 'stream' ? currentVideo.url : ""}
            imageUrl={currentVideo.type === 'image' ? currentVideo.imageSourceUrl : undefined}
            audioUrl={currentVideo.type === 'image' ? currentVideo.audioSourceUrl : undefined}
            autoplay={isPlaying}
            onClose={() => { }} // onClose is now a required prop for VideoPlayer. Add a no-op function.
          />
        )}
      </MediaPlayerWrapper>
    </div>
  );
};

export default FullScreenTvPlayer;
