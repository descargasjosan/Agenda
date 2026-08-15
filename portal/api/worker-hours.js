import { createClient } from '@supabase/supabase-js';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const STATUS_LABELS = {
  'F': 'Falta',
  'B': 'Baja Médica',
  'R': 'Reposo',
  'V': 'Vacaciones',
  'D': 'Permiso Retribuido',
  'P': 'Baja Paternidad',
  'L': 'Liquidado',
  'ADV': 'Anticipo',
  'ADV-PAID': 'Anticipo pagado'
};

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, serviceKey);
}

function getMonthDays(month) {
  const [year, m] = month.split('-').map(Number);
  const daysInMonth = new Date(year, m, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => i + 1);
}

function formatDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getDayOfWeek(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString('es-ES', { weekday: 'short' });
}

function isNumericValue(value) {
  return value !== '' && !isNaN(Number(value)) && !isNaN(parseFloat(value));
}

function getDisplayValue(value) {
  if (!value) return '-';
  if (isNumericValue(value)) return `${value}h`;
  return STATUS_LABELS[value] || value;
}

function getStatusColor(value) {
  if (isNumericValue(value)) return 'blue';
  switch (value) {
    case 'F': return 'red';
    case 'B': return 'orange';
    case 'R': return 'yellow';
    case 'V':
    case 'D': return 'green';
    case 'P': return 'blue';
    default: return 'gray';
  }
}

function verifyPin(worker, pin) {
  if (!pin || pin.trim().length === 0) return false;

  // Si el operario tiene un PIN definido explícitamente, se usa ese
  if (worker.portalPin && worker.portalPin === pin) return true;

  // Si no, se usa como PIN los últimos 4 dígitos del teléfono
  const phoneDigits = (worker.phone || '').replace(/\D/g, '');
  const phonePin = phoneDigits.slice(-4);
  if (phonePin && phonePin === pin) return true;

  return false;
}

function buildDayList(controls, month, workerId) {
  const [year, m] = month.split('-').map(Number);
  const days = getMonthDays(month);
  const controlByDate = {};

  for (const control of controls) {
    if (control.worker_id !== workerId) continue;
    if (!control.date || !control.date.startsWith(`${month}-`)) continue;
    // Evitar registros especiales (anticipo, liquidación) en el día a día
    const isSpecial =
      control.id === `${workerId}-${month}-settled` ||
      control.id === `${workerId}-${month}-advance` ||
      control.value === 'L' ||
      control.value === 'ADV' ||
      control.value === 'ADV-PAID';
    if (isSpecial) continue;
    controlByDate[control.date] = control;
  }

  return days.map(day => {
    const date = formatDate(year, m, day);
    const control = controlByDate[date];
    const value = control ? control.value : '';

    return {
      day,
      date,
      weekday: getDayOfWeek(date),
      value,
      display: getDisplayValue(value),
      color: getStatusColor(value),
      isWeekend: new Date(`${date}T00:00:00`).getDay() === 0 || new Date(`${date}T00:00:00`).getDay() === 6
    };
  });
}

function calculateMonthTotals(dayList) {
  const totals = {
    totalHours: 0,
    totalFaltas: 0,
    totalBajaMedica: 0,
    totalReposo: 0,
    totalVacaciones: 0
  };

  for (const day of dayList) {
    const value = day.value;
    if (isNumericValue(value)) {
      totals.totalHours += parseFloat(value);
    } else {
      switch (value) {
        case 'F': totals.totalFaltas++; break;
        case 'B': totals.totalBajaMedica++; break;
        case 'R': totals.totalReposo++; break;
        case 'V':
        case 'D': totals.totalVacaciones++; break;
      }
    }
  }

  return totals;
}

function isHoursSettled(controls, workerId, month) {
  const settledId = `${workerId}-${month}-settled`;
  return controls.some(c => c.id === settledId && c.value === 'L');
}

function getWorkerAdvance(controls, workerId, month) {
  const advanceId = `${workerId}-${month}-advance`;
  const control = controls.find(c => c.id === advanceId);

  if (!control) {
    return { amount: 0, paid: false };
  }

  const amount = parseFloat(control.advance) || 0;
  const paid = control.value === 'ADV-PAID';

  return { amount, paid };
}

function calculateAccumulatedHours(controls, workerId, month) {
  // Buscar meses liquidados anteriores al mes seleccionado
  const settledMonths = controls
    .filter(c => {
      if (c.worker_id !== workerId) return false;
      if (c.id !== `${workerId}-${c.month}-settled`) return false;
      if (c.value !== 'L') return false;
      return c.month < month;
    })
    .map(c => c.month)
    .sort();

  const lastSettledMonth = settledMonths.length > 0 ? settledMonths[settledMonths.length - 1] : null;

  let accumulated = 0;

  for (const control of controls) {
    if (control.worker_id !== workerId) continue;
    if (control.id === `${workerId}-${control.month}-settled`) continue; // Ignorar liquidaciones
    if (control.id === `${workerId}-${control.month}-advance`) continue; // Ignorar anticipos
    if (control.month >= month) continue; // Solo meses anteriores
    if (lastSettledMonth && control.month <= lastSettledMonth) continue; // Excluir hasta el último cierre

    const num = parseFloat(control.value);
    if (!isNaN(num)) {
      accumulated += num;
    }
  }

  return accumulated;
}

export default async function handler(req, res) {
  // CORS
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
    const { dni, pin, month } = req.body || {};

    if (!dni || !pin) {
      return res.status(400).json({
        error: 'Faltan datos',
        message: 'Debes introducir DNI y PIN (últimos 4 dígitos del teléfono)'
      });
    }

    const selectedMonth = month || new Date().toISOString().slice(0, 7);
    const normalizedDni = dni.trim().toUpperCase();

    const supabase = getSupabaseClient();

    // Buscar operario por DNI (insensible a mayúsculas/minúsculas)
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

    if (!verifyPin(worker, String(pin))) {
      return res.status(401).json({
        error: 'Acceso denegado',
        message: 'DNI o PIN incorrectos'
      });
    }

    // Cargar todos los registros de control del operario
    const { data: controlsRows, error: controlsError } = await supabase
      .from('worker_control_data')
      .select('data')
      .eq('data->>worker_id', worker.id);

    if (controlsError) {
      console.error('Error cargando controles:', controlsError);
      return res.status(500).json({ error: 'Error interno' });
    }

    const controls = (controlsRows || []).map(r => r.data);

    // Calcular resumen
    const dayList = buildDayList(controls, selectedMonth, worker.id);
    const totals = calculateMonthTotals(dayList);
    const accumulated = calculateAccumulatedHours(controls, worker.id, selectedMonth);
    const isSettled = isHoursSettled(controls, worker.id, selectedMonth);
    const advance = getWorkerAdvance(controls, worker.id, selectedMonth);

    const [year, m] = selectedMonth.split('-').map(Number);

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
      monthName: `${MONTH_NAMES[m - 1]} ${year}`,
      days: dayList,
      totals,
      accumulated,
      total: totals.totalHours + accumulated,
      isSettled,
      advance,
      lastSettledMonth: null // se puede completar si es necesario
    });

  } catch (error) {
    console.error('Error en worker-hours:', error);
    return res.status(500).json({
      error: 'Error interno',
      message: error.message || 'Error desconocido'
    });
  }
}
