// Verificar estructura de tablas
import fetch from 'node-fetch';

const NEW_SUPABASE_URL = 'https://qmythlgbuawqgazokjrb.supabase.co';
const NEW_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFteXRobGdidWF3cWdhem9ranJiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQwODgxMCwiZXhwIjoyMDg2OTg0ODEwfQ.O5nD0jMDLrIsMZr0WKtbZbceR5vkxagRAWWFcPFACTg';

const headers = {
  'Authorization': `Bearer ${NEW_SERVICE_KEY}`,
  'apikey': NEW_SERVICE_KEY,
  'Content-Type': 'application/json'
};

async function checkSchema() {
  try {
    console.log('🔍 Verificando estructura de tablas...');
    
    // Intentar obtener información de la tabla jobs
    const schemaResponse = await fetch(`${NEW_SUPABASE_URL}/rest/v1/`, {
      method: 'GET',
      headers
    });
    
    if (schemaResponse.ok) {
      const schema = await schemaResponse.json();
      console.log('📋 Tablas disponibles:');
      console.log(JSON.stringify(schema, null, 2));
    } else {
      console.log('❌ Error obteniendo schema');
    }
    
    // Intentar obtener jobs sin campos específicos
    const jobsResponse = await fetch(`${NEW_SUPABASE_URL}/rest/v1/jobs?select=*&limit=1`, {
      method: 'GET',
      headers
    });
    
    if (jobsResponse.ok) {
      const jobs = await jobsResponse.json();
      console.log('\n📋 Estructura de jobs:');
      if (jobs.length > 0) {
        console.log('Campos disponibles:', Object.keys(jobs[0]));
      }
    } else {
      console.log('❌ Error obteniendo jobs');
    }
    
  } catch (error) {
    console.error('❌ Error verificando schema:', error);
  }
}

checkSchema();
