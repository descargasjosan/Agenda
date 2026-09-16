# 📦 DISEÑO: Archivado por semestres ("Semester Packs")

**Fecha del diseño:** Septiembre 2026
**Estado:** APROBADO — pendiente de implementación
**Objetivo:** No acumular datos indefinidamente en Supabase. Mantener online solo los últimos 3 semestres (~18 meses) y guardar el resto en archivos locales consultables en modo solo-lectura.

---

## 🎯 DECISIONES TOMADAS

1. **Snapshot congelado:** cada pack incluye copia de los datos maestros tal como eran al archivar (operarios, clientes, vehículos...). Vista fiel al pasado, archivo autocontenido.
2. **Purga activa:** tras exportar y verificar, los registros del semestre se BORRAN de Supabase.
3. **Operativa:** botón dentro de la app (modal de Copias de Seguridad). El admin exporta, verifica y confirma el borrado.

---

## 🗄️ CLASIFICACIÓN DE TABLAS

### Temporales (archivables + purgables)

| Tabla | Campo de filtrado | Notas |
|---|---|---|
| `jobs` | `data->>date` | La tabla más grande; ya pagina por >1000 filas |
| `worker_control_data` | `data->>month` | Captura también registros especiales `-settled` y `-advance` |
| `fuel_records` | `data->>date` | |
| `daily_notes` | `data->>date` | |
| `vehicle_assignments` | `data->>date` | |

### Maestras (SIEMPRE online)

| Tabla | Motivo |
|---|---|
| `workers` | Catálogo vivo; `statusRecords` y `vacationConfig` van dentro del blob → necesarios para el portal |
| `clients` | Catálogo vivo |
| `standard_tasks` | Catálogo |
| `vehicles` | Catálogo |
| `courses`, `medical_courses` | Reconocimientos/cursos con vigencia multi-año |
| `app_settings` | Notificaciones y config |
| `custom_holidays` | Pesan poco; se incluye copia congelada en el pack por fidelidad |

---

## 📄 FORMATO DEL ARCHIVO

`semestre_2026-S1.json` — mismo formato que el backup actual (`PlanningState`), con arrays temporales filtrados al rango + manifiesto:

```json
{
  "format": "semester-pack",
  "version": 1,
  "semester": "2026-S1",
  "range": ["2026-01-01", "2026-06-30"],
  "exportedAt": "2026-07-02T09:00:00Z",
  "counts": {
    "jobs": 1432,
    "workerControls": 7800,
    "fuelRecords": 260,
    "dailyNotes": 45,
    "vehicleAssignments": 300
  },
  "planning": {
    "workers": ["...copia congelada completa..."],
    "clients": ["..."],
    "standardTasks": ["..."],
    "vehicles": ["..."],
    "courses": ["..."],
    "medicalCourses": ["..."],
    "customHolidays": ["..."],
    "jobs": ["...solo S1-2026..."],
    "workerControls": ["...solo meses 2026-01 a 2026-06..."],
    "fuelRecords": ["..."],
    "dailyNotes": ["..."],
    "vehicleAssignments": ["..."]
  }
}
```

- Tamaño estimado: **1–3 MB por pack**
- Semestres: **S1 = ene–jun**, **S2 = jul–dic**
- El pack es compatible con el formato de backup → sirve también como vía de restauración futura (re-upsert por `id`) si algún día hiciera falta.

---

## 🔄 VENTANA DE RETENCIÓN

**Online = semestre actual + 2 anteriores** (~18 meses).

```
Hoy (S2-2026):  online = S2-2026, S1-2026, S2-2025
Ene 2027:       cae S2-2025 → exportar y purgar
Jul 2027:       cae S1-2026 → exportar y purgar
Oct 2028:       consulta de marzo-2026 → cargar pack local 2026-S1
```

**Cadencia:** 2 archivados al año (principios de enero y principios de julio).

---

## 🖱️ FLUJO DEL BOTÓN (en el modal de Copias de Seguridad)

1. **Detección automática:** al arrancar, la app comprueba si hay filas fuera de la ventana (mirando `min(jobs.date)` / `min(worker_control.month)`). Si las hay → aviso en el modal: "Semestre 2026-S1 pendiente de archivar".
2. **Exportar** → genera y descarga el pack JSON.
3. **Verificar** → la app pide re-seleccionar el archivo descargado y compara `counts` contra la BD. **Sin verificación OK no se habilita el paso 4.**
4. **Purgar** → confirmación explícita → `DELETE` por rango en las 5 tablas temporales.

**Regla de oro:** nunca purgar sin haber exportado Y verificado el pack.

---

## 👁️ MODO CONSULTA (local, solo lectura)

- Desde el modal de backups: "Cargar archivo local" → lee el JSON → valida `format === 'semester-pack'` → carga `planning` en estado + flag `archiveMode = { semester, readOnly: true }`.
- En modo consulta se desactiva TODO lo que toca Supabase:
  - Todas las funciones `saveX` / `deleteX` (guarda en los handlers o en el propio hook)
  - Suscripción Realtime
  - Polling de sincronización
- Banner fijo visible: "Modo consulta · Semestre 1 2026 · Solo lectura".
- Todas las vistas renderizan normal (planning, control de operarios, estadísticas, combustible, flota...) pero solo con los datos del semestre.
- Botón "Volver a online" → recarga los datos vivos y reactiva sync.

---

## ⚠️ CASOS LÍMITE

### 1. Horas acumuladas sin liquidar (portal)
`worker-hours.js` del portal calcula el "acumulado" sumando `worker_control_data` desde la última liquidación (`-settled`). Si se purga un semestre con meses **sin liquidar**, ese acumulado desaparece del portal (sigue existiendo en el pack local).

→ **Mitigación:** en el paso de verificación, la app debe avisar si el semestre a archivar contiene meses sin liquidar: "Este semestre tiene N meses sin liquidar — liquidar antes de purgar". Idealmente bloquear o pedir confirmación extra.

### 2. Portal — historial de meses
Tras la purga, el portal solo muestra meses dentro de la ventana (~18 meses). Vacaciones siguen funcionando al 100% porque `statusRecords` vive en el blob del operario (siempre online).

### 3. `statusRecords` en el pack
Viajan congelados dentro del blob de cada operario tal como eran al exportar (incluye correcciones posteriores hechas antes del archivado — aceptable y deseable).

### 4. Custodia de los packs
La app solo puede descargar el archivo. Norma recomendada: carpeta local + copia en nube/disco externo. Si se pierde el pack, ese semestre no es consultable.

### 5. Multi-usuario
Cada PC tiene sus propios packs. Si varios admin necesitan consultar, hay que compartir el archivo (carpeta compartida / Drive). Alternativa futura opcional: guardar packs en Supabase Storage (fuera de la BD, egress mínimo al descargar).

---

## 📈 BENEFICIOS ADICIONALES

- **Carga inicial más rápida:** hoy se descargan TODAS las filas de `jobs` y `worker_control_data` en cada arranque (paginación por >1000). Con la ventana de 18 meses, la carga baja ~60-70%.
- **Menos egress:** menos bytes por arranque y por polling.
- **DB acotada:** el plan Free (500 MB) deja de crecer indefinidamente.
- **Portal:** la query de `worker-hours` que descarga todo el historial del operario se mantiene acotada por la purga.

---

## 🔧 SUPERFICIE DE IMPLEMENTACIÓN

Todo se concentra en dos archivos. **No toca el portal ni el esquema de Supabase (cero migraciones).**

### `src/hooks/useSupabaseData.ts`
- Loader de pack que puebla `planning` SIN activar Realtime/polling (o los desmonta al entrar en modo archivo).
- `exportSemesterPack(semester)` → consulta por rango a las 5 tablas + estado maestro actual → descarga JSON con manifiesto.
- `purgeSemester(semester)` → `DELETE` por rango (`date` / `month`) en las 5 tablas temporales.
- `detectPendingArchive()` → devuelve el semestre más antiguo fuera de ventana.
- Verificación de meses sin liquidar en el semestre a archivar.
- Guarda global de `readOnly` en `saveX`/`deleteX` (no-op o error si `archiveMode`).

### `src/App.tsx`
- Modal de Copias de Seguridad: aviso de semestre pendiente, botones Exportar / Verificar / Purgar / Cargar archivo local.
- Banner de modo consulta + botón "Volver a online".
- (Opcional) bloquear edición en vistas que llaman directamente a `supabase.from(...)` — hay algunas escrituras directas fuera del hook (líneas ~988, ~1577, ~1630, ~3167, ~8118): revisarlas al implementar.

### Detalles técnicos a recordar
- `worker_control_data` se filtra por `data->>month` (valores `YYYY-MM`); incluye ids `${workerId}-${month}-settled` y `${workerId}-${month}-advance`.
- `jobs` se filtra por `data->>date` entre `range[0]` y `range[1]`.
- El formato `PlanningState` completo está en `src/lib/types.ts` (`interface PlanningState`, líneas ~247-265).
- Ya existe `exportBackup()` (App.tsx ~línea 3230) e `importData()` (~línea 3404) como referencia de descarga/carga de JSON.
- El auto-backup diario existente (08:00) sigue funcionando igual — no interfiere.

---

## ✅ CHECKLIST PARA EL DÍA DE LA IMPLEMENTACIÓN

- [ ] `exportSemesterPack` + manifiesto + descarga
- [ ] Verificación de pack (re-leer archivo, comparar counts)
- [ ] Aviso de meses sin liquidar antes de purgar
- [ ] `purgeSemester` con confirmación explícita
- [ ] Modo consulta: loader, flag readOnly, banner, desactivar writes/Realtime/polling
- [ ] Detección de semestre pendiente al arrancar
- [ ] Botón "Volver a online"
- [ ] Revisar escrituras directas a Supabase fuera del hook
- [ ] Probar: exportar → consultar pack → purgar → verificar portal
