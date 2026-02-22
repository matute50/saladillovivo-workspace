'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimationControls } from 'framer-motion';

interface NewsTickerProps {
  tickerTexts: string[];
}

const NewsTicker: React.FC<NewsTickerProps> = ({ tickerTexts }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(30);

  useEffect(() => {
    if (textRef.current && containerRef.current) {
      const textWidth = textRef.current.scrollWidth;
      const containerWidth = containerRef.current.offsetWidth;

      if (textWidth > 0 && containerWidth > 0) {
        // Calculate duration based on text length to keep speed consistent
        // Speed = distance / time. Let's aim for ~100px per second for comfortable reading
        // Total distance is textWidth + containerWidth
        const calculatedDuration = Math.max(20, (textWidth + containerWidth) / 80);
        setDuration(calculatedDuration);
      }
    }
  }, [tickerTexts]);

  const concatenatedTickerText = tickerTexts && tickerTexts.length > 0
    ? tickerTexts.join("  ---  ")
    : "Bienvenido a Saladillo Vivo - Manténgase informado.";

  if (!tickerTexts) {
    return (
      <div ref={containerRef} className="bg-background overflow-hidden relative h-5 flex items-center container mx-auto px-4 -mb-px">
        <div className="whitespace-nowrap h-full flex items-center">
          <p className="font-arial italic text-xs animate-pulse text-muted-foreground">
            Cargando últimas noticias...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="ticker-background overflow-hidden relative h-6 flex items-center container mx-auto px-0 ticker-container z-30 -mb-px"
    >
      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .ticker-text-wrapper {
          will-change: transform;
          animation-name: ticker-scroll;
          animation-timing-function: linear;
          animation-iteration-count: infinity;
        }
      `}</style>
      <div
        ref={textRef}
        className="ticker-text-wrapper whitespace-nowrap h-full flex items-center z-30"
        style={{
          animationDuration: `${duration}s`,
          animationIterationCount: 'infinite'
        }}
      >
        <p className="font-arial italic text-[12px] px-4 text-neutral-600 dark:text-neutral-300">
          {concatenatedTickerText}
        </p>
      </div>
    </div>
  );
};

export default React.memo(NewsTicker);