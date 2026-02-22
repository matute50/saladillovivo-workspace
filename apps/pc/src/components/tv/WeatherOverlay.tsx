'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWeatherUIStore } from '@/store/useWeatherUIStore';
import { useWeather } from '@/hooks/useWeather';
import { useNewsStore } from '@/store/useNewsStore';
import {
    Sun, Moon, Cloud, CloudRain, CloudSnow, CloudLightning,
    Wind, CloudFog, CloudDrizzle, ChevronUp, Search, ChevronLeft,
    Droplets, Umbrella
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper for icons (Duplicated from Widget for now, can be extracted to utils later)
// Helper for icons (Duplicated from Widget for now, can be extracted to utils later)
const getWeatherIcon = (code: number, isDay: boolean = true) => {
    // Sunny / Clear
    if (code === 1000) {
        return isDay
            ? <Sun size={50} className="text-amber-500 dark:text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.6)]" />
            : <Moon size={50} className="text-indigo-600 dark:text-indigo-200 drop-shadow-[0_0_12px_rgba(199,210,254,0.3)]" />;
    }

    // Part cloudy (1003)
    if (code === 1003) return <Cloud size={50} className={cn(isDay ? "text-sky-700 dark:text-sky-300" : "text-slate-600 dark:text-slate-400")} />;

    // Cloudy / Overcast (1006, 1009)
    if (code === 1006 || code === 1009) return <Cloud size={50} className="text-slate-600 dark:text-slate-400" />;

    // Mist, Fog (1030, 1135, 1147)
    if (code === 1030 || code === 1135 || code === 1147) return <CloudFog size={50} className="text-slate-500 dark:text-slate-300/80" />;

    // Patchy rain, light drizzle (1063, 1150, 1153, 1180, 1183)
    if ([1063, 1150, 1153, 1180, 1183].includes(code)) return <CloudDrizzle size={50} className="text-cyan-700 dark:text-cyan-400" />;

    // Moderate/Heavy Rain (1186, 1189, 1192, 1195, 1240, 1243, 1246)
    if ([1186, 1189, 1192, 1195, 1240, 1243, 1246].includes(code)) {
        return <CloudRain size={50} className="text-blue-700 dark:text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]" />;
    }

    // Snow (1066, 1114, 1117, 1210-1225, 1255-1258)
    if (code >= 1210 && code <= 1258 || [1066, 1114, 1117].includes(code)) return <CloudSnow size={50} className="text-sky-800 dark:text-blue-50" />;

    // Thundery outbreaks (1087, 1273, 1276, 1279, 1282)
    if ([1087, 1273, 1276, 1279, 1282].includes(code)) {
        return <CloudLightning size={50} className="text-amber-600 dark:text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]" />;
    }
    return <Wind size={50} className="text-teal-700 dark:text-teal-300" />;
};

const WeatherOverlay = () => {
    const { isWeatherOverlayOpen, closeWeatherOverlay, selectedDayPayload } = useWeatherUIStore();
    const { weather, searchLocation } = useWeather();
    const isDarkTheme = useNewsStore(state => state.isDarkTheme);
    const [searchQuery, setSearchQuery] = useState('');

    // Initialize with payload if available
    const [selectedDay, setSelectedDay] = useState<any>(selectedDayPayload || null);

    // Sync when payload changes (opening/closing)
    useEffect(() => {
        setSelectedDay(selectedDayPayload);
    }, [selectedDayPayload]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            searchLocation(searchQuery);
            setSearchQuery('');
        }
    };

    // Filter forecast to get next 5 days
    const forecastDays = weather?.forecast.slice(0, 5) || [];

    // Helper to format date for display
    const formatDate = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        const weekday = dateObj.toLocaleDateString('es-ES', { weekday: 'long' }).toUpperCase();
        const dayNum = day.toString().padStart(2, '0');
        const monthNum = month.toString().padStart(2, '0');
        return `${weekday} ${dayNum}/${monthNum}`;
    };

    const formatShortDate = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        const today = new Date();

        // Check if it's today
        if (dateObj.getDate() === today.getDate() &&
            dateObj.getMonth() === today.getMonth() &&
            dateObj.getFullYear() === today.getFullYear()) {
            return 'HOY';
        }

        const weekday = dateObj.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase().replace('.', '');
        const dayNum = day.toString().padStart(2, '0');
        const monthNum = month.toString().padStart(2, '0');
        return `${weekday} ${dayNum}/${monthNum}`;
    }

    return (
        <AnimatePresence>
            {isWeatherOverlayOpen && weather && (
                <motion.div
                    initial={{ y: "-100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "-100%" }}
                    transition={{ type: "spring", stiffness: 80, damping: 15 }}
                    className={cn(
                        "absolute top-0 left-0 w-full h-full z-[60] pointer-events-auto",
                        "backdrop-blur-sm",
                        isDarkTheme
                            ? "bg-black/50"
                            : "bg-white/50"
                    )}
                >
                    <div className="p-4 md:p-6 h-full flex flex-col">
                        <div className="flex justify-between items-start">
                            <div className="w-full mr-4 flex flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    {selectedDay && (
                                        <button
                                            onClick={() => setSelectedDay(null)}
                                            className={cn(
                                                "p-1 rounded-full transition-colors",
                                                isDarkTheme ? "hover:bg-white/10 text-white" : "hover:bg-black/10 text-black"
                                            )}
                                        >
                                            <ChevronLeft size={24} />
                                        </button>
                                    )}
                                    <h2 className={cn("text-2xl font-bold whitespace-nowrap", isDarkTheme ? "text-white" : "text-black")}>
                                        {weather.locationName}
                                    </h2>
                                </div>

                                {!selectedDay && (
                                    <form onSubmit={handleSearch} className="w-48">
                                        <div className="relative flex items-center">
                                            <Search className={cn("absolute left-0 w-4 h-4", isDarkTheme ? "text-white/70" : "text-black/70")} />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Cambiar ubicación..."
                                                className={cn(
                                                    "w-full bg-transparent border-b py-1 pl-6 text-sm font-medium focus:outline-none transition-colors",
                                                    isDarkTheme
                                                        ? "text-white border-white/30 focus:border-white placeholder:text-white/50"
                                                        : "text-black border-black/30 focus:border-black placeholder:text-black/50"
                                                )}
                                            />
                                        </div>
                                    </form>
                                )}
                            </div>
                            <button
                                onClick={closeWeatherOverlay}
                                className={cn(
                                    "p-2 rounded-full transition-colors flex-shrink-0",
                                    isDarkTheme ? "hover:bg-white/10 text-white" : "hover:bg-black/10 text-black"
                                )}
                            >
                                <ChevronUp size={24} />
                            </button>
                        </div>

                        {selectedDay ? (
                            // DETAIL VIEW - DESKTOP ONLY
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex-1 flex flex-row items-center justify-center w-full max-w-5xl mx-auto gap-8 px-4 overflow-hidden mt-2"
                            >
                                {/* Left Side: Main Temp & Condition */}
                                <div className="flex-1 flex flex-col items-end justify-center text-right gap-1 pr-4">
                                    <span className={cn(
                                        "text-lg font-bold uppercase mb-1 opacity-80 mr-4",
                                        isDarkTheme ? "text-gray-300" : "text-gray-700"
                                    )}>
                                        {formatDate(selectedDay.date)}
                                    </span>

                                    <div className="flex flex-col items-end mr-4">
                                        <div className="mb-2 transform scale-110 origin-right">
                                            {getWeatherIcon(selectedDay.conditionCode)}
                                        </div>
                                        <span className={cn("text-6xl font-black leading-none tracking-tighter", isDarkTheme ? "text-white" : "text-black")}>
                                            {selectedDay.maxTemp}°
                                        </span>
                                        <span className={cn("text-2xl font-medium opacity-70", isDarkTheme ? "text-gray-300" : "text-gray-600")}>
                                            Min: {selectedDay.minTemp}°
                                        </span>
                                    </div>

                                    <span className={cn(
                                        "text-lg font-medium leading-tight italic mt-[3px] max-w-sm mr-4",
                                        isDarkTheme ? "text-white/90" : "text-black/80"
                                    )}>
                                        {selectedDay.conditionText}
                                    </span>
                                </div>

                                {/* Divider */}
                                <div className={cn("block w-px h-64 opacity-20 mx-2", isDarkTheme ? "bg-white" : "bg-black")} />

                                {/* Right Side: Detailed Metrics Grid */}
                                <div className={cn(
                                    "flex-1 grid grid-cols-2 gap-2 w-full h-full max-h-[300px]",
                                    isDarkTheme ? "text-white" : "text-black"
                                )}>
                                    <div className={cn(
                                        "flex flex-col items-center justify-center p-2 rounded-xl backdrop-blur-md transition-transform hover:scale-[1.02]",
                                        isDarkTheme ? "bg-white/10 border border-white/10" : "bg-black/5 border border-black/5"
                                    )}>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <Wind className="opacity-90" size={22} />
                                            <span className="text-[9px] font-bold opacity-60 uppercase tracking-widest">Viento</span>
                                        </div>
                                        <span className="text-3xl font-black">{selectedDay.maxWind}</span>
                                        <span className="text-[10px] font-medium opacity-50">km/h</span>
                                    </div>
                                    <div className={cn(
                                        "flex flex-col items-center justify-center p-2 rounded-xl backdrop-blur-md transition-transform hover:scale-[1.02]",
                                        isDarkTheme ? "bg-white/10 border border-white/10" : "bg-black/5 border border-black/5"
                                    )}>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <Droplets className="opacity-90" size={22} />
                                            <span className="text-[9px] font-bold opacity-60 uppercase tracking-widest">Humedad</span>
                                        </div>
                                        <span className="text-3xl font-black">{selectedDay.humidity}</span>
                                        <span className="text-[10px] font-medium opacity-50">%</span>
                                    </div>
                                    <div className={cn(
                                        "flex flex-col items-center justify-center p-2 rounded-xl backdrop-blur-md transition-transform hover:scale-[1.02]",
                                        isDarkTheme ? "bg-white/10 border border-white/10" : "bg-black/5 border border-black/5"
                                    )}>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <Umbrella className="opacity-90" size={22} />
                                            <span className="text-[9px] font-bold opacity-60 uppercase tracking-widest">Lluvia</span>
                                        </div>
                                        <span className="text-3xl font-black">{selectedDay.rainChance}</span>
                                        <span className="text-[10px] font-medium opacity-50">%</span>
                                    </div>
                                    <div className={cn(
                                        "flex flex-col items-center justify-center p-2 rounded-xl backdrop-blur-md transition-transform hover:scale-[1.02]",
                                        isDarkTheme ? "bg-white/10 border border-white/10" : "bg-black/5 border border-black/5"
                                    )}>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <Sun className="opacity-90" size={22} />
                                            <span className="text-[9px] font-bold opacity-60 uppercase tracking-widest">Indice UV</span>
                                        </div>
                                        <span className="text-3xl font-black">{selectedDay.uv}</span>
                                        <span className="text-[10px] font-medium opacity-50">Nivel</span>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            // GRID VIEW
                            <div className="grid grid-cols-5 gap-4 mb-auto mt-auto">
                                {forecastDays.map((day, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => setSelectedDay(day)}
                                        className={cn(
                                            "flex flex-col items-center p-4 rounded-2xl border transition-all cursor-pointer hover:scale-105",
                                            isDarkTheme
                                                ? "bg-black/60 border-white/10 hover:bg-black/80 hover:border-white/30"
                                                : "bg-white/60 border-black/10 hover:bg-white/80 hover:border-black/30"
                                        )}
                                    >
                                        <span className={cn(
                                            "text-sm font-bold uppercase mb-2",
                                            isDarkTheme ? "text-gray-200" : "text-gray-800"
                                        )}>
                                            {formatShortDate(day.date)}
                                        </span>

                                        <div className="mb-3 transform scale-110">
                                            {getWeatherIcon(day.conditionCode)}
                                        </div>

                                        <div className="flex flex-col items-center gap-0.5">
                                            <span className={cn("text-3xl font-bold", isDarkTheme ? "text-white" : "text-black")}>
                                                {day.maxTemp}°
                                            </span>
                                            <span className={cn("text-lg", isDarkTheme ? "text-gray-400" : "text-gray-600")}>
                                                {day.minTemp}°
                                            </span>
                                        </div>

                                        <span className={cn(
                                            "text-[11px] text-center mt-3 opacity-80 leading-tight line-clamp-2 h-8 font-medium px-2",
                                            isDarkTheme ? "text-gray-300" : "text-gray-700"
                                        )}>
                                            {day.conditionText}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default WeatherOverlay;
