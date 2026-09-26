import { createClient } from '@supabase/supabase-js';

export function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, serviceKey);
}

export function verifyPin(worker, pin) {
  if (!pin || pin.trim().length === 0) return false;
  return Boolean(worker.portalPin) && worker.portalPin === String(pin);
}

// Busca un operario por DNI. Devuelve { worker } o { error: res ya enviada }.
export async function authenticateWorker(supabase, res, dni, pin) {
  const normalizedDni = String(dni || '').trim().toUpperCase();

  const { data: workerRows, error: workerError } = await supabase
    .from('workers')
    .select('id, data')
    .ilike('data->>dni', normalizedDni)
    .limit(1);

  if (workerError) {
    console.error('Error buscando operario:', workerError);
    res.status(500).json({ error: 'Error interno' });
    return { error: true };
  }

  const denied = () => res.status(401).json({
    error: 'Acceso denegado',
    message: 'DNI o PIN incorrectos'
  });

  if (!workerRows || workerRows.length === 0) {
    denied();
    return { error: true };
  }

  const worker = { ...workerRows[0].data, id: workerRows[0].id };

  if (worker.isArchived || !verifyPin(worker, String(pin || ''))) {
    denied();
    return { error: true };
  }

  return { worker };
}

// ---- Zona horaria: los fichajes se computan en horario de Madrid ----

const MADRID_TZ = 'Europe/Madrid';

export function madridDateStr(date = new Date()) {
  // 'YYYY-MM-DD' en horario de Madrid
  return date.toLocaleDateString('en-CA', { timeZone: MADRID_TZ });
}

export function madridTimeStr(ts) {
  return new Date(ts).toLocaleTimeString('es-ES', {
    timeZone: MADRID_TZ,
    hour: '2-digit',
    minute: '2-digit'
  });
}

function madridOffsetMinutes(utcDate) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: MADRID_TZ, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const p = Object.fromEntries(dtf.formatToParts(utcDate).map(x => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return (asUtc - utcDate.getTime()) / 60000;
}

// Devuelve [inicioISO, finISO) en UTC para un día 'YYYY-MM-DD' de Madrid
export function madridDayRangeUtc(dateStr) {
  const guess = new Date(`${dateStr}T00:00:00Z`);
  const start = new Date(guess.getTime() - madridOffsetMinutes(guess) * 60000);
  const end = new Date(start.getTime() + 24 * 3600 * 1000);
  return [start.toISOString(), end.toISOString()];
}

// Devuelve [inicioISO, finISO) en UTC para un mes 'YYYY-MM' de Madrid
export function madridMonthRangeUtc(month) {
  const [y, m] = month.split('-').map(Number);
  const first = `${month}-01`;
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const [start] = madridDayRangeUtc(first);
  const [end] = madridDayRangeUtc(next);
  return [start, end];
}

// ---- Reglas del audit log ----
// Un fichaje queda fuera del cómputo si existe otra fila con corrects_id = su id
// (corrección o anulación). Las filas 'void' son solo marcadores: se excluyen.

export function effectiveLogs(logs) {
  const superseded = new Set(logs.filter(l => l.corrects_id).map(l => l.corrects_id));
  return logs.filter(l => !superseded.has(l.id) && l.type !== 'void');
}

export function lastState(logs) {
  const eff = effectiveLogs(logs);
  const last = eff[eff.length - 1];
  if (!last) return 'none';
  if (last.type === 'pause_start') return 'paused';
  if (last.type === 'out') return 'out';
  return 'in';
}

export const CLOCK_LABELS = {
  in: 'Entrada',
  out: 'Salida',
  pause_start: 'Inicio pausa',
  pause_end: 'Fin pausa',
  void: 'Anulación'
};

// ---- Ajustes del registro de jornada (app_settings key='clock') ----

const CLOCK_SETTINGS_DEFAULTS = { gpsMode: 'optional', requireTask: true };

export async function getClockSettings(supabase) {
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'clock')
    .maybeSingle();
  return { ...CLOCK_SETTINGS_DEFAULTS, ...(data?.value || {}) };
}

export async function saveClockSettings(supabase, settings) {
  const { error } = await supabase
    .from('app_settings')
    .upsert({ key: 'clock', value: { ...CLOCK_SETTINGS_DEFAULTS, ...settings } });
  if (error) throw error;
}
