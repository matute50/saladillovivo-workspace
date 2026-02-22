'use client';

import React, { useEffect } from 'react';
import { useNewsStore } from '@/store/useNewsStore';
import GlobalErrorBoundary from '@/components/GlobalErrorBoundary';

interface ClientLayoutWrapperProps {
  children: React.ReactNode;
}

export default function ClientLayoutWrapper({ children }: ClientLayoutWrapperProps) {
  const fetchInitialData = useNewsStore(state => state.fetchInitialData);

  useEffect(() => {
    // Inicialización global de datos
    fetchInitialData();

    // Safe Client-Side Execution
    if (typeof window === 'undefined') return;

    const hostname = window.location.hostname;
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

    // Mobile Redirection Strategy
    const checkMobileAndRedirect = () => {
      // Exception: Do not redirect if already on TV subdomain
      if (hostname.startsWith('tv.')) {
        // TV Subdomain detected. Skipping mobile redirection
        return;
      }

      // Basic mobile detection regex
      if (/android|ipad|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase())) {
        window.location.href = "https://m.saladillovivo.com.ar";
      }
    };

    checkMobileAndRedirect();

    // TV Native Experience: Hide cursor on tv. subdomains or standalone/android TV
    const isTV = hostname.startsWith('tv.') ||
      /android tv|tv|viera|smarttv/i.test(userAgent.toLowerCase()) ||
      (window.matchMedia('(display-mode: standalone)').matches);

    if (isTV) {
      document.body.classList.add('tv-cursor-hide');
      // TV Experience Mode enabled: Cursor hidden
    }

    return () => {
      document.body.classList.remove('tv-cursor-hide');
    };
  }, [fetchInitialData]);

  // Hydration safety: render basic structure until mounted
  return (
    <GlobalErrorBoundary>
      {/* 
        DEBUGGING: PreloadIntros disabled to rule out memory exhaustion on TV.
        Uncomment if white screen persists but it's not a memory issue.
      */}
      {/* 
      <div className={isMounted ? "opacity-100" : "opacity-0 invisible"} key="client-extras">
        <PreloadIntros />
      </div> 
      */}

      {children}
    </GlobalErrorBoundary>
  );
}