// Corregir IDs de workers en jobs (corregido)
import fetch from 'node-fetch';

const NEW_SUPABASE_URL = 'https://qmythlgbuawqgazokjrb.supabase.co';
const NEW_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFteXRobGdidWF3cWdhem9ranJiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQwODgxMCwiZXhwIjoyMDg2OTg0ODEwfQ.O5nD0jMDLrIsMZr0WKtbZbceR5vkxagRAWWFcPFACTg';

const headers = {
  'Authorization': `Bearer ${NEW_SERVICE_KEY}`,
  'apikey': NEW_SERVICE_KEY,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal'
};

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

async function fixWorkerIds() {
  try {
    console.log('🔧 Corrigiendo IDs de workers en jobs...');
    
    // Obtener todos los workers para crear mapa de IDs
    const workersResponse = await fetch(`${NEW_SUPABASE_URL}/rest/v1/workers?select=id,data`, {
      method: 'GET',
      headers
    });
    
    if (!workersResponse.ok) {
      console.log('❌ Error obteniendo workers');
      return;
    }
    
    const workers = await workersResponse.json();
    
    // Crear mapa de nombres a IDs nuevos
    const nameToIdMap = new Map();
    workers.forEach((worker) => {
      let workerData;
      if (typeof worker.data === 'string') {
        workerData = safeJsonParse(worker.data);
      } else if (typeof worker.data === 'object') {
        workerData = worker.data;
      } else {
        workerData = worker;
      }
      nameToIdMap.set(workerData.name, worker.id);
    });
    
    console.log(`📋 Mapa de ${nameToIdMap.size} trabajadores creados`);
    
    // Obtener todos los jobs
    const jobsResponse = await fetch(`${NEW_SUPABASE_URL}/rest/v1/jobs?select=id,data`, {
      method: 'GET',
      headers
    });
    
    if (!jobsResponse.ok) {
      console.log('❌ Error obteniendo jobs');
      return;
    }
    
    const jobs = await jobsResponse.json();
    console.log(`📋 Procesando ${jobs.length} jobs...`);
    
    let fixedCount = 0;
    let errorCount = 0;
    
    // Procesar cada job
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      
      if (job.data && typeof job.data === 'string') {
        const jobData = safeJsonParse(job.data);
        
        if (jobData.assignedWorkerIds && Array.isArray(jobData.assignedWorkerIds)) {
          // Corregir IDs usando nombres
          const correctedIds = jobData.assignedWorkerIds.map((oldId) => {
            // Extraer nombre del ID antiguo (formato w-nombre)
            const nameMatch = oldId.match(/^w-(.+)$/);
            if (nameMatch) {
              const workerName = nameMatch[1];
              // Buscar ID nuevo por nombre
              const newId = nameToIdMap.get(workerName);
              if (newId) {
                console.log(`🔄 ${oldId} → ${newId} (${workerName})`);
                return newId;
              }
            }
            return oldId; // Si no se encuentra, mantener el original
          });
          
          // Actualizar job con IDs corregidos
          const updatedJobData = {
            ...jobData,
            assignedWorkerIds: correctedIds
          };
          
          const updateResponse = await fetch(`${NEW_SUPABASE_URL}/rest/v1/jobs?id=eq.${job.id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ 
              data: updatedJobData,
              updated_at: new Date().toISOString()
            })
          });
          
          if (updateResponse.ok) {
            fixedCount++;
            if (fixedCount % 10 === 0) {
              console.log(`✅ ${fixedCount} jobs corregidos...`);
            }
          } else {
            errorCount++;
            const errorText = await updateResponse.text();
            console.error(`❌ Error corrigiendo job ${job.id}: ${errorText}`);
          }
        }
      }
    }
    
    console.log(`\n🎉 CORRECCIÓN COMPLETADA:`);
    console.log(`✅ ${fixedCount} jobs corregidos correctamente`);
    console.log(`❌ ${errorCount} jobs con errores`);
    console.log(`🔄 Recarga tu app en Vercel para ver las asignaciones corregidas`);
    
  } catch (error) {
    console.error('❌ Error corrigiendo IDs:', error);
  }
}

fixWorkerIds();
