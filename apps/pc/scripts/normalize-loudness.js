/**
 * SCRIPT DE NORMALIZACIÓN DE AUDIO PARA SALADILLO VIVO (REFACTORIZADO)
 * 
 * Este script automatiza el cálculo del campo 'volumen_extra' en Supabase.
 * Objetivo: Que todos los videos suenen al nivel de "SEMBRANDO FUTURO".
 */

const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// RUTAS ABSOLUTAS (Winget)
const YTDLP_PATH = '"C:\\Users\\NOTEBOOK\\AppData\\Local\\Microsoft\\WinGet\\Packages\\yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe\\yt-dlp.exe"';
const FFMPEG_PATH = '"C:\\Users\\NOTEBOOK\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0.1-full_build\\bin\\ffmpeg.exe"';
const DENO_PATH = '"C:\\Users\\NOTEBOOK\\AppData\\Local\\Microsoft\\WinGet\\Packages\\DenoLand.Deno_Microsoft.Winget.Source_8wekyb3d8bbwe\\deno.exe"';

const REFERENCE_CATEGORY = 'SEMBRANDO FUTURO';

async function getLoudness(url) {
    try {
        console.log(`\n> Analizando: ${url}`);

        // 1. Obtener URL del stream con timeout de 60s
        console.log('  [1/2] Extrayendo URL del stream...');
        const getUrlCmd = `${YTDLP_PATH} --js-runtimes deno:${DENO_PATH} -f ba -g "${url}"`;
        const streamUrl = execSync(getUrlCmd, { timeout: 60000 }).toString().trim();

        if (!streamUrl) {
            console.error(`  [!] Error: No se obtuvo URL del stream`);
            return null;
        }

        // 2. Analizar volumen con ffmpeg con timeout de 120s
        console.log('  [2/2] MidLayout con FFmpeg...');
        const ffmpegCmd = `${FFMPEG_PATH} -i "${streamUrl}" -t 30 -filter:a loudnorm=print_format=json -f null - 2>&1`; // Analizamos solo primeros 30s
        const output = execSync(ffmpegCmd, { timeout: 120000 }).toString();

        const match = output.match(/\{[\s\S]*\}/);
        if (!match) {
            console.error('  [!] Error: FFmpeg no devolvió JSON de estadísticas');
            return null;
        }
        const stats = JSON.parse(match[0]);
        const loudness = parseFloat(stats.input_i);
        console.log(`  [OK] Nivel: ${loudness} LUFS`);
        return loudness;
    } catch (e) {
        console.error(`  [X] Error en ${url}:`, e.message);
        return null;
    }
}

async function run() {
    console.log('--- INICIANDO NORMALIZACIÓN AUTOMÁTICA ---');

    console.log(`\nBuscando video de referencia en "${REFERENCE_CATEGORY}"...`);
    const { data: refVideos } = await supabase
        .from('videos')
        .select('url, nombre')
        .eq('categoria', REFERENCE_CATEGORY)
        .limit(1);

    if (!refVideos || refVideos.length === 0) {
        console.error('Error: No se encontró video de referencia.');
        return;
    }

    const refLoudness = await getLoudness(refVideos[0].url);
    if (refLoudness === null) {
        console.error('Error: No se pudo analizar el video de referencia.');
        return;
    }

    console.log(`\nNIVEL DE REFERENCIA: ${refLoudness} LUFS`);

    const { data: allVideos } = await supabase
        .from('videos')
        .select('id, url, nombre, categoria');

    console.log(`Total de videos a procesar: ${allVideos.length}`);

    let processedCount = 0;
    for (const video of allVideos) {
        processedCount++;
        const progress = ((processedCount / allVideos.length) * 100).toFixed(2);
        console.log(`\n[${progress}%] Video ${processedCount}/${allVideos.length}: ${video.nombre}`);

        if (video.categoria === REFERENCE_CATEGORY) {
            await supabase.from('videos').update({ volumen_extra: 1.0 }).eq('id', video.id);
            continue;
        }

        const currentLoudness = await getLoudness(video.url);
        if (currentLoudness === null) continue;

        const diffDb = refLoudness - currentLoudness;
        const multiplier = Math.pow(10, diffDb / 20);
        // Limitamos el multiplicador entre 0.2 y 5.0 para seguridad
        const finalMultiplier = Math.min(Math.max(multiplier, 0.2), 5.0);

        console.log(`  [UPDATE] Multiplicador: ${finalMultiplier.toFixed(3)}`);

        await supabase
            .from('videos')
            .update({ volumen_extra: finalMultiplier })
            .eq('id', video.id);
    }

    console.log('\n--- PROCESO COMPLETADO ---');
}

run();
