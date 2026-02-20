# Descargas Josan v2 — Guía de Migración

## ¿Qué ha cambiado?

| | v1 (anterior) | v2 (este proyecto) |
|---|---|---|
| **Tráfico diario** | >2 GB | <50 MB |
| **Guardado** | Todo el estado (~300KB) en cada cambio | Solo el registro exacto que cambia (~2KB) |
| **Conflictos entre usuarios** | Frecuentes ("el último en guardar gana") | Imposibles por diseño |
| **Base de datos** | 1 tabla con un JSON gigante | 12 tablas independientes por entidad |
| **Tiempo real** | Sobrescribe todo el estado | Solo actualiza el registro que cambió |

---

## PASO 1 — Crear el nuevo proyecto Supabase (30 min)

1. Entra en [supabase.com](https://supabase.com) y crea un proyecto nuevo  
   (ponle un nombre diferente, ej: `josan-v2`)
2. Ve a **Settings → API** y anota:
   - `URL del proyecto` → la necesitarás en el paso 3
   - `anon key` → la necesitarás en el paso 3
3. Ve a **SQL Editor** y ejecuta **todo** el contenido de `supabase_setup.sql`
4. Ve a **Authentication → Policies** y asegúrate de que los mismos usuarios pueden acceder

---

## PASO 2 — Migrar datos del proyecto actual (40 min)

1. Instala la dependencia del script:
   ```bash
   npm install node-fetch
   ```
2. Abre `migrate.js` y rellena las 4 constantes al principio:
   ```js
   const OLD_SUPABASE_URL  = 'https://TU_PROYECTO_ACTUAL.supabase.co';
   const OLD_SERVICE_KEY   = 'TU_SERVICE_ROLE_KEY_ACTUAL';
   const NEW_SUPABASE_URL  = 'https://TU_PROYECTO_NUEVO.supabase.co';
   const NEW_SERVICE_KEY   = 'TU_SERVICE_ROLE_KEY_NUEVO';
   ```
   > La **service_role key** está en Supabase → Settings → API → "service_role" (NO la anon key)
3. Ejecuta:
   ```bash
   node migrate.js
   ```
4. Verifica en el **Table Editor** del nuevo proyecto que todas las tablas tienen datos

---

## PASO 3 — Configurar y probar en local (20 min)

1. Copia el archivo de ejemplo de variables de entorno:
   ```bash
   cp .env.local.example .env.local
   ```
2. Edita `.env.local` y rellena con los datos del **NUEVO** proyecto:
   ```
   VITE_SUPABASE_URL=https://TU_PROYECTO_NUEVO.supabase.co
   VITE_SUPABASE_ANON_KEY=TU_ANON_KEY_NUEVO
   ```
3. Instala dependencias y arranca:
   ```bash
   npm install
   npm run dev
   ```
4. Verifica que:
   - ✅ Los datos de operarios, clientes y tareas cargan correctamente
   - ✅ Guardar un operario solo hace 1 petición pequeña (no 300KB)
   - ✅ Abrir la app en dos navegadores muestra cambios en tiempo real

---

## PASO 4 — Desplegar en Vercel (15 min)

1. Sube este código a un repositorio GitHub nuevo
2. En Vercel, crea un nuevo proyecto apuntando a ese repositorio
3. En **Settings → Environment Variables** añade:
   - `VITE_SUPABASE_URL` → URL del nuevo proyecto Supabase
   - `VITE_SUPABASE_ANON_KEY` → Anon key del nuevo proyecto Supabase
4. Haz Deploy

---

## PASO 5 — Prueba de concurrencia (10 min)

Abre la app en dos navegadores/pestañas con usuarios distintos:

1. **Usuario A** modifica un operario → guarda  
   **Usuario B** ve el cambio en ~1 segundo sin recargar ✅
2. **Usuario A** crea una tarea y **Usuario B** modifica un operario simultáneamente  
   Ambos cambios persisten sin sobrescribirse ✅

---

## PASO 6 — Archivar el proyecto antiguo

Una vez confirmado que todo funciona en producción:
- En el proyecto Supabase antiguo: **Settings → General → Pause project**
- NO lo borres — mantenerlo como backup durante 30 días

---

## Estructura de archivos

```
src/
  hooks/
    useSupabaseData.ts    ← NUEVO: capa de datos granular
  components/             ← Sin cambios respecto a v1
  lib/                    ← Sin cambios respecto a v1
  App.tsx                 ← Reescrito para usar el nuevo hook
supabaseClient.ts         ← Simplificado (solo env vars)
supabase_setup.sql        ← Script SQL para el nuevo proyecto
migrate.js                ← Script de migración de datos
```
