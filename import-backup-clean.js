// Importación desde backup.json a la base de datos de Vercel (con limpieza de datos)
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

// Función para limpiar workers
function cleanWorker(worker) {
  return {
    id: worker.id,
    code: worker.code || '',
    name: worker.name || '',
    apodo: worker.apodo || null,
    dni: worker.dni || '',
    phone: worker.phone || '',
    role: worker.role || 'Mozo Almacén',
    status: worker.status || 'Disponible',
    contractType: worker.contractType || 'Fijo Discontinuo',
    hasVehicle: worker.hasVehicle || false,
    startTime: worker.startTime || '09:00',
    endTime: worker.endTime || '17:00',
    restrictions: worker.restrictions || [],
    restrictedClientIds: worker.restrictedClientIds || [],
    skills: worker.skills || ['Manipulación'],
    completedCourses: worker.completedCourses || []
  };
}

// Función para limpiar clients
function cleanClient(client) {
  return {
    id: client.id,
    name: client.name || '',
    cif: client.cif || '',
    logo: client.logo || '?',
    phone: client.phone || '',
    contactPerson: client.contactPerson || '',
    email: client.email || '',
    location: client.location || '',
    priority: client.priority || 3,
    centers: client.centers || [],
    regularTasks: client.regularTasks || [],
    requiredCourses: client.requiredCourses || [],
    allowFreeTextTask: client.allowFreeTextTask || true
  };
}

// Función para limpiar jobs
function cleanJob(job) {
  return {
    id: job.id,
    date: job.date || '',
    clientId: job.clientId || '',
    centerId: job.centerId || '',
    type: job.type || 'Descarga',
    startTime: job.startTime || '09:00',
    endTime: job.endTime || '17:00',
    requiredWorkers: job.requiredWorkers || 1,
    assignedWorkerIds: job.assignedWorkerIds || [],
    ref: job.ref || '',
    deliveryNote: job.deliveryNote || '',
    locationDetails: job.locationDetails || '',
    isCancelled: job.isCancelled || false,
    workerTimes: job.workerTimes || {}
  };
}

async function importFromBackup() {
  try {
    console.log('📥 Leyendo backup.json...');
    const backupData = JSON.parse(fs.readFileSync('backup.json', 'utf8'));
    
    console.log('📊 Estructura del backup:');
    console.log(`- Jobs: ${backupData.jobs?.length || 0} registros`);
    console.log(`- Workers: ${backupData.workers?.length || 0} registros`);
    console.log(`- Clients: ${backupData.clients?.length || 0} registros`);
    console.log(`- Courses: ${backupData.courses?.length || 0} registros`);

    const results = [];

    // Importar Workers (limpios)
    if (backupData.workers && backupData.workers.length > 0) {
      console.log('👥 Importando workers...');
      try {
        const cleanWorkers = backupData.workers.map(cleanWorker);
        console.log(`🧹 Workers limpiados: ${cleanWorkers.length}`);
        
        // Importar en lotes de 50 para evitar límites
        const batchSize = 50;
        for (let i = 0; i < cleanWorkers.length; i += batchSize) {
          const batch = cleanWorkers.slice(i, i + batchSize);
          console.log(`📦 Enviando lote ${Math.floor(i/batchSize) + 1} de ${Math.ceil(cleanWorkers.length/batchSize)} (${batch.length} workers)`);
          
          const workersResponse = await fetch(`${NEW_SUPABASE_URL}/rest/v1/workers`, {
            method: 'POST',
            headers,
            body: JSON.stringify(batch)
          });
          
          if (workersResponse.ok) {
            console.log(`✅ Lote ${Math.floor(i/batchSize) + 1} importado`);
          } else {
            const errorText = await workersResponse.text();
            console.error(`❌ Error lote ${Math.floor(i/batchSize) + 1}: ${workersResponse.statusText} - ${errorText}`);
            results.push(`❌ Error importando workers lote ${Math.floor(i/batchSize) + 1}: ${workersResponse.statusText}`);
          }
        }
        results.push(`✅ ${backupData.workers.length} workers importados`);
      } catch (error) {
        results.push(`❌ Error importando workers: ${error.message}`);
      }
    }

    // Importar Clients (limpios)
    if (backupData.clients && backupData.clients.length > 0) {
      console.log('🏢 Importando clients...');
      try {
        const cleanClients = backupData.clients.map(cleanClient);
        console.log(`🧹 Clients limpiados: ${cleanClients.length}`);
        
        const clientsResponse = await fetch(`${NEW_SUPABASE_URL}/rest/v1/clients`, {
          method: 'POST',
          headers,
          body: JSON.stringify(cleanClients)
        });
        
        if (clientsResponse.ok) {
          results.push(`✅ ${backupData.clients.length} clients importados`);
        } else {
          const errorText = await clientsResponse.text();
          results.push(`❌ Error importando clients: ${clientsResponse.statusText} - ${errorText}`);
        }
      } catch (error) {
        results.push(`❌ Error importando clients: ${error.message}`);
      }
    }

    // Importar Jobs (limpios)
    if (backupData.jobs && backupData.jobs.length > 0) {
      console.log('📋 Importando jobs...');
      try {
        const cleanJobs = backupData.jobs.map(cleanJob);
        console.log(`🧹 Jobs limpiados: ${cleanJobs.length}`);
        
        // Importar en lotes de 50
        const batchSize = 50;
        for (let i = 0; i < cleanJobs.length; i += batchSize) {
          const batch = cleanJobs.slice(i, i + batchSize);
          console.log(`📦 Enviando lote ${Math.floor(i/batchSize) + 1} de ${Math.ceil(cleanJobs.length/batchSize)} (${batch.length} jobs)`);
          
          const jobsResponse = await fetch(`${NEW_SUPABASE_URL}/rest/v1/jobs`, {
            method: 'POST',
            headers,
            body: JSON.stringify(batch)
          });
          
          if (jobsResponse.ok) {
            console.log(`✅ Lote ${Math.floor(i/batchSize) + 1} importado`);
          } else {
            const errorText = await jobsResponse.text();
            console.error(`❌ Error lote ${Math.floor(i/batchSize) + 1}: ${jobsResponse.statusText} - ${errorText}`);
            results.push(`❌ Error importando jobs lote ${Math.floor(i/batchSize) + 1}: ${jobsResponse.statusText}`);
          }
        }
        results.push(`✅ ${backupData.jobs.length} jobs importados`);
      } catch (error) {
        results.push(`❌ Error importando jobs: ${error.message}`);
      }
    }

    console.log('\n🎉 RESULTADOS DE LA IMPORTACIÓN:');
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result}`);
    });

    console.log('\n✅ Importación completada. Tu app en Vercel ahora debería tener todos los datos.');
    console.log('🔄 Recarga tu app en Vercel para ver los datos.');

  } catch (error) {
    console.error('❌ Error durante la importación:', error);
  }
}

importFromBackup();
