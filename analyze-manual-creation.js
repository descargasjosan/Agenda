import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qmythlgbuawqgazokjrb.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFteXRobGdidWF3cWdhem9ranJiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQwODgxMCwiZXhwIjoyMDg2OTg0ODEwfQ.O5nD0jMDLrIsMZr0WKtbZbceR5vkxagRAWWFcPFACTg';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function analyzeManualCreation() {
  try {
    console.log('🔍 Analizando creación manual de registros...\n');
    
    // 1. Crear un registro manualmente como lo hace la aplicación
    const manualRecord = {
      id: Date.now().toString(),
      name: '🏥 Reconocimiento Médico',
      type: 'recognition',
      provider: 'Mutua',
      issueDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'active',
      assignedWorkerIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('📝 Registro manual a crear:');
    console.log(JSON.stringify(manualRecord, null, 2));
    
    // 2. Insertarlo exactamente como lo hace la aplicación
    const { data: insertedRecord, error: insertError } = await supabase
      .from('medical_courses')
      .insert({
        id: manualRecord.id,
        data: manualRecord
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Error insertando registro manual:', insertError);
      return;
    }
    
    console.log('\n✅ Registro manual insertado correctamente');
    console.log('\n📊 Estructura COMPLETA en Supabase:');
    console.log(JSON.stringify(insertedRecord, null, 2));
    
    // 3. Obtenerlo para ver cómo lo carga la aplicación
    const { data: loadedRecord, error: loadError } = await supabase
      .from('medical_courses')
      .select('*')
      .eq('id', manualRecord.id)
      .single();
    
    if (loadError) {
      console.error('❌ Error cargando registro:', loadError);
      return;
    }
    
    console.log('\n🔄 Estructura cuando la aplicación lo carga:');
    console.log('🎯 ID principal:', loadedRecord.id);
    console.log('🎯 ID dentro de data:', loadedRecord.data?.id);
    console.log('🎯 Estructura de data:', Object.keys(loadedRecord.data || {}));
    
    // 4. Limpiar el registro de prueba
    console.log('\n🧹 Limpiando registro de prueba...');
    await supabase
      .from('medical_courses')
      .delete()
      .eq('id', manualRecord.id);
    
    console.log('✅ Registro de prueba eliminado');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

analyzeManualCreation();
