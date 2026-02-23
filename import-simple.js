// Importación simplificada - solo campos básicos
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

// Función para limpiar workers (solo campos básicos)
function cleanWorker(worker) {
  return {
    id: worker.id,
    code: worker.code || '',
    name: worker.name || '',
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

// Función para limpiar clients (solo campos básicos)
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
    requiredCourses: client.requiredCourses || []
  };
}

// Función para limpiar jobs (solo campos básicos)
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
    ref: job.ref || '',
    deliveryNote: job.deliveryNote || '',
    locationDetails: job.locationDetails || '',
    isCancelled: job.isCancelled || false,
    workerTimes: job.workerTimes || {}
  };
}

async function importSimple() {
  try {
    console.log('📥 Leyendo backup.json...');
    const backupData = JSON.parse(fs.readFileSync('backup.json', 'utf8'));
    
    const results = [];

    // Importar Clients (simplificado)
    if (backupData.clients && backupData.clients.length > 0) {
      console.log('🏢 Importando clients (simplificado)...');
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

    console.log('\n🎉 RESULTADOS:');
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result}`);
    });

    console.log('\n✅ Importación simplificada completada.');
    console.log('🔄 Recarga tu app en Vercel para ver los datos.');

  } catch (error) {
    console.error('❌ Error durante la importación:', error);
  }
}

importSimple();
