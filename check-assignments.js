// Verificar IDs y asignaciones
import fetch from 'node-fetch';

const NEW_SUPABASE_URL = 'https://qmythlgbuawqgazokjrb.supabase.co';
const NEW_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFteXRobGdidWF3cWdhem9ranJiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQwODgxMCwiZXhwIjoyMDg2OTg0ODEwfQ.O5nD0jMDLrIsMZr0WKtbZbceR5vkxagRAWWFcPFACTg';

const headers = {
  'Authorization': `Bearer ${NEW_SERVICE_KEY}`,
  'apikey': NEW_SERVICE_KEY,
  'Content-Type': 'application/json'
};

async function checkIdsAndAssignments() {
  try {
    console.log('🔍 Verificando IDs y asignaciones...');
    
    // Obtener workers
    const workersResponse = await fetch(`${NEW_SUPABASE_URL}/rest/v1/workers?select=id,data&limit=5`, {
      method: 'GET',
      headers
    });
    
    if (!workersResponse.ok) {
      console.log('❌ Error obteniendo workers');
      return;
    }
    
    const workers = await workersResponse.json();
    console.log('👥 Workers encontrados:');
    workers.forEach((worker, index) => {
      const workerData = worker.data ? JSON.parse(worker.data) : worker;
      console.log(`${index + 1}. ID: ${worker.id}, Nombre: ${workerData.name || 'Sin nombre'}`);
    });
    
    // Obtener jobs con asignaciones
    const jobsResponse = await fetch(`${NEW_SUPABASE_URL}/rest/v1/jobs?select=id,data&limit=3`, {
      method: 'GET',
      headers
    });
    
    if (!jobsResponse.ok) {
      console.log('❌ Error obteniendo jobs');
      return;
    }
    
    const jobs = await jobsResponse.json();
    console.log('\n📋 Jobs con asignaciones:');
    jobs.forEach((job, index) => {
      const jobData = job.data ? JSON.parse(job.data) : job;
      console.log(`${index + 1}. Job ${job.id} (${jobData.date || 'Sin fecha'})`);
      console.log(`   - assignedWorkerIds: ${JSON.stringify(jobData.assignedWorkerIds || [])}`);
      console.log(`   - workerTimes: ${JSON.stringify(jobData.workerTimes || {})}`);
    });
    
    // Verificar si los IDs coinciden
    console.log('\n🔍 Verificando coincidencias de IDs:');
    const workerIds = workers.map(w => w.id);
    jobs.forEach((job) => {
      const jobData = job.data ? JSON.parse(job.data) : job;
      const assignedIds = jobData.assignedWorkerIds || [];
      const invalidIds = assignedIds.filter(id => !workerIds.includes(id));
      
      if (invalidIds.length > 0) {
        console.log(`❌ Job ${job.id} tiene IDs inválidos: ${invalidIds.join(', ')}`);
      } else {
        console.log(`✅ Job ${job.id} tiene IDs válidos`);
      }
    });
    
    console.log('\n✅ Verificación completada.');
    
  } catch (error) {
    console.error('❌ Error verificando IDs:', error);
  }
}

checkIdsAndAssignments();
