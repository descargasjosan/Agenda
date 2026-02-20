import { createClient } from '@supabase/supabase-js';

// Las variables de entorno se configuran en Vercel (Settings → Environment Variables)
// y en local en un archivo .env.local (que NO se sube a git)
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '❌ Variables de entorno de Supabase no configuradas.\n' +
    'Crea un archivo .env.local con:\n' +
    '  VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co\n' +
    '  VITE_SUPABASE_ANON_KEY=TU_ANON_KEY'
  );
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
