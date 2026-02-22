'use client';

import { useState, useEffect, useCallback } from 'react';

const API_KEY = 'b9fd6909428741cc9aa182830260102';
const DEFAULT_COORDS = { lat: -34.636, lon: -59.778 }; // Saladillo, Buenos Aires
const SALADILLO_NAME = 'Saladillo, BA';
const WEATHER_CACHE_KEY = 'saladillovivo_weather_cache_v2';
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

    const fetchWeather = useCallback(async (lat: number, lon: number, name: string) => {
        try {
            setLoading(true);
            // WeatherAPI.com - Current and Forecast
            const url = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${lat},${lon}&days=6&aqi=no&alerts=no&lang=es`;

            const response = await fetch(url);
            if (!response.ok) throw new Error('Error al obtener datos del clima');

            const data = await response.json();

            const weatherData: WeatherData = {
                current: {
                    temp: Math.round(data.current.temp_c),
                    feelsLike: Math.round(data.current.feelslike_c),
                    conditionCode: data.current.condition.code,
                    isDay: !!data.current.is_day,
                    conditionText: data.current.condition.text,
                },
                forecast: data.forecast.forecastday.slice(1).map((day: any) => ({
                    date: day.date,
                    maxTemp: Math.round(day.day.maxtemp_c),
                    minTemp: Math.round(day.day.mintemp_c),
                    conditionCode: day.day.condition.code,
                    conditionText: day.day.condition.text,
                    maxWind: Math.round(day.day.maxwind_kph),
                    humidity: day.day.avghumidity,
                    rainChance: day.day.daily_chance_of_rain,
                    uv: day.day.uv,
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
            const res = await fetch(`https://api.weatherapi.com/v1/search.json?key=${API_KEY}&q=${encodeURIComponent(query)}`);
            const data = await res.json();
            if (data && data[0]) {
                const { lat, lon, name } = data[0];
                fetchWeather(lat, lon, name);
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
