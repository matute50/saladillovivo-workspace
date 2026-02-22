'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Share2, Tv, Newspaper, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SearchBar from '@/components/ui/SearchBar';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useNewsStore } from '@/store/useNewsStore';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

const WeatherWidget = dynamic(() => import('@/components/ui/WeatherWidget'), {
  loading: () => <div className="w-[100px] h-8 bg-black/5 dark:bg-white/5 rounded-md animate-pulse"></div>,
  ssr: false
});
import { useNotifications } from '@/hooks/useNotifications';
import { Bell } from 'lucide-react';

import { usePwaInstall } from '@/hooks/usePwaInstall';
import { MonitorDown } from 'lucide-react';

interface InstallPwaButtonProps {
  isDarkTheme: boolean;
}

const InstallPwaButton = ({ isDarkTheme }: InstallPwaButtonProps) => {
  const { isInstallable, promptInstall } = usePwaInstall();
  // We use the store to detect the theme, assuming Header keeps it synced


  if (!isInstallable) return null;

  // Animation Colors Configuration are now handled via CSS or Tailwind if static
  const colorClass = isDarkTheme ? 'text-white' : 'text-black';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={promptInstall}
      className="hover:bg-black/10 dark:hover:bg-white/10 font-bold"
      title="Instalar App en PC"
    >
      <div className="animate-bounce-subtle">
        <MonitorDown size={24} className={cn("drop-shadow-lg", colorClass, "hover:text-red-500 transition-colors")} aria-hidden="true" />
      </div>
    </Button>
  );
};

const NotificationButton = () => {
  const { requestPermission } = useNotifications();
  const [hasUnread, setHasUnread] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClick = () => {
    requestPermission();
    setHasUnread(false);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className="text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10 relative"
      title="Notificaciones"
    >
      <Bell size={20} aria-hidden="true" />
      {mounted && hasUnread && (
        <span
          className="absolute bottom-2 right-2 w-[9px] h-[9px] bg-red-500 rounded-full border border-white dark:border-black animate-bounce-subtle"
        />
      )}
    </Button>
  );
};

const Header = () => {
  const { viewMode, setViewMode } = usePlayerStore();
  const setIsDarkThemeGlobal = useNewsStore(state => state.setIsDarkTheme);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      const initialTheme = savedTheme === 'dark';
      setIsDarkTheme(initialTheme);
      if (initialTheme) {
        document.documentElement.classList.add('dark');
        setIsDarkThemeGlobal(true);
      } else {
        document.documentElement.classList.remove('dark');
        setIsDarkThemeGlobal(false);
      }
    }
  }, [setIsDarkThemeGlobal]);

  const toggleTheme = () => {
    const newThemeState = !isDarkTheme;
    setIsDarkTheme(newThemeState);
    if (newThemeState) {
      document.documentElement.classList.add('dark');
      setIsDarkThemeGlobal(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDarkThemeGlobal(false);
    }
    localStorage.setItem('theme', newThemeState ? 'dark' : 'light');
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      const whatsappUrl = 'https://wa.me/?text=Descubr%C3%AD%20Saladillo%20Vivo.com,%20mucho%20m%C3%A1s%20que%20noticias';
      window.open(whatsappUrl, '_blank');
    }
  };

  const banerClaroOriginal = "https://storage.googleapis.com/hostinger-horizons-assets-prod/77d159f1-0d45-4b01-ba42-c8ca9cbd0d70/e9eb6580b7ad5742826daaa5df2b592d.png";
  const banerOscuroOriginal = "https://storage.googleapis.com/hostinger-horizons-assets-prod/77d159f1-0d45-4b01-ba42-c8ca9cbd0d70/47acc550fd7b520146be23b59835d549.png";

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      className={`bg-gradient-to-b ${isDarkTheme ? 'from-gray-500 to-black' : 'from-gray-500 to-white'} sticky top-0 left-0 right-0 z-[100] h-[4.5rem]`}
    >
      <div className="container mx-auto px-4 h-full flex items-center gap-6">
        <Link href="/" className="flex items-center h-full">
          <Image
            priority
            src={isDarkTheme ? banerClaroOriginal : banerOscuroOriginal}
            alt="Saladillo Vivo"
            width={216}
            height={58}
            className="w-auto h-auto object-contain"
          />
        </Link>

        {/* This div pushes all subsequent elements to the right */}
        <div className="flex-grow" />

        {mounted ? (
          <nav className="flex items-center space-x-2">
            {/* 1. Modo Claro/Oscuro */}
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10">
              {isDarkTheme ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
            </Button>

            {/* Notificaciones (Desktop) */}
            <NotificationButton />

            {/* 2. Compartir */}
            <Button variant="ghost" size="icon" onClick={handleShare} className="text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10">
              <Share2 size={20} aria-hidden="true" />
            </Button>

            {/* 3. Instalar PWA (Monitor) - Ubicación solicitada */}
            <InstallPwaButton isDarkTheme={isDarkTheme} />

            {/* Acceso Mobile (QR) */}
            <Button variant="ghost" size="icon" onClick={() => setIsQRModalOpen(true)} className="text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10">
              <Smartphone size={20} aria-hidden="true" />
            </Button>

            {/* 3. Modo TV */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode(viewMode === 'diario' ? 'tv' : 'diario')}
              aria-label="Cambiar modo"
              className="text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10"
            >
              {viewMode === 'diario' ? <Tv size={20} aria-hidden="true" /> : <Newspaper size={20} aria-hidden="true" />}
            </Button>

            <div className="h-6 w-px bg-black/20 dark:bg-white/20 mx-1 block"></div>

            {/* 4. Widget Clima */}
            <WeatherWidget />

            {/* 5. Caja de Búsqueda */}
            <SearchBar />
          </nav>
        ) : (
          <div className="h-10 w-[400px]" /> /* Space for nav during hydration */
        )}
      </div>

      {/* QR Code Modal */}
      <AnimatePresence>
        {isQRModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsQRModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white dark:bg-zinc-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-black/5 dark:border-white/5 overflow-hidden"
            >
              <button
                onClick={() => setIsQRModalOpen(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors p-2"
              >
                <X size={20} aria-hidden="true" />
              </button>

              <div className="flex flex-col items-center text-center space-y-6">
                <div className="relative w-64 h-64 bg-white p-4 rounded-2xl shadow-inner">
                  <Image
                    src="/qr.png"
                    alt="Saladillo Vivo Mobile QR"
                    width={256}
                    height={256}
                    className="w-full h-full object-contain"
                    unoptimized
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                    ¡Saladillo Vivo en tu bolsillo!
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                    Escaneá el QR y sentí el pulso de Saladillo. Llevá nuestra historia, talento y futuro siempre con vos.
                  </p>
                </div>

                <div className="w-full h-px bg-zinc-100 dark:bg-zinc-800" />

                <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium">
                  versión mobile oficial
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default Header;