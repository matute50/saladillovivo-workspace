const sharp = require('sharp');
const fs = require('fs').promises;

/**
 * generate-banner.js
 * Genera el banner de Android TV desde un logo
 * Android TV requiere banner 1920x1080
 */

const BANNER_WIDTH = 1920;
const BANNER_HEIGHT = 1080;

async function generateBanner(logoPath, outputPath) {
    try {
        console.log(`📦 Generando banner desde ${logoPath}...`);

        // Crear fondo con degradado rojo Saladillo
        const background = await sharp({
            create: {
                width: BANNER_WIDTH,
                height: BANNER_HEIGHT,
                channels: 4,
                background: { r: 220, g: 38, b: 38, alpha: 1 } // Rojo Saladillo
            }
        })
            .png()
            .toBuffer();

        // Cargar y redimensionar logo
        const logo = await sharp(logoPath)
            .resize(800, 400, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .toBuffer();

        // Compositar logo centrado sobre fondo
        await sharp(background)
            .composite([{
                input: logo,
                gravity: 'center'
            }])
            .png()
            .toFile(outputPath);

        console.log(`✅ Banner generado: ${outputPath}`);
        return outputPath;
    } catch (error) {
        console.error('❌ Error generando banner:', error);
        throw error;
    }
}

// Si se ejecuta directamente
if (require.main === module) {
    const logoPath = process.argv[2] || './public/logo.png';
    const outputPath = process.argv[3] || './assets/banner.png';

    generateBanner(logoPath, outputPath)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { generateBanner };
