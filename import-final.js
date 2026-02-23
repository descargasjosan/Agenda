// Importación final - corregir jobs
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

async function importFinal() {
  try {
    console.log('📥 Leyendo backup.json...');
    const backupData = JSON.parse(fs.readFileSync('backup.json', 'utf8'));
    
    const results = [];

    // Importar Jobs con campos correctos
    if (backupData.jobs && backupData.jobs.length > 0) {
      console.log('📋 Importando jobs (final)...');
      try {
        // Extraer campos específicos y guardar el resto en data
        const finalJobs = backupData.jobs.map(job => {
          const { id, date, clientId, centerId, type, startTime, endTime, requiredWorkers, ref, deliveryNote, locationDetails, isCancelled, workerTimes, ...rest } = job;
          
          return {
            id: id,
            date: date || '',
            clientId: clientId || '',
            centerId: centerId || '',
            type: type || 'Descarga',
            startTime: startTime || '09:00',
            endTime: endTime || '17:00',
            requiredWorkers: requiredWorkers || 1,
            ref: ref || '',
            deliveryNote: deliveryNote || '',
            locationDetails: locationDetails || '',
            isCancelled: isCancelled || false,
            workerTimes: workerTimes || {},
            data: rest // Guardar campos adicionales en data
          };
        });
        
        console.log(`🧹 Jobs finales: ${finalJobs.length}`);
        
        // Importar en lotes pequeños
        const batchSize = 10;
        let successCount = 0;
        
        for (let i = 0; i < finalJobs.length; i += batchSize) {
          const batch = finalJobs.slice(i, i + batchSize);
          console.log(`📦 Enviando lote ${Math.floor(i/batchSize) + 1} de ${Math.ceil(finalJobs.length/batchSize)} (${batch.length} jobs)`);
          
          const jobsResponse = await fetch(`${NEW_SUPABASE_URL}/rest/v1/jobs`, {
            method: 'POST',
            headers,
            body: JSON.stringify(batch)
          });
          
          if (jobsResponse.ok) {
            successCount += batch.length;
            console.log(`✅ Lote ${Math.floor(i/batchSize) + 1} importado`);
          } else {
            const errorText = await jobsResponse.text();
            console.error(`❌ Error lote ${Math.floor(i/batchSize) + 1}: ${jobsResponse.statusText} - ${errorText}`);
            results.push(`❌ Error importando jobs lote ${Math.floor(i/batchSize) + 1}: ${jobsResponse.statusText}`);
          }
        }
        
        results.push(`✅ ${successCount} jobs importados correctamente`);
      } catch (error) {
        results.push(`❌ Error importando jobs: ${error.message}`);
      }
    }

    console.log('\n🎉 RESULTADOS FINALES:');
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result}`);
    });

    console.log('\n✅ ¡IMPORTACIÓN COMPLETADA!');
    console.log('🔄 Recarga tu app en Vercel para ver todos los datos.');
    console.log('📊 Resumen:');
    console.log(`   - Clients: ${backupData.clients?.length || 0} (ya existían)`);
    console.log(`   - Workers: ${backupData.workers?.length || 0} (ya existían)`);
    console.log(`   - Jobs: ${backupData.jobs?.length || 0} (recién importados)`);

  } catch (error) {
    console.error('❌ Error durante la importación:', error);
  }
}

importFinal();
