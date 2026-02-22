import React from "react";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { centuryGothic } from "@/lib/fonts";
import "@/app/globals.css";
import ClientLayoutWrapper from "./ClientLayoutWrapper";

export const metadata: Metadata = {
  title: {
    default: "Saladillo Vivo",
    template: "%s | Saladillo Vivo"
  },
  description: "Noticias, streaming en vivo y actualidad de Saladillo y la región.",
  openGraph: {
    title: "Saladillo Vivo",
    description: "Todas las noticias y vivo de Saladillo.",
    url: "https://www.saladillovivo.com.ar",
    siteName: "Saladillo Vivo",
    locale: "es_AR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: 'black',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Saladillo TV" />
        <meta name="apple-mobile-web-app-title" content="Saladillo TV" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#000000" />

        <Script
          src="/scripts/patch-events.js"
          strategy="beforeInteractive"
        />
        <link rel="preconnect" href="https://media.saladillovivo.com.ar" />
        <link rel="preconnect" href="https://www.youtube.com" />

        {/* Resource Preloading for LCP and Layout Stability */}
        {/* Vercel Deployment Trigger: 2026-02-12 */}
        {/* Font preloading is now handled by next/font */}

      </head>

      <body className={`${centuryGothic.variable} bg-main-gradient antialiased overflow-x-hidden min-h-screen font-century-gothic`}>
        <ClientLayoutWrapper>
          {children}
        </ClientLayoutWrapper>
      </body>
    </html>
  );
}
