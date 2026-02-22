import type { Article, Video, Interview, Banner, Ad, CalendarEvent, SupabaseArticle } from './types';

// Helper to ensure Supabase credentials are set
function checkSupabaseCredentials() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Supabase URL or Anon Key is not defined.');
        throw new Error('Supabase configuration is missing.');
    }
    return { supabaseUrl, supabaseAnonKey };
}

/**
 * Fetches articles from Supabase and categorizes them into featured and secondary.
 */
export async function getArticlesForHome(limitTotal: number = 25) {
    const { supabaseUrl, supabaseAnonKey } = checkSupabaseCredentials();
    const now = new Date().toISOString();

    const apiUrl = `${supabaseUrl}/rest/v1/articles?select=id,title,image_url,featureStatus,slug,updatedAt,created_at,published_at,url_slide,audio_url,description,animation_duration&or=(published_at.is.null,published_at.lte.${now})&order=created_at.desc&limit=${limitTotal}`;

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            next: { revalidate: 60 }
        });

        if (!response.ok) {
            console.error('Supabase fetch failed in getArticlesForHome. Status:', response.status);
            return { featuredNews: null, secondaryNews: [], tertiaryNews: [], otherNews: [], allNews: [] };
        }
        const rawArticles = await response.json();
        if (!Array.isArray(rawArticles)) {
            return { featuredNews: null, secondaryNews: [], tertiaryNews: [], otherNews: [], allNews: [] };
        }
        const articles: SupabaseArticle[] = rawArticles as SupabaseArticle[];

        let featuredNews: Article | null = null;
        const secondaryList: Article[] = [];
        const tertiaryList: Article[] = [];
        const othersList: Article[] = [];
        const processedNews: Article[] = [];

        for (const item of articles) {
            const article: Article = {
                id: item.id,
                titulo: item.title,
                slug: item.slug || item.id.toString(),
                description: item.description || 'Descripción no disponible.',
                resumen: item.description ? item.description.substring(0, 150) + (item.description.length > 150 ? '...' : '') : 'Resumen no disponible.',
                contenido: item.description || 'Contenido no disponible.',
                fecha: item.updatedAt || item.created_at || now,
                created_at: item.created_at || now,
                updatedAt: item.updatedAt || item.created_at || now,
                autor: 'Equipo Editorial',
                categoria: item.featureStatus,
                imageUrl: item.image_url || 'https://saladillovivo.vercel.app/default-og-image.png',
                featureStatus: item.featureStatus,
                meta_title: item.meta_title,
                meta_description: item.meta_description,
                meta_keywords: item.meta_keywords,
                audio_url: item.audio_url,
                url_slide: item.url_slide,
                animation_duration: item.animation_duration ? Number(item.animation_duration) : undefined,
            };

            processedNews.push(article);

            if (!featuredNews && (article.featureStatus === 'featured' || articles.length === 1)) {
                featuredNews = article;
            } else if (article.featureStatus === 'secondary') {
                secondaryList.push(article);
            } else if (article.featureStatus === 'tertiary') {
                tertiaryList.push(article);
            } else {
                if (article.id !== featuredNews?.id) {
                    othersList.push(article);
                }
            }
        }

        if (!featuredNews && processedNews.length > 0) {
            featuredNews = processedNews[0];
            secondaryList.filter(n => n.id !== featuredNews?.id);
            tertiaryList.filter(n => n.id !== featuredNews?.id);
            othersList.filter(n => n.id !== featuredNews?.id);
        }

        const orderedNews: Article[] = featuredNews ? [featuredNews] : [];
        const remainingToDistribute = [...secondaryList, ...tertiaryList, ...othersList].filter(n => n.id !== featuredNews?.id);

        remainingToDistribute.forEach((item, index) => {
            if (index % 2 === 0) {
                orderedNews.unshift(item); // Izquierda
            } else {
                orderedNews.push(item);    // Derecha
            }
        });

        return {
            featuredNews,
            secondaryNews: secondaryList,
            tertiaryNews: tertiaryList,
            otherNews: othersList,
            allNews: orderedNews,
        };

    } catch (error) {
        console.error('Error in getArticlesForHome:', error);
        return { featuredNews: null, secondaryNews: [], tertiaryNews: [], otherNews: [], allNews: [] };
    }
}

export async function getVideosForHome(limitRecent: number = 4) {
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

    const { supabaseUrl, supabaseAnonKey } = checkSupabaseCredentials();
    const apiUrl = `${supabaseUrl}/rest/v1/videos?select=id,nombre,url,createdAt,categoria,imagen,novedad,forzar_video,volumen_extra&categoria=not.ilike.*HCD*&order=createdAt.desc&limit=150`;

    let videos: Video[] = [];
    try {
        const response = await fetch(apiUrl, {
            headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            next: { revalidate: 60 }
        });

        if (response.ok) {
            videos = await response.json();
        }
    } catch (err) {
        console.error('Exception in getVideosForHome:', err);
    }

    if (videos.length === 0) {
        return { featuredVideo: null, recentVideos: [], allVideos: [], videoCategories: [] };
    }
    const videoCategories = [...new Set(videos.map(v => v.categoria).filter(Boolean))].sort();

    const forcedVideos: Video[] = [];
    const otherVideos: Video[] = [];

    for (const video of videos) {
        if (video.novedad && video.createdAt <= fourDaysAgo) {
            video.novedad = false;
        }
        if (video.forzar_video && video.createdAt > twelveHoursAgo) {
            forcedVideos.push(video);
        } else {
            otherVideos.push(video);
        }
    }

    for (let i = otherVideos.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [otherVideos[i], otherVideos[j]] = [otherVideos[j], otherVideos[i]];
    }

    let featuredVideo: Video | null = null;
    const recentVideos: Video[] = [];

    if (forcedVideos.length > 0) {
        featuredVideo = forcedVideos[0];
        recentVideos.push(...forcedVideos.slice(1), ...otherVideos);
    } else {
        const featuredIndex = otherVideos.findIndex(v => v.novedad);
        if (featuredIndex !== -1) {
            featuredVideo = otherVideos[featuredIndex];
            otherVideos.splice(featuredIndex, 1);
        } else if (otherVideos.length > 0) {
            featuredVideo = otherVideos.shift()!;
        }
        recentVideos.push(...otherVideos);
    }

    return {
        featuredVideo,
        recentVideos: recentVideos.slice(0, limitRecent),
        allVideos: featuredVideo ? [featuredVideo, ...recentVideos] : recentVideos,
        videoCategories,
    };
}

export async function getRandomVideo(): Promise<Video | null> {
    const { supabaseUrl, supabaseAnonKey } = checkSupabaseCredentials();
    const apiUrl = `${supabaseUrl}/rest/v1/rpc/get_random_video_excluding_sv`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'application/json'
            },
            next: { revalidate: 30 }
        });

        if (response.ok) {
            const data = await response.json();
            return data && data.length > 0 ? data[0] : null;
        }
    } catch (error) {
        console.error('Error fetching random video:', error);
    }
    return null;
}

export async function getNewRandomVideo(currentId?: string, currentCategory?: string): Promise<Video | null> {
    const { supabaseUrl, supabaseAnonKey } = checkSupabaseCredentials();

    let apiUrl = `${supabaseUrl}/rest/v1/videos?select=id,nombre,url,createdAt,categoria,imagen,novedad,forzar_video,volumen_extra&categoria=not.ilike.*HCD*&order=createdAt.desc&limit=60`;

    if (currentId) {
        apiUrl += `&id=neq.${currentId}`;
    }

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            next: { revalidate: 60 }
        });

        if (!response.ok) return null;
        const data = await response.json();

        if (!data || data.length === 0) {
            if (currentId || currentCategory) {
                return await getNewRandomVideo();
            }
            return null;
        }

        let candidates = data as Video[];

        if (currentCategory) {
            const categoryFiltered = candidates.filter(v => v.categoria !== currentCategory);
            if (categoryFiltered.length > 0) {
                candidates = categoryFiltered;
            }
        }

        const randomIndex = Math.floor(Math.random() * candidates.length);
        return candidates[randomIndex];
    } catch (error) {
        console.error('Error fetching videos for random selection:', error);
        return null;
    }
}

export async function getTickerTexts(): Promise<string[]> {
    const { supabaseUrl, supabaseAnonKey } = checkSupabaseCredentials();
    const apiUrl = `${supabaseUrl}/rest/v1/textos_ticker?select=text,isActive&isActive=eq.true&order=createdAt.asc&limit=20`;

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            next: { revalidate: 60 }
        });

        if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
                return data.map((t: { text: string }) => t.text).filter(Boolean);
            }
        }
    } catch (error) {
        console.warn('Error fetching ticker texts:', error);
    }
    return ["Bienvenido a Saladillo Vivo - Manténgase informado."];
}

export async function getVideoById(id: string): Promise<Video | null> {
    const { supabaseUrl, supabaseAnonKey } = checkSupabaseCredentials();
    const apiUrl = `${supabaseUrl}/rest/v1/videos?select=id,nombre,url,createdAt,categoria,imagen,novedad,volumen_extra&id=eq.${id}&maybeSingle=true`;

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            next: { revalidate: 60 }
        });

        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Error fetching video by ID:', error);
    }
    return null;
}

export async function getInterviews(): Promise<Interview[]> {
    const { supabaseUrl, supabaseAnonKey } = checkSupabaseCredentials();
    const apiUrl = `${supabaseUrl}/rest/v1/entrevistas?select=id,nombre,url,created_at,updated_at,categoria,imagen&order=created_at.desc&limit=50`;

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            next: { revalidate: 60 }
        });

        if (response.ok) {
            const data = await response.json();
            return (data || []).map((item: any): Interview => ({
                id: item.id,
                nombre: item.nombre,
                url: item.url,
                createdAt: item.created_at ? new Date(item.created_at).toISOString() : new Date().toISOString(),
                updatedAt: item.updated_at ? new Date(item.updated_at).toISOString() : (item.created_at ? new Date(item.created_at).toISOString() : new Date().toISOString()),
                categoria: item.categoria,
                imagen: item.imagen,
            }));
        }
    } catch (error) {
        console.error('Error fetching interviews:', error);
    }
    return [];
}

export async function getActiveBanners(): Promise<Banner[]> {
    const { supabaseUrl, supabaseAnonKey } = checkSupabaseCredentials();
    const apiUrl = `${supabaseUrl}/rest/v1/banner?select=id,imageUrl,nombre,isActive&isActive=eq.true&order=createdAt.desc&limit=10`;

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            next: { revalidate: 60 }
        });

        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Error fetching banners:', error);
    }
    return [];
}

export async function getActiveAds(): Promise<Ad[]> {
    const { supabaseUrl, supabaseAnonKey } = checkSupabaseCredentials();
    const apiUrl = `${supabaseUrl}/rest/v1/anuncios?select=id,imageUrl,name,isActive,linkUrl&isActive=eq.true&order=createdAt.desc&limit=20`;

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            next: { revalidate: 60 }
        });

        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Error fetching ads:', error);
    }
    return [];
}

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
    const { supabaseUrl, supabaseAnonKey } = checkSupabaseCredentials();
    const apiUrl = `${supabaseUrl}/rest/v1/eventos?select=nombre,fecha,hora&order=fecha.asc,hora.asc&limit=15`;

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            next: { revalidate: 60 }
        });

        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.warn('Error fetching calendar events:', error);
    }
    return [];
}

export async function getArticles() {
    const { allNews } = await getArticlesForHome(100);

    const destacada = allNews.find(a => a.featureStatus === 'featured') || null;
    const noticias2 = allNews.filter(a => a.featureStatus === 'secondary');
    const noticias3 = allNews.filter(a => a.featureStatus === 'tertiary');
    const otrasNoticias = allNews.filter(a => !a.featureStatus);

    return {
        destacada,
        noticias2,
        noticias3,
        otrasNoticias,
        allNews,
    };
}

export async function getArticlesForRss(limit: number = 50): Promise<Article[]> {
    const { supabaseUrl, supabaseAnonKey } = checkSupabaseCredentials();
    const now = new Date().toISOString();

    const apiUrl = `${supabaseUrl}/rest/v1/articles?select=id,title,image_url,featureStatus,slug,description,published_at,audio_url,url_slide,animation_duration&or=(published_at.is.null,published_at.lte.${now})&order=created_at.desc&limit=${limit}`;

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`
            },
            next: { revalidate: 60 }
        });

        if (!response.ok) {
            console.error('Supabase fetch failed for RSS articles.');
            throw new Error(`Supabase fetch failed: ${response.statusText}`);
        }

        const articles: SupabaseArticle[] = await response.json();

        return articles.map((item: SupabaseArticle): Article => ({
            id: item.id,
            titulo: item.title,
            slug: item.slug || item.id.toString(),
            description: item.description || (item.text ? item.text.substring(0, 160) : 'Descripción no disponible.'),
            resumen: item.text ? item.text.substring(0, 150) + (item.text.length > 150 ? '...' : '') : 'Resumen no disponible.',
            contenido: item.text || 'Contenido no disponible.',
            fecha: item.updatedAt ? new Date(item.updatedAt).toISOString() : (item.created_at ? new Date(item.created_at).toISOString() : new Date().toISOString()),
            created_at: item.created_at ? new Date(item.created_at).toISOString() : new Date().toISOString(),
            updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : (item.created_at ? new Date(item.created_at).toISOString() : new Date().toISOString()),
            autor: 'Equipo Editorial',
            categoria: item.featureStatus,
            imageUrl: item.image_url || 'https://saladillovivo.vercel.app/default-og-image.png',
            featureStatus: item.featureStatus,
            meta_title: item.meta_title,
            meta_description: item.meta_description,
            meta_keywords: item.meta_keywords,
            audio_url: item.audio_url,
            url_slide: item.url_slide,
            animation_duration: item.animation_duration ? Number(item.animation_duration) : undefined,
        }));

    } catch (error) {
        console.error('Error in getArticlesForRss:', error);
        return [];
    }
}

export async function getVideos() {
    const { supabaseUrl, supabaseAnonKey } = checkSupabaseCredentials();
    const apiUrl = `${supabaseUrl}/rest/v1/videos?select=id,nombre,url,createdAt,categoria,imagen,novedad&order=createdAt.desc&limit=100`;

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            next: { revalidate: 60 }
        });

        if (response.ok) {
            const data = await response.json();
            return (data || []).map((item: any) => ({
                ...item,
                createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
            }));
        }
    } catch (error) {
        console.error('Error fetching videos:', error);
    }
    return [];
}

function filterSearchTerms(query: string): string {
    const stopWords = new Set([
        'el', 'la', 'los', 'las', 'un', 'una', 'y', 'o', 'pero', 'a', 'en', 'de', 'del', 'al',
        'por', 'para', 'con', 'buscar', 'encontrar', 'explorar', 'ver', 'video', 'videos'
    ]);

    const cleanedQuery = query
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 1 && !stopWords.has(word))
        .join(' & ');

    return cleanedQuery;
}

export async function fetchVideosBySearch(searchTerm: string): Promise<Video[]> {
    const processedTerm = filterSearchTerms(searchTerm);

    if (!processedTerm) {
        return [];
    }

    const { supabaseUrl, supabaseAnonKey } = checkSupabaseCredentials();
    const apiUrl = `${supabaseUrl}/rest/v1/videos?select=id,nombre,url,createdAt,categoria,imagen,novedad&nombre=fts.${encodeURIComponent(processedTerm)}&limit=50`;

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            next: { revalidate: 60 }
        });

        if (response.ok) {
            const data = await response.json();
            return (data || []).map((item: any) => ({
                ...item,
                createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
            }));
        }
    } catch (error) {
        console.error('Error searching videos:', error);
    }

    return [];
}

export async function getArticleById(id: string | number): Promise<Article | null> {
    const { supabaseUrl, supabaseAnonKey } = checkSupabaseCredentials();
    const now = new Date().toISOString();
    const apiUrl = `${supabaseUrl}/rest/v1/articles?select=id,title,image_url,featureStatus,slug,updatedAt,created_at,published_at,animation_duration,url_slide,audio_url,text&id=eq.${id}&maybeSingle=true`;

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            next: { revalidate: 60 }
        });

        if (!response.ok) return null;
        const item = await response.json();
        if (!item) return null;

        return {
            id: item.id,
            titulo: item.title,
            slug: item.slug || item.id.toString(),
            description: item.description || (item.text ? item.text.substring(0, 160) : 'Descripción no disponible.'),
            resumen: item.text ? item.text.substring(0, 150) + (item.text.length > 150 ? '...' : '') : 'Resumen no disponible.',
            contenido: item.text || 'Contenido no disponible.',
            fecha: item.updatedAt || item.created_at || now,
            created_at: item.created_at || now,
            updatedAt: item.updatedAt || item.created_at || now,
            autor: 'Equipo Editorial',
            categoria: item.featureStatus,
            imageUrl: item.image_url || 'https://saladillovivo.vercel.app/default-og-image.png',
            featureStatus: item.featureStatus,
            meta_title: item.meta_title,
            meta_description: item.meta_description,
            meta_keywords: item.meta_keywords,
            audio_url: item.audio_url,
            url_slide: item.url_slide,
            animation_duration: item.animation_duration ? Number(item.animation_duration) : undefined,
        };
    } catch (error) {
        console.error('Error in getArticleById:', error);
        return null;
    }
}

export async function getVideoByUrl(url: string): Promise<Video | null> {
    const { supabaseUrl, supabaseAnonKey } = checkSupabaseCredentials();
    const apiUrl = `${supabaseUrl}/rest/v1/videos?select=id,nombre,url,createdAt,categoria,imagen,novedad,volumen_extra&url=eq.${encodeURIComponent(url)}&maybeSingle=true`;

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            next: { revalidate: 60 }
        });

        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Error fetching video by URL:', error);
    }
    return null;
}
