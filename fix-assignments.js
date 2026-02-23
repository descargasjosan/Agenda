// Corregir asignaciones - mover datos de data a campos principales
import fetch from 'node-fetch';

const NEW_SUPABASE_URL = 'https://qmythlgbuawqgazokjrb.supabase.co';
const NEW_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFteXRobGdidWF3cWdhem9ranJiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQwODgxMCwiZXhwIjoyMDg2OTg0ODEwfQ.O5nD0jMDLrIsMZr0WKtbZbceR5vkxagRAWWFcPFACTg';

const headers = {
  'Authorization': `Bearer ${NEW_SERVICE_KEY}`,
  'apikey': NEW_SERVICE_KEY,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal'
};

async function fixAssignments() {
  try {
    console.log('🔧 Corrigiendo asignaciones...');
    
    // Obtener todos los jobs
    const jobsResponse = await fetch(`${NEW_SUPABASE_URL}/rest/v1/jobs?select=*`, {
      method: 'GET',
      headers
    });
    
    if (!jobsResponse.ok) {
      console.log('❌ Error obteniendo jobs');
      return;
    }
    
    const jobs = await jobsResponse.json();
    console.log(`📋 Encontrados ${jobs.length} jobs para corregir`);
    
    let fixedCount = 0;
    let errorCount = 0;
    
    // Procesar cada job
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      
      if (job.data && typeof job.data === 'object') {
        // Extraer campos importantes de data
        const { clientId, centerId, type, startTime, endTime, requiredWorkers, ref, deliveryNote, locationDetails, isCancelled, assignedWorkerIds, workerTimes } = job.data;
        
        // Crear job actualizado
        const updatedJob = {
          id: job.id,
          date: job.date || job.data.date || '',
          clientId: clientId || job.data.clientId || '',
          centerId: centerId || job.data.centerId || '',
          type: type || job.data.type || 'Descarga',
          startTime: startTime || job.data.startTime || '09:00',
          endTime: endTime || job.data.endTime || '17:00',
          requiredWorkers: requiredWorkers || job.data.requiredWorkers || 1,
          ref: ref || job.data.ref || '',
          deliveryNote: deliveryNote || job.data.deliveryNote || '',
          locationDetails: locationDetails || job.data.locationDetails || '',
          isCancelled: isCancelled || job.data.isCancelled || false,
          assignedWorkerIds: assignedWorkerIds || job.data.assignedWorkerIds || [],
          workerTimes: workerTimes || job.data.workerTimes || {},
          data: job.data // Mantener data como backup
        };
        
        // Actualizar el job
        const updateResponse = await fetch(`${NEW_SUPABASE_URL}/rest/v1/jobs?id=eq.${job.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(updatedJob)
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
    
    console.log(`\n🎉 CORRECCIÓN COMPLETADA:`);
    console.log(`✅ ${fixedCount} jobs corregidos correctamente`);
    console.log(`❌ ${errorCount} jobs con errores`);
    console.log(`🔄 Recarga tu app en Vercel para ver las asignaciones corregidas`);
    
  } catch (error) {
    console.error('❌ Error corrigiendo asignaciones:', error);
  }
}

fixAssignments();
