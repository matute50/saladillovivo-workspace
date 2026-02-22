
import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabaseClient';

const BASE_URL = 'https://saladillovivo.vercel.app'; // Replace with your actual domain

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch articles for dynamic routes
  const { data: articles, error: articlesError } = await supabase
    .from('articles')
    .select('slug, updatedAt');

  if (articlesError) {
    console.error('Error fetching articles for sitemap:', articlesError);
    return [];
  }

  const articleEntries: MetadataRoute.Sitemap = articles?.map(({ slug, updatedAt }) => ({
    url: `${BASE_URL}/noticia/${slug}`,
    lastModified: new Date(updatedAt),
    changeFrequency: 'weekly',
    priority: 0.8,
  })) || [];

  // Fetch categories for dynamic routes
  const { data: categories, error: categoriesError } = await supabase
    .from('articles')
    .select('featureStatus');

  if (categoriesError) {
    console.error('Error fetching categories for sitemap:', categoriesError);
    return []; // Or just return the article entries
  }

  const uniqueCategories = [...new Set(categories?.map(item => item.featureStatus).filter(Boolean))];

  const categoryEntries: MetadataRoute.Sitemap = uniqueCategories.map((categoria) => ({
    url: `${BASE_URL}/categoria/${categoria}`,
    lastModified: new Date(), // Categories don't have a timestamp, so use current date
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    ...articleEntries,
    ...categoryEntries,
  ];
}
