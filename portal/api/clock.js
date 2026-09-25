import { parseJsonBody } from './_body.js';
import {
  getSupabaseClient,
  authenticateWorker,
  madridDateStr,
  madridTimeStr,
  madridDayRangeUtc,
  effectiveLogs,
  lastState,
  CLOCK_LABELS
} from './_shared.js';

const PUNCH_TYPES = ['in', 'out', 'pause_start', 'pause_end'];

// Piloto: solo estos DNI pueden fichar. Quitar la lista (o el check) para abrirlo a todos.
const CLOCK_PILOT_DNIS = ['24368437Y'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const body = await parseJsonBody(req);
    const { dni, pin, punch } = body || {};

    if (!dni || !pin) {
      return res.status(400).json({ error: 'Faltan datos', message: 'Debes introducir DNI y PIN' });
    }

    const supabase = getSupabaseClient();
    const { worker, error } = await authenticateWorker(supabase, res, dni, pin);
    if (error) return;

    if (!CLOCK_PILOT_DNIS.includes(String(worker.dni || '').toUpperCase())) {
      return res.status(403).json({
        error: 'No disponible',
        message: 'El registro de jornada aún no está activo para tu usuario'
      });
    }

    const today = madridDateStr();
    const [dayStart, dayEnd] = madridDayRangeUtc(today);

    const loadLogs = async () => {
      const { data, error: logsError } = await supabase
        .from('clock_logs')
        .select('id, type, ts, source, corrects_id')
        .eq('worker_id', worker.id)
        .gte('ts', dayStart)
        .lt('ts', dayEnd)
        .order('ts', { ascending: true });
      if (logsError) throw logsError;
      return data || [];
    };

    let logs = await loadLogs();

    if (punch) {
      if (!PUNCH_TYPES.includes(punch)) {
        return res.status(400).json({ error: 'Tipo de fichaje no válido' });
      }

      const { error: insertError } = await supabase
        .from('clock_logs')
        .insert({ worker_id: worker.id, type: punch, source: 'worker', created_by: worker.id });

      if (insertError) {
        console.error('Error insertando fichaje:', insertError);
        return res.status(500).json({ error: 'Error interno', message: 'No se pudo registrar el fichaje' });
      }

      logs = await loadLogs();
    }

    const eff = effectiveLogs(logs);

    return res.status(200).json({
      success: true,
      worker: { id: worker.id, name: worker.name, dni: worker.dni },
      date: today,
      state: lastState(logs),
      serverTime: new Date().toISOString(),
      logs: eff.map(l => ({
        id: l.id,
        type: l.type,
        label: CLOCK_LABELS[l.type],
        time: madridTimeStr(l.ts),
        source: l.source,
        corrected: Boolean(l.corrects_id)
      }))
    });
  } catch (error) {
    console.error('Error en clock:', error);
    return res.status(500).json({ error: 'Error interno', message: error.message || 'Error desconocido' });
  }
}
