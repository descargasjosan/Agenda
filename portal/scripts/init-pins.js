// Script para generar/actualizar el PIN del portal para todos los operarios.
// Uso: node scripts/init-pins.js
// Requiere variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('❌ Faltan variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

function getLast4Digits(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  return digits.slice(-4);
}

function generateRandomPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

async function main() {
  const { data: rows, error } = await supabase.from('workers').select('id, data');

  if (error) {
    console.error('❌ Error cargando operarios:', error);
    process.exit(1);
  }

  const results = [];

  for (const row of rows || []) {
    const worker = row.data || {};

    if (worker.portalPin) {
      results.push({
        name: worker.name,
        dni: worker.dni,
        pin: worker.portalPin,
        source: 'existente'
      });
      continue;
    }

    let pin = getLast4Digits(worker.phone);
    if (!pin) {
      pin = generateRandomPin();
    }

    const updated = {
      ...worker,
      portalPin: pin
    };

    const { error: upsertError } = await supabase
      .from('workers')
      .upsert({ id: row.id, data: updated });

    if (upsertError) {
      console.error(`❌ Error guardando ${worker.name}:`, upsertError);
      continue;
    }

    results.push({
      name: worker.name,
      dni: worker.dni,
      pin,
      source: worker.phone ? 'teléfono' : 'aleatorio'
    });
  }

  console.log('\n🎉 PINs generados:\n');
  console.table(results);

  console.log('\n📋 Lista para copiar y enviar:\n');
  for (const r of results) {
    console.log(`${r.name} - DNI: ${r.dni} - PIN: ${r.pin}`);
  }
}

main().catch(err => {
  console.error('❌ Error inesperado:', err);
  process.exit(1);
});
