'use client';

import React from 'react';
import {
    Sun,
    Moon,
    Cloud,
    CloudRain,
    CloudSnow,
    CloudLightning,
    Wind,
    CloudFog,
    CloudDrizzle,
    ChevronDown
} from 'lucide-react';
import { useWeather } from '@/hooks/useWeather';
import { cn } from '@/lib/utils';
import { useNewsStore } from '@/store/useNewsStore';
import { useWeatherUIStore } from '@/store/useWeatherUIStore';

// Mapping WeatherAPI codes to Icons
// https://www.weatherapi.com/docs/weather_conditions.json
const getWeatherIcon = (code: number, isDay: boolean = true) => {
    // Sunny / Clear
    if (code === 1000) {
        return isDay
            ? <Sun size={30} className="text-amber-500 dark:text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]" aria-hidden="true" />
            : <Moon size={30} className="text-indigo-600 dark:text-indigo-200 drop-shadow-[0_0_8px_rgba(199,210,254,0.3)]" aria-hidden="true" />;
    }

    // Part cloudy (1003)
    if (code === 1003) return <Cloud size={30} className={cn(isDay ? "text-sky-700 dark:text-sky-300" : "text-slate-600 dark:text-slate-400")} aria-hidden="true" />;

    // Cloudy / Overcast (1006, 1009)
    if (code === 1006 || code === 1009) return <Cloud size={30} className="text-slate-600 dark:text-slate-400" aria-hidden="true" />;

    // Mist, Fog (1030, 1135, 1147)
    if (code === 1030 || code === 1135 || code === 1147) return <CloudFog size={30} className="text-slate-500 dark:text-slate-300/80" aria-hidden="true" />;

    // Patchy rain, light drizzle (1063, 1150, 1153, 1180, 1183)
    if ([1063, 1150, 1153, 1180, 1183].includes(code)) return <CloudDrizzle size={30} className="text-cyan-700 dark:text-cyan-400" aria-hidden="true" />;

    // Moderate/Heavy Rain (1186, 1189, 1192, 1195, 1240, 1243, 1246)
    if ([1186, 1189, 1192, 1195, 1240, 1243, 1246].includes(code)) {
        return <CloudRain size={30} className="text-blue-700 dark:text-blue-500 drop-shadow-[0_0_5px_rgba(59,130,246,0.3)]" aria-hidden="true" />;
    }

    // Snow (1066, 1114, 1117, 1210-1225, 1255-1258)
    if (code >= 1210 && code <= 1258 || [1066, 1114, 1117].includes(code)) return <CloudSnow size={30} className="text-sky-800 dark:text-blue-50" aria-hidden="true" />;

    // Thundery outbreaks (1087, 1273, 1276, 1279, 1282)
    if ([1087, 1273, 1276, 1279, 1282].includes(code)) {
        return <CloudLightning size={30} className="text-amber-600 dark:text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" aria-hidden="true" />;
    }

    return <Wind size={30} className="text-teal-700 dark:text-teal-300" aria-hidden="true" />;
};

const WeatherWidget = () => {
    const { weather, loading } = useWeather();
    const isDarkTheme = useNewsStore(state => state.isDarkTheme);
    const { toggleWeatherOverlay, openWithDetails, isWeatherOverlayOpen } = useWeatherUIStore();

    if (!weather && loading) return <div className="w-16 h-8 bg-white/10 animate-pulse rounded-full" />;

    return (
        <div className="relative">
            {/* Widget Container */}
            <div
                className={cn(
                    "flex items-center rounded-full transition-all border overflow-hidden",
                    isDarkTheme
                        ? "bg-white/5 border-white/10 text-white"
                        : "bg-black/10 border-black/20 text-black", // Darkened background for Light Mode
                    isWeatherOverlayOpen && (isDarkTheme ? "bg-white/10" : "bg-black/20")
                )}
            >
                {weather && (
                    <>
                        {/* Zone 1: Status & Data -> Opens Detail (Today) */}
                        <button
                            onClick={() => {
                                if (weather.forecast && weather.forecast.length > 0) {
                                    openWithDetails(weather.forecast[0]);
                                }
                            }}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors",
                                isDarkTheme ? "hover:bg-white/10" : "hover:bg-black/5"
                            )}
                            title="Ver detalles de hoy"
                        >
                            {getWeatherIcon(weather.current.conditionCode, weather.current.isDay)}
                            <div className="flex items-center gap-2">
                                <span className="text-xl font-bold">{weather.current.temp}°</span>
                                <div className="flex flex-col items-start leading-[0.8] mt-0.5">
                                    <span className={cn(
                                        "text-[9px] font-bold uppercase",
                                        isDarkTheme ? "text-gray-400" : "text-gray-500"
                                    )}>ST</span>
                                    <span className="text-xs font-semibold">{weather.current.feelsLike}°</span>
                                </div>
                            </div>
                        </button>

                        {/* Divider */}
                        <div className={cn("w-px h-6 self-center", isDarkTheme ? "bg-white/10" : "bg-black/10")} />

                        {/* Zone 2: Arrow -> Toggles Grid (5 Days) */}
                        <button
                            onClick={toggleWeatherOverlay}
                            className={cn(
                                "px-2 py-3 hover:bg-white/5 transition-colors",
                                isDarkTheme ? "hover:bg-white/10" : "hover:bg-black/5"
                            )}
                            title="Ver pronóstico extendido"
                        >
                            <ChevronDown size={21} className={cn("transition-transform", isWeatherOverlayOpen && "rotate-180")} aria-hidden="true" />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default WeatherWidget;
