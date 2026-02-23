// Importación ultra mínima - solo nombre
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

async function importUltraMinimal() {
  try {
    console.log('📥 Leyendo backup.json...');
    const backupData = JSON.parse(fs.readFileSync('backup.json', 'utf8'));
    
    const results = [];

    // Importar Clients (solo nombre)
    if (backupData.clients && backupData.clients.length > 0) {
      console.log('🏢 Importando clients (solo nombre)...');
      try {
        // Solo el nombre que seguro existe
        const ultraMinimalClients = backupData.clients.map(client => ({
          id: client.id,
          name: client.name || ''
        }));
        
        console.log(`🧹 Clients ultra mínimos: ${ultraMinimalClients.length}`);
        
        const clientsResponse = await fetch(`${NEW_SUPABASE_URL}/rest/v1/clients`, {
          method: 'POST',
          headers,
          body: JSON.stringify(ultraMinimalClients)
        });
        
        if (clientsResponse.ok) {
          results.push(`✅ ${backupData.clients.length} clients importados (ultra mínimo)`);
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

    console.log('\n✅ Importación ultra mínima completada.');
    console.log('🔄 Recarga tu app en Vercel para ver los datos.');

  } catch (error) {
    console.error('❌ Error durante la importación:', error);
  }
}

importUltraMinimal();
