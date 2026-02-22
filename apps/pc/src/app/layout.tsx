import React from "react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import "@/app/globals.css";
import Script from 'next/script';
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
  manifest: '/manifest.json',
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
        <meta name="theme-color" content="#000000" />
        <link rel="preconnect" href="https://img.youtube.com" />
        <link rel="preconnect" href="https://storage.googleapis.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" />
        <link rel="preconnect" href="https://media.saladillovivo.com.ar" />
        <link rel="preconnect" href="https://www.youtube.com" />
      </head>

      <body className="bg-main-gradient antialiased overflow-x-hidden min-h-screen">
        <Script
          src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1"
          strategy="beforeInteractive"
        />
        <ClientLayoutWrapper>
          {children}
        </ClientLayoutWrapper>

        <SpeedInsights />
      </body>
    </html>
  );
}