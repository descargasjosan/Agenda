// Importación ultra simplificada - solo clients básicos
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

// Función para limpiar clients (ultra básico)
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
    priority: client.priority || 3
  };
}

async function importClientsBasic() {
  try {
    console.log('📥 Leyendo backup.json...');
    const backupData = JSON.parse(fs.readFileSync('backup.json', 'utf8'));
    
    const results = [];

    // Importar Clients (ultra básico)
    if (backupData.clients && backupData.clients.length > 0) {
      console.log('🏢 Importando clients (ultra básico)...');
      try {
        const cleanClients = backupData.clients.map(cleanClient);
        console.log(`🧹 Clients limpiados: ${cleanClients.length}`);
        
        // Importar uno por uno para ver cuál falla
        for (let i = 0; i < cleanClients.length; i++) {
          const client = cleanClients[i];
          console.log(`📦 Importando client ${i + 1}/${cleanClients.length}: ${client.name}`);
          
          const clientResponse = await fetch(`${NEW_SUPABASE_URL}/rest/v1/clients`, {
            method: 'POST',
            headers,
            body: JSON.stringify(client)
          });
          
          if (clientResponse.ok) {
            console.log(`✅ Client ${i + 1} importado`);
          } else {
            const errorText = await clientResponse.text();
            console.error(`❌ Error client ${i + 1}: ${clientResponse.statusText} - ${errorText}`);
            results.push(`❌ Error importando client ${client.name}: ${clientResponse.statusText}`);
          }
        }
        
        results.push(`✅ ${backupData.clients.length} clients procesados`);
      } catch (error) {
        results.push(`❌ Error importando clients: ${error.message}`);
      }
    }

    console.log('\n🎉 RESULTADOS:');
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result}`);
    });

    console.log('\n✅ Importación de clients completada.');
    console.log('🔄 Recarga tu app en Vercel para ver los datos.');

  } catch (error) {
    console.error('❌ Error durante la importación:', error);
  }
}

importClientsBasic();
