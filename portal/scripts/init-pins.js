// Script para regenerar los PIN del portal (6 dígitos aleatorios) para todos
// los operarios ACTIVOS. Los operarios archivados quedan sin PIN (sin acceso).
//
// Uso: node scripts/init-pins.js
// Lee SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY de portal/.env.local
// Genera pins-lista.html (listado imprimible Nombre-DNI-PIN) — NO subirlo a git.

import { createClient } from '@supabase/supabase-js';
import { randomInt } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carga .env.local si existe
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.+)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('❌ Faltan variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

function generatePin() {
  return String(randomInt(0, 1000000)).padStart(6, '0');
}

async function main() {
  const { data: rows, error } = await supabase.from('workers').select('id, data');

  if (error) {
    console.error('❌ Error cargando operarios:', error);
    process.exit(1);
  }

  const results = [];
  const archived = [];
  let errors = 0;

  for (const row of rows || []) {
    const worker = row.data || {};

    if (worker.isArchived) {
      // Revocar el PIN si lo tuviera (defensa adicional sobre el check isArchived de la API)
      if (worker.portalPin) {
        const { portalPin, ...rest } = worker;
        const { error: revError } = await supabase
          .from('workers')
          .upsert({ id: row.id, data: rest });
        if (revError) console.error(`❌ Error revocando PIN de ${worker.name}:`, revError);
      }
      archived.push(worker.name);
      continue;
    }

    const pin = generatePin();
    const updated = { ...worker, portalPin: pin };

    const { error: upsertError } = await supabase
      .from('workers')
      .upsert({ id: row.id, data: updated });

    if (upsertError) {
      console.error(`❌ Error guardando ${worker.name}:`, upsertError);
      errors++;
      continue;
    }

    results.push({ name: worker.name, dni: worker.dni, pin });
  }

  results.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  console.log(`\n🎉 ${results.length} PINs regenerados (6 dígitos)`);
  if (archived.length > 0) {
    console.log(`🚫 ${archived.length} archivados sin acceso: ${archived.join(', ')}`);
  }
  if (errors > 0) {
    console.log(`⚠️ ${errors} operarios con error — revisa los mensajes de arriba`);
  }

  const date = new Date().toISOString().split('T')[0];
  const rowsHtml = results
    .map(
      (r) => `    <tr><td>${r.name}</td><td>${r.dni}</td><td class="pin">${r.pin}</td></tr>`
    )
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>PINs Portal Operarios — ${date}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
  h1 { font-size: 18px; }
  .warn { font-size: 12px; color: #b91c1c; margin-bottom: 16px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #999; padding: 8px 12px; text-align: left; font-size: 14px; }
  th { background: #eee; }
  .pin { font-family: monospace; font-size: 18px; font-weight: bold; letter-spacing: 2px; }
  @media print { .warn { color: #000; } }
</style>
</head>
<body>
<h1>PINs Portal Operarios — Descargas Josan (${date})</h1>
<p class="warn">CONFIDENCIAL — Entregar a cada operario SOLO su PIN. Destruir este listado tras repartir.</p>
<table>
  <tr><th>Operario</th><th>DNI</th><th>PIN</th></tr>
${rowsHtml}
</table>
</body>
</html>
`;

  const outPath = path.resolve(__dirname, '../pins-lista.html');
  fs.writeFileSync(outPath, html);

  console.log(`\n📄 Listado imprimible: ${outPath}`);
  console.log('⚠️  Contiene todos los PINs — bórralo tras repartirlos.\n');
}

main().catch(err => {
  console.error('❌ Error inesperado:', err);
  process.exit(1);
});
