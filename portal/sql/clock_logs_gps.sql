-- =====================================================
-- GEOLOCALIZACIÓN EN FICHAJES
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- (incremental sobre clock_logs ya creada)
-- =====================================================

-- Coordenadas capturadas en el momento del fichaje (opcionales).
-- accuracy = margen de precisión del GPS en metros.
alter table clock_logs
  add column if not exists lat numeric,
  add column if not exists lng numeric,
  add column if not exists accuracy numeric;

-- La configuración (GPS off/opcional/obligatorio) se guarda en la tabla
-- existente app_settings con key='clock' — no hace falta tabla nueva.
