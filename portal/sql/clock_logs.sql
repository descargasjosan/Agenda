-- =====================================================
-- REGISTRO DE JORNADA (FICHAJES)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =====================================================

-- Tabla de fichajes: cada fila es un evento (entrada, salida, pausa).
-- Nunca se borra ni se edita: las correcciones son filas nuevas que
-- apuntan a la original mediante corrects_id (audit trail inmutable).
create table if not exists clock_logs (
  id uuid primary key default gen_random_uuid(),

  -- Operario que fichó (workers.id)
  worker_id text not null,

  -- Tipo de evento:
  --   in          → Entrada
  --   out         → Salida
  --   pause_start → Inicio de pausa
  --   pause_end   → Fin de pausa
  --   void        → Marcador de anulación (solo admin; anula corrects_id)
  type text not null check (type in ('in','out','pause_start','pause_end','void')),

  -- Hora del fichaje (timestamp del servidor, no del dispositivo)
  ts timestamptz not null default now(),

  -- Origen: 'worker' (portal) o 'admin' (corrección/alta manual)
  source text not null default 'worker' check (source in ('worker','admin')),

  -- Si es una corrección/anulación, apunta al fichaje que sustituye.
  -- El fichaje sustituido queda guardado pero fuera del cómputo.
  corrects_id uuid null references clock_logs(id),

  -- Motivo obligatorio en correcciones/anulaciones de admin
  correction_reason text,

  -- Quién creó el registro (worker.id o email del admin)
  created_by text,

  created_at timestamptz not null default now()
);

create index if not exists idx_clock_logs_worker_ts on clock_logs (worker_id, ts desc);
create index if not exists idx_clock_logs_ts on clock_logs (ts);

-- RLS activado SIN políticas: solo la service role key (APIs del portal)
-- puede acceder. La anon key del navegador no puede ni leer ni escribir.
alter table clock_logs enable row level security;
