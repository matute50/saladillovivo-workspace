import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const slugify = (text: string | undefined | null, id: number | string): string => {
  if (!text) {
    text = ''; // Default to empty string if text is undefined or null
  }
  const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;'
  const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrssssssttuuuuuuuuuwxyyzzz------'
  const p = new RegExp(a.split('').join('|'), 'g')

  return text.toString().toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(p, c => b.charAt(a.indexOf(c))) // Replace special characters
    .replace(/&/g, '-and-') // Replace & with 'and'

    // --- ARREGLO 1: Quitado el '\' de [^\w-]+ ---
    .replace(/[^\w-]+/g, '') // Remove all non-word chars

    // --- ARREGLO 2: Quitado el '\' de /--+/g ---
    .replace(/--+/g, '-') // Replace multiple - with single -

    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, '') + '-' + id // Trim - from end of text and append id
}

export const formatDate = (dateString: string, format: 'short' | 'numeric' = 'numeric'): string => {
  if (!dateString) return 'Fecha no disponible';

  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: format === 'short' ? 'short' : 'numeric',
    year: format === 'short' ? 'numeric' : '2-digit',
  };

  try {
    return new Date(dateString).toLocaleDateString('es-ES', options);
  } catch (error) {
    console.error("Error al formatear fecha:", dateString, error);
    return 'Fecha inválida';
  }
};

export function isValidSlideUrl(url: string | null | undefined): url is string {

  if (!url) {

    return false;
  }
  const startsWithCorrectPrefix = url.startsWith('https://media.saladillovivo.com.ar/slides/');

  const includesWebm = url.includes('.webm');

  return startsWithCorrectPrefix && includesWebm;
}

export const isYouTubeVideo = (url: string) => {
  return url.includes('youtu.be/') || url.includes('youtube.com/');
};

export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export const cleanTitle = (title: string | undefined | null): string => {
  if (!title) return '';
  return title.replace(/\|/g, '').trim();
};
