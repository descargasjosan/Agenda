import { parseJsonBody } from './_body.js';
import {
  getSupabaseClient,
  madridDateStr,
  madridTimeStr,
  madridDayRangeUtc,
  madridOffsetMinutes,
  effectiveLogs,
  lastState,
  isOfficeJob,
  OFFICE_WORKER_IDS,
  getOfficeClientIds,
  getEmailSettings,
  CLOCK_LABELS
} from './_shared.js';

// ============================================================
// Avisos por email de fichajes incorrectos
//
// 'send'    -> lo llama pg_cron cada hora (x-cron-secret). Solo actua cuando la
//              hora de Madrid coincide con settings.sendHour y el sistema esta
//              activado. Sin RESEND_API_KEY calcula el informe pero no envia.
// 'preview' -> lo llama el panel admin (Bearer). Muestra quien recibiria aviso
//              hoy (o en body.date) sin enviar nada. Sirve para verificar antes
//              de conectar Resend.
// ============================================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const toMin = t => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
const ddmmyyyy = d => d.split('-').reverse().join('/');

// Cierre automatico de jornada: a esta hora (Madrid) nadie sigue trabajando,
// asi que quien no cerro la salida lo hizo por olvido.
const AUTO_CLOSE_HOUR = 21;
const AUTO_CLOSE_REASON = 'Cerrado automáticamente por olvido de fichaje';

// Estado del operario ese dia segun sus statusRecords (mismo criterio que la app)
function workerStatusForDate(data, dateStr) {
  const rec = (data?.statusRecords || []).find(r => dateStr >= r.startDate && dateStr <= (r.endDate || '9999-12-31'));
  return rec?.status || 'Disponible';
}

// Filas propias del operario (no las creadas/corregidas desde administracion).
// Incluye las fichadas aunque luego fueran corregidas: el error original cuenta.
const ownPunches = logs => logs.filter(l => l.type !== 'void' && l.source !== 'admin');

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---- Plantillas ----

function violationText(v) {
  switch (v.type) {
    case 'noEntry':   return `No fichaste la entrada. Tu jornada empezaba a las ${v.start}.`;
    case 'noExit':    return v.entryTime
      ? `Fichaste la entrada a las ${v.entryTime}, pero no fichaste la salida.`
      : 'No fichaste la salida.';
    case 'openPause': return `Iniciaste una pausa a las ${v.pauseTime} y no fichaste su fin.`;
    case 'late':      return `Tu jornada empezaba a las ${v.start} y fichaste la entrada a las ${v.entryTime} (${v.delayMin} minutos de retraso).`;
  }
}

function workerEmail(name, dateStr, violations, adminFixes) {
  const d = ddmmyyyy(dateStr);
  const lines = violations.map(violationText);
  const fixes = adminFixes.length
    ? `El registro ha sido corregido desde administración (${adminFixes.join('; ')}). La corrección no elimina el incumplimiento: fichar correctamente y a tiempo es responsabilidad del trabajador.`
    : null;
  const text = [
    `Hola ${name}:`,
    ``,
    `Hemos revisado tu registro de jornada del ${d} y hemos detectado lo siguiente:`,
    ``,
    ...lines.map(l => `- ${l}`),
    ...(fixes ? [``, fixes] : []),
    ``,
    `Te recordamos que el registro de jornada es obligatorio y debe hacerse en el momento, desde la aplicación. Si crees que este aviso es un error, contacta con la oficina.`,
    ``,
    `Descargas Josan`
  ].join('\n');
  const html = `
<div style="font-family:Arial,sans-serif;font-size:14px;color:#1e293b;max-width:560px">
  <p>Hola <b>${esc(name)}</b>:</p>
  <p>Hemos revisado tu registro de jornada del <b>${d}</b> y hemos detectado lo siguiente:</p>
  <ul style="padding-left:20px">${lines.map(l => `<li style="margin:6px 0">${esc(l)}</li>`).join('')}</ul>
  ${fixes ? `<p style="background:#eff6ff;border-left:4px solid #3b82f6;padding:10px 14px;border-radius:6px">${esc(fixes)}</p>` : ''}
  <p>Te recordamos que el registro de jornada es obligatorio y debe hacerse en el momento, desde la aplicación. Si crees que este aviso es un error, contacta con la oficina.</p>
  <p style="color:#64748b">Descargas Josan</p>
</div>`;
  return { subject: `Aviso de fichaje incorrecto – ${d}`, text, html };
}

function digestEmail(dateStr, alerts) {
  const d = ddmmyyyy(dateStr);
  const blocks = alerts.map(a => {
    const lines = a.violations.map(violationText);
    const fixes = a.adminFixes.length ? ` [corregido por administración: ${a.adminFixes.join('; ')}]` : '';
    return `${a.name}${a.email ? ` <${a.email}>` : ' (sin email — no enviado)'}\n` + lines.map(l => `  - ${l}`).join('\n') + fixes;
  });
  const text = [
    `Incidencias de fichaje del ${d}: ${alerts.length} operario(s).`,
    ``,
    ...blocks
  ].join('\n');
  const html = `
<div style="font-family:Arial,sans-serif;font-size:14px;color:#1e293b;max-width:640px">
  <p>Incidencias de fichaje del <b>${d}</b>: <b>${alerts.length}</b> operario(s).</p>
  ${alerts.map(a => `
  <div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin:10px 0">
    <p style="margin:0 0 6px"><b>${esc(a.name)}</b>${a.email ? '' : ' <span style="color:#dc2626">(sin email — no enviado)</span>'}</p>
    <ul style="margin:0;padding-left:18px">${a.violations.map(v => `<li>${esc(violationText(v))}</li>`).join('')}</ul>
    ${a.adminFixes.length ? `<p style="margin:6px 0 0;color:#1d4ed8">Corregido por administración: ${esc(a.adminFixes.join('; '))}</p>` : ''}
  </div>`).join('')}
</div>`;
  return { subject: `Incidencias de fichaje – ${d} (${alerts.length} operarios)`, text, html };
}

// ---- Calculo de incumplimientos ----

async function computeAlerts(supabase, date, settings) {
  const [dayStart, dayEnd] = madridDayRangeUtc(date);
  const [workersRes, logsRes, jobsRes, officeClientIds] = await Promise.all([
    supabase.from('workers').select('id, data'),
    supabase.from('clock_logs').select('*').gte('ts', dayStart).lt('ts', dayEnd).order('ts', { ascending: true }),
    supabase.from('jobs').select('data').eq('data->>date', date),
    getOfficeClientIds(supabase)
  ]);
  if (workersRes.error) throw workersRes.error;
  if (logsRes.error) throw logsRes.error;
  if (jobsRes.error) throw jobsRes.error;

  // Trabajos del dia agrupados por operario
  const jobsByWorker = {};
  for (const row of jobsRes.data || []) {
    const d = row.data || {};
    if (d.isCancelled) continue;
    const ids = new Set([
      ...(d.assignedWorkerIds || []),
      ...(d.reinforcementGroups || []).flatMap(g => g.workerIds || [])
    ]);
    for (const wid of ids) (jobsByWorker[wid] = jobsByWorker[wid] || []).push(d);
  }

  const logsByWorker = {};
  for (const l of logsRes.data || []) (logsByWorker[l.worker_id] = logsByWorker[l.worker_id] || []).push(l);

  const c = settings.conditions;
  const lateMin = Number(settings.lateMin ?? 10);
  const alerts = [];

  for (const w of workersRes.data || []) {
    const data = w.data || {};
    if (data.isArchived) continue;

    const jobs = jobsByWorker[w.id];
    if (!jobs || jobs.length === 0) continue; // sin tarea ese dia: no se le exige fichar

    // De baja, vacaciones u otro estado no disponible: exento
    const status = workerStatusForDate(data, date);
    if (status !== 'Disponible' && status !== 'Activo') continue;

    // Inicio real de la jornada: se descartan las citas de oficina
    // (salvo para el personal de oficina)
    const isOfficeWorker = OFFICE_WORKER_IDS.includes(w.id);
    const realJobs = isOfficeWorker ? jobs : jobs.filter(d => !isOfficeJob(d, officeClientIds));
    if (realJobs.length === 0) continue; // solo cita de oficina: nada que fichar
    const realStart = realJobs
      .map(d => {
        const groupTimes = (d.reinforcementGroups || [])
          .filter(g => (g.workerIds || []).includes(w.id))
          .map(g => g.startTime).filter(Boolean).sort();
        if (groupTimes.length) return groupTimes[0];
        return (d.workerTimes && d.workerTimes[w.id]) || d.startTime || null;
      })
      .filter(Boolean).sort()[0];
    if (!realStart) continue;

    const logs = logsByWorker[w.id] || [];
    const eff = effectiveLogs(logs);
    const own = ownPunches(logs);

    const ownIn = own.find(l => l.type === 'in');
    const ownOut = [...own].reverse().find(l => l.type === 'out');
    const pauseStarts = own.filter(l => l.type === 'pause_start').length;
    const pauseEnds = own.filter(l => l.type === 'pause_end').length;
    const lastPauseStart = [...own].reverse().find(l => l.type === 'pause_start');

    const violations = [];
    if (c.noEntry && !ownIn) {
      violations.push({ type: 'noEntry', start: realStart });
    }
    if (c.noExit && !ownOut) {
      violations.push({ type: 'noExit', entryTime: ownIn ? madridTimeStr(ownIn.ts) : null });
    }
    if (c.openPause && pauseStarts > pauseEnds) {
      violations.push({ type: 'openPause', pauseTime: madridTimeStr(lastPauseStart.ts) });
    }
    if (c.late && ownIn) {
      const entryTime = madridTimeStr(ownIn.ts);
      const delayMin = toMin(entryTime) - toMin(realStart);
      if (delayMin > lateMin) violations.push({ type: 'late', start: realStart, entryTime, delayMin });
    }
    if (violations.length === 0) continue;

    // Correcciones hechas por administracion: se informan, no ocultan el error
    const adminFixes = eff
      .filter(l => l.source === 'admin')
      .map(l => `${(CLOCK_LABELS[l.type] || l.type).toLowerCase()} ${madridTimeStr(l.ts)}`);

    alerts.push({
      workerId: w.id,
      name: data.name || w.id,
      email: (data.email || '').trim(),
      violations,
      adminFixes
    });
  }

  alerts.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return alerts;
}

// ---- Envio por Resend ----

async function sendEmail(mail) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'Descargas Josan <avisos@descargasjosan.com>';
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: mail.to, subject: mail.subject, text: mail.text, html: mail.html })
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
}

async function getRunState(supabase) {
  const { data } = await supabase.from('app_settings').select('value').eq('key', 'emailAlertsState').maybeSingle();
  return data?.value || {};
}

// ---- Cierre automatico de jornada a las 21:00 ----
// Inserta una salida de administrador a quien siga dentro (o en pausa) al final
// del dia. Si esta en pausa tambien se cierra la pausa primero. El motivo queda
// registrado; el correo de incidencias sigue avisando del olvido.

async function autoCloseOpenShifts(supabase, date) {
  const [dayStart, dayEnd] = madridDayRangeUtc(date);
  const { data: logs, error } = await supabase
    .from('clock_logs')
    .select('*')
    .gte('ts', dayStart).lt('ts', dayEnd)
    .order('ts', { ascending: true });
  if (error) throw error;

  const byWorker = {};
  for (const l of logs || []) (byWorker[l.worker_id] = byWorker[l.worker_id] || []).push(l);

  // '21:00' de ese dia en horario de Madrid -> UTC
  const guess = new Date(`${date}T${String(AUTO_CLOSE_HOUR).padStart(2, '0')}:00:00Z`);
  const closeTs = new Date(guess.getTime() - madridOffsetMinutes(guess) * 60000).toISOString();

  const inserts = [];
  for (const [wid, wlogs] of Object.entries(byWorker)) {
    const st = lastState(wlogs);
    if (st === 'paused') {
      inserts.push({ worker_id: wid, type: 'pause_end', ts: closeTs, source: 'admin', correction_reason: AUTO_CLOSE_REASON, created_by: 'auto-cierre' });
    }
    if (st === 'in' || st === 'paused') {
      inserts.push({ worker_id: wid, type: 'out', ts: closeTs, source: 'admin', correction_reason: AUTO_CLOSE_REASON, created_by: 'auto-cierre' });
    }
  }
  if (inserts.length === 0) return 0;
  const { error: insErr } = await supabase.from('clock_logs').insert(inserts);
  if (insErr) throw insErr;
  return inserts.filter(i => i.type === 'out').length;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-cron-secret');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const body = await parseJsonBody(req);
    const { action } = body || {};
    const supabase = getSupabaseClient();

    // ---------- Envio programado (cron) ----------
    if (action === 'send') {
      if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'No autorizado' });
      }
      const settings = await getEmailSettings(supabase);
      const nowHour = Number(madridTimeStr(new Date()).split(':')[0]);
      const date = madridDateStr();

      // A las 21:00 se cierran las jornadas olvidadas (independiente del email)
      let autoClosed = 0;
      if (nowHour === AUTO_CLOSE_HOUR) {
        autoClosed = await autoCloseOpenShifts(supabase, date);
      }

      if (nowHour !== settings.sendHour) return res.status(200).json({ success: true, skipped: 'not-send-hour', autoClosed });
      if (!settings.enabled) return res.status(200).json({ success: true, skipped: 'disabled', autoClosed });

      // No reenviar si ya se mando el informe de hoy
      const state = await getRunState(supabase);
      if (state.lastSentDate === date) return res.status(200).json({ success: true, skipped: 'already-sent' });

      const alerts = await computeAlerts(supabase, date, settings);

      const report = { date, autoClosed, alerts: alerts.length, emailsSent: 0, skippedNoEmail: 0, digestSent: false, resendConfigured: !!process.env.RESEND_API_KEY };
      if (alerts.length === 0) {
        await supabase.from('app_settings').upsert({ key: 'emailAlertsState', value: { lastSentDate: date } });
        return res.status(200).json({ success: true, ...report });
      }

      if (!process.env.RESEND_API_KEY) {
        // Sistema montado pero Resend aun no configurado: informe sin envio
        return res.status(200).json({ success: true, ...report, pending: alerts.map(a => a.name) });
      }

      for (const a of alerts) {
        if (!a.email || !EMAIL_RE.test(a.email)) { report.skippedNoEmail++; continue; }
        const mail = workerEmail(a.name, date, a.violations, a.adminFixes);
        await sendEmail({ to: a.email, ...mail });
        report.emailsSent++;
      }

      if (settings.officeDigestEmail) {
        const mail = digestEmail(date, alerts);
        await sendEmail({ to: settings.officeDigestEmail, ...mail });
        report.digestSent = true;
      }

      await supabase.from('app_settings').upsert({ key: 'emailAlertsState', value: { lastSentDate: date } });
      return res.status(200).json({ success: true, ...report });
    }

    // ---------- Vista previa (admin) ----------
    if (action === 'preview') {
      const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
      const { data: authData, error: authError } = await supabase.auth.getUser(token);
      if (authError || !authData?.user) return res.status(401).json({ error: 'No autorizado' });

      const settings = await getEmailSettings(supabase);
      const date = typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : madridDateStr();
      const alerts = await computeAlerts(supabase, date, settings);

      return res.status(200).json({
        success: true,
        date,
        enabled: settings.enabled,
        resendConfigured: !!process.env.RESEND_API_KEY,
        alerts: alerts.map(a => ({
          name: a.name,
          email: a.email || null,
          violations: a.violations.map(violationText),
          adminFixes: a.adminFixes,
          emailPreview: a.email ? workerEmail(a.name, date, a.violations, a.adminFixes).text : null
        }))
      });
    }

    return res.status(400).json({ error: 'Acción no válida' });
  } catch (error) {
    console.error('Error en email-alerts:', error);
    return res.status(500).json({ error: 'Error interno', message: error.message });
  }
}
