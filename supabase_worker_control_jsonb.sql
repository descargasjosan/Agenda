-- ============================================================================
-- OPCIÓN B: ESTRUCTURA JSONB (RECOMENDADA)
-- ✅ 100% consistente con workers, jobs, clients
-- ✅ El hook useSupabaseData funciona SIN cambios
-- ✅ El polling optimizado funciona automáticamente
-- ✅ Realtime funciona automáticamente
-- ✅ Fácil de extender sin ALTER TABLE
-- ============================================================================

CREATE TABLE worker_control_data (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,               -- Contiene: {worker_id, date, value, month, ...}
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices optimizados para queries en JSONB
CREATE INDEX idx_worker_control_worker_id ON worker_control_data((data->>'worker_id'));
CREATE INDEX idx_worker_control_date ON worker_control_data((data->>'date'));
CREATE INDEX idx_worker_control_month ON worker_control_data((data->>'month'));
CREATE INDEX idx_worker_control_updated_at ON worker_control_data(updated_at);

-- Constraint único via expresión JSONB
CREATE UNIQUE INDEX idx_worker_control_unique ON worker_control_data(
  (data->>'worker_id'), 
  (data->>'date')
);

-- RLS
ALTER TABLE worker_control_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on worker_control_data" ON worker_control_data
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger para updated_at (usando función existente)
CREATE TRIGGER update_worker_control_updated_at 
  BEFORE UPDATE ON worker_control_data 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE worker_control_data;

-- ============================================================================
-- 🎯 EJEMPLOS DE USO
-- ============================================================================

-- Insertar dato
INSERT INTO worker_control_data (id, data) VALUES 
('worker-123-2026-02-27', '{"worker_id": "worker-123", "date": "2026-02-27", "value": "F", "month": "2026-02"}');

-- Consultar por mes
SELECT * FROM worker_control_data WHERE data->>'month' = '2026-02';

-- Consultar por worker y fecha
SELECT * FROM worker_control_data 
WHERE data->>'worker_id' = 'worker-123' 
AND data->>'date' = '2026-02-27';

-- Actualizar valor
UPDATE worker_control_data 
SET data = jsonb_set(data, '{value}', '"V"')
WHERE data->>'worker_id' = 'worker-123' 
AND data->>'date' = '2026-02-27';

-- ============================================================================
-- 🎯 VENTAJAS DE ESTA OPCIÓN
-- ============================================================================
-- 
-- 1. Consistencia total con tu arquitectura actual (workers, jobs, clients)
-- 2. El hook useSupabaseData funciona SIN modificar ni una línea
-- 3. El polling optimizado funciona automáticamente (consulta updated_at)
-- 4. Realtime funciona igual que en otras tablas
-- 5. Fácil de extender (añadir campos sin ALTER TABLE)
--
-- EJEMPLO DE DATO EN JSONB:
-- {
--   "worker_id": "worker-123",
--   "date": "2026-02-27",
--   "value": "F",
--   "month": "2026-02",
--   "notes": "Festivo nacional", // Opcional, fácil de añadir
--   "approved_by": "admin"      // Opcional, fácil de añadir
-- }
