import { useState, useCallback, useEffect } from 'react';
import { LogIn, LogOut, Coffee, Play, Loader2, AlertCircle, Clock, MapPin } from 'lucide-react';
import type { WorkerInfo } from './lib/types';

type GpsMode = 'off' | 'optional' | 'required';

function getPosition(timeoutMs = 8000): Promise<{ lat: number; lng: number; accuracy: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30000 }
    );
  });
}

const CLOCK_API_URL = import.meta.env.VITE_API_CLOCK_URL || '/api/clock';

interface ClockLog {
  id: string;
  type: string;
  label: string;
  time: string;
  source: string;
  corrected: boolean;
  lat: number | null;
  lng: number | null;
}

type ClockState = 'none' | 'in' | 'paused' | 'out';

const STATE_INFO: Record<ClockState, { label: string; classes: string }> = {
  none: { label: 'Sin fichar', classes: 'bg-slate-100 text-slate-600 ring-slate-200' },
  in: { label: 'Trabajando', classes: 'bg-green-100 text-green-700 ring-green-200' },
  paused: { label: 'En pausa', classes: 'bg-amber-100 text-amber-700 ring-amber-200' },
  out: { label: 'Jornada cerrada', classes: 'bg-blue-100 text-blue-700 ring-blue-200' }
};

export default function ClockView({
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
  const [logs, setLogs] = useState<ClockLog[]>([]);
  const [state, setState] = useState<ClockState>('none');
  const [gpsMode, setGpsMode] = useState<GpsMode>('optional');
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const callClock = useCallback(async (punch?: string) => {
    if (punch) setPunching(true); else setLoading(true);
    setError(null);

    try {
      let coords: { lat: number; lng: number; accuracy: number } | null = null;
      if (punch && gpsMode !== 'off') {
        coords = await getPosition();
      }

      const response = await fetch(CLOCK_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni, pin, punch, ...(coords || {}) })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || 'Error al fichar');

      setLogs(data.logs || []);
      setState(data.state || 'none');
      if (data.gpsMode) setGpsMode(data.gpsMode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
      setPunching(false);
    }
  }, [dni, pin, gpsMode]);

  useEffect(() => {
    callClock();
  }, [callClock]);

  const info = STATE_INFO[state];

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-md items-center justify-between">
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
      </header>

      <main className="mx-auto max-w-md px-4 pt-4">
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
            <div className="flex items-start gap-2">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Reloj y estado */}
        <div className="mb-4 rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-5xl font-black tabular-nums tracking-tight text-slate-900">
            {now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className="mt-1 text-sm font-medium capitalize text-slate-500">
            {now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <div className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold ring-1 ${info.classes}`}>
            <Clock size={15} />
            {loading ? 'Cargando...' : info.label}
          </div>
          {gpsMode !== 'off' && (
            <p className="mt-3 flex items-center justify-center gap-1 text-xs text-slate-400">
              <MapPin size={12} />
              Al fichar se registrará tu ubicación{gpsMode === 'required' ? ' (obligatoria)' : ''}
            </p>
          )}
        </div>

        {/* Botones de fichaje */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={32} className="animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-2 gap-3">
            {(state === 'none' || state === 'out') && (
              <button
                onClick={() => callClock('in')}
                disabled={punching}
                className="col-span-2 flex items-center justify-center gap-3 rounded-2xl bg-green-600 px-4 py-6 text-lg font-black uppercase tracking-wider text-white shadow-lg shadow-green-200 transition hover:bg-green-700 active:scale-[0.98] disabled:opacity-60"
              >
                {punching ? <Loader2 size={26} className="animate-spin" /> : <LogIn size={26} />}
                Fichar Entrada
              </button>
            )}

            {state === 'in' && (
              <>
                <button
                  onClick={() => callClock('pause_start')}
                  disabled={punching}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-6 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-amber-200 transition hover:bg-amber-600 active:scale-[0.98] disabled:opacity-60"
                >
                  {punching ? <Loader2 size={22} className="animate-spin" /> : <Coffee size={22} />}
                  Iniciar Pausa
                </button>
                <button
                  onClick={() => callClock('out')}
                  disabled={punching}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-6 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-rose-200 transition hover:bg-rose-700 active:scale-[0.98] disabled:opacity-60"
                >
                  {punching ? <Loader2 size={22} className="animate-spin" /> : <LogOut size={22} />}
                  Fichar Salida
                </button>
              </>
            )}

            {state === 'paused' && (
              <>
                <button
                  onClick={() => callClock('pause_end')}
                  disabled={punching}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-6 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-amber-200 transition hover:bg-amber-600 active:scale-[0.98] disabled:opacity-60"
                >
                  {punching ? <Loader2 size={22} className="animate-spin" /> : <Play size={22} />}
                  Fin Pausa
                </button>
                <button
                  onClick={() => callClock('out')}
                  disabled={punching}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-6 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-rose-200 transition hover:bg-rose-700 active:scale-[0.98] disabled:opacity-60"
                >
                  {punching ? <Loader2 size={22} className="animate-spin" /> : <LogOut size={22} />}
                  Fichar Salida
                </button>
              </>
            )}
          </div>
        )}

        {/* Fichajes de hoy */}
        <div className="mb-3 flex items-center gap-2">
          <Clock size={18} className="text-slate-500" />
          <h3 className="text-base font-bold text-slate-800">Fichajes de hoy</h3>
        </div>

        <div className="space-y-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  log.type === 'in' ? 'bg-green-100 text-green-700'
                  : log.type === 'out' ? 'bg-rose-100 text-rose-700'
                  : 'bg-amber-100 text-amber-700'
                }`}>
                  {log.type === 'in' ? <LogIn size={18} />
                    : log.type === 'out' ? <LogOut size={18} />
                    : <Coffee size={18} />}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{log.label}</p>
                  {log.source === 'admin' && (
                    <p className="text-xs text-slate-500">Registrado por administración</p>
                  )}
                </div>
              </div>
              <span className="text-lg font-bold tabular-nums text-slate-900">{log.time}</span>
            </div>
          ))}
          {!loading && logs.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              Todavía no has fichado hoy.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
