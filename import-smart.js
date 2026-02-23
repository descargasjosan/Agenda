// Importación inteligente - detectar esquema automáticamente
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

async function importSmart() {
  try {
    console.log('📥 Leyendo backup.json...');
    const backupData = JSON.parse(fs.readFileSync('backup.json', 'utf8'));
    
    const results = [];

    // Importar Clients (inteligente)
    if (backupData.clients && backupData.clients.length > 0) {
      console.log('🏢 Importando clients (inteligente)...');
      try {
        // Probar diferentes combinaciones de campos
        const testClient = backupData.clients[0];
        
        // Opción 1: Solo id y name
        const option1 = { id: testClient.id, name: testClient.name };
        console.log('🧪 Probando opción 1:', option1);
        
        const response1 = await fetch(`${NEW_SUPABASE_URL}/rest/v1/clients`, {
          method: 'POST',
          headers,
          body: JSON.stringify([option1])
        });
        
        if (response1.ok) {
          console.log('✅ Opción 1 funcionó');
          // Importar todos con esta estructura
          const simpleClients = backupData.clients.map(client => ({
            id: client.id,
            name: client.name || ''
          }));
          
          const finalResponse = await fetch(`${NEW_SUPABASE_URL}/rest/v1/clients`, {
            method: 'POST',
            headers,
            body: JSON.stringify(simpleClients)
          });
          
          if (finalResponse.ok) {
            results.push(`✅ ${backupData.clients.length} clients importados (solo id+name)`);
          } else {
            const errorText = await finalResponse.text();
            results.push(`❌ Error importando clients: ${finalResponse.statusText} - ${errorText}`);
          }
        } else {
          const errorText = await response1.text();
          console.log('❌ Opción 1 falló:', errorText);
          
          // Opción 2: Solo id
          const option2 = { id: testClient.id };
          console.log('🧪 Probando opción 2:', option2);
          
          const response2 = await fetch(`${NEW_SUPABASE_URL}/rest/v1/clients`, {
            method: 'POST',
            headers,
            body: JSON.stringify([option2])
          });
          
          if (response2.ok) {
            console.log('✅ Opción 2 funcionó');
            results.push(`❌ Solo se puede importar con ID, pero eso no es útil`);
          } else {
            const errorText2 = await response2.text();
            console.log('❌ Opción 2 falló:', errorText2);
            results.push(`❌ No se pudo determinar el esquema de clients`);
          }
        }
      } catch (error) {
        results.push(`❌ Error importando clients: ${error.message}`);
      }
    }

    console.log('\n🎉 RESULTADOS:');
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result}`);
    });

    console.log('\n✅ Importación inteligente completada.');
    console.log('🔄 Recarga tu app en Vercel para ver los datos.');

  } catch (error) {
    console.error('❌ Error durante la importación:', error);
  }
}

importSmart();
