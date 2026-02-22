import React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Article } from '@/lib/types';
import CategoryPageClient from './CategoryPageClient'; // Import the new client component

interface SupabaseArticleData {
  id: string;
  title: string;
  text: string;
  image_url?: string;
  featureStatus: 'featured' | 'secondary' | 'tertiary' | null;
  created_at: string; // My fix
  updatedAt: string;
  slug: string;
  description: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  audio_url?: string; // Add audio_url
  url_slide?: string; // From remote

}

// This function obtains the news for a specific category.
async function getNewsForCategory(category: string): Promise<Article[]> {
  const { data, error } = await supabase
    .from('articles')
    // My select query (with created_at, thumbnail_url, no imageUrl, and url_slide from remote)
    .select('id, title, text, image_url, featureStatus, created_at, updatedAt, slug, description, meta_title, meta_description, meta_keywords, audio_url, url_slide')
    .eq('featureStatus', category)
    .order('created_at', { ascending: false }); // My fix

  if (error) {
    console.error('Error fetching news for category:', error);
    return [];
  }

  return (data as SupabaseArticleData[] || []).map((item): Article => ({
    id: item.id,
    titulo: item.title,
    slug: item.slug || item.id.toString(),
    description: item.description || (item.text ? item.text.substring(0, 160) : 'Descripción no disponible.'),
    resumen: item.text ? item.text.substring(0, 150) + (item.text.length > 150 ? '...' : '') : 'Resumen no disponible.',
    contenido: item.text || 'Contenido no disponible.',
    fecha: item.created_at, // My fix
    created_at: item.created_at, // My fix
    updatedAt: item.updatedAt,
    autor: 'Equipo Editorial',
    categoria: item.featureStatus,
    imageUrl: item.image_url || 'https://saladillovivo.vercel.app/default-og-image.png', // My fix
    featureStatus: item.featureStatus,
    meta_title: item.meta_title,
    meta_description: item.meta_description,
    meta_keywords: item.meta_keywords,
    audio_url: item.audio_url,
    url_slide: item.url_slide, // Both had this, keep it.

  }));
}

// The page component is now a simple server component.
const CategoryPage = async ({ params }: { params: { categoria: string } }) => {
  const { categoria } = params;
  const categoryNews = await getNewsForCategory(categoria);

  // Renders the client component and passes the data to it.
  return (
    <CategoryPageClient
      categoria={categoria}
      initialData={categoryNews}
    />
  );
};

export default CategoryPage;

// The generateStaticParams function is kept as is (my version).
export async function generateStaticParams() {
  const { data, error } = await supabase.from('articles').select('featureStatus, created_at').order('created_at', { ascending: false }); // My fix

  if (error || !data) {
    console.error("Failed to fetch categories for static generation", error);
    return [];
  }

  const uniqueCategories = [...new Set(data.map(item => item.featureStatus).filter((status): status is string => typeof status === 'string' && status.trim() !== ''))];

  return uniqueCategories.map(categoria => ({
    categoria: categoria,
  }));
}