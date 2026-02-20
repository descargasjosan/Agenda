/**
 * import-medical-v2.js — Importación de Registros Médicos con actualización de alertas
 *
 * Importa registros médicos desde Excel y actualiza las alertas automáticamente
 */

import fs from 'fs';
import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

// ⚠️  CONFIGURA TUS DATOS DE SUPABASE
// ─────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://qmythlgbuawqgazokjrb.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFteXRobGdidWF3cWdhem9ranJiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQwODgxMCwiZXhwIjoyMDg2OTg0ODEwfQ.O5nD0jMDLrIsMZr0WKtbZbceR5vkxagRAWWFcPFACTg';

// Función para convertir fecha DD/MM/YYYY a YYYY-MM-DD
function convertDateFormat(dateStr) {
  if (!dateStr) return '';
  
  // Eliminar espacios y caracteres extraños
  const cleanDate = dateStr.toString().trim();
  
  // Verificar si ya está en formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    return cleanDate;
  }
  
  // Parsear DD/MM/YYYY
  const parts = cleanDate.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    const paddedDay = day.padStart(2, '0');
    const paddedMonth = month.padStart(2, '0');
    const fullYear = year.length === 2 ? `20${year}` : year;
    
    return `${fullYear}-${paddedMonth}-${paddedDay}`;
  }
  
  // Parsear formato numérico de Excel (días desde 1900)
  if (/^\d+$/.test(cleanDate)) {
    const excelDate = parseInt(cleanDate);
    // Excel usa 1 de enero de 1900 como día 1, pero considera 1900 como año bisiesto incorrectamente
    const excelEpoch = new Date(1900, 0, 1);
    const adjustedDate = excelDate - 2; // Corrección para el error de Excel de 1900
    const resultDate = new Date(excelEpoch.getTime() + (adjustedDate * 24 * 60 * 60 * 1000));
    
    if (!isNaN(resultDate.getTime())) {
      const year = resultDate.getFullYear();
      const month = String(resultDate.getMonth() + 1).padStart(2, '0');
      const day = String(resultDate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  
  console.warn(`⚠️  Formato de fecha no reconocido: ${dateStr}`);
  return '';
}

// Función para calcular estado basado en fecha de caducidad
function calculateStatus(expiryDate) {
  if (!expiryDate) return 'pending';
  
  const today = new Date();
  const expiry = new Date(expiryDate);
  if (expiry < today) {
    return 'expired';
  } else if (expiry.toDateString() === today.toDateString()) {
    return 'critical';
  } else {
    return 'active';
  }
}

// Función para calcular alertas médicas
function calculateMedicalAlerts(courses, workers) {
  const today = new Date();
  const alerts = [];
  courses.forEach(course => {
    if (!course.expiryDate) return;
    const expiryDate = new Date(course.expiryDate);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Mostrar alertas para registros que caducan en 30 días o menos
    if (daysUntilExpiry > 30) return;
    
    const alertLevel = daysUntilExpiry < 0 ? 'critical' : 'warning';
    course.assignedWorkerIds.forEach(workerId => {
      const worker = workers.find(w => w.id === workerId);
      if (worker) {
        alerts.push({ 
          id: `${course.id}-${workerId}`, 
          workerId: worker.id, 
          courseId: course.id, 
          courseName: course.type === 'recognition' ? '🏥 Reconocimiento Médico' : course.name || '📚 Curso', 
          workerName: worker.name, 
          type: course.type, 
          provider: course.provider, 
          expiryDate: course.expiryDate, 
          daysUntilExpiry, 
          alertLevel 
        });
      }
    });
  });
  return alerts.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
}

async function importMedicalRecords() {
  console.log('🏥 Iniciando importación de Registros Médicos...');
  
  // Verificar que existe el archivo Excel
  const excelFile = 'medical_records.xlsx';
  if (!fs.existsSync(excelFile)) {
    console.error(`❌ Error: No se encuentra el archivo "${excelFile}"`);
    console.error('   Coloca tu archivo Excel con ese nombre en la raíz del proyecto');
    process.exit(1);
  }
  
  // Conectar a Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  try {
    // 1. Cargar operarios desde Supabase
    console.log('📥 Cargando operarios desde Supabase...');
    const { data: workersData, error: workersError } = await supabase
      .from('workers')
      .select('data');
    
    if (workersError) {
      throw new Error(`Error al cargar operarios: ${workersError.message}`);
    }
    
    const workers = workersData.map(w => w.data);
    console.log(`✅ ${workers.length} operarios cargados`);
    
    // Crear mapa de DNI a ID para búsqueda rápida
    const dniToIdMap = new Map();
    workers.forEach(worker => {
      if (worker.dni) {
        dniToIdMap.set(worker.dni.toLowerCase().trim(), worker.id);
      }
    });
    
    // 2. Leer Excel
    console.log('📊 Leyendo archivo Excel...');
    const workbook = XLSX.readFile(excelFile);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`✅ ${data.length} filas encontradas en el Excel`);
    
    // 3. Procesar registros
    const medicalRecords = [];
    let processedCount = 0;
    let skippedCount = 0;
    const notFoundDnis = new Set();
    
    for (let i = 0; i < data.length; i++) {
      // Omitir primera fila (cabeceras)
      if (i === 0) {
        console.log(`📋 Omitiendo fila de cabeceras: ${JSON.stringify(Object.keys(data[i]))}`);
        continue;
      }
      
      processedCount++;
      
      // Extraer datos (asumiendo orden: A, B, D)
      const type = 'recognition'; // Siempre reconocimiento médico
      const provider = 'Antea';
      const issueDate = convertDateFormat(data[i][Object.keys(data[i])[0]] || '');
      const expiryDate = convertDateFormat(data[i][Object.keys(data[i])[1]] || '');
      const dni = (data[i][Object.keys(data[i])[3]] || '').toString().trim();
      
      // Buscar operario por DNI
      const workerId = dniToIdMap.get(dni.toLowerCase());
      
      if (!workerId) {
        console.log(`⚠️  Fila ${i + 1}: No se encontró operario con DNI "${dni}"`);
        notFoundDnis.add(dni);
        skippedCount++;
        continue;
      }
      
      // Crear registro médico
      const medicalRecord = {
        type,
        provider,
        issueDate,
        expiryDate,
        status: calculateStatus(expiryDate),
        assignedWorkerIds: [workerId],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Añadir nombre por defecto para reconocimientos médicos
      if (type === 'recognition' && !medicalRecord.name) {
        medicalRecord.name = '🏥 Reconocimiento Médico';
      }
      
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
    
    // 4. Insertar registros en Supabase
    if (medicalRecords.length === 0) {
      console.log('\n❌ No hay registros válidos para importar');
      return;
    }
    
    console.log(`\n💾 Insertando ${medicalRecords.length} registros en Supabase...`);
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < medicalRecords.length; i++) {
      const record = medicalRecords[i];
      // Generar ID único basado en timestamp y operario para evitar conflictos
      const workerId = record.assignedWorkerIds[0] || 'unknown';
      const recordId = `medical_${Date.now()}_${workerId}_${i}`;
      
      try {
        const { error } = await supabase
          .from('medical_courses')
          .insert({
            id: recordId,
            data: record
          });
        
        if (error) {
          throw error;
        }
        
        successCount++;
        console.log(`✅ Registro ${i + 1}/${medicalRecords.length} insertado`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Error insertando registro ${i + 1}: ${error.message}`);
      }
    }
    
    console.log(`\n🎉 Importación completada:`);
    console.log(`   • Registros insertados: ${successCount}`);
    console.log(`   • Registros con error: ${errorCount}`);
    console.log(`   • Total procesados: ${medicalRecords.length}`);
    
    if (errorCount === 0) {
      console.log(`\n✅ ¡Todos los registros se importaron correctamente!`);
      
      // 5. Actualizar alertas en la aplicación
      console.log('\n🔄 Actualizando alertas en la aplicación...');
      try {
        const { data: courses } = await supabase
          .from('medical_courses')
          .select('id, data')
          .eq('provider', 'Antea');
        
        if (error) {
          console.error('Error al cargar registros para actualizar alertas:', error);
          return;
        }
        
        // Actualizar el estado de planning con los cursos importados
        const updatedAlerts = calculateMedicalAlerts(courses, workers);
        console.log(`✅ Alertas actualizadas: ${updatedAlerts.length} alertas generadas`);
        
      } catch (error) {
        console.error('Error durante la actualización de alertas:', error);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error durante la importación:', error);
    process.exit(1);
  }
}

// Ejecutar importación
importMedicalRecords().catch(console.error);
