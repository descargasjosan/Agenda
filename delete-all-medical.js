import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qmythlgbuawqgazokjrb.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFteXRobGdidWF3cWdhem9ranJiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQwODgxMCwiZXhwIjoyMDg2OTg0ODEwfQ.O5nD0jMDLrIsMZr0WKtbZbceR5vkxagRAWWFcPFACTg';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function deleteAllMedicalRecords() {
  try {
    console.log('🧹 Eliminando TODOS los registros médicos...');
    
    const { data: records, error } = await supabase
      .from('medical_courses')
      .select('id');
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log(`📊 ${records.length} registros encontrados`);
    
    if (records.length === 0) {
      console.log('✅ No hay registros que eliminar');
      return;
    }
    
    const { error: deleteError } = await supabase
      .from('medical_courses')
      .delete()
      .in('id', records.map(r => r.id));
    
    if (deleteError) {
      console.error('Error eliminando:', deleteError);
    } else {
      console.log(`✅ ${records.length} registros eliminados correctamente`);
      console.log('🎯 Tabla medical_courses completamente vacía');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

deleteAllMedicalRecords();
