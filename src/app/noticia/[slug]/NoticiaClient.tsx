// src/app/[slug]/NoticiaClient.tsx
"use client";

import Image from 'next/image';
import React from 'react';
import { } from 'lucide-react';
import { Article } from '@/lib/types';


// Recibimos 'article' como prop desde la página de servidor
export default function NoticiaClient({ article }: { article: Article }) {


  // Helper para procesar la URL de la imagen
  const getSafeImageUrl = (inputUrl: string | undefined | null): string => {
    const cleanUrl = (inputUrl || '').trim();

    if (!cleanUrl) { // Check after trimming
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    }

    // Check for YouTube URLs first
    if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
      return cleanUrl; // Use as is
    }

    // Use regex for http/https check
    if (cleanUrl.match(/^(http|https):\/\//)) {
      return cleanUrl;
    }

    // Otherwise, it's a relative path, prepend base URL
    const mediaUrl = process.env.NEXT_PUBLIC_MEDIA_URL || 'https://media.saladillovivo.com.ar';
    return `${mediaUrl}${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}`;
  };

  const finalImageUrl = getSafeImageUrl(article.imageUrl);

  // 3. RENDERIZAMOS EL HTML
  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      <article>
        <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-white md:text-4xl mb-4">
          {article.titulo}
        </h1>

        {/* --- INICIO DE CAMBIOS (IMAGEN Y BOTÓN) --- */}
        {article.imageUrl && ( // Mantenemos el chequeo de article.imageUrl para asegurar que la propiedad exista
          <div
            // 1. IMAGEN MÁS PEQUEÑA: Cambiado max-w-4xl (del contenedor padre) a max-w-2xl y centrado
            className="max-w-2xl mx-auto rounded-lg shadow-lg mb-6 relative"
            style={{ aspectRatio: '16 / 9' }}
          >
            <Image
              src={finalImageUrl} // THIS IS THE LINE I WANT TO CHANGE TO finalImageUrl
              alt={article.titulo}
              fill
              className="w-full h-full object-cover rounded-lg"
            />
            {/* Viñeta Negra Intensificada con Efecto Blur Superior */}
            <div className="absolute inset-0 z-10 pointer-events-none rounded-lg bg-black/10 [mask-image:radial-gradient(circle,transparent_30%,black_100%)] shadow-[inset_0_0_120px_rgba(0,0,0,0.8)]" />
            <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-black/95 via-black/40 to-transparent z-10 pointer-events-none rounded-t-lg" />

          </div>
        )}
        {/* --- FIN DE CAMBIOS --- */}


        {/* Cuerpo de la noticia (sin cambios) */}
        {article.contenido ? (
          <div
            className="prose prose-lg dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: article.contenido }}
          />
        ) : (
          <p className="text-lg dark:text-gray-300">{article.description}</p>
        )}
      </article>
    </main>
  );
}
