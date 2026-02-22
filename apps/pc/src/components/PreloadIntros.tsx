'use client';

import React from 'react';

const INTRO_VIDEOS = [
    '/videos_intro/noticias.mp4?v=20b',
    '/videos_intro/intro1.mp4',
];

/**
 * PreloadIntros - Componente invisible para forzar la descarga de videos de intro
 * en el caché del navegador al momento de cargar la aplicación.
 */
const PreloadIntros = () => {
    return (
        <div style={{ display: 'none', visibility: 'hidden', position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
            {INTRO_VIDEOS.map((src) => (
                <video key={src} src={src} preload="auto" muted playsInline autoPlay={false} />
            ))}
        </div>
    );
};

export default PreloadIntros;
