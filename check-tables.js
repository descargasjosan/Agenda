import fetch from 'node-fetch';

const NEW_SUPABASE_URL = 'https://qmythlgbuawqgazokjrb.supabase.co';
const NEW_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFteXRobGdidWF3cWdhem9ranJiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQwODgxMCwiZXhwIjoyMDg2OTg0ODEwfQ.O5nD0jMDLrIsMZr0WKtbZbceR5vkxagRAWWFcPFACTg';

const headers = {
  'Authorization': `Bearer ${NEW_SERVICE_KEY}`,
  'apikey': NEW_SERVICE_KEY,
  'Content-Type': 'application/json'
};

async function checkTables() {
  try {
    console.log('🔍 Verificando tablas en la base de datos...');
    
    // Intentar obtener clients
    const clientsResponse = await fetch(`${NEW_SUPABASE_URL}/rest/v1/clients?limit=1`, {
      method: 'GET',
      headers
    });
    
    console.log('📋 Clients status:', clientsResponse.status);
    if (!clientsResponse.ok) {
      const errorText = await clientsResponse.text();
      console.log('❌ Clients error:', errorText);
    }
    
    // Intentar obtener workers
    const workersResponse = await fetch(`${NEW_SUPABASE_URL}/rest/v1/workers?limit=1`, {
      method: 'GET',
      headers
    });
    
    console.log('👥 Workers status:', workersResponse.status);
    if (!workersResponse.ok) {
      const errorText = await workersResponse.text();
      console.log('❌ Workers error:', errorText);
    }
    
    // Intentar obtener jobs
    const jobsResponse = await fetch(`${NEW_SUPABASE_URL}/rest/v1/jobs?limit=1`, {
      method: 'GET',
      headers
    });
    
    console.log('📋 Jobs status:', jobsResponse.status);
    if (!jobsResponse.ok) {
      const errorText = await jobsResponse.text();
      console.log('❌ Jobs error:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Error verificando tablas:', error);
  }
}

checkTables();
