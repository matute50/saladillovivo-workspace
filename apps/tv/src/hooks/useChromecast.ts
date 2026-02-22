import { useState, useEffect, useCallback } from 'react';

// Declaration to avoid TypeScript errors without installing @types/chromecast-caf-sender
declare global {
    interface Window {
        __onGCastApiAvailable: (isAvailable: boolean) => void;
        chrome: any;
        cast: any;
    }
}

export const useChromecast = () => {
    const [isAvailable, setIsAvailable] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [castContext, setCastContext] = useState<any>(null);

    const initializeCastApi = useCallback(() => {
        if (window.chrome?.cast?.media) { // Check if API is already loaded
            try {
                const context = window.cast.framework.CastContext.getInstance();
                if (!context) return;

                context.setOptions({
                    receiverApplicationId: window.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
                    autoJoinPolicy: window.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
                });

                setCastContext(context);
                setIsAvailable(true);

                // Listen for session state changes
                context.addEventListener(
                    window.cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
                    (event: any) => {
                        const sessionState = event.sessionState;
                        const SessionState = window.cast.framework.SessionState;

                        if (sessionState === SessionState.SESSION_STARTED || sessionState === SessionState.SESSION_RESUMED) {
                            setIsConnected(true);
                            castImage(context.getCurrentSession());
                        } else if (sessionState === SessionState.SESSION_ENDED) {
                            setIsConnected(false);
                        }
                    }
                );

                // Check initial state
                const currentSession = context.getCurrentSession();
                if (currentSession) {
                    setIsConnected(true);
                }

            } catch (e) {
                console.error('Error initializing Cast API:', e);
            }
        }
    }, []);

    useEffect(() => {
        window.__onGCastApiAvailable = (isAvailable: boolean) => {
            if (isAvailable) {
                initializeCastApi();
            } else {
                setIsAvailable(false);
            }
        };

        // If script already loaded before hook mounted
        if (window.chrome?.cast && window.cast?.framework) {
            initializeCastApi();
        }
    }, [initializeCastApi]);

    const castImage = (session: any) => {
        if (!session) return;

        const mediaInfo = new window.chrome.cast.media.MediaInfo(
            'https://www.saladillovivo.com.ar/images/chromecast-bg.png',
            'image/png'
        );

        // Metadata is optional but good practice
        const metadata = new window.chrome.cast.media.GenericMediaMetadata();
        metadata.title = 'Saladillo Vivo';
        metadata.images = [{ url: 'https://www.saladillovivo.com.ar/images/chromecast-bg.png' }];
        mediaInfo.metadata = metadata;

        const request = new window.chrome.cast.media.LoadRequest(mediaInfo);

        session.loadMedia(request).then(
            () => { /* Image loaded */ },
            (errorCode: any) => { console.error('Image load error', errorCode); }
        );
    };

    const requestSession = () => {
        if (castContext) {
            castContext.requestSession().then(
                (err: any) => {
                    if (err) {
                        console.error('Error requesting session', err);
                    }
                }
            );
        }
    };

    return { isAvailable, isConnected, requestSession };
};
