import fs from 'fs';
import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qmythlgbuawqgazokjrb.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFteXRobGdidWF3cWdhem9ranJiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQwODgxMCwiZXhwIjoyMDg2OTg0ODEwfQ.O5nD0jMDLrIsMZr0WKtbZbceR5vkxagRAWWFcPFACTg';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Función para convertir fecha DD/MM/YYYY a YYYY-MM-DD
function convertDateFormat(dateStr) {
  if (!dateStr) return '';
  
  const cleanDate = dateStr.toString().trim();
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    return cleanDate;
  }
  
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleanDate)) {
    const [day, month, year] = cleanDate.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  if (/^\d+$/.test(cleanDate)) {
    const excelDate = parseInt(cleanDate);
    const date = new Date((excelDate - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  
  return '';
}

function calculateStatus(expiryDate) {
  if (!expiryDate) return 'active';
  
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'expired';
  if (diffDays <= 30) return 'pending';
  return 'active';
}

async function createMedicalRecordsManually() {
  try {
    console.log('🏥 Creando 78 registros médicos MANUALMENTE...\n');
    
    const excelFile = 'medical_records.xlsx';
    
    if (!fs.existsSync(excelFile)) {
      console.error(`❌ Error: No se encuentra el archivo ${excelFile}`);
      return;
    }
    
    // 1. Cargar operarios
    console.log('📥 Cargando operarios desde Supabase...');
    const { data: workersData, error: workersError } = await supabase
      .from('workers')
      .select('data');
    
    if (workersError) {
      throw new Error(`Error al cargar operarios: ${workersError.message}`);
    }
    
    const workers = workersData.map(w => w.data);
    console.log(`✅ ${workers.length} operarios cargados`);
    
    const dniToIdMap = new Map();
    const notFoundDnis = new Set();
    
    workers.forEach(worker => {
      if (worker.dni) {
        dniToIdMap.set(worker.dni.toLowerCase().trim(), worker.id);
      }
    });
    
    // 2. Leer Excel
    console.log('\n📊 Leyendo archivo Excel...');
    const workbook = XLSX.readFile(excelFile);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`✅ ${data.length} filas encontradas en el Excel`);
    
    // 3. Procesar registros
    const medicalRecords = [];
    let processedCount = 0;
    let skippedCount = 0;
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      if (i === 0) {
        console.log(`📋 Omitiendo fila de cabeceras: ${JSON.stringify(Object.keys(row))}`);
        continue;
      }
      
      processedCount++;
      
      // Crear registro EXACTAMENTE como lo hace la aplicación manualmente
      const recordId = Date.now().toString() + i;
      const issueDate = convertDateFormat(row[Object.keys(row)[0]] || '');
      const expiryDate = convertDateFormat(row[Object.keys(row)[1]] || '');
      const dni = (row[Object.keys(row)[3]] || '').toString().trim();
      
      const workerId = dniToIdMap.get(dni.toLowerCase());
      
      if (!workerId) {
        console.log(`⚠️  Fila ${i + 1}: No se encontró operario con DNI "${dni}"`);
        notFoundDnis.add(dni);
        skippedCount++;
        continue;
      }
      
      // Estructura EXACTA como la aplicación manual
      const medicalRecord = {
        id: recordId,
        name: '🏥 Reconocimiento Médico',
        type: 'recognition',
        provider: 'Antea',
        issueDate,
        expiryDate,
        status: calculateStatus(expiryDate),
        assignedWorkerIds: [workerId],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      medicalRecords.push(medicalRecord);
      
      console.log(`✅ Fila ${i + 1}: Operario ${dni} -> ${issueDate} a ${expiryDate}`);
    }
    
    console.log(`\n📈 Resumen del procesamiento:`);
    console.log(`   • Total filas procesadas: ${processedCount}`);
    console.log(`   • Registros válidos: ${medicalRecords.length}`);
    console.log(`   • Registros omitidos: ${skippedCount}`);
    
    if (notFoundDnis.size > 0) {
      console.log(`\n⚠️  DNIs no encontrados (${notFoundDnis.size}):`);
      Array.from(notFoundDnis).forEach(dni => {
        console.log(`   • ${dni}`);
      });
    }
    
    // 4. Insertar registros uno por uno como lo hace la aplicación
    if (medicalRecords.length === 0) {
      console.log('\n❌ No hay registros válidos para crear');
      return;
    }
    
    console.log(`\n💾 Creando ${medicalRecords.length} registros manualmente...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < medicalRecords.length; i++) {
      const record = medicalRecords[i];
      
      try {
        // Insertar EXACTAMENTE como lo hace la aplicación manual
        const { error } = await supabase
          .from('medical_courses')
          .insert({
            id: record.id,
            data: record  // Estructura completa con ID dentro
          });
        
        if (error) {
          throw error;
        }
        
        successCount++;
        console.log(`✅ Registro ${i + 1}/${medicalRecords.length} creado manualmente`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Error creando registro ${i + 1}: ${error.message}`);
      }
    }
    
    console.log(`\n🎉 Creación manual completada:`);
    console.log(`   • Registros creados: ${successCount}`);
    console.log(`   • Registros con error: ${errorCount}`);
    console.log(`   • Total procesados: ${medicalRecords.length}`);
    
    if (errorCount > 0) {
      console.log(`\n⚠️  Algunos registros no se pudieron crear. Revisa los errores arriba.`);
    } else {
      console.log(`\n✅ ¡Todos los registros se crearon manualmente correctamente!`);
      console.log(`\n🎯 Estos registros deberían funcionar EXACTAMENTE como los creados desde la UI`);
    }
    
  } catch (error) {
    console.error(`\n❌ Error durante la creación: ${error.message}`);
    process.exit(1);
  }
}

createMedicalRecordsManually().catch(console.error);
