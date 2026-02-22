'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';

const CreatorModal = dynamic(() => import('./modals/CreatorModalNew'), { ssr: false });
const ImageModal = dynamic(() => import('./ImageModal'), { ssr: false });

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [isCreatorModalOpen, setCreatorModalOpen] = useState(false);
  const [isDecretoModalOpen, setDecretoModalOpen] = useState(false);

  const decretoImageUrl = "/decreto.png";

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const observer = new MutationObserver(() => {
        setIsDarkTheme(document.documentElement.classList.contains('dark'));
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      return () => observer.disconnect();
    }
  }, []);

  const banerClaro = "https://storage.googleapis.com/hostinger-horizons-assets-prod/77d159f1-0d45-4b01-ba42-c8ca9cbd0d70/e9eb6580b7ad5742826daaa5df2b592d.png";
  const banerOscuro = "https://storage.googleapis.com/hostinger-horizons-assets-prod/77d159f1-0d45-4b01-ba42-c8ca9cbd0d70/47acc550fd7b520146be23b59835d549.png";

  return (
    <footer className="bg-gradient-to-b from-[hsl(var(--footer-bg-start))] to-[hsl(var(--footer-bg-end))] dark:bg-[hsl(var(--footer-bg-color))] text-foreground h-[var(--footer-height)]">
      <div className="container mx-auto px-4 h-full flex justify-center items-center">
        <div className="flex flex-col md:flex-row justify-center items-center text-center gap-2 md:gap-4 w-full">

          {/* 1. LOGO */}
          <div className="flex-shrink-0">
            <Image
              loading="lazy"
              src={isDarkTheme ? banerClaro : banerOscuro}
              alt="Logo Saladillo Vivo"
              width={105}
              height={30}
              className="object-contain"
              unoptimized // Evita errores 403 en Vercel con imágenes externas
            />
          </div>

          <span className="hidden md:block text-gray-500 text-[10px]">|</span>

          {/* 2. TEXTO DECRETO */}
          <p className="text-[9px] m-0 leading-none">
            Declarado de interés cultural{' '}
            <span
              onClick={() => setDecretoModalOpen(true)}
              className="font-bold underline cursor-pointer text-[#003399] dark:text-[#6699ff] hover:text-blue-400 transition-colors"
            >
              DECRETO H.C.D. Nro. 37/2022
            </span>
          </p>

          <span className="hidden md:block text-gray-500 text-[10px]">|</span>

          {/* 3. COPYRIGHT Y CRÉDITOS */}
          <p className="text-[9px] m-0 leading-none">
            © {currentYear} Saladillo Vivo. Desarrollado por:{' '}
            <span
              onClick={() => setCreatorModalOpen(true)}
              className="font-bold underline cursor-pointer text-[#003399] dark:text-[#6699ff] hover:text-blue-400 transition-colors"
            >
              Matías Vidal
            </span>
          </p>

        </div>
      </div>

      {isCreatorModalOpen && <CreatorModal isOpen={isCreatorModalOpen} onClose={() => setCreatorModalOpen(false)} />}
      {isDecretoModalOpen && <ImageModal isOpen={isDecretoModalOpen} onClose={() => setDecretoModalOpen(false)} imageUrl={decretoImageUrl} imageAlt="Decreto H.C.D. Nro. 37/2022" />}
    </footer>
  );
};

export default Footer;