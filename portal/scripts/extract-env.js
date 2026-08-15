// Extrae la URL y service role key de api/migrate.js (usado para test local).
// Uso: node scripts/extract-env.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migratePath = path.resolve(__dirname, '../../api/migrate.js');
const envPath = path.resolve(__dirname, '../.env.local');

const src = fs.readFileSync(migratePath, 'utf8');

const urlMatch = src.match(/NEW_SUPABASE_URL\s*=\s*'([^']+)'/);
const keyMatch = src.match(/NEW_SERVICE_KEY\s*=\s*'([^']+)'/);

if (!urlMatch || !keyMatch) {
  console.error('❌ No se encontraron credenciales en api/migrate.js');
  process.exit(1);
}

const envContent = `SUPABASE_URL=${urlMatch[1]}\nSUPABASE_SERVICE_ROLE_KEY=${keyMatch[1]}\n`;
fs.writeFileSync(envPath, envContent);

console.log('✅ .env.local creado en', envPath);
