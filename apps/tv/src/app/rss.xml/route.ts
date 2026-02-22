
import { NextResponse } from 'next/server';
import RSS from 'rss';
import { getArticlesForRss } from '@/lib/data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.saladillovivo.com.ar';

export async function GET() {
  const feed = new RSS({
    title: 'Saladillo Vivo - Últimas Noticias',
    description: 'El feed de noticias de Saladillo Vivo.',
    feed_url: `${SITE_URL}/rss.xml`,
    site_url: SITE_URL,
    language: 'es',
    pubDate: new Date(),
    ttl: 60,
    custom_namespaces: {
      'media': 'http://search.yahoo.com/mrss/'
    }
  });

  try {
    let allNews = await getArticlesForRss();
    allNews = allNews.filter(article => article.imageUrl);

    allNews.forEach(article => {
      if (article.imageUrl && article.slug) {
        const cleanThumbnailUrl = article.imageUrl.split('?')[0];
        const articleUrl = `${SITE_URL}/noticia/${article.slug}`;

        const facebookImageUrl = `${SITE_URL}/api/og?imageUrl=${encodeURIComponent(cleanThumbnailUrl)}&w=1200&h=630`;
        const instagramImageUrl = `${SITE_URL}/api/og?imageUrl=${encodeURIComponent(cleanThumbnailUrl)}&w=1080&h=1350`;

        feed.item({
          title: article.titulo,
          description: article.description || '',
          url: articleUrl,
          guid: article.id,
          date: article.created_at,
          custom_elements: [
            {
              'media:content': {
                _attr: {
                  url: facebookImageUrl,
                  medium: 'image',
                  type: 'image/png',
                  width: '1200',
                  height: '630',
                  'media:role': 'facebook'
                }
              }
            },
            {
              'media:content': {
                _attr: {
                  url: instagramImageUrl,
                  medium: 'image',
                  type: 'image/png',
                  width: '1080',
                  height: '1350',
                  'media:role': 'instagram'
                }
              }
            }
          ]
        });
      }
    });

    const xml = feed.xml({ indent: true });

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    });

  } catch (error) {
    console.error('Failed to generate RSS feed:', error);
    return new NextResponse('Could not generate RSS feed', { status: 500 });
  }
}
