import webpush from 'web-push';
import { parseJsonBody } from './_body.js';
import {
  getSupabaseClient,
  authenticateWorker,
  getClockSettings,
  madridDateStr,
  madridDayRangeUtc,
  madridOffsetMinutes,
  effectiveLogs
} from './_shared.js';

// Piloto: solo estos DNI reciben avisos (misma lista que clock.js)
const CLOCK_PILOT_DNIS = ['24368437Y'];

function initWebPush() {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) throw new Error('Faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY');
  webpush.setVapidDetails('mailto:info@descargasjosan.com', pub, priv);
}

// 'HH:mm' en horario de Madrid -> Date UTC
function madridTimeToUtc(dateStr, timeStr) {
  const guess = new Date(`${dateStr}T${timeStr}:00Z`);
  return new Date(guess.getTime() - madridOffsetMinutes(guess) * 60000);
}

// Hora de inicio mas temprana del operario entre sus trabajos del dia
function workerStartTime(job, workerId) {
  const d = job.data || {};
  const candidates = [];
  if (d.workerTimes && d.workerTimes[workerId]) candidates.push(d.workerTimes[workerId]);
  if ((d.assignedWorkerIds || []).includes(workerId)) candidates.push(d.startTime);
  for (const g of d.reinforcementGroups || []) {
    if ((g.workerIds || []).includes(workerId)) candidates.push(g.startTime || d.startTime);
  }
  const valid = candidates.filter(Boolean).sort();
  return valid[0] || null;
}

async function runPlan(supabase) {
  const today = madridDateStr();
  const settings = await getClockSettings(supabase);
  const graceMs = Math.max(0, Number(settings.notifyDelayMin ?? 15)) * 60000;

  const { data: jobRows, error: jobsError } = await supabase
    .from('jobs')
    .select('data')
    .eq('data->>date', today);
  if (jobsError) throw jobsError;

  // worker_id -> primera hora de inicio del dia
  const starts = new Map();
  for (const row of jobRows || []) {
    const d = row.data || {};
    if (d.isCancelled) continue;
    const ids = new Set([
      ...(d.assignedWorkerIds || []),
      ...(d.reinforcementGroups || []).flatMap(g => g.workerIds || [])
    ]);
    for (const wid of ids) {
      const t = workerStartTime(row, wid);
      if (!t) continue;
      if (!starts.has(wid) || t < starts.get(wid)) starts.set(wid, t);
    }
  }

  if (starts.size === 0) return { planned: 0, removed: 0 };

  // Filtrar por piloto (DNI) y por tener suscripcion activa
  const ids = [...starts.keys()];
  const [{ data: workerRows }, { data: subRows }] = await Promise.all([
    supabase.from('workers').select('id, data->>dni').in('id', ids),
    supabase.from('push_subscriptions').select('worker_id').in('worker_id', ids)
  ]);

  const pilotIds = new Set(
    (workerRows || [])
      .filter(w => CLOCK_PILOT_DNIS.includes(String(w.dni || '').toUpperCase()))
      .map(w => w.id)
  );
  const subbedIds = new Set((subRows || []).map(s => s.worker_id));

  const eligible = ids.filter(id => pilotIds.has(id) && subbedIds.has(id));

  // Limpiar filas pendientes de hoy que ya no procedan (reasignaciones)
  const { data: pending } = await supabase
    .from('push_queue')
    .select('id, worker_id')
    .eq('notify_date', today)
    .is('sent_at', null);
  const staleIds = (pending || []).filter(r => !eligible.includes(r.worker_id)).map(r => r.id);
  let removed = 0;
  if (staleIds.length) {
    const { error: delErr } = await supabase.from('push_queue').delete().in('id', staleIds);
    if (!delErr) removed = staleIds.length;
  }

  // No encolar a quien ya ficho la entrada
  const [dayStart] = madridDayRangeUtc(today);
  const { data: inLogs } = await supabase
    .from('clock_logs')
    .select('worker_id')
    .in('worker_id', eligible.length ? eligible : ['-'])
    .gte('ts', dayStart)
    .eq('type', 'in');
  const alreadyIn = new Set((inLogs || []).map(l => l.worker_id));

  const rows = eligible
    .filter(id => !alreadyIn.has(id))
    .map(id => ({
      worker_id: id,
      notify_date: today,
      notify_at: new Date(madridTimeToUtc(today, starts.get(id)).getTime() + graceMs).toISOString(),
      start_time: starts.get(id)
    }));

  let planned = 0;
  if (rows.length) {
    const { error: upErr, count } = await supabase
      .from('push_queue')
      .upsert(rows, { onConflict: 'worker_id,notify_date', ignoreDuplicates: true, count: 'exact' });
    if (upErr) throw upErr;
    planned = count ?? rows.length;
  }

  return { planned, removed, eligible: eligible.length };
}

async function runTick(supabase) {
  const now = new Date().toISOString();

  const { data: due, error } = await supabase
    .from('push_queue')
    .select('id, worker_id, start_time, notify_date')
    .is('sent_at', null)
    .lte('notify_at', now)
    .order('notify_at', { ascending: true })
    .limit(50);
  if (error) throw error;

  const results = { sent: 0, skipped: 0, failed: 0 };
  if (!due || due.length === 0) {
    await pruneQueue(supabase);
    return results;
  }

  for (const item of due) {
    const [dayStart] = madridDayRangeUtc(item.notify_date);
    const { data: logs } = await supabase
      .from('clock_logs')
      .select('id, type, corrects_id')
      .eq('worker_id', item.worker_id)
      .gte('ts', dayStart);

    const hasEntry = effectiveLogs(logs || []).some(l => l.type === 'in');
    if (hasEntry) {
      await supabase.from('push_queue').update({ sent_at: now, result: 'already-clocked' }).eq('id', item.id);
      results.skipped++;
      continue;
    }

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('worker_id', item.worker_id);

    if (!subs || subs.length === 0) {
      await supabase.from('push_queue').update({ sent_at: now, result: 'no-subscription' }).eq('id', item.id);
      results.skipped++;
      continue;
    }

    const payload = JSON.stringify({
      title: 'Recordatorio de fichaje',
      body: `Tu jornada empezaba a las ${item.start_time}. No olvides fichar la entrada.`,
      tag: `clock-${item.notify_date}`
    });

    let ok = false;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        ok = true;
      } catch (e) {
        // 404/410: suscripcion muerta -> borrarla
        if (e.statusCode === 404 || e.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        } else {
          console.error('Push error:', e.statusCode, e.message);
        }
      }
    }

    await supabase
      .from('push_queue')
      .update({ sent_at: now, result: ok ? 'sent' : 'failed' })
      .eq('id', item.id);
    ok ? results.sent++ : results.failed++;
  }

  await pruneQueue(supabase);
  return results;
}

async function pruneQueue(supabase) {
  // Borra filas de hace mas de 3 dias
  const cutoff = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
  await supabase.from('push_queue').delete().lt('notify_date', cutoff);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-cron-secret');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const body = await parseJsonBody(req);
    const { action } = body || {};

    // Acciones de cron (secreto compartido)
    if (action === 'plan' || action === 'tick') {
      if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'No autorizado' });
      }
      const supabase = getSupabaseClient();
      if (action === 'plan') return res.status(200).json({ success: true, ...(await runPlan(supabase)) });
      initWebPush();
      return res.status(200).json({ success: true, ...(await runTick(supabase)) });
    }

    // Clave publica VAPID (es publica por diseño, no necesita auth)
    if (action === 'key') {
      return res.status(200).json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
    }

    // Suscripciones: requieren DNI + PIN del operario
    if (action === 'subscribe' || action === 'unsubscribe') {
      const { dni, pin, subscription } = body;
      if (!dni || !pin) return res.status(400).json({ error: 'Faltan datos' });

      const supabase = getSupabaseClient();
      const { worker, error } = await authenticateWorker(supabase, res, dni, pin);
      if (error) return;

      const endpoint = subscription?.endpoint;
      if (!endpoint) return res.status(400).json({ error: 'Suscripción no válida' });

      if (action === 'unsubscribe') {
        await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
        return res.status(200).json({ success: true });
      }

      const { p256dh, auth } = subscription.keys || {};
      if (!p256dh || !auth) return res.status(400).json({ error: 'Suscripción no válida' });

      const { error: upErr } = await supabase
        .from('push_subscriptions')
        .upsert(
          {
            worker_id: worker.id,
            endpoint,
            p256dh,
            auth,
            user_agent: req.headers['user-agent'] || null
          },
          { onConflict: 'endpoint' }
        );
      if (upErr) throw upErr;
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Acción no válida' });
  } catch (error) {
    console.error('Error en push:', error);
    return res.status(500).json({ error: 'Error interno', message: error.message });
  }
}
