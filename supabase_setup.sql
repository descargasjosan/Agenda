-- ================================================================
-- SCRIPT DE CREACIÓN DE TABLAS - DESCARGAS JOSAN v2
-- Ejecutar COMPLETO en el SQL Editor del NUEVO proyecto Supabase
-- ================================================================

-- Habilitar extensión para auto-actualizar updated_at
CREATE EXTENSION IF NOT EXISTS moddatetime;

-- ── TABLA: workers ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workers (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE OR REPLACE TRIGGER workers_updated_at
  BEFORE UPDATE ON workers
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

-- ── TABLA: clients ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE OR REPLACE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

-- ── TABLA: jobs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id          TEXT PRIMARY KEY,
  date        TEXT NOT NULL,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS jobs_date_idx ON jobs(date);
CREATE OR REPLACE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

-- ── TABLA: standard_tasks ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS standard_tasks (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── TABLA: vehicles ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicles (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── TABLA: vehicle_assignments ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicle_assignments (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── TABLA: fuel_records ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fuel_records (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── TABLA: daily_notes ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_notes (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── TABLA: medical_courses ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medical_courses (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── TABLA: courses ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── TABLA: custom_holidays ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_holidays (
  id          TEXT PRIMARY KEY,   -- Usamos la fecha (YYYY-MM-DD) como ID
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── TABLA: app_settings ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- Solo usuarios autenticados pueden leer y escribir
-- ================================================================

ALTER TABLE workers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients             ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE standard_tasks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_records        ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_notes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_courses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses             ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_holidays     ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings        ENABLE ROW LEVEL SECURITY;

-- Política para cada tabla: acceso total a usuarios autenticados
CREATE POLICY "auth_all_workers"             ON workers             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_clients"             ON clients             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_jobs"                ON jobs                FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_standard_tasks"      ON standard_tasks      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_vehicles"            ON vehicles            FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_vehicle_assignments" ON vehicle_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_fuel_records"        ON fuel_records        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_daily_notes"         ON daily_notes         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_medical_courses"     ON medical_courses     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_courses"             ON courses             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_custom_holidays"     ON custom_holidays     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_app_settings"        ON app_settings        FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ================================================================
-- REALTIME: habilitar en tablas críticas
-- ================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE workers;
ALTER PUBLICATION supabase_realtime ADD TABLE clients;
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE standard_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE vehicle_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE medical_courses;
ALTER PUBLICATION supabase_realtime ADD TABLE courses;
ALTER PUBLICATION supabase_realtime ADD TABLE custom_holidays;

-- ================================================================
-- FIN DEL SCRIPT
-- ================================================================
