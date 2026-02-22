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
            ? <Sun size={30} className="text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]" />
            : <Moon size={30} className="text-indigo-200 drop-shadow-[0_0_8px_rgba(199,210,254,0.3)]" />;
    }

    // Part cloudy (1003)
    if (code === 1003) return <Cloud size={30} className={cn(isDay ? "text-sky-300" : "text-slate-400")} />;

    // Cloudy / Overcast (1006, 1009)
    if (code === 1006 || code === 1009) return <Cloud size={30} className="text-slate-400" />;

    // Mist, Fog (1030, 1135, 1147)
    if (code === 1030 || code === 1135 || code === 1147) return <CloudFog size={30} className="text-slate-300/80" />;

    // Patchy rain, light drizzle (1063, 1150, 1153, 1180, 1183)
    if ([1063, 1150, 1153, 1180, 1183].includes(code)) return <CloudDrizzle size={30} className="text-cyan-400" />;

    // Moderate/Heavy Rain (1186, 1189, 1192, 1195, 1240, 1243, 1246)
    if ([1186, 1189, 1192, 1195, 1240, 1243, 1246].includes(code)) {
        return <CloudRain size={30} className="text-blue-500 drop-shadow-[0_0_5px_rgba(59,130,246,0.3)]" />;
    }

    // Snow (1066, 1114, 1117, 1210-1225, 1255-1258)
    if (code >= 1210 && code <= 1258 || [1066, 1114, 1117].includes(code)) return <CloudSnow size={30} className="text-blue-50" />;

    // Thundery outbreaks (1087, 1273, 1276, 1279, 1282)
    if ([1087, 1273, 1276, 1279, 1282].includes(code)) {
        return <CloudLightning size={30} className="text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" />;
    }

    return <Wind size={30} className="text-teal-300" />;
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
                        : "bg-black/5 border-black/10 text-black",
                    isWeatherOverlayOpen && (isDarkTheme ? "bg-white/10" : "bg-black/10")
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
                            <div className="flex items-center gap-2 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                                <span className="text-xl font-bold tracking-tight">{weather.current.temp}°</span>
                                <div className="flex flex-col items-start leading-[0.8] mt-0.5">
                                    <span className="text-[9px] font-bold uppercase opacity-80">ST</span>
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
                            <ChevronDown size={21} className={cn("transition-transform", isWeatherOverlayOpen && "rotate-180")} />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default WeatherWidget;
