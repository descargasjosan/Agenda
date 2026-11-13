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

export function madridOffsetMinutes(utcDate) {
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

// ---- Planificacion ----

// Hora de entrada del operario en un trabajo ('HH:mm').
// Prioridad (igual que la app principal): si es refuerzo manda la hora de su
// grupo — un refuerzo aparece tambien en assignedWorkerIds, pero entra mas
// tarde. Si no, workerTimes[workerId] (hora personalizada) o job.startTime.
export function jobWorkerStart(jobData, workerId) {
  const d = jobData || {};
  const groupTimes = (d.reinforcementGroups || [])
    .filter(g => (g.workerIds || []).includes(workerId))
    .map(g => g.startTime)
    .filter(Boolean)
    .sort();
  if (groupTimes.length) return groupTimes[0];
  if (!(d.assignedWorkerIds || []).includes(workerId)) return null;
  return (d.workerTimes && d.workerTimes[workerId]) || d.startTime || null;
}

// ---- Citas en oficina ----
// A algunos operarios se les cita primero en la oficina (solo por transporte):
// su jornada real empieza en la siguiente tarea. Los tres de la lista son
// personal de oficina: para ellos la primera tarea SI es su inicio de jornada.

export const OFFICE_WORKER_IDS = ['w-hphov06e8', 'w-dcjbr3ap2', 'w-10vyi3rbw'];

export function isOfficeJob(jobData, officeClientIds) {
  const d = jobData || {};
  return d.type === 'Oficina' || d.customName === 'OFICINA' || (officeClientIds || []).includes(d.clientId);
}

// IDs de clientes cuyo nombre es "OFICINA" (una consulta pequena).
export async function getOfficeClientIds(supabase) {
  const { data } = await supabase.from('clients').select('id, data');
  return (data || []).filter(r => /oficina/i.test(r.data?.name || '')).map(r => r.id);
}

// Hora de inicio real de la jornada del operario un dia dado: la primera tarea
// descartando las citas de oficina (salvo personal de oficina). Devuelve 'HH:mm' o null.
export function workerDayStart(jobsData, workerId, officeClientIds) {
  const relevant = (jobsData || []).filter(
    d => !d.isCancelled && (OFFICE_WORKER_IDS.includes(workerId) || !isOfficeJob(d, officeClientIds))
  );
  return relevant
    .map(d => jobWorkerStart(d, workerId))
    .filter(Boolean)
    .sort()[0] || null;
}

// ---- Reglas del audit log ----
// Un fichaje queda fuera del cómputo si existe otra fila con corrects_id = su id
// (corrección o anulación). Las filas 'void' son solo marcadores: se excluyen.

export function effectiveLogs(logs) {
  // Un corrector anulado ya no sustituye a su objetivo: el fichaje
  // anterior "resucita" (cadena de correcciones, nada se borra).
  const voided = new Set(logs.filter(l => l.type === 'void' && l.corrects_id).map(l => l.corrects_id));
  const superseded = new Set(
    logs.filter(l => l.corrects_id && l.type !== 'void' && !voided.has(l.id)).map(l => l.corrects_id)
  );
  return logs.filter(l => !superseded.has(l.id) && l.type !== 'void' && !voided.has(l.id));
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

const CLOCK_SETTINGS_DEFAULTS = { gpsMode: 'optional', requireTask: true, notifyDelayMin: 10 };

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

// ---- Avisos por email de fichajes incorrectos (app_settings key='emailAlerts') ----

const EMAIL_SETTINGS_DEFAULTS = {
  enabled: false,
  sendHour: 21,
  lateMin: 10,
  officeDigestEmail: 'david.solano@descargasjosan.com',
  conditions: { noEntry: true, noExit: true, openPause: true, late: true }
};

export async function getEmailSettings(supabase) {
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'emailAlerts')
    .maybeSingle();
  const v = data?.value || {};
  return { ...EMAIL_SETTINGS_DEFAULTS, ...v, conditions: { ...EMAIL_SETTINGS_DEFAULTS.conditions, ...(v.conditions || {}) } };
}

export async function saveEmailSettings(supabase, settings) {
  const { error } = await supabase
    .from('app_settings')
    .upsert({ key: 'emailAlerts', value: settings });
  if (error) throw error;
}
