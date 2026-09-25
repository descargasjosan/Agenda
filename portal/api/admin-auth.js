import { getSupabaseClient } from './_shared.js';
import { parseJsonBody } from './_body.js';

// Login de administrador: valida email+contraseña contra Supabase Auth
// (las mismas credenciales que la app principal) y devuelve el access_token
// que el panel enviará como Bearer a las APIs de administración.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const body = await parseJsonBody(req);
    const { email, password } = body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Faltan datos', message: 'Introduce email y contraseña' });
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data?.session) {
      return res.status(401).json({ error: 'Acceso denegado', message: 'Usuario o contraseña incorrectos' });
    }

    return res.status(200).json({
      success: true,
      token: data.session.access_token,
      email: data.user.email
    });
  } catch (error) {
    console.error('Error en admin-auth:', error);
    return res.status(500).json({ error: 'Error interno', message: error.message || 'Error desconocido' });
  }
}
