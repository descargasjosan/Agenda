import { parseJsonBody } from './_body.js';
import {
  getSupabaseClient,
  getClockSettings,
  saveClockSettings,
  madridDateStr,
  madridTimeStr,
  madridDayRangeUtc,
  madridMonthRangeUtc,
  effectiveLogs,
  lastState,
  CLOCK_LABELS
} from './_shared.js';

const PUNCH_TYPES = ['in', 'out', 'pause_start', 'pause_end'];

function serializeLog(l) {
  return {
    id: l.id,
    workerId: l.worker_id,
    type: l.type,
    label: CLOCK_LABELS[l.type] || l.type,
    ts: l.ts,
    time: madridTimeStr(l.ts),
    date: madridDateStr(new Date(l.ts)),
    source: l.source,
    correctsId: l.corrects_id,
    correctionReason: l.correction_reason,
    createdBy: l.created_by,
    lat: l.lat ?? null,
    lng: l.lng ?? null,
    accuracy: l.accuracy ?? null
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (!token) return res.status(401).json({ error: 'No autorizado' });

    const supabase = getSupabaseClient();

    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) {
      return res.status(401).json({ error: 'No autorizado', message: 'Sesión caducada. Vuelve a entrar.' });
    }
    const adminEmail = authData.user.email;

    const body = await parseJsonBody(req);
    const { action } = body || {};

    // ---------- Ajustes ----------
    if (action === 'settings') {
      return res.status(200).json({ success: true, settings: await getClockSettings(supabase) });
    }

    if (action === 'save-settings') {
      const { settings } = body;
      const allowed = ['off', 'optional', 'required'];
      if (!settings || !allowed.includes(settings.gpsMode)) {
        return res.status(400).json({ error: 'Ajustes no válidos' });
      }
      await saveClockSettings(supabase, { gpsMode: settings.gpsMode });
      return res.status(200).json({ success: true });
    }

    // ---------- Quién está dentro ahora ----------
    if (action === 'overview') {
      const today = madridDateStr();
      const [start, end] = madridDayRangeUtc(today);

      const [workersRes, logsRes] = await Promise.all([
        supabase.from('workers').select('id, data'),
        supabase.from('clock_logs').select('*').gte('ts', start).lt('ts', end).order('ts', { ascending: true })
      ]);

      if (workersRes.error) throw workersRes.error;
      if (logsRes.error) throw logsRes.error;

      const byWorker = {};
      for (const l of logsRes.data || []) {
        (byWorker[l.worker_id] = byWorker[l.worker_id] || []).push(l);
      }

      const workers = (workersRes.data || [])
        .filter(r => !r.data.isArchived)
        .map(r => {
          const logs = byWorker[r.id] || [];
          return {
            id: r.id,
            name: r.data.name,
            dni: r.data.dni,
            code: r.data.code,
            state: lastState(logs),
            count: effectiveLogs(logs).length,
            logs: logs.map(serializeLog)
          };
        })
        .sort((a, b) => {
          const order = { in: 0, paused: 1, out: 2, none: 3 };
          return (order[a.state] - order[b.state]) || String(a.name).localeCompare(String(b.name));
        });

      return res.status(200).json({ success: true, date: today, workers });
    }

    // ---------- Historial de un operario en un mes ----------
    if (action === 'history') {
      const { workerId, month } = body;
      if (!workerId || !month) return res.status(400).json({ error: 'Faltan datos' });

      const [start, end] = madridMonthRangeUtc(month);
      const { data, error } = await supabase
        .from('clock_logs')
        .select('*')
        .eq('worker_id', workerId)
        .gte('ts', start)
        .lt('ts', end)
        .order('ts', { ascending: true });

      if (error) throw error;

      const superseded = new Set((data || []).filter(l => l.corrects_id).map(l => l.corrects_id));
      const voidIds = new Set((data || []).filter(l => l.type === 'void').map(l => l.corrects_id));

      return res.status(200).json({
        success: true,
        month,
        logs: (data || []).map(l => ({
          ...serializeLog(l),
          superseded: superseded.has(l.id),
          voided: voidIds.has(l.id)
        }))
      });
    }

    // ---------- Añadir fichaje manual ----------
    if (action === 'add') {
      const { workerId, type, ts, reason } = body;
      if (!workerId || !PUNCH_TYPES.includes(type) || !ts || !reason?.trim()) {
        return res.status(400).json({ error: 'Faltan datos', message: 'Tipo, fecha/hora y motivo son obligatorios' });
      }

      const { error } = await supabase.from('clock_logs').insert({
        worker_id: workerId,
        type,
        ts: new Date(ts).toISOString(),
        source: 'admin',
        correction_reason: reason.trim(),
        created_by: adminEmail
      });
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    // ---------- Corregir hora de un fichaje ----------
    if (action === 'correct') {
      const { logId, ts, reason } = body;
      if (!logId || !ts || !reason?.trim()) {
        return res.status(400).json({ error: 'Faltan datos', message: 'Nueva hora y motivo son obligatorios' });
      }

      const { data: orig } = await supabase.from('clock_logs').select('*').eq('id', logId).single();
      if (!orig) return res.status(404).json({ error: 'Fichaje no encontrado' });

      const { error } = await supabase.from('clock_logs').insert({
        worker_id: orig.worker_id,
        type: orig.type,
        ts: new Date(ts).toISOString(),
        source: 'admin',
        corrects_id: orig.id,
        correction_reason: reason.trim(),
        created_by: adminEmail
      });
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    // ---------- Anular un fichaje ----------
    if (action === 'void') {
      const { logId, reason } = body;
      if (!logId || !reason?.trim()) {
        return res.status(400).json({ error: 'Faltan datos', message: 'El motivo es obligatorio' });
      }

      const { data: orig } = await supabase.from('clock_logs').select('*').eq('id', logId).single();
      if (!orig) return res.status(404).json({ error: 'Fichaje no encontrado' });

      const { error } = await supabase.from('clock_logs').insert({
        worker_id: orig.worker_id,
        type: 'void',
        ts: orig.ts,
        source: 'admin',
        corrects_id: orig.id,
        correction_reason: reason.trim(),
        created_by: adminEmail
      });
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    // ---------- Exportación mensual ----------
    if (action === 'export') {
      const { month } = body;
      if (!month) return res.status(400).json({ error: 'Falta el mes' });

      const [start, end] = madridMonthRangeUtc(month);
      const [workersRes, logsRes] = await Promise.all([
        supabase.from('workers').select('id, data'),
        supabase.from('clock_logs').select('*').gte('ts', start).lt('ts', end).order('ts', { ascending: true })
      ]);

      if (workersRes.error) throw workersRes.error;
      if (logsRes.error) throw logsRes.error;

      const workerMap = {};
      for (const r of workersRes.data || []) {
        workerMap[r.id] = { name: r.data.name, dni: r.data.dni };
      }

      const superseded = new Set((logsRes.data || []).filter(l => l.corrects_id).map(l => l.corrects_id));

      return res.status(200).json({
        success: true,
        month,
        logs: (logsRes.data || [])
          .filter(l => l.type !== 'void')
          .map(l => ({
            ...serializeLog(l),
            workerName: workerMap[l.worker_id]?.name || l.worker_id,
            workerDni: workerMap[l.worker_id]?.dni || '',
            superseded: superseded.has(l.id)
          }))
      });
    }

    return res.status(400).json({ error: 'Acción no válida' });
  } catch (error) {
    console.error('Error en admin-clock:', error);
    return res.status(500).json({ error: 'Error interno', message: error.message || 'Error desconocido' });
  }
}
