'use client';

import { useState, useEffect, useCallback } from 'react';

const DEFAULT_COORDS = { lat: -34.636, lon: -59.778 }; // Saladillo, Buenos Aires
const SALADILLO_NAME = 'Saladillo, BA';
const WEATHER_CACHE_KEY = 'saladillovivo_weather_cache_v3'; // Updated version for new API
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes (reduced for better accuracy)

export interface WeatherData {
    current: {
        temp: number;
        feelsLike: number;
        conditionCode: number;
        isDay: boolean;
        conditionText: string;
    };
    forecast: Array<{
        date: string;
        minTemp: number;
        maxTemp: number;
        conditionCode: number;
        conditionText: string;
        maxWind: number;
        humidity: number;
        rainChance: number;
        uv: number;
    }>;
    locationName: string;
}

export const useWeather = () => {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Map WMO weather codes to our condition codes
    const mapWMOCode = (wmoCode: number): number => {
        if (wmoCode === 0) return 1000; // Clear sky
        if (wmoCode >= 1 && wmoCode <= 3) return 1003; // Partly cloudy
        if (wmoCode === 45 || wmoCode === 48) return 1030; // Fog
        if (wmoCode >= 51 && wmoCode <= 57) return 1150; // Drizzle
        if (wmoCode >= 61 && wmoCode <= 67) return 1186; // Rain
        if (wmoCode >= 71 && wmoCode <= 77) return 1210; // Snow
        if (wmoCode >= 80 && wmoCode <= 82) return 1240; // Rain showers
        if (wmoCode >= 85 && wmoCode <= 86) return 1210; // Snow showers
        if (wmoCode >= 95 && wmoCode <= 99) return 1087; // Thunderstorm
        return 1003; // Default to partly cloudy
    };

    // Get condition text in Spanish from WMO code
    const getConditionText = (wmoCode: number): string => {
        if (wmoCode === 0) return 'Despejado';
        if (wmoCode === 1) return 'Mayormente despejado';
        if (wmoCode === 2) return 'Parcialmente nublado';
        if (wmoCode === 3) return 'Nublado';
        if (wmoCode === 45 || wmoCode === 48) return 'Niebla';
        if (wmoCode >= 51 && wmoCode <= 57) return 'Llovizna';
        if (wmoCode >= 61 && wmoCode <= 65) return 'Lluvia';
        if (wmoCode === 66 || wmoCode === 67) return 'Lluvia helada';
        if (wmoCode >= 71 && wmoCode <= 77) return 'Nieve';
        if (wmoCode >= 80 && wmoCode <= 82) return 'Chubascos';
        if (wmoCode === 85 || wmoCode === 86) return 'Chubascos de nieve';
        if (wmoCode === 95) return 'Tormenta';
        if (wmoCode === 96 || wmoCode === 99) return 'Tormenta con granizo';
        return 'Parcialmente nublado';
    };

    const fetchWeather = useCallback(async (lat: number, lon: number, name: string) => {
        try {
            setLoading(true);
            // Open-Meteo API - Free 7-day forecast
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max,uv_index_max,windspeed_10m_max,relative_humidity_2m_mean&current_weather=true&timezone=auto&forecast_days=7`;

            const response = await fetch(url);
            if (!response.ok) throw new Error('Error al obtener datos del clima');

            const data = await response.json();

            const weatherData: WeatherData = {
                current: {
                    temp: Math.round(data.current_weather.temperature),
                    feelsLike: Math.round(data.current_weather.temperature), // Open-Meteo doesn't provide feels_like
                    conditionCode: mapWMOCode(data.current_weather.weathercode),
                    isDay: data.current_weather.is_day === 1,
                    conditionText: getConditionText(data.current_weather.weathercode),
                },
                forecast: data.daily.time.map((date: string, idx: number) => ({
                    date: date,
                    maxTemp: Math.round(data.daily.temperature_2m_max[idx]),
                    minTemp: Math.round(data.daily.temperature_2m_min[idx]),
                    conditionCode: mapWMOCode(data.daily.weathercode[idx]),
                    conditionText: getConditionText(data.daily.weathercode[idx]),
                    maxWind: Math.round(data.daily.windspeed_10m_max[idx]),
                    humidity: Math.round(data.daily.relative_humidity_2m_mean?.[idx] || 50),
                    rainChance: data.daily.precipitation_probability_max?.[idx] || 0,
                    uv: data.daily.uv_index_max[idx],
                })),
                locationName: name,
            };

            setWeather(weatherData);
            localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({
                data: weatherData,
                timestamp: Date.now(),
                lat,
                lon
            }));
            setError(null);
        } catch (err) {
            console.error('Weather Fetch Error:', err);
            setError('No se pudo cargar el clima');
        } finally {
            setLoading(false);
        }
    }, []);

    const searchLocation = async (query: string) => {
        try {
            setLoading(true);
            // Open-Meteo Geocoding API - Free location search
            const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=es&format=json`);
            const data = await res.json();
            if (data && data.results && data.results[0]) {
                const { latitude, longitude, name } = data.results[0];
                fetchWeather(latitude, longitude, name);
            } else {
                setError('Ubicación no encontrada');
                setLoading(false);
            }
        } catch {
            setError('Error al buscar ubicación');
            setLoading(false);
        }
    };

    const updateLocation = async (lat: number, lon: number, name?: string) => {
        fetchWeather(lat, lon, name || 'Ubicación Actual');
    };

    useEffect(() => {
        const initWeather = async () => {
            // 1. Try Cache
            const cached = localStorage.getItem(WEATHER_CACHE_KEY);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_DURATION) {
                    setWeather(data);
                    setLoading(false);
                    return;
                }
            }

            // 2. Try Geolocation
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        const { latitude, longitude } = position.coords;
                        // For name we can just use "Ubicación Actual" or better, let WeatherAPI handle it
                        fetchWeather(latitude, longitude, 'Ubicación Actual');
                    },
                    () => {
                        // Fallback to Saladillo if declined
                        fetchWeather(DEFAULT_COORDS.lat, DEFAULT_COORDS.lon, SALADILLO_NAME);
                    }
                );
            } else {
                fetchWeather(DEFAULT_COORDS.lat, DEFAULT_COORDS.lon, SALADILLO_NAME);
            }
        };

        initWeather();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { weather, loading, error, updateLocation, searchLocation };
};
