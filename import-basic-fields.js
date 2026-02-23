// Importación ultra básica - solo campos que existen
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

async function importBasicFields() {
  try {
    console.log('📥 Leyendo backup.json...');
    const backupData = JSON.parse(fs.readFileSync('backup.json', 'utf8'));
    
    const results = [];

    // Importar Jobs con campos básicos
    if (backupData.jobs && backupData.jobs.length > 0) {
      console.log('📋 Importando jobs (campos básicos)...');
      try {
        // Solo campos que sabemos que existen
        const basicJobs = backupData.jobs.map(job => ({
          id: job.id,
          date: job.date || '',
          data: job // Todo el resto en data
        }));
        
        console.log(`🧹 Jobs básicos: ${basicJobs.length}`);
        
        // Importar en lotes
        const batchSize = 20;
        let successCount = 0;
        
        for (let i = 0; i < basicJobs.length; i += batchSize) {
          const batch = basicJobs.slice(i, i + batchSize);
          console.log(`📦 Enviando lote ${Math.floor(i/batchSize) + 1} de ${Math.ceil(basicJobs.length/batchSize)} (${batch.length} jobs)`);
          
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
        
        results.push(`✅ ${successCount} jobs importados correctamente (campos básicos)`);
      } catch (error) {
        results.push(`❌ Error importando jobs: ${error.message}`);
      }
    }

    console.log('\n🎉 RESULTADOS FINALES:');
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result}`);
    });

    console.log('\n✅ ¡IMPORTACIÓN BÁSICA COMPLETADA!');
    console.log('🔄 Recarga tu app en Vercel para ver los datos.');
    console.log('📊 Resumen:');
    console.log(`   - Clients: ${backupData.clients?.length || 0} (ya existían)`);
    console.log(`   - Workers: ${backupData.workers?.length || 0} (ya existían)`);
    console.log(`   - Jobs: ${backupData.jobs?.length || 0} (con campos básicos)`);

  } catch (error) {
    console.error('❌ Error durante la importación:', error);
  }
}

importBasicFields();
