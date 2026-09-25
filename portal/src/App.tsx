/// <reference types="vite/client" />
import { useState, useCallback, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, LogOut, Clock, Wallet, PiggyBank, AlertCircle, CheckCircle2, Loader2, Fuel, Sun, Timer } from 'lucide-react';
import type { WorkerSummary, FuelSummary, FuelRecord, VacationSummary, WorkerInfo } from './lib/types';
import ClockView from './ClockView';
import AdminApp from './AdminApp';

const AUTH_KEY = 'dj-portal-auth';

// Piloto del fichaje: solo estos DNI ven la pestaña "Fichar"
const CLOCK_PILOT_DNIS = new Set(['24368437Y']);

const API_URL = import.meta.env.VITE_API_URL || '/api/worker-hours';
const FUEL_API_URL = import.meta.env.VITE_API_FUEL_URL || '/api/fuel';
const VACATIONS_API_URL = import.meta.env.VITE_API_VACATIONS_URL || '/api/vacations';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function addMonths(month: string, delta: number) {
  const [year, m] = month.split('-').map(Number);
  const date = new Date(year, m - 1 + delta, 1);
  const y = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${mm}`;
}

function formatMonthName(month: string) {
  const [year, m] = month.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${year}`;
}

function StatusBadge({ settled, advance }: { settled: boolean; advance: { amount: number; paid: boolean } }) {
  if (settled) {
    return (
      <div className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
        <CheckCircle2 size={14} />
        Liquidado
      </div>
    );
  }

  if (advance.amount > 0) {
    return (
      <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${advance.paid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
        <Wallet size={14} />
        {advance.paid ? 'Anticipo pagado' : 'Anticipo pendiente'}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
      <Clock size={14} />
      Pendiente de liquidar
    </div>
  );
}

function SummaryCard({ label, value, sub, color = 'blue' }: { label: string; value: string; sub?: string; color?: 'blue' | 'green' | 'amber' | 'slate' | 'red' }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-200',
    green: 'bg-green-50 text-green-700 ring-green-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    slate: 'bg-slate-50 text-slate-700 ring-slate-200',
    red: 'bg-red-50 text-red-700 ring-red-200'
  };

  return (
    <div className={`rounded-xl p-3 ring-1 ${colorClasses[color]}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-xs opacity-70">{sub}</p>}
    </div>
  );
}

function LoginForm({ onLogin, loading, error }: { onLogin: (dni: string, pin: string, remember: boolean) => void; loading: boolean; error: string | null }) {
  const [dni, setDni] = useState('');
  const [pin, setPin] = useState('');
  const [remember, setRemember] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(dni.trim().toUpperCase(), pin.trim(), remember);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-md">
            <Clock size={28} />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Mis Horas</h1>
          <p className="mt-1 text-sm text-slate-500">Descargas Josan</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="dni" className="mb-1.5 block text-sm font-medium text-slate-700">
              DNI
            </label>
            <input
              id="dni"
              type="text"
              inputMode="text"
              autoComplete="off"
              maxLength={12}
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              placeholder="12345678A"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg font-medium uppercase text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              required
            />
          </div>

          <div>
            <label htmlFor="pin" className="mb-1.5 block text-sm font-medium text-slate-700">
              PIN
            </label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={10}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN de 6 dígitos"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              required
            />
            <p className="mt-1.5 text-xs text-slate-500">
              PIN facilitado por tu supervisor. Si no lo tienes, pídeselo.
            </p>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded accent-blue-600"
            />
            <span className="text-sm font-medium text-slate-600">Mantener sesión en este dispositivo</span>
          </label>

          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
              <div className="flex items-start gap-2">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !dni || !pin}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
            {loading ? 'Cargando...' : 'Consultar mis horas'}
          </button>
        </form>
      </div>
    </div>
  );
}

function DayList({ days }: { days: WorkerSummary['days'] }) {
  return (
    <div className="space-y-2">
      {days.map((day) => (
        <div
          key={day.date}
          className={`flex items-center justify-between rounded-xl border p-3 ${
            day.isWeekend ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 flex-col items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <span className="text-[10px] font-medium uppercase leading-none">{day.weekday}</span>
              <span className="text-lg font-bold leading-tight">{day.day}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">
                {new Date(`${day.date}T00:00:00`).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long'
                })}
              </p>
              {day.isWeekend && <p className="text-xs text-slate-500">Fin de semana</p>}
            </div>
          </div>

          <div
            className={`rounded-lg px-3 py-1.5 text-sm font-bold ${
              day.color === 'blue'
                ? 'bg-blue-100 text-blue-700'
                : day.color === 'green'
                ? 'bg-green-100 text-green-700'
                : day.color === 'red'
                ? 'bg-red-100 text-red-700'
                : day.color === 'orange'
                ? 'bg-orange-100 text-orange-700'
                : day.color === 'yellow'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {day.display}
          </div>
        </div>
      ))}
    </div>
  );
}

function SummaryView({
  summary,
  month,
  onMonthChange,
  onLogout,
  loading,
  error
}: {
  summary: WorkerSummary;
  month: string;
  onMonthChange: (month: string) => void;
  onLogout: () => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto max-w-md">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{summary.worker.name}</h2>
              <p className="text-xs text-slate-500">{summary.worker.dni}</p>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              <LogOut size={16} />
              Salir
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-100 p-2">
            <button
              onClick={() => onMonthChange(addMonths(month, -1))}
              disabled={loading}
              className="rounded-lg bg-white p-2 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronLeft size={20} className="text-slate-700" />
            </button>

            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Calendar size={18} className="text-blue-600" />
              {summary.monthName}
            </div>

            <button
              onClick={() => onMonthChange(addMonths(month, 1))}
              disabled={loading}
              className="rounded-lg bg-white p-2 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronRight size={20} className="text-slate-700" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pt-4">
        <div className="mb-4 flex items-center justify-between">
          <StatusBadge settled={summary.isSettled} advance={summary.advance} />
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <SummaryCard label="Horas mes" value={`${summary.totals.totalHours}h`} color="blue" />
          <SummaryCard label="Acumulado" value={`${summary.accumulated}h`} sub="Meses anteriores" color="amber" />
          <SummaryCard label="Total" value={`${summary.total}h`} color="green" />
          <SummaryCard
            label="Anticipo"
            value={summary.advance.amount > 0 ? `${summary.advance.amount}€` : '0€'}
            sub={summary.advance.amount > 0 ? (summary.advance.paid ? 'Pagado' : 'Pendiente') : undefined}
            color={summary.advance.amount > 0 ? (summary.advance.paid ? 'green' : 'red') : 'slate'}
          />
        </div>

        <div className="mb-3 flex items-center gap-2">
          <Clock size={18} className="text-slate-500" />
          <h3 className="text-base font-bold text-slate-800">Detalle diario</h3>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-blue-600" />
          </div>
        ) : (
          <DayList days={summary.days} />
        )}
      </main>
    </div>
  );
}

function FuelRecordCard({ record }: { record: FuelRecord }) {
  const date = new Date(`${record.date}T00:00:00`);
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 flex-col items-center justify-center rounded-lg bg-slate-100 text-slate-700">
          <span className="text-[10px] font-medium uppercase leading-none">{date.toLocaleDateString('es-ES', { weekday: 'short' })}</span>
          <span className="text-lg font-bold leading-tight">{date.getDate()}</span>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900">
            {date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      <div className="text-right">
        <p className="text-sm font-bold text-slate-900">
          {record.liters != null ? `${record.liters.toFixed(2)} L` : '-'}
        </p>
        <p className="text-sm font-bold text-blue-700">{record.cost.toFixed(2)} €</p>
      </div>
    </div>
  );
}

function FuelView({
  dni,
  pin,
  worker,
  onLogout
}: {
  dni: string;
  pin: string;
  worker: WorkerInfo;
  onLogout: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const yearStart = `${new Date().getFullYear()}-01-01`;

  const [startDate, setStartDate] = useState(yearStart);
  const [endDate, setEndDate] = useState(today);
  const [records, setRecords] = useState<FuelRecord[]>([]);
  const [totals, setTotals] = useState({ count: 0, liters: 0, cost: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFuel = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(FUEL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dni,
          pin,
          startDate,
          endDate
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Error al consultar repostajes');
      }

      const fuel = data as FuelSummary;
      setRecords(fuel.records || []);
      setTotals(fuel.totals || { count: 0, liters: 0, cost: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [dni, pin, startDate, endDate]);

  useEffect(() => {
    fetchFuel();
  }, [fetchFuel]);

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto max-w-md">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{worker.name}</h2>
              <p className="text-xs text-slate-500">{worker.dni}</p>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              <LogOut size={16} />
              Salir
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="fuel-start" className="mb-1 block text-xs font-medium text-slate-600">
                Desde
              </label>
              <input
                id="fuel-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label htmlFor="fuel-end" className="mb-1 block text-xs font-medium text-slate-600">
                Hasta
              </label>
              <input
                id="fuel-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pt-4">
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        )}

        <div className="mb-4 grid grid-cols-3 gap-3">
          <SummaryCard label="Repostajes" value={String(totals.count)} color="blue" />
          <SummaryCard label="Litros" value={totals.liters.toFixed(2)} color="amber" />
          <SummaryCard label="Coste" value={`${totals.cost.toFixed(2)}€`} color="green" />
        </div>

        <div className="mb-3 flex items-center gap-2">
          <Fuel size={18} className="text-amber-600" />
          <h3 className="text-base font-bold text-amber-900">Repostajes</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-2">
            {records.map((record) => (
              <FuelRecordCard key={record.id} record={record} />
            ))}
            {records.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-500">
                No hay repostajes en este rango de fechas.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function VacationsView({
  dni,
  pin,
  worker,
  onLogout
}: {
  dni: string;
  pin: string;
  worker: WorkerInfo;
  onLogout: () => void;
}) {
  const [month, setMonth] = useState(getCurrentMonth());
  const [data, setData] = useState<VacationSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVacations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(VACATIONS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dni,
          pin,
          month
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Error al consultar vacaciones');
      }

      setData(result as VacationSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dni, pin, month]);

  useEffect(() => {
    fetchVacations();
  }, [fetchVacations]);

  const [year, monthNum] = month.split('-').map(Number);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const firstWeekday = new Date(year, monthNum - 1, 1).getDay();
  const mondayOffset = (firstWeekday + 6) % 7;
  const today = new Date().toISOString().slice(0, 10);
  const vacationSet = new Set(data?.vacationDays || []);

  const days: { day: number; date: string; isWeekend: boolean }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = String(d).padStart(2, '0');
    const date = `${month}-${dayStr}`;
    const weekday = new Date(year, monthNum - 1, d).getDay();
    days.push({ day: d, date, isWeekend: weekday === 0 || weekday === 6 });
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto max-w-md">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{worker.name}</h2>
              <p className="text-xs text-slate-500">{worker.dni}</p>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              <LogOut size={16} />
              Salir
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-100 p-2">
            <button
              onClick={() => setMonth(addMonths(month, -1))}
              disabled={loading}
              className="rounded-lg bg-white p-2 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronLeft size={20} className="text-slate-700" />
            </button>

            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Calendar size={18} className="text-amber-500" />
              {formatMonthName(month)}
            </div>

            <button
              onClick={() => setMonth(addMonths(month, 1))}
              disabled={loading}
              className="rounded-lg bg-white p-2 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronRight size={20} className="text-slate-700" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pt-4">
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        )}

        {data && (
          <div className="mb-4 grid grid-cols-3 gap-3">
            <SummaryCard
              label="Derecho"
              value={String(data.annualTotal)}
              sub={`${data.totalDays} + ${data.carryOver} arr.`}
              color="green"
            />
            <SummaryCard label="Marcados" value={String(data.taken)} color="amber" />
            <SummaryCard label="Restantes" value={String(data.remaining)} color="blue" />
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-amber-500" />
          </div>
        ) : data ? (
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="mb-3 grid grid-cols-7 gap-1 text-center">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((label) => (
                <div key={label} className="text-xs font-bold text-slate-500">
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: mondayOffset }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {days.map(({ day, date, isWeekend }) => {
                const isVacation = vacationSet.has(date);
                const isToday = date === today;

                return (
                  <div
                    key={date}
                    className={`flex aspect-square items-center justify-center rounded-lg text-sm font-semibold transition ${
                      isVacation
                        ? 'bg-green-500 text-white'
                        : isWeekend
                        ? 'text-slate-400'
                        : 'text-slate-700'
                    } ${isToday ? 'ring-2 ring-amber-500 ring-offset-1' : ''}`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>

            {data.vacationDays.length === 0 && (
              <p className="mt-4 text-center text-sm text-slate-500">
                No hay días de vacaciones en {formatMonthName(month)}.
              </p>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}

type PortalTab = 'clock' | 'hours' | 'fuel' | 'vacations';

function BottomNav({
  activeTab,
  onChange,
  showClock
}: {
  activeTab: PortalTab;
  onChange: (tab: PortalTab) => void;
  showClock: boolean;
}) {
  const allTabs = [
    { id: 'clock', label: 'Fichar', icon: Timer, color: 'rose' },
    { id: 'hours', label: 'Horas', icon: Clock, color: 'blue' },
    { id: 'fuel', label: 'Combustible', icon: Fuel, color: 'amber' },
    { id: 'vacations', label: 'Vacaciones', icon: Sun, color: 'emerald' }
  ] as const;

  const tabs = showClock ? allTabs : allTabs.filter(t => t.id !== 'clock');

  const colorMap: Record<typeof tabs[number]['color'], { active: string; inactive: string; activeIcon: string; inactiveIcon: string }> = {
    rose: { active: 'bg-rose-600 text-white shadow-md shadow-rose-200', inactive: 'text-rose-600 hover:bg-rose-50', activeIcon: 'text-white', inactiveIcon: 'text-rose-500' },
    blue: { active: 'bg-blue-600 text-white shadow-md shadow-blue-200', inactive: 'text-blue-600 hover:bg-blue-50', activeIcon: 'text-white', inactiveIcon: 'text-blue-500' },
    amber: { active: 'bg-amber-600 text-white shadow-md shadow-amber-200', inactive: 'text-amber-600 hover:bg-amber-50', activeIcon: 'text-white', inactiveIcon: 'text-amber-500' },
    emerald: { active: 'bg-emerald-600 text-white shadow-md shadow-emerald-200', inactive: 'text-emerald-600 hover:bg-emerald-50', activeIcon: 'text-white', inactiveIcon: 'text-emerald-500' }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white px-4 pb-3 pt-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="mx-auto flex max-w-md items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const colors = colorMap[tab.color];
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-black transition ${
                isActive ? colors.active : colors.inactive
              }`}
            >
              <Icon size={22} className={isActive ? colors.activeIcon : colors.inactiveIcon} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default function App() {
  const [isAdmin, setIsAdmin] = useState(() => window.location.hash === '#admin');

  useEffect(() => {
    const onHash = () => setIsAdmin(window.location.hash === '#admin');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const [view, setView] = useState<'login' | 'summary'>('login');
  const [activeTab, setActiveTab] = useState<PortalTab>('clock');
  const [dni, setDni] = useState('');
  const [pin, setPin] = useState('');
  const [month, setMonth] = useState(getCurrentMonth());
  const [summary, setSummary] = useState<WorkerSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async (currentDni: string, currentPin: string, currentMonth: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dni: currentDni,
          pin: currentPin,
          month: currentMonth
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Error al consultar');
      }

      setSummary(data as WorkerSummary);
      setView('summary');
      setActiveTab(CLOCK_PILOT_DNIS.has(String(data.worker?.dni || '').toUpperCase()) ? 'clock' : 'hours');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogin = useCallback(async (newDni: string, newPin: string, remember: boolean) => {
    setDni(newDni);
    setPin(newPin);
    if (remember) {
      localStorage.setItem(AUTH_KEY, JSON.stringify({ dni: newDni, pin: newPin }));
    }
    await fetchSummary(newDni, newPin, month);
  }, [month, fetchSummary]);

  // Auto-login si el operario marcó "mantener sesión"
  useEffect(() => {
    if (isAdmin) return;
    try {
      const saved = localStorage.getItem(AUTH_KEY);
      if (saved) {
        const { dni: sd, pin: sp } = JSON.parse(saved);
        if (sd && sp) {
          setDni(sd);
          setPin(sp);
          fetchSummary(sd, sp, getCurrentMonth());
        }
      }
    } catch { /* credenciales corruptas: pedir login */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const handleMonthChange = useCallback(async (newMonth: string) => {
    setMonth(newMonth);
    if (dni && pin) {
      await fetchSummary(dni, pin, newMonth);
    }
  }, [dni, pin, fetchSummary]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    setDni('');
    setPin('');
    setSummary(null);
    setActiveTab('clock');
    setView('login');
    setError(null);
  }, []);

  if (isAdmin) {
    return <AdminApp />;
  }

  if (view === 'login' || !summary) {
    return <LoginForm onLogin={handleLogin} loading={loading} error={error} />;
  }

  const canClock = CLOCK_PILOT_DNIS.has(String(summary.worker.dni || '').toUpperCase());
  const tab = canClock ? activeTab : 'hours';

  return (
    <div className="relative min-h-screen bg-slate-50">
      {tab === 'clock' && (
        <ClockView dni={dni} pin={pin} worker={summary.worker} onLogout={handleLogout} />
      )}
      {tab === 'hours' && (
        <SummaryView
          summary={summary}
          month={month}
          onMonthChange={handleMonthChange}
          onLogout={handleLogout}
          loading={loading}
          error={error}
        />
      )}
      {tab === 'fuel' && (
        <FuelView dni={dni} pin={pin} worker={summary.worker} onLogout={handleLogout} />
      )}
      {tab === 'vacations' && (
        <VacationsView dni={dni} pin={pin} worker={summary.worker} onLogout={handleLogout} />
      )}
      <BottomNav activeTab={tab} onChange={setActiveTab} showClock={canClock} />
    </div>
  );
}
