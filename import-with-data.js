// Importación con campo data
import fs from 'fs';
import fetch from 'node-fetch';

const NEW_SUPABASE_URL = 'https://qmythlgbuawqgazokjrb.supabase.co';
const NEW_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFteXRobGdidWF3cWdhem9ranJiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQwODgxMCwiZXhwIjoyMDg2OTg0ODEwfQ.O5nD0jMDLrIsMZr0WKtbZbceR5vkxagRAWWFcPFACTg';

const headers = {
  'Authorization': `Bearer ${NEW_SERVICE_KEY}`,
  'apikey': NEW_SERVICE_KEY,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal'
};

async function importWithData() {
  try {
    console.log('📥 Leyendo backup.json...');
    const backupData = JSON.parse(fs.readFileSync('backup.json', 'utf8'));
    
    const results = [];

    // Importar Clients con campo data
    if (backupData.clients && backupData.clients.length > 0) {
      console.log('🏢 Importando clients (con data)...');
      try {
        // Guardar todo el cliente en el campo data
        const dataClients = backupData.clients.map(client => ({
          id: client.id,
          data: client // Todo el objeto original en data
        }));
        
        console.log(`🧹 Clients con data: ${dataClients.length}`);
        
        const clientsResponse = await fetch(`${NEW_SUPABASE_URL}/rest/v1/clients`, {
          method: 'POST',
          headers,
          body: JSON.stringify(dataClients)
        });
        
        if (clientsResponse.ok) {
          results.push(`✅ ${backupData.clients.length} clients importados (con data)`);
        } else {
          const errorText = await clientsResponse.text();
          results.push(`❌ Error importando clients: ${clientsResponse.statusText} - ${errorText}`);
        }
      } catch (error) {
        results.push(`❌ Error importando clients: ${error.message}`);
      }
    }

    // Importar Workers con campo data
    if (backupData.workers && backupData.workers.length > 0) {
      console.log('👥 Importando workers (con data)...');
      try {
        const dataWorkers = backupData.workers.map(worker => ({
          id: worker.id,
          data: worker
        }));
        
        console.log(`🧹 Workers con data: ${dataWorkers.length}`);
        
        const workersResponse = await fetch(`${NEW_SUPABASE_URL}/rest/v1/workers`, {
          method: 'POST',
          headers,
          body: JSON.stringify(dataWorkers)
        });
        
        if (workersResponse.ok) {
          results.push(`✅ ${backupData.workers.length} workers importados (con data)`);
        } else {
          const errorText = await workersResponse.text();
          results.push(`❌ Error importando workers: ${workersResponse.statusText} - ${errorText}`);
        }
      } catch (error) {
        results.push(`❌ Error importando workers: ${error.message}`);
      }
    }

    // Importar Jobs con campo data
    if (backupData.jobs && backupData.jobs.length > 0) {
      console.log('📋 Importando jobs (con data)...');
      try {
        const dataJobs = backupData.jobs.map(job => ({
          id: job.id,
          data: job
        }));
        
        console.log(`🧹 Jobs con data: ${dataJobs.length}`);
        
        const jobsResponse = await fetch(`${NEW_SUPABASE_URL}/rest/v1/jobs`, {
          method: 'POST',
          headers,
          body: JSON.stringify(dataJobs)
        });
        
        if (jobsResponse.ok) {
          results.push(`✅ ${backupData.jobs.length} jobs importados (con data)`);
        } else {
          const errorText = await jobsResponse.text();
          results.push(`❌ Error importando jobs: ${jobsResponse.statusText} - ${errorText}`);
        }
      } catch (error) {
        results.push(`❌ Error importando jobs: ${error.message}`);
      }
    }

    console.log('\n🎉 RESULTADOS:');
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result}`);
    });

    console.log('\n✅ Importación con data completada.');
    console.log('🔄 Recarga tu app en Vercel para ver los datos.');

  } catch (error) {
    console.error('❌ Error durante la importación:', error);
  }
}

importWithData();
