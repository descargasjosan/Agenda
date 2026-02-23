// Importación desde backup.json a la base de datos de Vercel
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

    // Importar Workers
    if (backupData.workers && backupData.workers.length > 0) {
      console.log('👥 Importando workers...');
      try {
        const workersResponse = await fetch(`${NEW_SUPABASE_URL}/rest/v1/workers`, {
          method: 'POST',
          headers,
          body: JSON.stringify(backupData.workers)
        });
        
        if (workersResponse.ok) {
          results.push(`✅ ${backupData.workers.length} workers importados`);
        } else {
          const errorText = await workersResponse.text();
          results.push(`❌ Error importando workers: ${workersResponse.statusText} - ${errorText}`);
        }
      } catch (error) {
        results.push(`❌ Error importando workers: ${error.message}`);
      }
    }

    // Importar Clients
    if (backupData.clients && backupData.clients.length > 0) {
      console.log('🏢 Importando clients...');
      try {
        const clientsResponse = await fetch(`${NEW_SUPABASE_URL}/rest/v1/clients`, {
          method: 'POST',
          headers,
          body: JSON.stringify(backupData.clients)
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

    // Importar Jobs
    if (backupData.jobs && backupData.jobs.length > 0) {
      console.log('📋 Importando jobs...');
      try {
        const jobsResponse = await fetch(`${NEW_SUPABASE_URL}/rest/v1/jobs`, {
          method: 'POST',
          headers,
          body: JSON.stringify(backupData.jobs)
        });
        
        if (jobsResponse.ok) {
          results.push(`✅ ${backupData.jobs.length} jobs importados`);
        } else {
          const errorText = await jobsResponse.text();
          results.push(`❌ Error importando jobs: ${jobsResponse.statusText} - ${errorText}`);
        }
      } catch (error) {
        results.push(`❌ Error importando jobs: ${error.message}`);
      }
    }

    // Importar Courses (si hay)
    if (backupData.courses && backupData.courses.length > 0) {
      console.log('📚 Importando courses...');
      try {
        const coursesResponse = await fetch(`${NEW_SUPABASE_URL}/rest/v1/courses`, {
          method: 'POST',
          headers,
          body: JSON.stringify(backupData.courses)
        });
        
        if (coursesResponse.ok) {
          results.push(`✅ ${backupData.courses.length} courses importados`);
        } else {
          const errorText = await coursesResponse.text();
          results.push(`❌ Error importando courses: ${coursesResponse.statusText} - ${errorText}`);
        }
      } catch (error) {
        results.push(`❌ Error importando courses: ${error.message}`);
      }
    }

    console.log('\n🎉 RESULTADOS DE LA IMPORTACIÓN:');
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result}`);
    });

    console.log('\n✅ Importación completada. Tu app en Vercel ahora debería tener todos los datos.');

  } catch (error) {
    console.error('❌ Error durante la importación:', error);
  }
}

importFromBackup();
