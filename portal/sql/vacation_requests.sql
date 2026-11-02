-- ============================================================
-- Solicitudes de vacaciones (portal -> aprobacion en app principal)
-- Ejecutar UNA VEZ en Supabase SQL Editor
-- ============================================================

-- Estados: pending | approved | rejected | cancelled
create table if not exists public.vacation_requests (
  id uuid primary key default gen_random_uuid(),
  worker_id text not null,
  worker_name text not null,
  start_date date not null,
  end_date date not null,
  days int not null,
  status text not null default 'pending',
  note text,
  admin_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.vacation_requests enable row level security;

-- La app principal (rol anon, herramienta interna) lee pendientes y resuelve.
create policy "vacation_requests_anon_select"
  on public.vacation_requests for select
  to anon using (true);

create policy "vacation_requests_anon_update"
  on public.vacation_requests for update
  to anon using (true) with check (true);

-- Las escrituras del operario van por la API (service role, omite RLS).

-- Realtime: el contador de pendientes se actualiza solo en la app principal.
alter publication supabase_realtime add table public.vacation_requests;
