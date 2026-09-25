import { useState, useCallback, useEffect } from 'react';
import {
  Activity, CalendarDays, FileDown, LogOut, RefreshCw, Plus, Pencil, Ban,
  AlertCircle, Loader2, Lock, Mail, ArrowRight, Clock, ShieldCheck, Settings, MapPin
} from 'lucide-react';

const AUTH_API_URL = import.meta.env.VITE_API_ADMIN_AUTH_URL || '/api/admin-auth';
const ADMIN_API_URL = import.meta.env.VITE_API_ADMIN_CLOCK_URL || '/api/admin-clock';
const TOKEN_KEY = 'dj-portal-admin-token';

interface AdminLog {
  id: string;
  workerId: string;
  type: string;
  label: string;
  ts: string;
  time: string;
  date: string;
  source: string;
  correctsId: string | null;
  correctionReason: string | null;
  createdBy: string | null;
  superseded?: boolean;
  voided?: boolean;
  workerName?: string;
  workerDni?: string;
}

interface OverviewWorker {
  id: string;
  name: string;
  dni: string;
  code?: string;
  state: 'none' | 'in' | 'paused' | 'out';
  count: number;
  logs: AdminLog[];
}

type AdminView = 'overview' | 'history' | 'export' | 'settings';

type GpsMode = 'off' | 'optional' | 'required';

const STATE_BADGE: Record<OverviewWorker['state'], { label: string; classes: string }> = {
  in: { label: 'Trabajando', classes: 'bg-green-100 text-green-700' },
  paused: { label: 'En pausa', classes: 'bg-amber-100 text-amber-700' },
  out: { label: 'Cerrado', classes: 'bg-blue-100 text-blue-700' },
  none: { label: 'Sin fichar', classes: 'bg-slate-100 text-slate-500' }
};

function workedMinutesToday(logs: AdminLog[]) {
  const eff = logs.filter(l => !l.superseded && !l.voided && l.type !== 'void');
  let minutes = 0;
  let open: number | null = null;
  for (const l of eff) {
    const t = new Date(l.ts).getTime();
    if (l.type === 'in' || l.type === 'pause_end') open = t;
    else if ((l.type === 'out' || l.type === 'pause_start') && open !== null) {
      minutes += Math.max(0, (t - open) / 60000);
      open = null;
    }
  }
  if (open !== null) minutes += Math.max(0, (Date.now() - open) / 60000);
  return minutes;
}

function formatMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

// ---------- Login ----------

function AdminLogin({ onLogin }: { onLogin: (token: string, email: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(AUTH_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error de acceso');
      localStorage.setItem(TOKEN_KEY, data.token);
      onLogin(data.token, data.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md p-10 rounded-[40px] shadow-2xl border border-slate-100">
        <div className="text-center mb-10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-[900] text-slate-900 italic uppercase tracking-tighter mb-2">
            Registro de Jornada
          </h1>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">
            Panel de Administración · Descargas Josan
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
              Correo Electrónico
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="email"
                required
                placeholder="usuario@ejemplo.com"
                className="w-full bg-slate-50 text-slate-900 text-sm font-bold pl-12 pr-4 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-300"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
              Contraseña
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full bg-slate-50 text-slate-900 text-sm font-bold pl-12 pr-4 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-300"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-2xl text-xs font-bold flex items-center gap-3 bg-red-50 text-red-600 border border-red-100">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 rounded-[28px] font-black text-xs uppercase tracking-[0.15em] bg-slate-900 hover:bg-slate-800 text-white hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 mt-4"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Acceder <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <p className="mt-8 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">
          Mismas credenciales que la app principal
        </p>
      </div>
    </div>
  );
}

// ---------- Modal de corrección ----------

interface ModalState {
  kind: 'add' | 'correct' | 'void';
  workerId: string;
  date: string;
  log?: AdminLog;
}

function ActionModal({
  modal,
  onClose,
  onSubmit,
  saving
}: {
  modal: ModalState;
  onClose: () => void;
  onSubmit: (payload: { type?: string; ts?: string; reason: string }) => void;
  saving: boolean;
}) {
  const [type, setType] = useState('in');
  const [dateTime, setDateTime] = useState(() => {
    const base = modal.log ? new Date(modal.log.ts) : new Date(`${modal.date}T08:00`);
    const local = new Date(base.getTime() - base.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  });
  const [reason, setReason] = useState('');

  const titles = { add: 'Añadir Fichaje', correct: 'Corregir Hora', void: 'Anular Fichaje' };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-black text-slate-900 italic uppercase tracking-tighter mb-6">
          {titles[modal.kind]}
        </h3>

        <div className="space-y-4">
          {modal.kind === 'add' && (
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-1.5">Tipo</label>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full bg-slate-50 text-sm font-bold px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              >
                <option value="in">Entrada</option>
                <option value="pause_start">Inicio pausa</option>
                <option value="pause_end">Fin pausa</option>
                <option value="out">Salida</option>
              </select>
            </div>
          )}

          {modal.kind !== 'void' && (
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-1.5">Fecha y hora</label>
              <input
                type="datetime-local"
                value={dateTime}
                onChange={e => setDateTime(e.target.value)}
                className="w-full bg-slate-50 text-sm font-bold px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />
            </div>
          )}

          {modal.kind === 'void' && modal.log && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-xs font-bold text-rose-700">
              Se anulará el fichaje "{modal.log.label}" de las {modal.log.time}. El registro original queda guardado como anulado.
            </div>
          )}

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-1.5">Motivo *</label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Ej: Olvido de fichaje"
              className="w-full bg-slate-50 text-sm font-bold px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 placeholder:text-slate-300"
            />
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSubmit({ type, ts: dateTime, reason })}
            disabled={saving || !reason.trim()}
            className="flex-1 py-4 rounded-2xl bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Vistas ----------

type OverviewFilter = 'all' | OverviewWorker['state'];

const STATE_DOT: Record<OverviewWorker['state'], string> = {
  in: 'bg-green-500',
  paused: 'bg-amber-500',
  out: 'bg-blue-400',
  none: 'bg-slate-300'
};

function OverviewPanel({ workers, loading, onRefresh, onOpenHistory }: {
  workers: OverviewWorker[];
  loading: boolean;
  onRefresh: () => void;
  onOpenHistory: (workerId: string) => void;
}) {
  const [filter, setFilter] = useState('');
  const [stateFilter, setStateFilter] = useState<OverviewFilter>('all');

  const counts = {
    in: workers.filter(w => w.state === 'in').length,
    paused: workers.filter(w => w.state === 'paused').length,
    out: workers.filter(w => w.state === 'out').length,
    none: workers.filter(w => w.state === 'none').length
  };

  const filtered = workers.filter(w => {
    if (stateFilter !== 'all' && w.state !== stateFilter) return false;
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      w.name?.toLowerCase().includes(q) ||
      w.dni?.toLowerCase().includes(q) ||
      String(w.code || '').toLowerCase().includes(q)
    );
  });

  const stateButtons: { id: OverviewFilter; label: string; count: number }[] = [
    { id: 'all', label: 'Todos', count: workers.length },
    { id: 'in', label: 'Trabajando', count: counts.in },
    { id: 'paused', label: 'En pausa', count: counts.paused },
    { id: 'out', label: 'Cerrados', count: counts.out },
    { id: 'none', label: 'Sin fichar', count: counts.none }
  ];

  return (
    <div className="p-6">
      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="🔍 Código, nombre o DNI..."
          className="w-64 p-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">Estado</span>
          {stateButtons.map(b => (
            <button
              key={b.id}
              onClick={() => setStateFilter(b.id)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors border ${
                stateFilter === b.id
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600'
              }`}
            >
              {b.label} <span className="opacity-60">{b.count}</span>
            </button>
          ))}
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
        {loading && workers.length === 0 ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest w-16">Cód.</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Operario</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Entrada</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Pausa</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Salida</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Tiempo hoy</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(w => {
                  const eff = w.logs.filter(l => !l.superseded && !l.voided && l.type !== 'void');
                  const entries = eff.filter(l => l.type === 'in');
                  const exits = eff.filter(l => l.type === 'out');

                  const pauses: { start: AdminLog; end?: AdminLog }[] = [];
                  let openPause: AdminLog | null = null;
                  for (const l of eff) {
                    if (l.type === 'pause_start') openPause = l;
                    else if (l.type === 'pause_end' && openPause) {
                      pauses.push({ start: openPause, end: l });
                      openPause = null;
                    }
                  }
                  if (openPause) pauses.push({ start: openPause });

                  const mins = workedMinutesToday(w.logs);
                  const lastWithGps = [...eff].reverse().find(l => l.lat != null && l.lng != null);

                  const Time = ({ t, log }: { t: string; log?: AdminLog }) => (
                    <span className="inline-flex items-center gap-1 font-medium tabular-nums text-slate-800">
                      {t}
                      {log && log.lat != null && log.lng != null && (
                        <a
                          href={`https://www.google.com/maps?q=${log.lat},${log.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Ver ubicación"
                          onClick={e => e.stopPropagation()}
                          className="text-emerald-500 hover:text-emerald-700"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </span>
                  );

                  return (
                    <tr
                      key={w.id}
                      onClick={() => onOpenHistory(w.id)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-[10px] border bg-slate-100 text-slate-500 border-slate-200">
                          {w.code || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800 text-sm">{w.name}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-tight">{w.dni}</p>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {entries.length === 0 ? (
                          <span className="text-slate-300 font-bold">—</span>
                        ) : (
                          <div className="space-y-0.5">
                            {entries.map(l => <div key={l.id}><Time t={l.time} log={l} /></div>)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {pauses.length === 0 ? (
                          <span className="text-slate-300 font-bold">—</span>
                        ) : (
                          <div className="space-y-0.5">
                            {pauses.map((p, i) => (
                              <div key={i} className="flex items-center gap-1">
                                <Time t={p.start.time} log={p.start} />
                                <span className="text-slate-300 font-bold">→</span>
                                {p.end ? <Time t={p.end.time} log={p.end} /> : <span className="text-amber-600 font-black">…</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {exits.length === 0 ? (
                          <span className="text-slate-300 font-bold">—</span>
                        ) : (
                          <div className="space-y-0.5">
                            {exits.map(l => <div key={l.id}><Time t={l.time} log={l} /></div>)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {mins > 0 ? (
                          <span className="font-medium tabular-nums text-slate-800">{formatMinutes(mins)}</span>
                        ) : (
                          <span className="text-slate-300 font-bold">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${STATE_DOT[w.state]}`} />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                            {STATE_BADGE[w.state].label}
                          </span>
                          {lastWithGps && (
                            <span title="Último fichaje con GPS">
                              <MapPin className="w-3 h-3 text-emerald-500" />
                            </span>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-xs font-black uppercase tracking-widest text-slate-400">
                      Sin operarios con ese filtro
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryPanel({
  workers, workerId, onWorkerChange, month, onMonthChange, logs, loading, onRefresh, onAction
}: {
  workers: OverviewWorker[];
  workerId: string;
  onWorkerChange: (id: string) => void;
  month: string;
  onMonthChange: (m: string) => void;
  logs: AdminLog[];
  loading: boolean;
  onRefresh: () => void;
  onAction: (m: ModalState) => void;
}) {
  const byDate: Record<string, AdminLog[]> = {};
  for (const l of logs) {
    (byDate[l.date] = byDate[l.date] || []).push(l);
  }
  const dates = Object.keys(byDate).sort().reverse();

  const logById: Record<string, AdminLog> = {};
  for (const l of logs) logById[l.id] = l;

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={workerId}
          onChange={e => onWorkerChange(e.target.value)}
          className="bg-white text-sm font-medium px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[240px]"
        >
          <option value="">Selecciona operario…</option>
          {workers.map(w => (
            <option key={w.id} value={w.id}>{w.name} · {w.dni}</option>
          ))}
        </select>
        <input
          type="month"
          value={month}
          onChange={e => onMonthChange(e.target.value)}
          className="bg-white text-sm font-medium px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {workerId && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        )}
      </div>

      {!workerId ? (
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-16 text-center">
          <CalendarDays className="w-10 h-10 mx-auto text-slate-200 mb-3" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Elige un operario para ver su registro</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Fecha</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Entrada</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Pausa</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Salida</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Total</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Observaciones</th>
                  <th className="px-4 py-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dates.map(date => {
                  const dayLogs = byDate[date];
                  const d = new Date(`${date}T00:00:00`);
                  const eff = dayLogs.filter(l => !l.superseded && !l.voided && l.type !== 'void');
                  const entries = eff.filter(l => l.type === 'in');
                  const exits = eff.filter(l => l.type === 'out');
                  const supersededLogs = dayLogs.filter(l => (l.superseded || l.voided) && l.type !== 'void');
                  const corrections = dayLogs.filter(l => l.correctionReason);

                  const pauses: { start: AdminLog; end?: AdminLog }[] = [];
                  let openPause: AdminLog | null = null;
                  for (const l of eff) {
                    if (l.type === 'pause_start') openPause = l;
                    else if (l.type === 'pause_end' && openPause) {
                      pauses.push({ start: openPause, end: l });
                      openPause = null;
                    }
                  }
                  if (openPause) pauses.push({ start: openPause });

                  const mins = workedMinutesToday(dayLogs);

                  const Punch = ({ l }: { l: AdminLog }) => (
                    <div className="flex items-center gap-1 group">
                      <span className="font-medium tabular-nums text-slate-800">{l.time}</span>
                      {l.lat != null && l.lng != null && (
                        <a
                          href={`https://www.google.com/maps?q=${l.lat},${l.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Ver ubicación"
                          onClick={e => e.stopPropagation()}
                          className="text-emerald-500 hover:text-emerald-700"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {l.source === 'admin' && (
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-indigo-400">admin</span>
                      )}
                      {l.correctsId && (
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-blue-400">corr.</span>
                      )}
                      <button
                        onClick={() => onAction({ kind: 'correct', workerId, date, log: l })}
                        title="Corregir hora"
                        className="p-1 rounded text-slate-300 hover:bg-blue-50 hover:text-blue-600 transition-all"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onAction({ kind: 'void', workerId, date, log: l })}
                        title="Anular fichaje"
                        className="p-1 rounded text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition-all"
                      >
                        <Ban className="w-3 h-3" />
                      </button>
                    </div>
                  );

                  return (
                    <tr key={date} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-medium text-slate-800 text-sm capitalize">
                          {d.toLocaleDateString('es-ES', { weekday: 'short' })}
                          <span className="text-slate-400"> · </span>
                          {d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm align-top">
                        {entries.length === 0 ? <span className="text-slate-300">—</span> : (
                          <div className="space-y-1">{entries.map(l => <Punch key={l.id} l={l} />)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm align-top">
                        {pauses.length === 0 ? <span className="text-slate-300">—</span> : (
                          <div className="space-y-1">
                            {pauses.map((p, i) => (
                              <div key={i} className="flex items-center gap-1">
                                <Punch l={p.start} />
                                <span className="text-slate-300">→</span>
                                {p.end ? <Punch l={p.end} /> : <span className="text-amber-600 font-medium">…</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm align-top">
                        {exits.length === 0 ? <span className="text-slate-300">—</span> : (
                          <div className="space-y-1">{exits.map(l => <Punch key={l.id} l={l} />)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right align-top">
                        {mins > 0 ? (
                          <span className="font-medium tabular-nums text-slate-800">{formatMinutes(mins)}</span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="space-y-1">
                          {supersededLogs.map(l => (
                            <p key={l.id} className="text-[10px] text-slate-400">
                              <span className="line-through">{l.label} {l.time}</span>
                              <span className="ml-1">{l.voided ? 'anulado' : 'sustituido'}</span>
                            </p>
                          ))}
                          {corrections.map(l => (
                            <p key={`r-${l.id}`} className="text-[10px] text-slate-400" title={l.createdBy || ''}>
                              {l.type === 'void' ? 'Anulación' : 'Corrección'}: {l.correctionReason}
                            </p>
                          ))}
                          {supersededLogs.length === 0 && corrections.length === 0 && (
                            <span className="text-slate-200">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <button
                          onClick={() => onAction({ kind: 'add', workerId, date })}
                          title="Añadir fichaje este día"
                          className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-100 hover:text-slate-600 transition-all"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {dates.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400">Sin fichajes en este mes</p>
                      <button
                        onClick={() => onAction({ kind: 'add', workerId, date: `${month}-01` })}
                        className="mt-4 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800"
                      >
                        + Añadir fichaje
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsPanel({ apiCall }: { apiCall: (payload: Record<string, unknown>) => Promise<any> }) {
  const [gpsMode, setGpsMode] = useState<GpsMode>('optional');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiCall({ action: 'settings' })
      .then(d => { if (d.settings?.gpsMode) setGpsMode(d.settings.gpsMode); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [apiCall]);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await apiCall({ action: 'save-settings', settings: { gpsMode } });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const options: { id: GpsMode; title: string; desc: string }[] = [
    { id: 'off', title: 'Desactivada', desc: 'El fichaje no pide ni guarda ubicación.' },
    { id: 'optional', title: 'Opcional', desc: 'Se pide permiso al fichar y se guarda si el operario acepta. Si lo deniega, el fichaje se registra igualmente sin coordenadas.' },
    { id: 'required', title: 'Obligatoria', desc: 'Sin ubicación no se registra el fichaje — el operario debe aceptar el permiso GPS.' }
  ];

  return (
    <div className="p-6">
      <div className="max-w-xl bg-white rounded-3xl ring-1 ring-slate-200 p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <MapPin className="w-5 h-5" />
          </div>
          <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Geolocalización al fichar</h3>
        </div>
        <p className="text-xs font-bold text-slate-400 mb-6">
          La ubicación solo se captura en el instante de fichar; nunca se rastrea en segundo plano.
        </p>

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
        ) : (
          <>
            <div className="space-y-3">
              {options.map(o => (
                <button
                  key={o.id}
                  onClick={() => setGpsMode(o.id)}
                  className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
                    gpsMode === o.id
                      ? 'border-blue-500 bg-blue-50/50 ring-4 ring-blue-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                      gpsMode === o.id ? 'border-blue-600' : 'border-slate-300'
                    }`}>
                      {gpsMode === o.id && <div className="h-2 w-2 rounded-full bg-blue-600" />}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 uppercase tracking-wide">{o.title}</p>
                      <p className="text-xs font-bold text-slate-400 mt-0.5">{o.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={save}
              disabled={saving}
              className="mt-6 px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center gap-2 disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar ajustes
            </button>
            {saved && (
              <p className="mt-3 text-xs font-black uppercase tracking-widest text-green-600">✓ Guardado</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ExportPanel({ apiCall, month, onMonthChange }: {
  apiCall: (payload: Record<string, unknown>) => Promise<any>;
  month: string;
  onMonthChange: (m: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const data = await apiCall({ action: 'export', month });
      const logs: AdminLog[] = data.logs || [];

      const header = 'DNI;Operario;Fecha;Hora;Tipo;Origen;Estado;Motivo;Lat;Lng';
      const rows = logs.map(l => [
        l.workerDni,
        l.workerName,
        l.date,
        l.time,
        l.label,
        l.source === 'admin' ? 'Administración' : 'Operario',
        l.superseded ? 'Sustituido' : 'Vigente',
        (l.correctionReason || '').replace(/;/g, ','),
        l.lat ?? '',
        l.lng ?? ''
      ].join(';'));

      const csv = '﻿' + [header, ...rows].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `registro_jornada_${month}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      setMessage(`Exportados ${logs.length} fichajes de ${month}.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al exportar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-lg bg-white rounded-3xl ring-1 ring-slate-200 p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <FileDown className="w-5 h-5" />
          </div>
          <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Exportar registro mensual</h3>
        </div>
        <p className="text-xs font-bold text-slate-400 mb-6">
          Genera un CSV con todos los fichajes del mes (vigentes y sustituidos) listo para Excel.
        </p>

        <div className="flex items-center gap-3">
          <input
            type="month"
            value={month}
            onChange={e => onMonthChange(e.target.value)}
            className="bg-slate-50 text-sm font-bold px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleExport}
            disabled={loading}
            className="px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            Exportar CSV
          </button>
        </div>

        {message && (
          <p className="mt-4 text-xs font-bold text-slate-500">{message}</p>
        )}
      </div>
    </div>
  );
}

// ---------- App admin ----------

export default function AdminApp() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [adminEmail, setAdminEmail] = useState('');
  const [view, setView] = useState<AdminView>('overview');
  const [workers, setWorkers] = useState<OverviewWorker[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [historyWorker, setHistoryWorker] = useState('');
  const [historyMonth, setHistoryMonth] = useState(new Date().toISOString().slice(0, 7));
  const [historyLogs, setHistoryLogs] = useState<AdminLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [exportMonth, setExportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [modal, setModal] = useState<ModalState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiCall = useCallback(async (payload: Record<string, unknown>) => {
    const res = await fetch(ADMIN_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      throw new Error('Sesión caducada');
    }
    if (!res.ok) throw new Error(data.message || data.error || 'Error');
    return data;
  }, [token]);

  const loadOverview = useCallback(async () => {
    if (!token) return;
    setOverviewLoading(true);
    setError(null);
    try {
      const data = await apiCall({ action: 'overview' });
      setWorkers(data.workers || []);
    } catch (err) {
      if (err instanceof Error && err.message !== 'Sesión caducada') setError(err.message);
    } finally {
      setOverviewLoading(false);
    }
  }, [token, apiCall]);

  const loadHistory = useCallback(async () => {
    if (!token || !historyWorker) return;
    setHistoryLoading(true);
    try {
      const data = await apiCall({ action: 'history', workerId: historyWorker, month: historyMonth });
      setHistoryLogs(data.logs || []);
    } catch (err) {
      if (err instanceof Error && err.message !== 'Sesión caducada') setError(err.message);
    } finally {
      setHistoryLoading(false);
    }
  }, [token, apiCall, historyWorker, historyMonth]);

  useEffect(() => { loadOverview(); }, [loadOverview]);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleModalSubmit = async ({ type, ts, reason }: { type?: string; ts?: string; reason: string }) => {
    if (!modal) return;
    setSaving(true);
    try {
      if (modal.kind === 'add') {
        await apiCall({ action: 'add', workerId: modal.workerId, type, ts, reason });
      } else if (modal.kind === 'correct') {
        await apiCall({ action: 'correct', logId: modal.log!.id, ts, reason });
      } else {
        await apiCall({ action: 'void', logId: modal.log!.id, reason });
      }
      setModal(null);
      await Promise.all([loadHistory(), loadOverview()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  };

  if (!token) {
    return <AdminLogin onLogin={(t, email) => { setToken(t); setAdminEmail(email); }} />;
  }

  const navItems: { id: AdminView; label: string; icon: typeof Activity }[] = [
    { id: 'overview', label: 'En Curso', icon: Activity },
    { id: 'history', label: 'Historial', icon: CalendarDays },
    { id: 'export', label: 'Exportar', icon: FileDown },
    { id: 'settings', label: 'Ajustes', icon: Settings }
  ];

  const titles: Record<AdminView, string> = {
    overview: 'Registro en Curso',
    history: 'Historial de Fichajes',
    export: 'Exportación',
    settings: 'Ajustes'
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Sidebar oscuro como la app principal */}
      <aside className="w-20 bg-slate-900 flex flex-col items-center py-8 gap-8 shrink-0 z-50 shadow-2xl">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-900/40">
          <Clock className="w-6 h-6" />
        </div>
        <nav className="flex flex-col gap-4">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                title={item.label}
                className={`p-3 rounded-xl transition-all flex justify-center ${
                  view === item.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-6 h-6" />
              </button>
            );
          })}
        </nav>
        <button
          onClick={handleLogout}
          title="Cerrar sesión"
          className="mt-auto p-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 z-20 shadow-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter">
              {titles[view]}
            </h1>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
              Registro de Jornada
            </span>
          </div>
          {adminEmail && (
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{adminEmail}</span>
          )}
        </header>

        <main className="flex-1 overflow-auto bg-slate-50">
          {error && (
            <div className="mx-6 mt-4 p-4 rounded-2xl bg-red-50 border border-red-100 text-xs font-bold text-red-600 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
            </div>
          )}

          {view === 'overview' && (
            <OverviewPanel
              workers={workers}
              loading={overviewLoading}
              onRefresh={loadOverview}
              onOpenHistory={(id) => { setHistoryWorker(id); setView('history'); }}
            />
          )}
          {view === 'history' && (
            <HistoryPanel
              workers={workers}
              workerId={historyWorker}
              onWorkerChange={setHistoryWorker}
              month={historyMonth}
              onMonthChange={setHistoryMonth}
              logs={historyLogs}
              loading={historyLoading}
              onRefresh={loadHistory}
              onAction={setModal}
            />
          )}
          {view === 'export' && (
            <ExportPanel apiCall={apiCall} month={exportMonth} onMonthChange={setExportMonth} />
          )}
          {view === 'settings' && <SettingsPanel apiCall={apiCall} />}
        </main>
      </div>

      {modal && (
        <ActionModal modal={modal} onClose={() => setModal(null)} onSubmit={handleModalSubmit} saving={saving} />
      )}
    </div>
  );
}
