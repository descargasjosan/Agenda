import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qmythlgbuawqgazokjrb.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFteXRobGdidWF3cWdhem9ranJiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQwODgxMCwiZXhwIjoyMDg2OTg0ODEwfQ.O5nD0jMDLrIsMZr0WKtbZbceR5vkxagRAWWFcPFACTg';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixMedicalIds() {
  try {
    console.log('🔧 Corrigiendo IDs en registros médicos...\n');
    
    // Obtener todos los registros
    const { data: records, error } = await supabase
      .from('medical_courses')
      .select('*');
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log(`📊 ${records.length} registros encontrados`);
    
    let fixedCount = 0;
    let errorCount = 0;
    
    // Actualizar cada registro para incluir el ID dentro de data
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      // Solo actualizar si data.id no existe
      if (!record.data.id) {
        const updatedData = {
          ...record.data,
          id: record.id  // Añadir el ID del registro principal dentro de data
        };
        
        const { error: updateError } = await supabase
          .from('medical_courses')
          .update({ data: updatedData })
          .eq('id', record.id);
        
        if (updateError) {
          console.error(`❌ Error actualizando registro ${i + 1}:`, updateError);
          errorCount++;
        } else {
          console.log(`✅ Registro ${i + 1}/${records.length} corregido: ${record.id}`);
          fixedCount++;
        }
      } else {
        console.log(`⏭️ Registro ${i + 1}/${records.length} ya tenía ID correcto`);
      }
    }
    
    console.log(`\n🎉 Corrección completada:`);
    console.log(`   • Registros corregidos: ${fixedCount}`);
    console.log(`   • Registros con error: ${errorCount}`);
    console.log(`   • Total procesados: ${records.length}`);
    
    if (errorCount === 0) {
      console.log(`\n✅ ¡Todos los registros tienen ID correcto ahora!`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixMedicalIds();
