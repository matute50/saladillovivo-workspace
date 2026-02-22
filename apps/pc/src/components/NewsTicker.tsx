'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimationControls } from 'framer-motion';

interface NewsTickerProps {
  tickerTexts: string[];
}

const NewsTicker: React.FC<NewsTickerProps> = ({ tickerTexts }) => {
  const [isPaused, setIsPaused] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const textRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimationControls();
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    const calculateWidths = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
      if (textRef.current) {
        setTextWidth(textRef.current.scrollWidth);
      }
    };

    calculateWidths(); // Initial calculation

    const resizeObserver = new ResizeObserver(calculateWidths);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    if (textRef.current) resizeObserver.observe(textRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [tickerTexts, animationKey]);

  useEffect(() => {
    if (textWidth > 0 && containerWidth > 0 && textWidth > containerWidth) {
      const duration = Math.max(40, (textWidth / containerWidth) * 15);

      if (isPaused) {
        controls.stop();
      } else {
        controls.start({
          x: [containerWidth, -textWidth],
          transition: {
            x: {
              repeat: Infinity,
              repeatType: 'loop',
              duration: duration,
              ease: 'linear',
            },
          },
        });
      }
    } else {
      // Si el texto no necesita scroll, lo dejamos estático
      controls.stop();
      controls.set({ x: 0 });
    }
  }, [isPaused, textWidth, containerWidth, controls, animationKey]);

  useEffect(() => {
    setAnimationKey(prevKey => prevKey + 1);
  }, [tickerTexts]);

  const concatenatedTickerText = tickerTexts && tickerTexts.length > 0
    ? tickerTexts.join("  ---  ")
    : "Bienvenido a Saladillo Vivo - Manténgase informado.";

  // Duplicar el contenido solo si el texto es más grande que el contenedor
  const needsScrolling = textWidth > containerWidth;
  const display_text = needsScrolling ? `${concatenatedTickerText}  ---  ${concatenatedTickerText}` : concatenatedTickerText;

  if (!tickerTexts) {
    return (
      <div ref={containerRef} className="bg-background overflow-hidden relative h-8 flex items-center container mx-auto px-4 -mb-px">
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
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <motion.div
        key={animationKey}
        ref={textRef}
        className="whitespace-nowrap h-full flex items-center z-30"
        animate={controls}
        initial={{ x: containerWidth }}
      >
        <p className="font-arial italic text-[12px] px-4 text-neutral-600 dark:text-neutral-300">
          {display_text}
        </p>
      </motion.div>
    </div>
  );
};

export default React.memo(NewsTicker);