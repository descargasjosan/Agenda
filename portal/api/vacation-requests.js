import webpush from 'web-push';
import { parseJsonBody } from './_body.js';
import { getSupabaseClient, authenticateWorker } from './_shared.js';

const VALID_STATUS = new Set(['pending', 'approved', 'rejected', 'cancelled']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function initWebPush() {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails('mailto:info@descargasjosan.com', pub, priv);
  return true;
}

function daysBetween(start, end) {
  const [y1, m1, d1] = start.split('-').map(Number);
  const [y2, m2, d2] = end.split('-').map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.floor((b - a) / 86400000) + 1;
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd;
}

function serialize(r) {
  return {
    id: r.id,
    workerId: r.worker_id,
    workerName: r.worker_name,
    startDate: r.start_date,
    endDate: r.end_date,
    days: r.days,
    status: r.status,
    note: r.note || null,
    adminNote: r.admin_note || null,
    createdAt: r.created_at,
    resolvedAt: r.resolved_at
  };
}

async function notifyWorker(supabase, workerId, title, body) {
  try {
    if (!initWebPush()) return;
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('worker_id', workerId);
    if (!subs || subs.length === 0) return;
    const payload = JSON.stringify({ title, body, tag: 'vacation-request' });
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        } else {
          console.error('Push error:', e.statusCode, e.message);
        }
      }
    }
  } catch (e) {
    console.error('notifyWorker error:', e.message);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const body = await parseJsonBody(req);
    const { action } = body || {};
    const supabase = getSupabaseClient();

    // ---------- Acción de admin: push al operario tras resolver ----------
    // La aprobación/rechazo del registro se hace en la app principal; aquí
    // solo mandamos el aviso push (requiere token de sesión del admin).
    if (action === 'notify') {
      const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
      if (!token) return res.status(401).json({ error: 'No autorizado' });
      const { data: authData, error: authError } = await supabase.auth.getUser(token);
      if (authError || !authData?.user) {
        return res.status(401).json({ error: 'No autorizado', message: 'Sesión caducada' });
      }
      const { workerId, title, body: msgBody } = body;
      if (!workerId || !title || !msgBody) {
        return res.status(400).json({ error: 'Faltan datos' });
      }
      await notifyWorker(supabase, workerId, title, msgBody);
      return res.status(200).json({ success: true });
    }

    // ---------- Acciones del operario (DNI + PIN) ----------
    const { worker, error } = await authenticateWorker(supabase, res, body?.dni, body?.pin);
    if (error) return;

    if (action === 'list') {
      const { data: rows, error: qErr } = await supabase
        .from('vacation_requests')
        .select('*')
        .eq('worker_id', worker.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (qErr) throw qErr;
      return res.status(200).json({ success: true, requests: (rows || []).map(serialize) });
    }

    if (action === 'create') {
      const { startDate, endDate, note } = body || {};
      if (!DATE_RE.test(startDate || '') || !DATE_RE.test(endDate || '')) {
        return res.status(400).json({ error: 'Fechas no válidas', message: 'Formato de fecha incorrecto' });
      }
      if (endDate < startDate) {
        return res.status(400).json({ error: 'Rango no válido', message: 'La fecha de fin no puede ser anterior a la de inicio' });
      }
      const days = daysBetween(startDate, endDate);
      if (days > 62) {
        return res.status(400).json({ error: 'Rango demasiado largo', message: 'Máximo 62 días por solicitud' });
      }

      // Solape con otras solicitudes activas (pendientes o aprobadas)
      const { data: existing } = await supabase
        .from('vacation_requests')
        .select('id, start_date, end_date')
        .eq('worker_id', worker.id)
        .in('status', ['pending', 'approved']);
      const clash = (existing || []).find(r =>
        rangesOverlap(startDate, endDate, r.start_date, r.end_date)
      );
      if (clash) {
        return res.status(409).json({
          error: 'Solicitud solapada',
          message: 'Ya tienes una solicitud activa en esas fechas'
        });
      }

      // Solape con vacaciones ya registradas (statusRecords)
      const vacationClash = (worker.statusRecords || []).find(rec =>
        (rec.status === 'Vacaciones' || rec.status === 'VACACIONES') &&
        rec.startDate && (rec.endDate || rec.startDate) &&
        rangesOverlap(startDate, endDate, rec.startDate, rec.endDate || rec.startDate)
      );
      if (vacationClash) {
        return res.status(409).json({
          error: 'Solapado con vacaciones',
          message: 'Esas fechas coinciden con vacaciones ya aprobadas'
        });
      }

      const { data: inserted, error: insErr } = await supabase
        .from('vacation_requests')
        .insert({
          worker_id: worker.id,
          worker_name: worker.name || '',
          start_date: startDate,
          end_date: endDate,
          days,
          note: (note || '').toString().slice(0, 300) || null,
          status: 'pending'
        })
        .select()
        .single();
      if (insErr) throw insErr;
      return res.status(200).json({ success: true, request: serialize(inserted) });
    }

    if (action === 'cancel') {
      const { requestId } = body || {};
      if (!requestId) return res.status(400).json({ error: 'Falta requestId' });
      const { data: row, error: qErr } = await supabase
        .from('vacation_requests')
        .select('id, status')
        .eq('id', requestId)
        .eq('worker_id', worker.id)
        .single();
      if (qErr || !row) return res.status(404).json({ error: 'Solicitud no encontrada' });
      if (row.status !== 'pending') {
        return res.status(409).json({ error: 'No se puede cancelar', message: 'La solicitud ya ha sido resuelta' });
      }
      const { error: upErr } = await supabase
        .from('vacation_requests')
        .update({ status: 'cancelled', resolved_at: new Date().toISOString() })
        .eq('id', requestId);
      if (upErr) throw upErr;
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Acción no válida' });
  } catch (error) {
    console.error('Error en vacation-requests:', error);
    return res.status(500).json({ error: 'Error interno', message: error.message || 'Error desconocido' });
  }
}
