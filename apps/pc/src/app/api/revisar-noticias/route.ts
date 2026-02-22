// Ruta: src/app/api/revisar-noticias/route.ts

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; // Usa tu cliente de Supabase

// Esta es la función que Vercel "despertará" cada hora
export async function GET(request: Request) {
  
  // 1. SEGURIDAD: Verifica el Secreto del Cron Job
  // (Para evitar que cualquiera pueda llamar a esta API)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. BUSCAR: Encuentra UN artículo que esté listo
  const { data: articles, error: findError } = await supabase
    .from('articles')
    .select('id, title, slug, description, miniatura_url, og_image_url') // Pedimos todos los datos
    .not('miniatura_url', 'is', null) // Debe tener ambas miniaturas
    .not('og_image_url', 'is', null)
    .lte('publish_at', new Date().toISOString()) // La hora de publicación ya pasó
    .eq('is_published', false) // Y no ha sido publicado
    .order('publish_at', { ascending: true }) // El más antiguo primero
    .limit(1); // ¡Solo uno a la vez!

  if (findError) {
    console.error('Error de Supabase al buscar artículo:', findError);
    return NextResponse.json({ error: 'Supabase find error' }, { status: 500 });
  }

  if (!articles || articles.length === 0) {
    // No hay noticias nuevas, no hacemos nada.
    // Esto costará 0 créditos en Make.com.
    return NextResponse.json({ message: 'No new articles to publish.' });
  }

  const article = articles[0];
  const articleUrl = `https://www.saladillovivo.com.ar/noticia/${article.slug}`;

  // 3. PREPARAR DATOS: Preparamos el "paquete" para Make.com
  const payload = {
    id: article.id, // El ID de Supabase
    title: article.title,
    link: articleUrl, // El enlace a la noticia
    description: article.description,
    instagramImageUrl: article.miniatura_url, // La URL 4:5
    facebookImageUrl: article.og_image_url   // La URL 1.91:1
  };

  // 4. LLAMAR AL WEBHOOK: Envía el "paquete" a Make.com
  const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL;
  if (!makeWebhookUrl) {
     console.error('MAKE_WEBHOOK_URL no está configurada en Vercel');
     return NextResponse.json({ error: 'Webhook URL not configured' }, { status: 500 });
  }

  try {
    const makeResponse = await fetch(makeWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!makeResponse.ok) {
      // Si Make.com falla (ej. error 500), NO marcamos la noticia.
      // Vercel la reintentará en la próxima hora.
      console.error('Make.com falló:', await makeResponse.text());
      return NextResponse.json({ error: 'Make.com webhook execution failed.' }, { status: 500 });
    }

    // 5. CONFIRMAR: Si Make.com tuvo éxito (200 OK), marcamos la noticia
    const { error: updateError } = await supabase
      .from('articles')
      .update({ is_published: true })
      .eq('id', article.id);

    if (updateError) {
      // Error crítico: Make publicó pero no pudimos marcarlo.
      console.error('CRÍTICO: Make.com tuvo éxito pero Supabase UPDATE falló:', updateError);
      return NextResponse.json({ error: 'Supabase update failed' }, { status: 500 });
    }

    // 6. ÉXITO TOTAL
    return NextResponse.json({ success: true, message: `Artículo ${article.id} enviado a Make.com.` });

  } catch (err: any) {
    console.error('Error al llamar a Make.com:', err.message);
    return NextResponse.json({ error: 'Webhook call failed', details: err.message }, { status: 500 });
  }
}