import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qmythlgbuawqgazokjrb.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFteXRobGdidWF3cWdhem9ranJiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQwODgxMCwiZXhwIjoyMDg2OTg0ODEwfQ.O5nD0jMDLrIsMZr0WKtbZbceR5vkxagRAWWFcPFACTg';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function debugMedicalRecords() {
  try {
    console.log('🔍 Analizando estructura de registros médicos...\n');
    
    const { data: records, error } = await supabase
      .from('medical_courses')
      .select('*')
      .limit(3);
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log(`📊 Estructura completa del primer registro:`);
    console.log(JSON.stringify(records[0], null, 2));
    
    console.log('\n🎯 ID del registro:', records[0].id);
    console.log('🎯 ID dentro de data:', records[0].data?.id);
    console.log('🎯 Estructura de data:', Object.keys(records[0].data || {}));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugMedicalRecords();
