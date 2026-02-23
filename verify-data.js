// Verificar datos importados
import fetch from 'node-fetch';

const NEW_SUPABASE_URL = 'https://qmythlgbuawqgazokjrb.supabase.co';
const NEW_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFteXRobGdidWF3cWdhem9ranJiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQwODgxMCwiZXhwIjoyMDg2OTg0ODEwfQ.O5nD0jMDLrIsMZr0WKtbZbceR5vkxagRAWWFcPFACTg';

const headers = {
  'Authorization': `Bearer ${NEW_SERVICE_KEY}`,
  'apikey': NEW_SERVICE_KEY,
  'Content-Type': 'application/json'
};

async function verifyData() {
  try {
    console.log('🔍 Verificando datos importados...');
    
    // Verificar workers
    const workersResponse = await fetch(`${NEW_SUPABASE_URL}/rest/v1/workers?select=id,name&limit=5`, {
      method: 'GET',
      headers
    });
    
    if (workersResponse.ok) {
      const workers = await workersResponse.json();
      console.log('👥 Workers encontrados:');
      workers.forEach((worker, index) => {
        console.log(`${index + 1}. ${worker.name} (ID: ${worker.id})`);
      });
    } else {
      console.log('❌ Error obteniendo workers');
    }
    
    // Verificar clients
    const clientsResponse = await fetch(`${NEW_SUPABASE_URL}/rest/v1/clients?select=id,name&limit=5`, {
      method: 'GET',
      headers
    });
    
    if (clientsResponse.ok) {
      const clients = await clientsResponse.json();
      console.log('\n🏢 Clients encontrados:');
      clients.forEach((client, index) => {
        console.log(`${index + 1}. ${client.name} (ID: ${client.id})`);
      });
    } else {
      console.log('❌ Error obteniendo clients');
    }
    
    // Verificar jobs con asignaciones
    const jobsResponse = await fetch(`${NEW_SUPABASE_URL}/rest/v1/jobs?select=id,date,assignedWorkerIds,workerTimes&limit=5`, {
      method: 'GET',
      headers
    });
    
    if (jobsResponse.ok) {
      const jobs = await jobsResponse.json();
      console.log('\n📋 Jobs encontrados:');
      jobs.forEach((job, index) => {
        console.log(`${index + 1}. Job ${job.id} (${job.date})`);
        console.log(`   - assignedWorkerIds: ${JSON.stringify(job.assignedWorkerIds)}`);
        console.log(`   - workerTimes: ${JSON.stringify(job.workerTimes)}`);
      });
    } else {
      console.log('❌ Error obteniendo jobs');
    }
    
    console.log('\n✅ Verificación completada.');
    
  } catch (error) {
    console.error('❌ Error verificando datos:', error);
  }
}

verifyData();
