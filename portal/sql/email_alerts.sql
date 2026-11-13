-- ============================================================
-- Avisos por email de fichajes incorrectos
-- Ejecutar UNA VEZ en Supabase SQL Editor
-- Requiere las extensiones pg_cron y pg_net (ya creadas por push.sql)
-- ============================================================
--
-- El cron llama al endpoint cada hora; el propio endpoint comprueba la hora de
-- Madrid y solo envia cuando coincide con la hora configurada en Ajustes
-- (asi el envio siempre es a la hora local correcta, invierno y verano).

create extension if not exists pg_cron;
create extension if not exists pg_net;

grant usage on schema net to postgres;

select cron.schedule(
  'email-alerts-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://horas-descargasjosan.vercel.app/api/email-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '27382691e6135fd430b030f764c38a9549456a839921c300'
    ),
    body := '{"action":"send"}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);

-- Para revisar que el cron esta creado:
-- select * from cron.job;
-- Para borrarlo si hiciera falta:
-- select cron.unschedule('email-alerts-hourly');
-- Para provocar el envio manualmente (solo envia si es la hora y esta activado):
-- llamada POST a /api/email-alerts con {"action":"send"} y header x-cron-secret
