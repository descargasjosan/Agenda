import { createClient } from '@supabase/supabase-js';
import { parseJsonBody } from './_body.js';

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, serviceKey);
}

function verifyPin(worker, pin) {
  if (!pin || pin.trim().length === 0) return false;
  return Boolean(worker.portalPin) && worker.portalPin === String(pin);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const body = await parseJsonBody(req);
    const { dni, pin, startDate, endDate } = body || {};

    if (!dni || !pin) {
      return res.status(400).json({
        error: 'Faltan datos',
        message: 'Debes introducir DNI y PIN'
      });
    }

    const normalizedDni = dni.trim().toUpperCase();
    const supabase = getSupabaseClient();

    const { data: workerRows, error: workerError } = await supabase
      .from('workers')
      .select('id, data')
      .ilike('data->>dni', normalizedDni)
      .limit(1);

    if (workerError) {
      console.error('Error buscando operario:', workerError);
      return res.status(500).json({ error: 'Error interno' });
    }

    if (!workerRows || workerRows.length === 0) {
      return res.status(401).json({
        error: 'Acceso denegado',
        message: 'DNI o PIN incorrectos'
      });
    }

    const worker = { ...workerRows[0].data, id: workerRows[0].id };

    if (worker.isArchived) {
      return res.status(401).json({
        error: 'Acceso denegado',
        message: 'DNI o PIN incorrectos'
      });
    }

    if (!verifyPin(worker, String(pin))) {
      return res.status(401).json({
        error: 'Acceso denegado',
        message: 'DNI o PIN incorrectos'
      });
    }

    let query = supabase
      .from('fuel_records')
      .select('data')
      .eq('data->>workerId', worker.id);

    if (startDate) {
      query = query.gte('data->>date', startDate);
    }
    if (endDate) {
      query = query.lte('data->>date', endDate);
    }

    const { data: recordsRows, error: recordsError } = await query
      .order('data->>date', { ascending: false });

    if (recordsError) {
      console.error('Error cargando repostajes:', recordsError);
      return res.status(500).json({ error: 'Error interno' });
    }

    const records = (recordsRows || []).map(r => ({
      id: r.data.id,
      date: r.data.date,
      liters: r.data.liters ?? null,
      cost: r.data.cost ?? 0
    }));

    const totals = records.reduce(
      (acc, rec) => {
        acc.count++;
        if (typeof rec.liters === 'number') acc.liters += rec.liters;
        if (typeof rec.cost === 'number') acc.cost += rec.cost;
        return acc;
      },
      { count: 0, liters: 0, cost: 0 }
    );

    totals.liters = Math.round(totals.liters * 100) / 100;
    totals.cost = Math.round(totals.cost * 100) / 100;

    return res.status(200).json({
      success: true,
      worker: {
        id: worker.id,
        name: worker.name,
        firstName: worker.firstName,
        lastName: worker.lastName,
        dni: worker.dni,
        phone: worker.phone,
        contractType: worker.contractType
      },
      records,
      totals
    });

  } catch (error) {
    console.error('Error en fuel:', error);
    return res.status(500).json({
      error: 'Error interno',
      message: error.message || 'Error desconocido'
    });
  }
}
