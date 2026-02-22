---
name: build-deployment-pipeline
description: Automatización completa del proceso de build y deployment de APKs Android TV. Incluye TWA automation, signing strategies, Gradle optimization y troubleshooting de errores comunes.
---

# Build & Deployment Pipeline v1.0

Sistema completo para automatizar la generación de APKs para Android TV desde aplicaciones Next.js web, utilizando Trusted Web Activity (TWA) como motor de conversión.

## 1. Arquitectura del Pipeline

### Componentes Clave
```
┌─────────────────┐
│  Next.js App    │ (saladillovivo-TV)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  TWA Builder    │ (bubblewrap/llama-pack)
│  + Configuración│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Gradle Build   │ (Memory optimized)
│  + AndroidX     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  APK Signing    │ (Keystore management)
│  + Alignment    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Final APK      │ (Installable on Android TV)
└─────────────────┘
```

## 2. Configuración Inicial

### A. Estructura de Directorios
```
project-root/
├── twa-project/          # Directorio del proyecto TWA generado
├── keystore/             # Almacenamiento seguro de keys
│   └── release-key.keystore
├── assets/               # Assets para la app
│   ├── icon.png         # 512x512 mínimo
│   └── banner.png       # 1920x1080 para Android TV
└── scripts/
    ├── build-twa.js     # Script de automatización
    └── sign-apk.js      # Script de firmado
```

### B. Dependencias Requeridas
```json
{
  "devDependencies": {
    "@bubblewrap/cli": "^1.21.0",
    "sharp": "^0.34.5"  // Ya instalado en tu proyecto
  }
}
```

### C. Variables de Entorno (.env.local)
```bash
# TWA Configuration
TWA_HOST="tv.saladillovivo.com.ar"
TWA_NAME="Saladillo Vivo TV"
TWA_PACKAGE_ID="ar.com.saladillovivo.tv"
TWA_VERSION_CODE=1
TWA_VERSION_NAME="1.0.0"

# Keystore Configuration (NUNCA versionar estas!)
KEYSTORE_PATH="./keystore/release-key.keystore"
KEYSTORE_PASSWORD="your-secure-password"
KEY_ALIAS="saladillovivo-tv"
KEY_PASSWORD="your-key-password"

# Build Configuration
GRADLE_OPTS="-Xmx4096m -XX:MaxMetaspaceSize=512m"
```

## 3. Scripts de Automatización

### A. Banner Generator (`scripts/generate-banner.js`)
```javascript
const sharp = require('sharp');
const fs = require('fs').promises;

/**
 * Genera el banner de Android TV desde un logo
 * Android TV requiere banner 1920x1080
 */
async function generateBanner(logoPath, outputPath) {
  const BANNER_WIDTH = 1920;
  const BANNER_HEIGHT = 1080;
  
  try {
    // Crear fondo con degradado
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
      .resize(800, 400, { // Logo a 800x400 aprox
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

module.exports = { generateBanner };
```

### B. TWA Builder (`scripts/build-twa.js`)
```javascript
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { generateBanner } = require('./generate-banner');

/**
 * Automatiza completamente el proceso de build del TWA
 */
async function buildTWA() {
  const config = {
    host: process.env.TWA_HOST,
    name: process.env.TWA_NAME,
    packageId: process.env.TWA_PACKAGE_ID,
    versionCode: process.env.TWA_VERSION_CODE,
    versionName: process.env.TWA_VERSION_NAME,
  };

  console.log('🚀 Iniciando build del TWA...');

  // 1. Generar assets requeridos
  console.log('📦 Generando assets...');
  await generateBanner(
    './public/logo.png',
    './assets/banner.png'
  );

  // 2. Inicializar proyecto TWA (solo primera vez)
  const twaDir = './twa-project';
  const twaExists = await fs.access(twaDir).then(() => true).catch(() => false);
  
  if (!twaExists) {
    console.log('🆕 Inicializando proyecto TWA...');
    
    // Crear directorio manualmente para evitar prompts
    await fs.mkdir(twaDir, { recursive: true });
    
    // Crear twa-manifest.json manualmente
    const manifest = {
      packageId: config.packageId,
      host: config.host,
      name: config.name,
      launcherName: config.name,
      display: "standalone",
      themeColor: "#DC2626",
      navigationColor: "#000000",
      backgroundColor: "#FFFFFF",
      enableNotifications: true,
      startUrl: "/",
      iconUrl: `https://${config.host}/icon-512.png`,
      maskableIconUrl: `https://${config.host}/icon-maskable-512.png`,
      monochromeIconUrl: `https://${config.host}/icon-mono-512.png`,
      splashScreenFadeOutDuration: 300,
      signingKey: {
        path: process.env.KEYSTORE_PATH,
        alias: process.env.KEY_ALIAS,
      },
      appVersionName: config.versionName,
      appVersionCode: parseInt(config.versionCode),
      shortcuts: [],
      generatorApp: "llama-pack",
      webManifestUrl: `https://${config.host}/manifest.json`,
      fallbackType: "customtabs",
      features: {
        appsFlyer: { enabled: false },
        playBilling: { enabled: false }
      },
      alphaDependencies: {
        enabled: false
      },
      enableSiteSettingsShortcut: true,
      isChromeOSOnly: false,
      isMetaQuest: false,
      orientation: "landscape", // ⭐ CRÍTICO para Android TV
      fingerprints: [],
      additionalTrustedOrigins: [],
      retainedBundles: [],
      appVersion: config.versionName
    };

    await fs.writeFile(
      path.join(twaDir, 'twa-manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    console.log('✅ Manifest creado');
  }

  // 3. Actualizar AndroidManifest.xml para Android TV
  console.log('📝 Configurando Android TV...');
  await updateAndroidManifest(twaDir);

  // 4. Copiar banner a drawable folders
  console.log('🖼️ Copiando banner...');
  await copyBanner(twaDir);

  // 5. Optimizar Gradle para builds grandes
  console.log('⚙️ Optimizando Gradle...');
  await optimizeGradle(twaDir);

  // 6. Build del APK
  console.log('🔨 Building APK...');
  try {
    execSync('npx @bubblewrap/cli build', {
      cwd: twaDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        GRADLE_OPTS: process.env.GRADLE_OPTS || '-Xmx4096m'
      }
    });
    console.log('✅ APK generado exitosamente!');
  } catch (error) {
    console.error('❌ Error en build:', error.message);
    throw error;
  }
}

/**
 * Actualiza AndroidManifest.xml para Android TV
 */
async function updateAndroidManifest(twaDir) {
  const manifestPath = path.join(twaDir, 'app/src/main/AndroidManifest.xml');
  
  // Leer manifest actual
  let manifest = await fs.readFile(manifestPath, 'utf-8');

  // Agregar soporte Android TV si no existe
  if (!manifest.includes('android.software.leanback')) {
    manifest = manifest.replace(
      '<application',
      `<uses-feature
        android:name="android.software.leanback"
        android:required="true" />
    <uses-feature
        android:name="android.hardware.touchscreen"
        android:required="false" />
    
    <application`
    );
  }

  // Agregar banner a launcher activity
  if (!manifest.includes('android:banner')) {
    manifest = manifest.replace(
      '<activity',
      `<activity
        android:banner="@drawable/banner"`
    );
  }

  await fs.writeFile(manifestPath, manifest);
}

/**
 * Copia el banner a todos los drawable folders
 */
async function copyBanner(twaDir) {
  const drawableFolders = [
    'drawable-xhdpi',
    'drawable-xxhdpi',
    'drawable-xxxhdpi'
  ];

  const sourceBanner = './assets/banner.png';
  
  for (const folder of drawableFolders) {
    const destDir = path.join(twaDir, 'app/src/main/res', folder);
    await fs.mkdir(destDir, { recursive: true });
    await fs.copyFile(sourceBanner, path.join(destDir, 'banner.png'));
  }
}

/**
 * Optimiza configuración de Gradle
 */
async function optimizeGradle(twaDir) {
  const gradlePropsPath = path.join(twaDir, 'gradle.properties');
  
  const optimizations = `
# Memory Optimization
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError
org.gradle.daemon=true
org.gradle.parallel=true
org.gradle.caching=true

# AndroidX Migration
android.useAndroidX=true
android.enableJetifier=true

# Build Performance
android.enableR8.fullMode=true
`;

  let existingProps = '';
  try {
    existingProps = await fs.readFile(gradlePropsPath, 'utf-8');
  } catch (e) {
    // Archivo no existe, crear nuevo
  }

  // Merge sin duplicados
  const lines = new Set([...existingProps.split('\n'), ...optimizations.split('\n')]);
  await fs.writeFile(gradlePropsPath, Array.from(lines).join('\n'));
}

// Ejecutar si se llama directamente
if (require.main === module) {
  buildTWA().catch(console.error);
}

module.exports = { buildTWA };
```

### C. APK Signer (`scripts/sign-apk.js`)
```javascript
const { execSync } = require('child_process');
const path = require('path');

/**
 * Firma y alinea el APK para release
 */
function signAPK(unsignedApkPath, outputPath) {
  console.log('✍️ Firmando APK...');

  const keystorePath = process.env.KEYSTORE_PATH;
  const keystorePass = process.env.KEYSTORE_PASSWORD;
  const keyAlias = process.env.KEY_ALIAS;
  const keyPass = process.env.KEY_PASSWORD;

  // 1. Firmar con jarsigner
  try {
    execSync(
      `jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 ` +
      `-keystore ${keystorePath} -storepass ${keystorePass} ` +
      `-keypass ${keyPass} ${unsignedApkPath} ${keyAlias}`,
      { stdio: 'inherit' }
    );
    console.log('✅ APK firmado');
  } catch (error) {
    console.error('❌ Error firmando APK:', error.message);
    throw error;
  }

  // 2. Alinear con zipalign
  try {
    execSync(
      `zipalign -v 4 ${unsignedApkPath} ${outputPath}`,
      { stdio: 'inherit' }
    );
    console.log(`✅ APK alineado: ${outputPath}`);
  } catch (error) {
    console.error('❌ Error alineando APK:', error.message);
    throw error;
  }

  // 3. Verificar firma
  try {
    execSync(`jarsigner -verify -verbose -certs ${outputPath}`, {
      stdio: 'inherit'
    });
    console.log('✅ Firma verificada correctamente');
  } catch (error) {
    console.error('❌ Verificación de firma falló:', error.message);
    throw error;
  }

  return outputPath;
}

module.exports = { signAPK };
```

## 4. Troubleshooting de Errores Comunes

### Error: "Resource not found: banner.png"
**Causa:** El banner no se copió correctamente a los drawable folders.

**Solución:**
```bash
# Verificar que existan estos directorios:
twa-project/app/src/main/res/drawable-xhdpi/banner.png
twa-project/app/src/main/res/drawable-xxhdpi/banner.png
twa-project/app/src/main/res/drawable-xxxhdpi/banner.png
```

### Error: "Out of Memory Error" durante build
**Causa:** Gradle se queda sin memoria en builds grandes.

**Solución:**
```bash
# En .env.local, aumentar memoria:
GRADLE_OPTS="-Xmx4096m -XX:MaxMetaspaceSize=512m"

# O directamente en gradle.properties:
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m
```

### Error: "Failed to finalize session"
**Causa:** AndroidX/Jetifier no configurado correctamente.

**Solución:**
- Verificar que `gradle.properties` tenga:
  ```properties
  android.useAndroidX=true
  android.enableJetifier=true
  ```

### Error: "Keystore was tampered with, or password was incorrect"
**Causa:** Credenciales incorrectas en `.env.local`.

**Solución:**
1. Verificar password del keystore
2. Regenerar keystore si es necesario:
```bash
keytool -genkey -v -keystore keystore/release-key.keystore \
  -alias saladillovivo-tv -keyalg RSA -keysize 2048 -validity 10000
```

### Error: App no aparece en Android TV Launcher
**Causa:** Falta configuración de leanback en AndroidManifest.

**Solución:**
Verificar que `AndroidManifest.xml` tenga:
```xml
<uses-feature
    android:name="android.software.leanback"
    android:required="true" />

<application
    android:banner="@drawable/banner"
    ...
```

## 5. Workflow Completo

### Desarrollo Local
```bash
# 1. Desarrollar en Next.js
npm run dev

# 2. Build de producción
npm run build

# 3. Deploy a Vercel (o hosting de tu elección)
vercel --prod

# 4. Generar TWA una vez deployado
node scripts/build-twa.js
```

### Release a Production
```bash
# 1. Incrementar versión en .env.local
TWA_VERSION_CODE=2
TWA_VERSION_NAME="1.0.1"

# 2. Build + Sign automático
node scripts/build-twa.js
node scripts/sign-apk.js \
  ./twa-project/app/build/outputs/apk/release/app-release-unsigned.apk \
  ./releases/saladillovivo-tv-v1.0.1.apk

# 3. Verificar APK
adb install releases/saladillovivo-tv-v1.0.1.apk

# 4. Upload a Play Store Console
# (Manual o via play-publisher API)
```

## 6. Optimizaciones Avanzadas

### A. Build Caching
```javascript
// En scripts/build-twa.js, agregar check de cambios
const crypto = require('crypto');

async function shouldRebuild() {
  const manifestHash = crypto
    .createHash('sha256')
    .update(await fs.readFile('./public/manifest.json'))
    .digest('hex');

  const cachedHash = await fs.readFile('./.build-cache', 'utf-8')
    .catch(() => '');

  if (manifestHash === cachedHash) {
    console.log('⚡ No hay cambios, usando build cacheado');
    return false;
  }

  await fs.writeFile('./.build-cache', manifestHash);
  return true;
}
```

### B. Parallel Builds
```javascript
// Build múltiples variantes en paralelo
async function buildAllVariants() {
  const variants = ['tv', 'mobile'];
  
  await Promise.all(
    variants.map(variant => buildTWA({ variant }))
  );
}
```

### C. Auto-Increment de Versión
```javascript
// En scripts/build-twa.js
async function incrementVersion() {
  const envPath = './.env.local';
  let env = await fs.readFile(envPath, 'utf-8');
  
  const currentCode = parseInt(env.match(/TWA_VERSION_CODE=(\d+)/)[1]);
  env = env.replace(
    /TWA_VERSION_CODE=\d+/,
    `TWA_VERSION_CODE=${currentCode + 1}`
  );
  
  await fs.writeFile(envPath, env);
  console.log(`📈 Version incrementada: ${currentCode + 1}`);
}
```

## 7. Integration con CI/CD

### GitHub Actions Workflow (`.github/workflows/build-apk.yml`)
```yaml
name: Build Android TV APK

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          distribution: 'temurin'
          java-version: '17'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Decode keystore
        run: |
          echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 -d > keystore/release-key.keystore
          
      - name: Build APK
        env:
          KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
        run: node scripts/build-twa.js
        
      - name: Upload APK
        uses: actions/upload-artifact@v3
        with:
          name: saladillovivo-tv-apk
          path: ./twa-project/app/build/outputs/apk/release/*.apk
```

---

## Checklist de Pre-Release

Antes de publicar un APK, verificar:

- [ ] ✅ Manifest.json actualizado en web
- [ ] ✅ Iconos 512x512 disponibles en public/
- [ ] ✅ Banner 1920x1080 generado correctamente
- [ ] ✅ Versión incrementada en .env.local
- [ ] ✅ Build local exitoso sin warnings
- [ ] ✅ APK instalado y probado en Android TV físico
- [ ] ✅ Navegación con control remoto funciona
- [ ] ✅ Videos se reproducen correctamente
- [ ] ✅ Deep links funcionan (compartir desde otra app)
- [ ] ✅ Keystore seguro y respaldado

---

**Versión del Skill:** v1.0  
**Última actualización:** 2026-02-15  
**Proyecto:** Saladillo Vivo TV
