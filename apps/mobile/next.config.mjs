import path from 'path';
import withPWAInit from "@ducanh2912/next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    compress: true,
    poweredByHeader: false,

    experimental: {
        optimizePackageImports: ['lucide-react', 'swiper', 'date-fns', 'lodash'],
    },

    transpilePackages: ['@saladillo/core'],

    webpack: (config) => {
        config.resolve.alias['@saladillo/core'] = path.resolve(process.cwd(), '../../packages/core');
        return config;
    },

    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
            {
                protocol: 'https',
                hostname: 'media.saladillovivo.com.ar',
            },
        ],
    },
    async rewrites() {
        return [
            {
                source: '/articulo/:id',
                destination: '/?id=:id',
            },
            {
                source: '/video/:id',
                destination: '/?v=:id',
            },
        ];
    },
};

const withPWA = withPWAInit({
    dest: "public",
    cacheOnFrontEndNav: true,
    aggressiveFrontEndNavCaching: true,
    reloadOnOnline: true,
    disable: process.env.NODE_ENV === 'development',
    workboxOptions: {
        disableDevLogs: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
            {
                urlPattern: /^https:\/\/m\.saladillovivo\.com\.ar\/api\/weather/i,
                handler: 'StaleWhileRevalidate',
                options: {
                    cacheName: 'weather-api',
                    expiration: {
                        maxEntries: 10,
                        maxAgeSeconds: 30 * 60,
                    },
                },
            },
            {
                urlPattern: /^https:\/\/i\.ytimg\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                    cacheName: 'youtube-thumbnails',
                    expiration: {
                        maxEntries: 50,
                        maxAgeSeconds: 7 * 24 * 60 * 60,
                    },
                },
            },
            {
                urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
                handler: 'CacheFirst',
                options: {
                    cacheName: 'static-images',
                    expiration: {
                        maxEntries: 100,
                        maxAgeSeconds: 30 * 24 * 60 * 60,
                    },
                },
            },
            {
                urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                    cacheName: 'google-fonts',
                    expiration: {
                        maxEntries: 20,
                        maxAgeSeconds: 365 * 24 * 60 * 60,
                    },
                },
            },
            {
                urlPattern: /\.(?:mp4|webm)$/i,
                handler: 'NetworkFirst',
                options: {
                    cacheName: 'media-videos',
                    expiration: {
                        maxEntries: 50,
                        maxAgeSeconds: 24 * 60 * 60,
                    },
                },
            },
            {
                urlPattern: '/',
                handler: 'NetworkFirst',
                options: {
                    cacheName: 'start-url',
                },
            },
        ],
    },
});

export default withPWA(nextConfig);
