import type { Metadata } from "next";
import TvModeLayout from "@/components/layout/TvModeLayout";
import {
  getVideosForHome,
  getTickerTexts
} from "@/lib/data";

export const revalidate = 60; // Revalida cada minuto

// Generación de Metadatos Simplificada
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Saladillo Vivo TV',
    description: 'Noticias, streaming en vivo y actualidad de Saladillo y la región optimizado para TV.',
  };
}

export default async function Page() {
  try {
    // Preheat cache
    await Promise.all([
      getVideosForHome(),
      getTickerTexts(),
    ]);
  } catch (error) {
    console.error("Error cargando datos en Page:", error);
  }

  return (
    <main>
      <TvModeLayout />
    </main>
  );
}