/**
 * migrate.js — Migración de datos al nuevo proyecto Supabase
 *
 * Lee el snapshot JSON del proyecto ACTUAL e inserta cada entidad
 * en su tabla correspondiente en el NUEVO proyecto.
 *
 * Uso:
 *   1. Instala dependencias: npm install node-fetch
 *   2. Rellena las 4 constantes de abajo
 *   3. Ejecuta: node migrate.js
 */

// ⚠️  RELLENA ESTOS 4 VALORES ANTES DE EJECUTAR
// ─────────────────────────────────────────────────────────────────────
const OLD_SUPABASE_URL  = 'https://zblasxlrrjeycwjefitp.supabase.co';
const OLD_SERVICE_KEY   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpibGFzeGxycmpleWN3amVmaXRwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjU2MjAzNCwiZXhwIjoyMDgyMTM4MDM0fQ.2Fq8uV6gxhwKaGTbQQqdNiikYCQp7QgIRW3XIWsSPBA';
const NEW_SUPABASE_URL  = 'https://qmythlgbuawqgazokjrb.supabase.co';
const NEW_SERVICE_KEY   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFteXRobGdidWF3cWdhem9ranJiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQwODgxMCwiZXhwIjoyMDg2OTg0ODEwfQ.O5nD0jMDLrIsMZr0WKtbZbceR5vkxagRAWWFcPFACTg';
// ─────────────────────────────────────────────────────────────────────────────

const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

// ── Leer snapshot del proyecto actual ────────────────────────────────────────
async function readCurrentData() {
  console.log('📥 Leyendo datos del proyecto actual...');

  // Intentar con id=1 (versión antigua)
  let res = await fetch(`${OLD_SUPABASE_URL}/rest/v1/planning_snapshots?id=eq.1&select=data`, {
    headers: {
      'apikey': OLD_SERVICE_KEY,
      'Authorization': `Bearer ${OLD_SERVICE_KEY}`,
    }
  });

  if (!res.ok) {
    throw new Error(`Error leyendo proyecto actual: ${await res.text()}`);
  }

  let rows = await res.json();

  // Si no hay resultado con id=1, intentar con id=999999999999 (versión más nueva)
  if (!rows || rows.length === 0) {
    res = await fetch(`${OLD_SUPABASE_URL}/rest/v1/planning_snapshots?id=eq.999999999999&select=data`, {
      headers: {
        'apikey': OLD_SERVICE_KEY,
        'Authorization': `Bearer ${OLD_SERVICE_KEY}`,
      }
    });
    rows = await res.json();
  }

  // Si aún no hay datos, obtener el más reciente
  if (!rows || rows.length === 0) {
    res = await fetch(`${OLD_SUPABASE_URL}/rest/v1/planning_snapshots?select=data&order=updated_at.desc&limit=1`, {
      headers: {
        'apikey': OLD_SERVICE_KEY,
        'Authorization': `Bearer ${OLD_SERVICE_KEY}`,
      }
    });
    rows = await res.json();
  }

  if (!rows || rows.length === 0) {
    throw new Error('No se encontraron datos en planning_snapshots');
  }

  const rawData = rows[0].data;

  // El campo data puede ser string (JSON) u objeto según la versión
  return typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
}

// ── Insertar registros en una tabla del nuevo proyecto ────────────────────────
async function insertBatch(table, rows) {
  if (!rows || rows.length === 0) {
    console.log(`  ⏭️  ${table}: sin datos`);
    return;
  }

  // Supabase acepta hasta 1000 filas por petición
  const BATCH_SIZE = 500;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    const res = await fetch(`${NEW_SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': NEW_SERVICE_KEY,
        'Authorization': `Bearer ${NEW_SERVICE_KEY}`,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify(batch),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`  ❌ ${table} (lote ${i}–${i + batch.length}): ${errText}`);
    } else {
      inserted += batch.length;
    }
  }

  console.log(`  ✅ ${table}: ${inserted} registros migrados`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Iniciando migración de datos\n');

  const data = await readCurrentData();

  console.log('📊 Datos encontrados en el proyecto actual:');
  console.log(`   workers:            ${data.workers?.length || 0}`);
  console.log(`   clients:            ${data.clients?.length || 0}`);
  console.log(`   jobs:               ${data.jobs?.length || 0}`);
  console.log(`   standardTasks:      ${data.standardTasks?.length || 0}`);
  console.log(`   vehicles:           ${data.vehicles?.length || 0}`);
  console.log(`   vehicleAssignments: ${data.vehicleAssignments?.length || 0}`);
  console.log(`   fuelRecords:        ${data.fuelRecords?.length || 0}`);
  console.log(`   dailyNotes:         ${data.dailyNotes?.length || 0}`);
  console.log(`   medicalCourses:     ${data.medicalCourses?.length || 0}`);
  console.log(`   courses:            ${data.courses?.length || 0}`);
  console.log(`   customHolidays:     ${data.customHolidays?.length || 0}`);
  console.log('');
  console.log('📤 Insertando en el nuevo proyecto...\n');

  // workers
  await insertBatch('workers', (data.workers || []).map(w => ({ id: w.id, data: w })));

  // clients
  await insertBatch('clients', (data.clients || []).map(c => ({ id: c.id, data: c })));

  // jobs — necesita campo extra 'date'
  await insertBatch('jobs', (data.jobs || []).map(j => ({ id: j.id, date: j.date || '', data: j })));

  // standard_tasks
  await insertBatch('standard_tasks', (data.standardTasks || []).map(t => ({ id: t.id, data: t })));

  // vehicles
  await insertBatch('vehicles', (data.vehicles || []).map(v => ({ id: v.id, data: v })));

  // vehicle_assignments
  await insertBatch('vehicle_assignments', (data.vehicleAssignments || []).map(a => ({ id: a.id, data: a })));

  // fuel_records
  await insertBatch('fuel_records', (data.fuelRecords || []).map(r => ({ id: r.id, data: r })));

  // daily_notes
  await insertBatch('daily_notes', (data.dailyNotes || []).map(n => ({ id: n.id, data: n })));

  // medical_courses
  await insertBatch('medical_courses', (data.medicalCourses || []).map(c => ({ id: c.id, data: c })));

  // courses
  await insertBatch('courses', (data.courses || []).map(c => ({ id: c.id, data: c })));

  // custom_holidays — usa la fecha como ID
  await insertBatch('custom_holidays', (data.customHolidays || []).map(h => ({ id: h.date, data: h })));

  // app_settings — guardar notificaciones si existen
  if (data.notifications && Object.keys(data.notifications).length > 0) {
    await insertBatch('app_settings', [{ key: 'notifications', value: data.notifications }]);
  }

  console.log('\n✅ Migración completada con éxito');
  console.log('');
  console.log('Próximos pasos:');
  console.log('  1. Verifica los datos en el Table Editor del nuevo proyecto');
  console.log('  2. Configura las variables de entorno en Vercel:');
  console.log('     VITE_SUPABASE_URL  → URL del nuevo proyecto');
  console.log('     VITE_SUPABASE_ANON_KEY → Anon key del nuevo proyecto');
  console.log('  3. Haz deploy del nuevo código');
}

main().catch((err) => {
  console.error('\n❌ Error durante la migración:', err.message);
  process.exit(1);
});
