// Importa cuentas bancarias de operarios desde un CSV con columnas: DNI,cuenta
// Actualiza data.bankAccount en la tabla workers (merge sobre el JSON existente).
//
// Uso:  node scripts/import-bank-accounts.js <archivo.csv>
// Lee SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY de portal/.env.local
//
// El CSV acepta separador ';' o ',' y cabecera opcional.
// Imprime un informe: actualizados, sin cambios, DNI no encontrados.

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  console.error('❌ Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const csvPath = process.argv[2];
if (!csvPath || !fs.existsSync(csvPath)) {
  console.error('❌ Uso: node scripts/import-bank-accounts.js <archivo.csv>');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

// --- Leer CSV (separador ';' o ',', con o sin cabecera) ---
const raw = fs.readFileSync(csvPath, 'utf8').replace(/^﻿/, '');
const pairs = [];
for (const line of raw.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  const sep = trimmed.includes(';') ? ';' : ',';
  const [dni, account] = trimmed.split(sep).map(s => s.trim().replace(/^"|"$/g, ''));
  if (!dni || !account) continue;
  if (/dni|document/i.test(dni) && /cuenta|iban|banc/i.test(account)) continue; // cabecera
  pairs.push({ dni: dni.toUpperCase(), account: account.toUpperCase().replace(/\s+/g, ' ').trim() });
}

if (pairs.length === 0) {
  console.error('❌ El CSV no contiene filas válidas DNI,cuenta');
  process.exit(1);
}
console.log(`📄 ${pairs.length} cuentas leídas del CSV`);

// --- Cargar operarios ---
const { data: rows, error } = await supabase.from('workers').select('id, data');
if (error) { console.error('❌ Error leyendo operarios:', error.message); process.exit(1); }

const byDni = new Map();
for (const r of rows) {
  const dni = (r.data?.dni || '').toUpperCase();
  if (dni) byDni.set(dni, r);
}

// --- Actualizar ---
let updated = 0, unchanged = 0;
const notFound = [], errors = [];

for (const { dni, account } of pairs) {
  const row = byDni.get(dni);
  if (!row) { notFound.push(dni); continue; }
  if ((row.data.bankAccount || '') === account) { unchanged++; continue; }

  const { error: upErr } = await supabase
    .from('workers')
    .update({ data: { ...row.data, bankAccount: account } })
    .eq('id', row.id);
  if (upErr) errors.push(`${dni}: ${upErr.message}`);
  else updated++;
}

console.log(`\n✅ Actualizados: ${updated}`);
console.log(`=  Sin cambios: ${unchanged}`);
if (notFound.length) console.log(`⚠️  DNI no encontrados (${notFound.length}): ${notFound.join(', ')}`);
if (errors.length) console.log(`❌ Errores (${errors.length}):\n  ${errors.join('\n  ')}`);

// Operarios que siguen sin cuenta tras la importación
const missing = [...byDni.entries()]
  .filter(([dni, r]) => !r.data?.bankAccount && !pairs.some(p => p.dni === dni))
  .map(([, r]) => r.data.name || r.id);
if (missing.length) console.log(`\nℹ️  ${missing.length} operarios siguen sin cuenta bancaria en su ficha`);
