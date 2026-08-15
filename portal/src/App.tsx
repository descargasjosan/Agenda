import { useState, useCallback, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, LogOut, Clock, Wallet, PiggyBank, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import type { WorkerSummary } from './lib/types';

const API_URL = import.meta.env.VITE_API_URL || '/api/worker-hours';

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

function LoginForm({ onLogin, loading, error }: { onLogin: (dni: string, pin: string) => void; loading: boolean; error: string | null }) {
  const [dni, setDni] = useState('');
  const [pin, setPin] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(dni.trim().toUpperCase(), pin.trim());
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
              placeholder="Últimos 4 dígitos del teléfono"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              required
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Si no funciona, prueba con un PIN definido por tu supervisor.
            </p>
          </div>

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

      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="mx-auto max-w-md">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <PiggyBank size={18} />
              <span className="font-medium">A pagar:</span>
            </div>
            <span className="text-lg font-bold text-blue-700">{summary.total}h</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<'login' | 'summary'>('login');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogin = useCallback(async (newDni: string, newPin: string) => {
    setDni(newDni);
    setPin(newPin);
    await fetchSummary(newDni, newPin, month);
  }, [month, fetchSummary]);

  const handleMonthChange = useCallback(async (newMonth: string) => {
    setMonth(newMonth);
    if (dni && pin) {
      await fetchSummary(dni, pin, newMonth);
    }
  }, [dni, pin, fetchSummary]);

  const handleLogout = useCallback(() => {
    setDni('');
    setPin('');
    setSummary(null);
    setView('login');
    setError(null);
  }, []);

  if (view === 'login' || !summary) {
    return <LoginForm onLogin={handleLogin} loading={loading} error={error} />;
  }

  return (
    <SummaryView
      summary={summary}
      month={month}
      onMonthChange={handleMonthChange}
      onLogout={handleLogout}
      loading={loading}
      error={error}
    />
  );
}
