import { NextApiRequest, NextApiResponse } from 'next';

const OLD_SUPABASE_URL = 'https://zblasxlrrjeycwjefitp.supabase.co';
const OLD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpibGFzeGxycmpleWN3amVmaXRwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjU2MjAzNCwiZXhwIjoyMDgyMTM4MDM0fQ.2Fq8uV6gxhwKaGTbQQqdNiikYCQp7QgIRW3XIWsSPBA';
const NEW_SUPABASE_URL = 'https://qmythlgbuawqgazokjrb.supabase.co';
const NEW_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFteXRobGdidWF3cWdhem9ranJiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQwODgxMCwiZXhwIjoyMDg2OTg0ODEwfQ.O5nD0jMDLrIsMZr0WKtbZbceR5vkxagRAWWFcPFACTg';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Solo se permite POST'
    });
  }

  try {
    const { confirm } = req.body;
    
    if (!confirm) {
      return res.status(400).json({ 
        error: 'Debes confirmar la importación',
        message: 'Esta acción importará todos los datos del proyecto antiguo al nuevo. ¿Estás seguro?'
      });
    }

    console.log('🚀 Iniciando migración de datos...');
    
    // Obtener datos del proyecto antiguo
    const oldResponse = await fetch(`${OLD_SUPABASE_URL}/rest/v1/rpc/get_planning_snapshot`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OLD_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ target_date: new Date().toISOString().split('T')[0] })
    });

    if (!oldResponse.ok) {
      throw new Error(`Error obteniendo datos antiguos: ${oldResponse.statusText}`);
    }

    const oldData = await oldResponse.json();
    console.log('📥 Datos obtenidos del proyecto antiguo:', Object.keys(oldData));

    // Insertar datos en el nuevo proyecto
    const results = [];
    
    // Migrar workers
    if (oldData.workers && oldData.workers.length > 0) {
      try {
        const workersResponse = await fetch(`${NEW_SUPABASE_URL}/rest/v1/workers`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${NEW_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(oldData.workers)
        });
        
        if (workersResponse.ok) {
          results.push(`✅ ${oldData.workers.length} workers migrados`);
        } else {
          results.push(`❌ Error migrando workers: ${workersResponse.statusText}`);
        }
      } catch (error) {
        results.push(`❌ Error migrando workers: ${error.message}`);
      }
    }

    // Migrar clients
    if (oldData.clients && oldData.clients.length > 0) {
      try {
        const clientsResponse = await fetch(`${NEW_SUPABASE_URL}/rest/v1/clients`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${NEW_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(oldData.clients)
        });
        
        if (clientsResponse.ok) {
          results.push(`✅ ${oldData.clients.length} clients migrados`);
        } else {
          results.push(`❌ Error migrando clients: ${clientsResponse.statusText}`);
        }
      } catch (error) {
        results.push(`❌ Error migrando clients: ${error.message}`);
      }
    }

    // Migrar jobs
    if (oldData.jobs && oldData.jobs.length > 0) {
      try {
        const jobsResponse = await fetch(`${NEW_SUPABASE_URL}/rest/v1/jobs`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${NEW_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(oldData.jobs)
        });
        
        if (jobsResponse.ok) {
          results.push(`✅ ${oldData.jobs.length} jobs migrados`);
        } else {
          results.push(`❌ Error migrando jobs: ${jobsResponse.statusText}`);
        }
      } catch (error) {
        results.push(`❌ Error migrando jobs: ${error.message}`);
      }
    }

    console.log('🎉 Migración completada:', results);

    res.status(200).json({
      success: true,
      message: 'Migración completada exitosamente',
      results
    });

  } catch (error) {
    console.error('❌ Error en migración:', error);
    res.status(500).json({
      error: 'Error durante la migración',
      message: error.message || 'Error desconocido'
    });
  }
}
