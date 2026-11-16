-- ================================================================
-- TABLA: worker_documents
-- Documentos que la plantilla debe devolver firmados (Salud Laboral)
-- Ejecutar UNA VEZ en el SQL Editor de Supabase
-- ================================================================

CREATE TABLE IF NOT EXISTS worker_documents (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE OR REPLACE TRIGGER worker_documents_updated_at
  BEFORE UPDATE ON worker_documents
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

ALTER PUBLICATION supabase_realtime ADD TABLE worker_documents;
