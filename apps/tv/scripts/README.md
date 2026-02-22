# 📝 README - Scripts de Build

## Scripts Creados

### 1. `generate-banner.js`
Genera el banner de 1920x1080 requerido para Android TV.

**Uso:**
```bash
node scripts/generate-banner.js [logo-path] [output-path]

# Ejemplo:
node scripts/generate-banner.js ./public/logo.png ./assets/banner.png
```

### 2. `build-twa.js` (Por implementar)
Automatiza completamente el proceso de build del TWA.

Ver el skill `build-deployment-pipeline/SKILL.md` para el código completo.

### 3. `sign-apk.js` (Por implementar)
Firma y alinea APKs para release.

Ver el skill `build-deployment-pipeline/SKILL.md` para el código completo.

---

## Próximos Pasos

1. **Generar Keystore** (solo primera vez):
```bash
keytool -genkey -v -keystore keystore/release-key.keystore \
  -alias saladillovivo-tv -keyalg RSA -keysize 2048 -validity 10000
```

2. **Configurar .env.local**:
- Copiar `.env.local.template` a `.env.local`
- Completar las credenciales del keystore

3. **Implementar `build-twa.js`**:
Ver código completo en `.agent/skills/build-deployment-pipeline/SKILL.md`

4. **Ejecutar primer build**:
```bash
node scripts/build-twa.js
```

---

Ver documentación completa en: `.agent/skills/build-deployment-pipeline/SKILL.md`
