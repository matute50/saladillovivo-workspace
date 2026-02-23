// src/lib/data.ts
import { PageData, Video, Article, Ad } from '@/lib/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function getPageData(): Promise<PageData> {
  try {
    const fetchArticles = async () => {
      const url = `${supabaseUrl}/rest/v1/articles?select=id,title,description,image_url,created_at,slug,audio_url,url_slide,animation_duration,featureStatus&order=created_at.desc&limit=20`;
      const res = await fetch(url, { headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` }, next: { revalidate: 60 } });
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Articles fetch failed:', res.status, errorText);
        throw new Error(`Articles fetch failed: ${res.status}`);
      }
      return res.json();
    };

    // v25.0: Videos son on-demand — no se carga el catálogo completo en el inicio

    const fetchAds = async () => {
      const url = `${supabaseUrl}/rest/v1/anuncios?select=id,name,imageUrl,linkUrl,isActive,createdAt&isActive=eq.true&order=createdAt.desc`;
      const res = await fetch(url, { headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` }, next: { revalidate: 60 } });
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Ads fetch failed:', res.status, errorText);
        throw new Error(`Ads fetch failed: ${res.status}`);
      }
      return res.json();
    };

    const [articlesData, adsData] = await Promise.all([
      fetchArticles(),
      fetchAds()
    ]);
    const videosData: any[] = []; // Videos on-demand — no se pre-cargan

    const mappedArticles: Article[] = (articlesData || []).map((item: any) => {
      const backupImage = Array.isArray(item.images_urls) && item.images_urls.length > 0 ? item.images_urls[0] : null;
      const finalImageUrl = item.image_url || backupImage || '';

      return {
        id: String(item.id),
        titulo: (item.title || 'Sin título').replace(/\|/g, ' ').trim(),
        bajada: (item.description || '').trim(),
        imagen: item.image_url || backupImage || null,
        categoria: 'General',
        autor: 'Redacción',
        fecha: item.created_at || new Date().toISOString(),
        contenido: item.description || '',
        etiquetas: [],
        url_slide: item.url_slide || null,
        audio_url: item.audio_url || null,
        animation_duration: item.animation_duration || 45,
        slug: item.slug || '',
        featureStatus: item.featureStatus || null,
        description: (item.description || '').trim(),
        resumen: (item.description || '').trim(),
        created_at: item.created_at || new Date().toISOString(),
        updatedAt: item.created_at || new Date().toISOString(),
        imageUrl: finalImageUrl // Unificado
      };
    });

    const mappedVideos: Video[] = []; // On-demand: se solicitan individualmente

    const mappedAds: Ad[] = (adsData || []).map((item: any) => ({
      id: String(item.id),
      cliente: item.name || 'Anónimo',
      imagen_url: item.imageUrl || '',
      url: item.linkUrl || '',
      tipo: 'banner',
      fecha_inicio: item.createdAt || new Date().toISOString(),
      fecha_fin: item.createdAt || new Date().toISOString(),
      activo: item.isActive !== undefined ? item.isActive : true
    }));

    return {
      articles: {
        featuredNews: mappedArticles.length > 0 ? mappedArticles[0] : null,
        secondaryNews: mappedArticles.slice(1, 5),
        otherNews: mappedArticles.slice(5)
      },
      videos: { allVideos: mappedVideos, liveStream: null },
      ads: mappedAds
    };
  } catch (error) {
    console.error('❌ Error cargando datos:', error);
    return { articles: { featuredNews: null, secondaryNews: [], otherNews: [] }, videos: { allVideos: [], liveStream: null }, ads: [] };
  }
}

export async function getArticleById(id: string): Promise<Article | null> {
  const url = `${supabaseUrl}/rest/v1/articles?select=id,title,description,image_url,images_urls,created_at,slug,audio_url,url_slide,animation_duration,featureStatus&id=eq.${id}&limit=1`;

  try {
    const res = await fetch(url, { headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` }, next: { revalidate: 60 } });
    if (!res.ok) {
      console.error(`Article fetch failed for ID ${id}:`, res.status);
      return null;
    }
    const rawData = await res.json();
    const data = Array.isArray(rawData) ? rawData[0] : rawData;
    if (!data) {
      return null;
    }

    const backupImage = Array.isArray(data.images_urls) && data.images_urls.length > 0 ? data.images_urls[0] : null;
    const finalImageUrl = data.image_url || backupImage || '';

    return {
      id: String(data.id),
      titulo: (data.title || 'Sin título').replace(/\|/g, ' ').trim(),
      bajada: (data.description || '').trim(),
      imagen: finalImageUrl,
      categoria: 'General',
      autor: 'Redacción',
      fecha: data.created_at || new Date().toISOString(),
      contenido: data.description || '',
      etiquetas: [],
      url_slide: data.url_slide || null,
      audio_url: data.audio_url || null,
      animation_duration: data.animation_duration || 45,
      slug: data.slug || '',
      featureStatus: data.featureStatus || null,
      description: (data.description || '').trim(),
      resumen: (data.description || '').trim(),
      created_at: data.created_at || new Date().toISOString(),
      updatedAt: data.created_at || new Date().toISOString(),
      imageUrl: finalImageUrl
    };
  } catch (err) {
    console.error('Error in getArticleById:', err);
    return null;
  }
}

export async function getVideoById(id: string): Promise<Video | null> {
  const url = `${supabaseUrl}/rest/v1/videos?select=id,nombre,url,imagen,categoria,createdAt,volumen_extra&id=eq.${id}&limit=1`;

  try {
    const res = await fetch(url, { headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` }, next: { revalidate: 60 } });
    if (!res.ok) {
      console.error(`Video fetch failed for ID ${id}:`, res.status);
      return null;
    }
    const rawData = await res.json();
    const data = Array.isArray(rawData) ? rawData[0] : rawData;
    if (!data) {
      return null;
    }

    return {
      id: String(data.id),
      nombre: (data.nombre || 'Video sin nombre').replace(/\|/g, ' ').trim(),
      url: data.url || '',
      imagen: data.imagen || '',
      categoria: data.categoria || 'Varios',
      fecha: data.createdAt || new Date().toISOString(),
      volumen_extra: data.volumen_extra ? Number(data.volumen_extra) : 1,
      createdAt: data.createdAt || new Date().toISOString(),
      novedad: !!data.novedad
    };
  } catch (err) {
    console.error('Error in getVideoById:', err);
    return null;
  }
}

export async function fetchVideosByCategory(category: string): Promise<Video[]> {
  const url = `${supabaseUrl}/rest/v1/videos?select=id,nombre,url,imagen,categoria,createdAt,volumen_extra&categoria=eq.${encodeURIComponent(category)}&order=createdAt.desc&limit=100`;

  try {
    const res = await fetch(url, { headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` }, next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();

    return (data || []).map((item: any) => ({
      id: String(item.id),
      nombre: (item.nombre || 'Video sin nombre').replace(/\|/g, ' ').trim(),
      url: item.url || '',
      imagen: item.imagen || '',
      categoria: item.categoria || 'Varios',
      fecha: item.createdAt || new Date().toISOString(),
      volumen_extra: item.volumen_extra ? Number(item.volumen_extra) : 1,
      createdAt: item.createdAt || new Date().toISOString(),
      novedad: !!item.novedad
    }));
  } catch (err) {
    console.error(`Error fetching videos for category ${category}:`, err);
    return [];
  }
}

export async function fetchAvailableCategories(): Promise<string[]> {
  const url = `${supabaseUrl}/rest/v1/videos?select=categoria&limit=1000`;

  try {
    const res = await fetch(url, { headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` }, next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    const uniqueCategories = Array.from(new Set((data || []).map((v: any) => v.categoria))).filter(Boolean);
    return uniqueCategories as string[];
  } catch (err) {
    console.error("Error fetching available categories:", err);
    return [];
  }
}

export async function fetchVideosBySearch(query: string, signal?: AbortSignal): Promise<Video[]> {
  const url = `${supabaseUrl}/rest/v1/videos?select=id,nombre,url,imagen,categoria,createdAt,volumen_extra&nombre=ilike.*${encodeURIComponent(query)}*&limit=20`;

  try {
    const res = await fetch(url, { headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` }, next: { revalidate: 60 }, signal });
    if (!res.ok) return [];
    const data = await res.json();

    return (data || []).map((item: any) => ({
      id: String(item.id),
      nombre: (item.nombre || 'Video sin nombre').replace(/\|/g, ' ').trim(),
      url: item.url || '',
      imagen: item.imagen || '',
      categoria: item.categoria || 'Varios',
      fecha: item.createdAt || new Date().toISOString(),
      volumen_extra: item.volumen_extra ? Number(item.volumen_extra) : 1,
      createdAt: item.createdAt || new Date().toISOString(),
      novedad: !!item.novedad
    }));
  } catch (err) {
    console.error('Error searching videos:', err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────
// v25.0: Selección aleatoria on-demand — LIMIT 1 + OFFSET en Supabase
// Cada video se solicita individualmente, sin cargar el catálogo completo.
// ─────────────────────────────────────────────────────────────────
const FORBIDDEN_CAT_API = encodeURIComponent('HCD DE SALADILLO - Período 2025');
const BLOCKED_ID_API = '471';
const recentVideoIds: string[] = [];
const RECENT_HISTORY = 10;

function mapVideoRow(item: any): Video {
  return {
    id: String(item.id),
    nombre: (item.nombre || 'Video sin nombre').replace(/\|/g, ' ').trim(),
    url: item.url || '',
    imagen: item.imagen || '',
    categoria: item.categoria || 'Varios',
    fecha: item.createdAt || new Date().toISOString(),
    volumen_extra: item.volumen_extra ? Number(item.volumen_extra) : 1,
    createdAt: item.createdAt || new Date().toISOString(),
    novedad: !!item.novedad
  };
}

export async function fetchRandomVideo(excludeCategoria?: string, _retry = false): Promise<Video | null> {
  try {
    const AUTH = { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` };
    let filters = `url=not.is.null&categoria=neq.${FORBIDDEN_CAT_API}&id=neq.${BLOCKED_ID_API}`;
    if (excludeCategoria) filters += `&categoria=neq.${encodeURIComponent(excludeCategoria)}`;
    if (!_retry && recentVideoIds.length > 0) filters += `&id=not.in.(${recentVideoIds.join(',')})`;

    const countUrl = `${supabaseUrl}/rest/v1/videos?select=id&${filters}&limit=1`;
    const countRes = await fetch(countUrl, {
      headers: { ...AUTH, Prefer: 'count=exact', 'Range-Unit': 'items', Range: '0-0' }
    });
    const contentRange = countRes.headers.get('content-range') || '';
    const totalMatch = contentRange.match(/\/(\d+)$/);
    const total = totalMatch ? parseInt(totalMatch[1], 10) : 0;

    if (total === 0) {
      if (!_retry) return fetchRandomVideo(undefined, true);
      return null;
    }

    const offset = Math.floor(Math.random() * total);
    const videoUrl = `${supabaseUrl}/rest/v1/videos?select=id,nombre,url,imagen,categoria,createdAt,volumen_extra&${filters}&limit=1&offset=${offset}`;
    const videoRes = await fetch(videoUrl, { headers: AUTH, cache: 'no-store' });
    if (!videoRes.ok) return null;

    const data = await videoRes.json();
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;

    const video = mapVideoRow(row);
    recentVideoIds.push(video.id);
    if (recentVideoIds.length > RECENT_HISTORY) recentVideoIds.shift();
    return video;
  } catch (err) {
    console.error('Error in fetchRandomVideo:', err);
    return null;
  }
}