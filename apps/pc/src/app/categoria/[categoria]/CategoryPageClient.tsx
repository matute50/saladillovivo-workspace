'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NewsCard from '@/components/NewsCard';
import { Article } from '@/lib/types';
import React from 'react'; // Don't forget to import React

interface CategoryPageClientProps {
  categoria: string;
  initialData: Article[];
}

const CategoryPageClient: React.FC<CategoryPageClientProps> = ({ categoria, initialData }) => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link href="/">
          <Button variant="ghost" className="mb-4 -ml-3">
            <ArrowLeft size={16} className="mr-2" />
            Volver a inicio
          </Button>
        </Link>
        
        <h1 className="text-3xl font-bold mb-2 capitalize">
          Categoría: {categoria}
        </h1>
        <p className="text-muted-foreground">
          Explora las últimas noticias sobre {categoria}
        </p>
      </div>

      {initialData.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {initialData.map((noticia, index) => (
            <NewsCard
              key={noticia.id}
              newsItem={noticia}
              index={index}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium mb-2">No hay noticias disponibles</h3>
          <p className="text-muted-foreground mb-6">
            No se encontraron noticias en esta categoría.
          </p>
          <Link href="/">
            <Button>
              Volver a la página principal
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default CategoryPageClient;