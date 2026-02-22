'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Activity } from 'lucide-react';
import Image from 'next/image';

interface CreatorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CreatorModalNew: React.FC<CreatorModalProps> = ({ isOpen, onClose }) => {
    // New Component Version to force update
    // Bloquear scroll de fondo
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-neutral-900 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl border border-gray-200 dark:border-neutral-800 relative flex flex-col"
                    >
                        {/* Botón Cerrar - Mejorado */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 rounded-full bg-gray-200 dark:bg-neutral-800 hover:bg-red-500 hover:text-white text-gray-600 dark:text-gray-400 transition-all z-50 shadow-md"
                        >
                            <X size={24} />
                        </button>

                        {/* Contenido */}
                        <div className="p-6 md:p-8">

                            {/* Imagen Header */}
                            <div className="flex justify-center mb-6">
                                <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-blue-100 dark:border-blue-900/30">
                                    <Image
                                        src="/maraton.png"
                                        alt="Matías Vidal Maratón"
                                        className="object-cover"
                                        fill
                                        unoptimized
                                    />
                                </div>
                            </div>

                            {/* Encabezado */}
                            <div className="flex flex-col items-center text-center mb-6">
                                {/* <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-3 text-blue-600 dark:text-blue-400">
                                    <Code size={32} />
                                </div> */}
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Matías Vidal
                                </h2>
                                <p className="text-[#003399] dark:text-[#6699ff] font-bold text-xs tracking-widest uppercase mt-1">
                                    CREADOR DE SALADILLO VIVO
                                </p>
                            </div>

                            {/* Texto del cuerpo */}
                            <div className="space-y-4 text-sm md:text-base text-gray-700 dark:text-gray-300 leading-relaxed text-justify">
                                <p>
                                    Soy el creador de <span className="font-bold text-black dark:text-white">SALADILLO VIVO</span>, un medio local hecho desde cero con tecnología propia y una visión muy clara: conectar mi comunidad con contenidos relevantes y cercanos.
                                </p>

                                <p>
                                    Desde las apps para TV, web y móviles, el sistema de noticias, todo lo programé yo. No lo compré, no se lo pedí a nadie, no tercericé tareas: el código, el acopio de contenidos, la cámara, la edición y el streaming, salen de mis propias ideas.
                                </p>

                                <p>
                                    Nunca fue mi intención poner a funcionar una plataforma más, sino crear identidad.
                                </p>

                                <p>
                                    Quiero mostrar a <span className="font-semibold">Saladillo</span> en su diversidad: sus historias, sus voces, su arte, sus frutos, porque soy parte de una red viva llena de talentosos e incansables a los que acompaño desde mi lugar, ofreciendo este medio como espacio para que sus expresiones lleguen más lejos.
                                </p>

                                <div className="flex gap-3 pt-2">
                                    <Heart className="w-5 h-5 text-red-500 flex-shrink-0 mt-1" />
                                    <p>
                                        El motor detrás de todo esto no es una estrategia de negocio sino el amor por mi ciudad y el deseo de hacer mi aporte a nuestro sentido de pertenencia.
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <Activity className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                                    <p>
                                        Hago SALADILLO VIVO con la misma energía que me lleva, cada semana, a correr muchos kilómetros entrenando para una nueva maratón (11), donde cada paso es constancia, esfuerzo, y visión de llegada.
                                    </p>
                                </div>
                            </div>

                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CreatorModalNew;
