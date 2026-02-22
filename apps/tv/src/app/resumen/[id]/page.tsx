
import TvModeLayout from "@/components/layout/TvModeLayout";
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Resumen de Noticias - Saladillo Vivo TV',
    description: 'Mira el resumen de noticias y videos seleccionados para hoy.',
};

export default function ResumenPage({ params }: { params: { id: string } }) {
    return (
        <main>
            <TvModeLayout resumenId={params.id} />
        </main>
    );
}
