-- ============================================================
-- Recordatorios push de fichaje
-- Ejecutar UNA VEZ en Supabase SQL Editor
-- Requiere haber ejecutado antes clock_logs.sql
-- ============================================================

-- Tabla: suscripciones push de los operarios (una por dispositivo)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  worker_id text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

-- Tabla: cola de avisos. El 'plan' genera una fila por operario/dia con la
-- hora a la que toca avisarle; el 'tick' solo lee las filas vencidas (barato).
create table if not exists public.push_queue (
  id uuid primary key default gen_random_uuid(),
  worker_id text not null,
  notify_date date not null,
  notify_at timestamptz not null,
  start_time text not null,
  sent_at timestamptz,
  result text,
  created_at timestamptz not null default now(),
  unique (worker_id, notify_date)
);

alter table public.push_queue enable row level security;

create index if not exists push_queue_due_idx
  on public.push_queue (notify_at)
  where sent_at is null;

-- ============================================================
-- CRON (requiere las extensiones pg_cron y pg_net)
-- ============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

grant usage on schema net to postgres;

-- 'plan': genera la cola del dia. Dos pasadas por si la planificacion
-- cambia por la manana (02:30 y 07:30 UTC ~= 04:30/09:30 en Madrid).
select cron.schedule(
  'push-plan',
  '30 2,7 * * *',
  $$
  select net.http_post(
    url := 'https://horas-descargasjosan.vercel.app/api/push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '27382691e6135fd430b030f764c38a9549456a839921c300'
    ),
    body := '{"action":"plan"}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);

-- 'tick': cada 2 minutos envia los avisos vencidos (consulta minuscula).
select cron.schedule(
  'push-tick',
  '*/2 * * * *',
  $$
  select net.http_post(
    url := 'https://horas-descargasjosan.vercel.app/api/push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '27382691e6135fd430b030f764c38a9549456a839921c300'
    ),
    body := '{"action":"tick"}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);

-- Para revisar que los cron estan creados:
-- select * from cron.job;
-- Para borrarlos si hiciera falta:
-- select cron.unschedule('push-plan'); select cron.unschedule('push-tick');
