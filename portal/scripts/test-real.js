// Prueba end-to-end con un operario real del sistema.
// Uso: node scripts/test-real.js
// No muestra DNI ni teléfono completos.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar .env.local
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      process.env[key] = valueParts.join('=').trim();
    }
  }
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('❌ Faltan credenciales en .env.local');
  process.exit(1);
}

const supabase = createClient(url, key);

function isNumericValue(value) {
  return value !== '' && !isNaN(Number(value)) && !isNaN(parseFloat(value));
}

async function main() {
  // Buscar un registro de control con valor numérico y su operario
  const { data: controlRows, error: controlError } = await supabase
    .from('worker_control_data')
    .select('data')
    .limit(50);

  if (controlError || !controlRows) {
    console.error('❌ Error cargando controles:', controlError);
    process.exit(1);
  }

  // Coger filas con valor numérico y agrupar por worker_id y month
  const candidates = controlRows
    .map(r => r.data)
    .filter(c => c && isNumericValue(c.value) && c.month && c.worker_id)
    .sort((a, b) => b.month.localeCompare(a.month));

  if (candidates.length === 0) {
    console.error('❌ No se encontraron controles numéricos');
    process.exit(1);
  }

  const workerIds = [...new Set(candidates.map(c => c.worker_id))];

  const { data: workers, error: workerError } = await supabase
    .from('workers')
    .select('id, data')
    .in('id', workerIds)
    .not('data->>dni', 'is', null)
    .not('data->>phone', 'is', null);

  if (workerError || !workers || workers.length === 0) {
    console.error('❌ No se encontró operario con DNI y teléfono:', workerError);
    process.exit(1);
  }

  const workerById = {};
  for (const row of workers) {
    workerById[row.id] = row.data;
  }

  const selected = candidates.find(c => workerById[c.worker_id]);

  if (!selected) {
    console.error('❌ Ninguno de los operarios con datos tiene DNI y teléfono');
    process.exit(1);
  }

  const worker = workerById[selected.worker_id];
  const dni = worker.dni;
  const phoneDigits = String(worker.phone).replace(/\D/g, '');
  const pin = phoneDigits.slice(-4);
  const month = selected.month;

  if (!pin) {
    console.error('❌ El operario de prueba no tiene teléfono con dígitos:', worker.name);
    process.exit(1);
  }

  const res = await fetch('http://localhost:3000/api/worker-hours', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dni, pin, month })
  });

  const json = await res.json();

  console.log('\n📊 Resumen de prueba:');
  console.log('  Status:', res.status);
  console.log('  Operario:', json.worker ? json.worker.name : '—');
  console.log('  Mes:', json.monthName);
  console.log('  Horas mes:', json.totals ? json.totals.totalHours : '—');
  console.log('  Acumulado:', json.accumulated);
  console.log('  Total:', json.total);
  console.log('  Liquidado:', json.isSettled ? 'Sí' : 'No');
  console.log('  Anticipo:', json.advance ? `${json.advance.amount}€ (${json.advance.paid ? 'pagado' : 'pendiente'})` : '—');
  console.log('  Días devueltos:', json.days ? json.days.length : 0);

  if (!res.ok) {
    console.error('\n❌ Error:', json.message || json.error);
    process.exit(1);
  }

  console.log('\n✅ El flujo funciona correctamente con datos reales.');
}

main().catch(err => {
  console.error('❌ Error inesperado:', err);
  process.exit(1);
});
