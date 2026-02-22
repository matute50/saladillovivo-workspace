import { useState, useEffect, useCallback } from 'react';

export const useNotifications = () => {
    const [permission, setPermission] = useState<NotificationPermission>('default');

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermission(Notification.permission);
        }
    }, []);

    const requestPermission = useCallback(async () => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            const result = await Notification.requestPermission();
            setPermission(result);
            if (result === 'granted') {
                new Notification('Saladillo Vivo', {
                    body: '¡Notificaciones activadas! Te avisaremos de las noticias más importantes.',
                    icon: '/favicon.ico' // Ajustar ruta si hay icono mejor
                });
            }
        }
    }, []);

    const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
        if (permission === 'granted') {
            new Notification(title, {
                icon: '/favicon.ico',
                ...options
            });
        }
    }, [permission]);

    return { permission, requestPermission, sendNotification };
};
