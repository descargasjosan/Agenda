-- Realtime del panel admin: fichajes en vivo con mínimo egress.
-- Ejecutar UNA VEZ en Supabase > SQL Editor.
--
-- El panel se suscribe a clock_logs con el access_token del admin
-- (rol "authenticated"). clock_logs tiene RLS sin políticas — la anon
-- key del navegador sigue SIN acceso; solo los admins logueados
-- reciben los eventos.

alter publication supabase_realtime add table public.clock_logs;

create policy "clock_logs_auth_select"
  on public.clock_logs for select
  to authenticated using (true);
