// Ruta: src/app/feed/make/route.ts

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; 

// Esta línea fuerza al servidor a generar el feed
// cada vez que se solicita, en lugar de cachearlo.
export const dynamic = 'force-dynamic';

// Función para "escapar" caracteres XML
function escapeXML(str: string) {
  if (!str) return '';
  return str.replace(/[<>&"']/g, (match) => {
    switch (match) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return match;
    }
  });
}

export async function GET() {
  // 1. Conectar a Supabase y obtener los artículos programados
  const { data: articles, error } = await supabase
    .from('articles')
    .select('id, title, slug, description, createdAt, miniatura_url, og_image_url') // Pedimos ambas miniaturas
    .not('miniatura_url', 'is', null) // Debe tener miniatura 4:5
    .not('og_image_url', 'is', null)  // Debe tener miniatura 1.91:1
    .lte('publish_at', new Date().toISOString()) // La hora de publicación es ahora o ya pasó
    .eq('is_published', false) // Y no ha sido publicado
    .order('createdAt', { ascending: true }) // Publica el más antiguo primero
    .limit(5); // Limita a 5 por si hay muchos en cola

  if (error) {
    console.error('Error fetching articles for Make.com RSS:', error);
    // Si hay un error, devuelve un feed vacío para que Make no falle
    return new NextResponse('<rss version="2.0"><channel></channel></rss>', {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }

  // 2. Construir el XML del Feed RSS
  const siteUrl = 'https://www.saladillovivo.com.ar';
  
  const rssHeader = `
    <rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
      <channel>
        <title>Saladillo Vivo - Feed de Publicación (para Make.com)</title>
        <link>${siteUrl}</link>
        <description>Feed de noticias programadas para publicar.</description>
        <language>es-ar</language>
  `.trim();

  // 3. Crear cada <item> del feed
  const items = articles.map(article => {
    const articleUrl = `${siteUrl}/noticia/${article.slug}`; 
    
    // Limpiamos las URLs (por si acaso)
    const miniaturaInstagram = article.miniatura_url.split('?')[0];
    const miniaturaFacebook = article.og_image_url.split('?')[0];
    
    return `
      <item>
        <title>${escapeXML(article.title)}</title>
        <link>${articleUrl}</link>
        <guid>${article.id}</guid> <pubDate>${new Date(article.createdAt).toUTCString()}</pubDate> 
        <description>${escapeXML(article.description || '')}</description>
        
        <media:content 
          url="${miniaturaInstagram}"
          medium="image" 
          type="image/jpeg"
          width="1080"
          height="1350"
        />
        
        <media:content 
          url="${miniaturaFacebook}"
          medium="image" 
          type="image/jpeg"
          width="1200"
          height="628"
        />
        
      </item>
    `;
  }).join('');

  const rssFooter = `
      </channel>
    </rss>
  `;

  // 4. Unir todo y enviarlo
  const xml = rssHeader + items + rssFooter;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}