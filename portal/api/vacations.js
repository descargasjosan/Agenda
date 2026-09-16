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

  if (worker.portalPin && worker.portalPin === pin) return true;

  const phoneDigits = (worker.phone || '').replace(/\D/g, '');
  const phonePin = phoneDigits.slice(-4);
  if (phonePin && phonePin === pin) return true;

  return false;
}

function parseLocalDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function formatDateISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysToDate(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function clampDate(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function monthName(month) {
  const names = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const [year, m] = month.split('-').map(Number);
  return `${names[m - 1]} ${year}`;
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
    const { dni, pin, month } = body || {};

    if (!dni || !pin) {
      return res.status(400).json({
        error: 'Faltan datos',
        message: 'Debes introducir DNI y PIN'
      });
    }

    const selectedMonth = month || new Date().toISOString().slice(0, 7);
    const [yearStr] = selectedMonth.split('-');
    const year = Number(yearStr);
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

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

    const vacationConfig = (worker.vacationConfig || {})[String(year)] || {};
    const totalDays = Number.isFinite(Number(vacationConfig.totalDays)) ? Number(vacationConfig.totalDays) : 34;
    const carryOver = Number.isFinite(Number(vacationConfig.carryOver)) ? Number(vacationConfig.carryOver) : 0;
    const annualTotal = totalDays + carryOver;

    const statusRecords = Array.isArray(worker.statusRecords) ? worker.statusRecords : [];
    const vacationRecords = statusRecords.filter(
      (record) => record.status === 'Vacaciones' && record.startDate && record.endDate
    );

    const vacationDaysSet = new Set();

    for (const record of vacationRecords) {
      const rangeStart = clampDate(record.startDate, yearStart, yearEnd);
      const rangeEnd = clampDate(record.endDate, yearStart, yearEnd);

      if (rangeStart > rangeEnd) continue;

      let current = parseLocalDate(rangeStart);
      const end = parseLocalDate(rangeEnd);

      while (current <= end) {
        vacationDaysSet.add(formatDateISO(current));
        current = addDaysToDate(current, 1);
      }
    }

    const taken = vacationDaysSet.size;
    const remaining = annualTotal - taken;

    const vacationDays = Array.from(vacationDaysSet)
      .filter((date) => date.startsWith(`${selectedMonth}-`))
      .sort();

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
      month: selectedMonth,
      monthName: monthName(selectedMonth),
      year,
      totalDays,
      carryOver,
      annualTotal,
      taken,
      remaining,
      vacationDays
    });

  } catch (error) {
    console.error('Error en vacations:', error);
    return res.status(500).json({
      error: 'Error interno',
      message: error.message || 'Error desconocido'
    });
  }
}
