-- PASO 1: Crear tabla para Control Operarios
CREATE TABLE worker_control_data (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL,
  date DATE NOT NULL,
  value TEXT NOT NULL, -- 'F', 'D', 'R', '8', '4.5', etc.
  month TEXT NOT NULL, -- '2026-01' para indexación
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(worker_id, date) -- Solo un valor por worker por día
);

-- PASO 2: Crear índices para rendimiento
CREATE INDEX idx_worker_control_worker_date ON worker_control_data(worker_id, date);
CREATE INDEX idx_worker_control_month ON worker_control_data(month);

-- PASO 3: Crear política de seguridad (RLS)
ALTER TABLE worker_control_data ENABLE ROW LEVEL SECURITY;

-- PASO 4: Política para permitir todas las operaciones
CREATE POLICY "Allow all operations on worker_control_data" ON worker_control_data
  FOR ALL USING (true) WITH CHECK (true);

-- PASO 5: Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_worker_control_data_updated_at 
    BEFORE UPDATE ON worker_control_data 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
