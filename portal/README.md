# Portal de Operarios — Descargas Josan

Portal externo para que los operarios consulten sus horas, acumulados, anticipos y liquidaciones desde el móvil.

## Acceso

Una única URL para todos. Cada operario entra con:

- **DNI**
- **PIN** de 6 dígitos, único por operario, guardado en su ficha (`data.portalPin`) y facilitado en privado por su supervisor.

Los operarios **archivados** no pueden acceder (la API devuelve 401).

## Tecnología

- React 19 + TypeScript + Vite
- Tailwind CSS
- Vercel Functions (`api/worker-hours.js`)
- Supabase (misma base de datos que la app de administración)

## Variables de entorno

Copia `.env.local.example` a `.env.local` y completa:

```
SUPABASE_URL=https://TU_PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
```

## Desarrollo local

```bash
cd portal
npm install
npm run dev
```

Para probar también la función de Vercel:

```bash
npx vercel dev
```

## Despliegue paso a paso en Vercel (desde GitHub)

Sí, debes subir el repositorio a GitHub primero. Vercel construirá y desplegará directamente desde ahí.

### 1. Subir el código a GitHub

En la terminal, desde la carpeta raíz del proyecto:

```bash
git add .
git status
# Comprueba que NO aparezcan archivos .env.local, dist/ ni node_modules/
git commit -m "Añade portal de operarios"
git push origin main
```

Si aún no tienes repositorio remoto:
1. Crea uno nuevo en GitHub.
2. Sigue las instrucciones de GitHub para subir un repositorio existente.

### 2. Crear un nuevo proyecto en Vercel

Importante: **no uses el proyecto actual de la app admin**. El portal debe ser un proyecto nuevo.

1. Ve a [https://vercel.com/dashboard](https://vercel.com/dashboard).
2. Haz clic en **Add New... > Project**.
3. Importa tu repositorio de GitHub.

### 3. Configurar Root Directory

En la pantalla de configuración del proyecto:

- **Root Directory:** escribe `portal`.
- Vercel detectará automáticamente **Vite** como framework.
- **Build Command:** `npm run build` (o `vite build`).
- **Output Directory:** `dist`.

No modifiques la configuración del proyecto Vercel de tu app actual (`agenda-descargas-josan`); ese sigue apuntando al root y se desplegará normalmente.

### 4. Añadir variables de entorno

En el panel del proyecto Vercel → **Settings > Environment Variables**, añade:

- `SUPABASE_URL` = tu URL de Supabase
- `SUPABASE_SERVICE_ROLE_KEY` = tu service role key de Supabase

> Estas variables solo deben estar en Vercel, nunca en el código. `portal/.gitignore` ya ignora `portal/.env.local`.

### 5. Desplegar

Haz clic en **Deploy**. Cuando termine el build, Vercel te dará la URL, por ejemplo `https://horas-descargas-josan.vercel.app`.

### 6. Probar

Abre la URL en un móvil o en el navegador con vista móvil e introduce:

- **DNI** de un operario
- **PIN** de 6 dígitos (el generado con `init-pins.js`)

## PIN de acceso

Cada operario activo tiene un PIN aleatorio de 6 dígitos en `data.portalPin` de la tabla `workers`.

Para regenerar todos los PINs (rota el acceso de quien tenga el antiguo):

```bash
node scripts/init-pins.js
```

Lee las credenciales de `portal/.env.local` y genera `pins-lista.html`, un listado imprimible (Nombre–DNI–PIN) para repartir en privado. **Bórralo tras repartirlo** — está en `.gitignore` pero contiene todos los PINs.

## Registro de Jornada (fichajes)

Módulo independiente dentro del portal:

- **Operario** (`/`): pestaña "Fichar" con Entrada / Salida / Pausas. Sesión persistente opcional ("Mantener sesión en este dispositivo") para fichar en 1 toque.
- **Admin** (`/#admin`): panel oculto de gestión — quién está dentro ahora, historial con correcciones/anulaciones (audit log inmutable) y exportación mensual CSV. Acceso con las **mismas credenciales de Supabase Auth** que la app principal (email + contraseña). Las APIs verifican el token en servidor.

### Setup inicial (una sola vez)

Ejecutar en **Supabase → SQL Editor**:

```
portal/sql/clock_logs.sql
```

### Endpoints

| Endpoint | Quién | Qué hace |
|---|---|---|
| `api/clock.js` | Operario (DNI+PIN) | Fichar y ver fichajes de hoy |
| `api/admin-auth.js` | Admin | Login email+password → token |
| `api/admin-clock.js` | Admin (Bearer token) | overview, history, add, correct, void, export |

La tabla `clock_logs` es append-only: las correcciones del admin son filas nuevas que apuntan al fichaje original (`corrects_id`), que queda conservado pero fuera del cómputo.

## Funcionamiento

La función `api/worker-hours.js`:

1. Recibe DNI + PIN.
2. Busca al operario en `workers`.
3. Carga todos sus registros de `worker_control_data`.
4. Calcula el resumen del mes, el acumulado de meses anteriores no liquidados, el anticipo y si el mes está liquidado.
5. Devuelve el resumen al portal.
