/**
 * clean-medical.js — Limpiar registros médicos de Antea
 *
 * Elimina todos los registros médicos con proveedor "Antea" 
 * para poder volver a importar con fechas correctas.
 */

import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const SUPABASE_URL = 'https://qmythlgbuawqgazokjrb.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFteXRobGdidWF3cWdhem9ranJiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQwODgxMCwiZXhwIjoyMDg2OTg0ODEwfQ.O5nD0jMDLrIsMZr0WKtbZbceR5vkxagRAWWFcPFACTg';

async function cleanMedicalRecords() {
  console.log('🧹 Limpiando registros médicos de Antea...\n');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  try {
    // 1. Obtener todos los registros médicos
    console.log('📥 Cargando registros médicos...');
    const { data: records, error: fetchError } = await supabase
      .from('medical_courses')
      .select('id, data');
    
    if (fetchError) {
      throw new Error(`Error al cargar registros: ${fetchError.message}`);
    }
    
    console.log(`✅ ${records.length} registros encontrados`);
    
    // 2. Filtrar registros de Antea
    const anteaRecords = records.filter(record => 
      record.data && record.data.provider === 'Antea'
    );
    
    console.log(`🎯 ${anteaRecords.length} registros de Antea encontrados`);
    
    if (anteaRecords.length === 0) {
      console.log('ℹ️  No hay registros de Antea para eliminar');
      return;
    }
    
    // 3. Eliminar registros de Antea
    console.log('\n🗑️  Eliminando registros...');
    let deletedCount = 0;
    let errorCount = 0;
    
    for (const record of anteaRecords) {
      try {
        const { error } = await supabase
          .from('medical_courses')
          .delete()
          .eq('id', record.id);
        
        if (error) {
          throw error;
        }
        
        deletedCount++;
        console.log(`✅ Registro ${deletedCount}/${anteaRecords.length} eliminado`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Error eliminando registro ${record.id}: ${error.message}`);
      }
    }
    
    console.log(`\n🎉 Limpieza completada:`);
    console.log(`   • Registros eliminados: ${deletedCount}`);
    console.log(`   • Registros con error: ${errorCount}`);
    console.log(`   • Total procesados: ${anteaRecords.length}`);
    
    if (errorCount === 0) {
      console.log(`\n✅ ¡Todos los registros de Antea se eliminaron correctamente!`);
      console.log(`\n🔄 Ahora puedes ejecutar 'node import-medical.js' para importar con fechas correctas`);
    }
    
  } catch (error) {
    console.error(`\n❌ Error durante la limpieza: ${error.message}`);
    process.exit(1);
  }
}

cleanMedicalRecords().catch(console.error);
