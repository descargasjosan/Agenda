
import * as React from 'react';
import { useState, useMemo } from 'react';
import { 
  BarChart3, Users, Clock, CalendarDays, Filter, Building2, MapPin, 
  TrendingUp, Activity, Calculator, ArrowRight, Ban, X, FileText, AlertCircle, Download, FileSpreadsheet, User, Briefcase, CheckCircle2, Stethoscope, StickyNote, Fuel, Plus, Minus
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { PlanningState, Job, Worker, NoteType, FuelRecord } from '../lib/types';
import { formatDateDMY } from '../lib/utils';

// Función para formatear horas
const formatTime = (hours: number): string => {
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

interface StatisticsPanelProps {
  planning: PlanningState;
}

const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ planning }) => {
  // Estados para filtros
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    return firstDay;
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    return lastDay;
  });
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [selectedCenterId, setSelectedCenterId] = useState<string>('all');
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('all'); 
  
  const [showCancelledDetails, setShowCancelledDetails] = useState(false);
  const [showFuelDetails, setShowFuelDetails] = useState(false);
  const [showSitePresence, setShowSitePresence] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('all');
  
  // Estado para controlar qué sedes están expandidas
  const [expandedSites, setExpandedSites] = useState<Record<string, boolean>>({});

  // Función para toggle expansión de sedes
  const toggleSiteExpansion = (siteId: string) => {
    setExpandedSites(prev => ({
      ...prev,
      [siteId]: !prev[siteId]
    }));
  };

  // Calcular detalles de operarios por sede
  const siteWorkersDetails = useMemo(() => {
    const details: Record<string, Array<{
      workerId: string;
      workerName: string;
      date: string;
      startTime: string;
      endTime: string;
      hoursAtSite: number;
    }>> = {};

    // Procesar cada día del rango
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      
      // Obtener TODAS las tareas de este día
      const allDayJobs = planning.jobs.filter(job => 
        job.date === dateStr && 
        !job.isCancelled &&
        (selectedClientId === 'all' || job.clientId === selectedClientId) &&
        (selectedCenterId === 'all' || job.centerId === selectedCenterId)
      );

      if (allDayJobs.length === 0) continue;

      // Agrupar tareas por operario
      const workerTasks: Record<string, typeof allDayJobs> = {};
      allDayJobs.forEach(job => {
        job.assignedWorkerIds.forEach(workerId => {
          if (!workerTasks[workerId]) workerTasks[workerId] = [];
          workerTasks[workerId].push(job);
        });
      });

      // Para cada operario, calcular sus horas en cada sede
      Object.entries(workerTasks).forEach(([workerId, tasks]) => {
        if (tasks.length === 0) return;

        const worker = planning.workers.find(w => w.id === workerId);
        const workerName = worker?.name || 'Desconocido';

        // Ordenar tareas por hora de inicio
        tasks.sort((a, b) => a.startTime.localeCompare(b.startTime));
        
        // Calcular jornada
        const firstTaskStart = parseFloat(tasks[0].startTime.split(':')[0]) + parseFloat(tasks[0].startTime.split(':')[1]) / 60;
        const workDayDuration = 9;
        const breakTime = 1;
        const actualWorkDayDuration = workDayDuration - breakTime;
        const workDayEnd = firstTaskStart + workDayDuration;
        
        tasks.forEach((task, index) => {
          // Obtener hora real de inicio del operario (workerTimes) o usar startTime por defecto
          const realStartTime = task.workerTimes?.[workerId] || task.startTime;
          const taskStart = parseFloat(realStartTime.split(':')[0]) + parseFloat(realStartTime.split(':')[1]) / 60;
          
          let endTime: number;
          let hoursAtSite: number;
          
          if (index === 0) {
            // Primera tarea: usar hora de inicio de siguiente tarea o fin de jornada
            const nextTaskRealStartTime = tasks[index + 1]?.workerTimes?.[workerId] || tasks[index + 1]?.startTime;
            endTime = tasks.length > 1 ? 
              parseFloat(nextTaskRealStartTime.split(':')[0]) + parseFloat(nextTaskRealStartTime.split(':')[1]) / 60 : 
              workDayEnd;
            hoursAtSite = Math.min(endTime - taskStart, actualWorkDayDuration);
          } else if (index < tasks.length - 1) {
            // Tareas intermedias: usar hora de inicio de siguiente tarea
            const nextTaskRealStartTime = tasks[index + 1]?.workerTimes?.[workerId] || tasks[index + 1]?.startTime;
            endTime = parseFloat(nextTaskRealStartTime.split(':')[0]) + parseFloat(nextTaskRealStartTime.split(':')[1]) / 60;
            hoursAtSite = Math.min(endTime - taskStart, actualWorkDayDuration);
          } else {
            // Última tarea: usar fin de jornada
            endTime = workDayEnd;
            hoursAtSite = Math.min(workDayEnd - taskStart, actualWorkDayDuration);
          }

          // Debug específico para ISRAEL
          if (workerName.includes('ISRAEL')) {
            console.log(`🔍 DEBUG ISRAEL - Tarea ${index + 1}:`);
            console.log(`   - task.startTime: ${task.startTime}`);
            console.log(`   - task.workerTimes[${workerId}]: ${task.workerTimes?.[workerId]}`);
            console.log(`   - realStartTime: ${realStartTime} (${taskStart}h)`);
            console.log(`   - task.endTime: ${task.endTime}`);
            console.log(`   - endTime calculado: ${formatTime(endTime)} (${endTime}h)`);
            console.log(`   - hoursAtSite: ${hoursAtSite}h`);
            console.log(`   - Sede: ${task.centerId}`);
          }

          if (hoursAtSite > 0) {
            if (!details[task.centerId]) {
              details[task.centerId] = [];
            }
            
            details[task.centerId].push({
              workerId,
              workerName,
              date: dateStr,
              startTime: realStartTime, // Usar hora real de inicio
              endTime: formatTime(endTime),
              hoursAtSite
            });
          }
        });
      });
    }

    return details;
  }, [planning.jobs, planning.workers, planning.clients, startDate, endDate, selectedClientId, selectedCenterId]);

  const sortedWorkers = useMemo(() => {
    return [...planning.workers]
        .filter(w => !w.isArchived)
        .sort((a, b) => a.name.localeCompare(b.name));
  }, [planning.workers]);

  const jobsInScope = useMemo(() => {
    return planning.jobs.filter(job => {
      if (job.date < startDate || job.date > endDate) return false;
      if (selectedClientId !== 'all' && job.clientId !== selectedClientId) return false;
      if (selectedCenterId !== 'all' && job.centerId !== selectedCenterId) return false;
      if (selectedWorkerId !== 'all' && !job.assignedWorkerIds.includes(selectedWorkerId)) return false;
      return true;
    });
  }, [planning.jobs, startDate, endDate, selectedClientId, selectedCenterId, selectedWorkerId]);

  const activeJobs = useMemo(() => jobsInScope.filter(j => !j.isCancelled), [jobsInScope]);
  const cancelledJobs = useMemo(() => jobsInScope.filter(j => j.isCancelled), [jobsInScope]);

  const fuelRecordsInScope = useMemo(() => {
    return planning.fuelRecords.filter(record => {
      if (record.date < startDate || record.date > endDate) return false;
      if (selectedWorkerId !== 'all' && record.workerId !== selectedWorkerId) return false;
      return true;
    });
  }, [planning.fuelRecords, startDate, endDate, selectedWorkerId]);

  // Lógica para calcular horas por sede
  const sitePresenceStats = useMemo(() => {
    console.log('🔍 ANÁLISIS REAL DE HORAS POR SEDE');
    console.log('📅 Periodo:', startDate, '-', endDate);
    console.log('='.repeat(80));
    
    const siteData: Record<string, { totalHours: number; totalWorkers: number; days: Set<string> }> = {};
    
    // Obtener todas las sedes únicas
    const allSites = new Set<string>();
    planning.clients.forEach(client => {
      client.centers?.forEach(center => {
        allSites.add(center.id);
      });
    });

    // Inicializar datos para cada sede
    allSites.forEach(siteId => {
      siteData[siteId] = {
        totalHours: 0,
        totalWorkers: 0,
        days: new Set()
      };
    });

    // Procesar cada día del rango
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Para registrar operarios únicos por sede por día
    const workersBySiteByDay: Record<string, Record<string, Set<string>>> = {};
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      
      // Obtener TODAS las tareas de este día (sin filtrar por operario)
      const allDayJobs = planning.jobs.filter(job => 
        job.date === dateStr && 
        !job.isCancelled &&
        (selectedClientId === 'all' || job.clientId === selectedClientId) &&
        (selectedCenterId === 'all' || job.centerId === selectedCenterId)
      );

      // Si hay filtro de operario, obtener también las tareas filtradas para mostrar logs
      const dayJobs = selectedWorkerId === 'all' 
        ? allDayJobs 
        : allDayJobs.filter(job => job.assignedWorkerIds.includes(selectedWorkerId));

      if (allDayJobs.length === 0) continue;

      console.log(`\n📅 DÍA: ${dateStr}`);
      console.log('📋 Tareas totales del día:', allDayJobs.length);
      if (selectedWorkerId !== 'all') {
        console.log('📋 Tareas del operario filtrado:', dayJobs.length);
      }

      // Agrupar TODAS las tareas por operario (para el cálculo real)
      const allWorkerTasks: Record<string, typeof allDayJobs> = {};
      allDayJobs.forEach(job => {
        job.assignedWorkerIds.forEach(workerId => {
          if (!allWorkerTasks[workerId]) allWorkerTasks[workerId] = [];
          allWorkerTasks[workerId].push(job);
        });
      });

      // Agrupar tareas filtradas por operario (solo para mostrar logs si hay filtro)
      const workerTasks: Record<string, typeof dayJobs> = {};
      dayJobs.forEach(job => {
        job.assignedWorkerIds.forEach(workerId => {
          if (!workerTasks[workerId]) workerTasks[workerId] = [];
          workerTasks[workerId].push(job);
        });
      });

      console.log('👥 Operarios totales con tareas:', Object.keys(allWorkerTasks).length);
      if (selectedWorkerId !== 'all') {
        console.log('👥 Operarios filtrados con tareas:', Object.keys(workerTasks).length);
      }

      // Inicializar registro de operarios para este día
      if (!workersBySiteByDay[dateStr]) {
        workersBySiteByDay[dateStr] = {};
      }

      // Para cada operario (TODOS), calcular su presencia en sedes
      Object.entries(allWorkerTasks).forEach(([workerId, tasks]) => {
        if (tasks.length === 0) return;

        const worker = planning.workers.find(w => w.id === workerId);
        console.log(`\n   👤 ${worker?.name || 'Desconocido'} (${workerId}):`);

        // Ordenar tareas por hora de inicio
        tasks.sort((a, b) => a.startTime.localeCompare(b.startTime));
        
        // Calcular jornada desde primera tarea hasta 9h de trabajo
        const firstTaskStart = parseFloat(tasks[0].startTime.split(':')[0]) + parseFloat(tasks[0].startTime.split(':')[1]) / 60;
        const workDayDuration = 9; // 9 horas teóricas
        const breakTime = 1; // 1 hora de descansos (2 × 30min)
        const actualWorkDayDuration = workDayDuration - breakTime; // 8 horas reales
        const workDayEnd = firstTaskStart + workDayDuration; // Jornada teórica hasta 17:00
        
        console.log(`      🕐 Jornada: ${formatTime(firstTaskStart)} - ${formatTime(workDayEnd)} (${workDayDuration}h teóricas - ${breakTime}h descansos = ${actualWorkDayDuration}h reales)`);
        
        let currentSite = tasks[0].centerId;
        let currentSiteHours = 0;
        
        // Registrar este operario en la primera sede que trabaja
        if (!workersBySiteByDay[dateStr][currentSite]) {
          workersBySiteByDay[dateStr][currentSite] = new Set();
        }
        workersBySiteByDay[dateStr][currentSite].add(workerId);
        
        tasks.forEach((task, index) => {
          // Obtener hora real de inicio del operario (workerTimes) o usar startTime por defecto
          const realStartTime = task.workerTimes?.[workerId] || task.startTime;
          const taskStart = parseFloat(realStartTime.split(':')[0]) + parseFloat(realStartTime.split(':')[1]) / 60;
          const taskEnd = parseFloat(task.endTime.split(':')[0]) + parseFloat(task.endTime.split(':')[1]) / 60;
          
          const client = planning.clients.find(c => c.id === task.clientId);
          const center = client?.centers?.find(ct => ct.id === task.centerId);
          const siteName = `${client?.name || 'Empresa Desconocida'} - ${center?.name || 'Sede Desconocida'}`;
          
          console.log(`      📍 ${index + 1}. ${siteName}: ${realStartTime} - ${task.endTime} (real: ${realStartTime}, programada: ${task.startTime})`);
          
          if (index === 0) {
            // Primera tarea: usar hora real de inicio y hora de inicio de siguiente tarea o fin de jornada
            const nextTaskRealStartTime = tasks[index + 1]?.workerTimes?.[workerId] || tasks[index + 1]?.startTime;
            const endTime = tasks.length > 1 ? 
              parseFloat(nextTaskRealStartTime.split(':')[0]) + parseFloat(nextTaskRealStartTime.split(':')[1]) / 60 : 
              workDayEnd; // Siempre usar fin de jornada, nunca fin de tarea
            const hoursAtFirstSite = Math.min(endTime - taskStart, actualWorkDayDuration); // Máximo 8h reales
            currentSiteHours = hoursAtFirstSite;
            
            console.log(`         ⏰ Primera tarea: ${hoursAtFirstSite.toFixed(1)}h en ${siteName} (desde ${realStartTime} hasta ${tasks.length > 1 ? nextTaskRealStartTime : formatTime(workDayEnd)})`);
            
            if (siteData[currentSite]) {
              siteData[currentSite].totalHours += currentSiteHours;
              siteData[currentSite].days.add(dateStr);
            }
          } else if (index < tasks.length - 1) {
            // Cambios de sede: calcular horas entre inicio de esta tarea y inicio de la siguiente tarea
            const nextTaskRealStartTime = tasks[index + 1]?.workerTimes?.[workerId] || tasks[index + 1]?.startTime;
            const hoursAtCurrentSite = Math.min(parseFloat(nextTaskRealStartTime.split(':')[0]) + parseFloat(nextTaskRealStartTime.split(':')[1]) / 60 - taskStart, actualWorkDayDuration);
            
            console.log(`         ⏰ Cambio a ${siteName}: ${hoursAtCurrentSite.toFixed(1)}h (desde ${realStartTime} hasta ${nextTaskRealStartTime})`);
            
            if (hoursAtCurrentSite > 0 && siteData[task.centerId]) {
              siteData[task.centerId].totalHours += hoursAtCurrentSite;
              siteData[task.centerId].days.add(dateStr);
            }
            
            // Registrar operario en la nueva sede
            if (!workersBySiteByDay[dateStr][task.centerId]) {
              workersBySiteByDay[dateStr][task.centerId] = new Set();
            }
            workersBySiteByDay[dateStr][task.centerId].add(workerId);
            
            currentSite = task.centerId;
          } else {
            // Última tarea: calcular hasta fin de jornada
            const hoursAtLastSite = Math.min(workDayEnd - taskStart, actualWorkDayDuration);
            
            console.log(`         ⏰ Última tarea en ${siteName}: ${hoursAtLastSite.toFixed(1)}h (desde ${realStartTime} hasta ${formatTime(workDayEnd)})`);
            
            if (hoursAtLastSite > 0 && siteData[task.centerId]) {
              siteData[task.centerId].totalHours += hoursAtLastSite;
              siteData[task.centerId].days.add(dateStr);
            }
            
            // Registrar operario en la última sede
            if (!workersBySiteByDay[dateStr][task.centerId]) {
              workersBySiteByDay[dateStr][task.centerId] = new Set();
            }
            workersBySiteByDay[dateStr][task.centerId].add(workerId);
            
            currentSite = task.centerId;
          }
        });
      });
    }

    // Calcular operarios únicos por sede
    Object.entries(workersBySiteByDay).forEach(([dateStr, sitesByDay]) => {
      Object.entries(sitesByDay).forEach(([siteId, workers]) => {
        if (siteData[siteId]) {
          siteData[siteId].totalWorkers += workers.size;
        }
      });
    });

    // Convertir a array para mostrar
    const result = Object.entries(siteData).map(([siteId, data]) => {
      const client = planning.clients.find(c => c.centers?.some(ct => ct.id === siteId));
      const center = client?.centers?.find(ct => ct.id === siteId);
      const siteName = `${client?.name || 'Empresa Desconocida'} - ${center?.name || 'Sede Desconocida'}`;
      
      return {
        siteId,
        siteName,
        totalHours: data.totalHours,
        totalWorkers: data.totalWorkers,
        totalDays: data.days.size
      };
    }).filter(site => site.totalHours > 0);

    console.log('\n📊 RESUMEN FINAL:');
    console.log('='.repeat(80));
    result.forEach(site => {
      console.log(`📍 ${site.siteName}:`);
      console.log(`   📊 Total horas: ${site.totalHours.toFixed(1)}h`);
      console.log(`   👥 Total operarios: ${site.totalWorkers}`);
      console.log(`   📅 Días activos: ${site.totalDays}`);
      console.log(`   📈 Media horas/día: ${site.totalDays > 0 ? (site.totalHours / site.totalDays).toFixed(1) : '0.0'}h`);
    });

    return {
      sites: result,
      totalDays: result.reduce((sum, site) => sum + site.totalDays, 0),
      totalHours: result.reduce((sum, site) => sum + site.totalHours, 0),
      totalWorkers: result.reduce((sum, site) => sum + site.totalWorkers, 0)
    };
  }, [planning.jobs, planning.clients, planning.workers, startDate, endDate, selectedClientId, selectedCenterId, selectedWorkerId]);

  const flattenedActivity = useMemo(() => {
    const activity: Array<{
      id: string;
      date: string;
      worker: Worker;
      job?: Job;
      clientName: string;
      centerName: string;
      isAbsence?: boolean;
      absenceType?: string;
      noteText?: string;
    }> = [];

    // 1. Agregar trabajos activos
    activeJobs.forEach(job => {
      const client = planning.clients.find(c => c.id === job.clientId);
      const center = client?.centers.find(ct => ct.id === job.centerId);

      job.assignedWorkerIds.forEach(workerId => {
        if (selectedWorkerId !== 'all' && workerId !== selectedWorkerId) return;

        const worker = planning.workers.find(w => w.id === workerId);
        if (worker) {
          activity.push({
            id: `${job.id}-${worker.id}`,
            date: job.date,
            worker,
            job,
            clientName: client?.name || '---',
            centerName: center?.name || '---'
          });
        }
      });
    });

    // 2. Agregar Ausencias (solo si hay un trabajador seleccionado)
    if (selectedWorkerId !== 'all') {
      const worker = planning.workers.find(w => w.id === selectedWorkerId);
      if (worker) {
        const notes = planning.dailyNotes?.filter(n => n.workerId === selectedWorkerId && n.date >= startDate && n.date <= endDate) || [];
        
        notes.forEach(note => {
          const text = note.text.toLowerCase();
          const isMedical = note.type === 'medical';
          const isVacation = text.includes('vacaciones') || text.includes('fiesta') || text.includes('permiso') || text.includes('ausencia') || text.includes('vaca');
          
          if (isMedical || isVacation) {
            // Evitar duplicar si ya tiene un trabajo ese día (opcional, pero ayuda al control)
            const hasJobThisDay = activity.some(a => a.date === note.date && a.worker.id === selectedWorkerId);
            
            activity.push({
              id: `absence-${note.id}`,
              date: note.date,
              worker,
              clientName: 'AUSENCIA',
              centerName: 'REGISTRO INTERNO',
              isAbsence: true,
              absenceType: isMedical ? 'BAJA MÉDICA' : 'VACACIONES / PERMISO',
              noteText: note.text
            });
          }
        });
      }
    }

    return activity.sort((a, b) => b.date.localeCompare(a.date) || a.worker.name.localeCompare(b.worker.name));
  }, [activeJobs, planning.workers, planning.clients, planning.dailyNotes, selectedWorkerId, startDate, endDate]);


  const stats = useMemo(() => {
    const uniqueWorkers = new Set<string>();
    const workersPerDay: Record<string, Set<string>> = {};
    let totalManHours = 0;

    activeJobs.forEach(job => {
      job.assignedWorkerIds.forEach(id => {
          if (selectedWorkerId === 'all' || id === selectedWorkerId) {
              uniqueWorkers.add(id);
          }
      });

      if (!workersPerDay[job.date]) {
        workersPerDay[job.date] = new Set();
      }
      job.assignedWorkerIds.forEach(id => {
          if (selectedWorkerId === 'all' || id === selectedWorkerId) {
              workersPerDay[job.date].add(id);
          }
      });

      const parseTime = (timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h + m / 60;
      };

      const effectiveEndTimeStr = (job.isFinished && job.actualEndTime) ? job.actualEndTime : job.endTime;
      const startDec = parseTime(job.startTime);
      const endDec = parseTime(effectiveEndTimeStr);
      let duration = endDec - startDec;
      if (duration < 0) duration = 0; 

      const workersCount = selectedWorkerId === 'all' ? job.assignedWorkerIds.length : 1;
      totalManHours += duration * workersCount;
    });

    // Lógica para excluir operarios que SOLO tengan "RECONOCIMIENTO MÉDICO" en un día
    Object.keys(workersPerDay).forEach(date => {
      const dayJobs = activeJobs.filter(job => job.date === date);
      const workersThatDay = workersPerDay[date];
      
      workersThatDay.forEach(workerId => {
        const workerJobsThatDay = dayJobs.filter(job => job.assignedWorkerIds.includes(workerId));
        
        // Verificar si TODOS los trabajos del operario ese día son de "RECONOCIMIENTO MÉDICO"
        const onlyMedicalJobs = workerJobsThatDay.every(job => {
          const client = planning.clients.find(c => c.id === job.clientId);
          return client?.name === "RECONOCIMIENTO MÉDICO" || client?.name === "RECONOCIMIENTO MEDICO";
        });
        
        // Si solo tiene trabajos de reconocimiento médico, excluirlo del conteo de ese día
        if (onlyMedicalJobs && workerJobsThatDay.length > 0) {
          workersPerDay[date].delete(workerId);
          
          // También excluirlo del conteo total de uniqueWorkers si no tiene otros trabajos en otras fechas
          const hasOtherJobs = activeJobs.some(job => 
            job.assignedWorkerIds.includes(workerId) && 
            job.date !== date &&
            !planning.clients.find(c => c.id === job.clientId)?.name?.includes("RECONOCIMIENTO")
          );
          
          if (!hasOtherJobs) {
            uniqueWorkers.delete(workerId);
          }
        }
      });
    });

    const activeDays = Object.keys(workersPerDay).length;
    let sumDailyWorkers = 0;
    Object.values(workersPerDay).forEach(set => sumDailyWorkers += set.size);
    const averageDailyWorkers = activeDays > 0 ? (sumDailyWorkers / activeDays) : 0;

    return {
      totalUniqueWorkers: uniqueWorkers.size,
      averageDailyWorkers: averageDailyWorkers,
      totalManHours: totalManHours,
      activeDays
    };
  }, [activeJobs, selectedWorkerId, planning.clients]);

  const cancellationRate = jobsInScope.length > 0 
    ? ((cancelledJobs.length / jobsInScope.length) * 100).toFixed(1) 
    : "0.0";

  const selectedClient = planning.clients.find(c => c.id === selectedClientId);
  const selectedWorker = planning.workers.find(w => w.id === selectedWorkerId);

  const formatDateForExcel = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const exportStatsToExcel = () => {
    const wb = XLSX.utils.book_new();

    const summaryData = [
       { Concepto: 'Periodo Inicio', Valor: formatDateForExcel(startDate) },
       { Concepto: 'Periodo Fin', Valor: formatDateForExcel(endDate) },
       { Concepto: 'Cliente Filtrado', Valor: selectedClient ? selectedClient.name : 'TODOS' },
       { Concepto: 'Trabajador Filtrado', Valor: selectedWorker ? selectedWorker.name : 'TODOS' },
       { Concepto: '', Valor: '' },
       { Concepto: 'Operarios Únicos', Valor: stats.totalUniqueWorkers },
       { Concepto: 'Media Operarios/Día', Valor: stats.averageDailyWorkers.toFixed(2) },
       { Concepto: 'Horas Totales', Valor: stats.totalManHours.toFixed(2) },
       { Concepto: 'Servicios Realizados', Valor: activeJobs.length },
       { Concepto: 'Servicios Anulados', Valor: cancelledJobs.length },
       { Concepto: 'Tasa Cancelación', Valor: `${cancellationRate}%` }
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen KPI");

    const detailedData = flattenedActivity.map(item => {
        if (item.isAbsence) {
           return {
            'Fecha': formatDateForExcel(item.date),
            'Código Operario': item.worker.code,
            'Nombre Operario': item.worker.name,
            'Cliente': 'AUSENCIA',
            'Sede': '-',
            'Tarea': item.absenceType,
            'Inicio': '-',
            'Fin': '-',
            'Duración (h)': '0.00',
            'Estado': 'AUSENCIA'
           };
        }
        const [h1, m1] = item.job!.startTime.split(':').map(Number);
        const [h2, m2] = (item.job!.isFinished && item.job!.actualEndTime ? item.job!.actualEndTime : item.job!.endTime).split(':').map(Number);
        let duration = (h2 + m2/60) - (h1 + m1/60);
        if(duration < 0) duration = 0;

        return {
            'Fecha': formatDateForExcel(item.date),
            'Código Operario': item.worker.code,
            'Nombre Operario': item.worker.name,
            'Cliente': item.clientName,
            'Sede': item.centerName,
            'Tarea': item.job!.customName || item.job!.type,
            'Inicio': item.job!.startTime,
            'Fin': item.job!.isFinished && item.job!.actualEndTime ? item.job!.actualEndTime : item.job!.endTime,
            'Duración (h)': duration.toFixed(2),
            'Estado': item.job!.isFinished ? 'FINALIZADA' : 'PENDIENTE'
        };
    });
    const wsDetailed = XLSX.utils.json_to_sheet(detailedData);
    XLSX.utils.book_append_sheet(wb, wsDetailed, "Detalle Actividad Operarios");

    const fileName = `Informe_Completo_${formatDateForExcel(startDate).replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const exportActivityList = () => {
    const wb = XLSX.utils.book_new();
    const detailedData = flattenedActivity.map(item => {
        if (item.isAbsence) {
            return {
                'Fecha': formatDateForExcel(item.date),
                'Código Operario': item.worker.code,
                'Nombre Operario': item.worker.name,
                'Cliente': 'AUSENCIA',
                'Sede': '-',
                'Tarea': item.absenceType,
                'Horario': '-',
                'Estado': 'AUSENCIA'
            };
        }
        const endTime = (item.job!.isFinished && item.job!.actualEndTime ? item.job!.actualEndTime : item.job!.endTime);
        return {
            'Fecha': formatDateForExcel(item.date),
            'Código Operario': item.worker.code,
            'Nombre Operario': item.worker.name,
            'Cliente': item.clientName,
            'Sede': item.centerName,
            'Tarea': item.job!.customName || item.job!.type,
            'Horario': `${item.job!.startTime} - ${endTime}`,
            'Estado': item.job!.isFinished ? 'FINALIZADA' : 'PENDIENTE'
        };
    });
    const wsDetailed = XLSX.utils.json_to_sheet(detailedData);
    XLSX.utils.book_append_sheet(wb, wsDetailed, "Listado Operarios");
    XLSX.writeFile(wb, `Listado_Actividad_${startDate}.xlsx`);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50 flex flex-col h-full custom-scrollbar">
      
      <div className="bg-white border-b border-slate-200 px-8 py-6 sticky top-0 z-20 shadow-sm">
         <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 text-white">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">Análisis Operativo</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Estadísticas y Rendimiento</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                
                <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <CalendarDays className="w-4 h-4 text-slate-400" />
                    <div className="flex items-center gap-2">
                      <input type="date" className="text-[10px] font-bold text-slate-700 bg-transparent outline-none uppercase cursor-pointer" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                      <ArrowRight className="w-3 h-3 text-slate-300" />
                      <input type="date" className="text-[10px] font-bold text-slate-700 bg-transparent outline-none uppercase cursor-pointer" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                </div>

                <div className="w-px h-8 bg-slate-200 mx-1" />

                <div className="relative group">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  <select 
                      className="pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-700 outline-none focus:border-blue-400 hover:border-blue-300 transition-all appearance-none cursor-pointer min-w-[140px]"
                      value={selectedClientId}
                      onChange={(e) => { setSelectedClientId(e.target.value); setSelectedCenterId('all'); }}
                  >
                    <option value="all">Todos los Clientes</option>
                    {planning.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300 pointer-events-none" />
                </div>

                <div className={`relative group ${selectedClientId === 'all' ? 'opacity-50 pointer-events-none' : ''}`}>
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  <select 
                      className="pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-700 outline-none focus:border-blue-400 hover:border-blue-300 transition-all appearance-none cursor-pointer min-w-[140px]"
                      value={selectedCenterId}
                      onChange={(e) => setSelectedCenterId(e.target.value)}
                      disabled={selectedClientId === 'all'}
                  >
                    <option value="all">Todas las Sedes</option>
                    {selectedClient?.centers.map(ct => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
                  </select>
                  <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300 pointer-events-none" />
                </div>

                <div className="w-px h-8 bg-slate-200 mx-1" />

                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  <select 
                      className="pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-700 outline-none focus:border-blue-400 hover:border-blue-300 transition-all appearance-none cursor-pointer min-w-[140px]"
                      value={selectedWorkerId}
                      onChange={(e) => setSelectedWorkerId(e.target.value)}
                  >
                    <option value="all">Todos los Operarios</option>
                    {sortedWorkers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                  <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300 pointer-events-none" />
                </div>

              </div>

              <button onClick={exportStatsToExcel} className="bg-green-50 text-green-700 border border-green-200 p-3 rounded-2xl hover:bg-green-600 hover:text-white transition-all shadow-sm group" title="Descargar Informe Completo (KPI + Listados)">
                <FileSpreadsheet className="w-5 h-5" />
              </button>
            </div>
         </div>
      </div>

      <div className="p-2">
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mb-2">
           
           <div onClick={() => {setShowCancelledDetails(false); setShowFuelDetails(false);}} className={`bg-white rounded-[12px] p-2 border shadow-sm relative overflow-hidden group hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer ${!showCancelledDetails && !showFuelDetails && selectedWorkerId === 'all' ? 'border-blue-200 ring-2 ring-blue-50' : 'border-slate-100'}`}>
              <div className="absolute right-0 top-0 w-32 h-32 bg-blue-50 rounded-full -mr-10 -mt-10 group-hover:bg-blue-100 transition-colors" />
              <div className="relative z-10 flex items-start justify-between">
                <div className="flex-1">
                  {selectedWorkerId === 'all' ? (
                      <>
                          <h3 className="text-2xl font-[900] text-slate-900 mb-1">{stats.totalUniqueWorkers}</h3>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operarios Totales</p>
                      </>
                  ) : (
                      <>
                          <h3 className="text-2xl font-[900] text-slate-900 mb-1">{stats.activeDays}</h3>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Días Trabajados</p>
                      </>
                  )}
                </div>
                <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                  {selectedWorkerId === 'all' ? <Users className="w-4 h-4" /> : <CalendarDays className="w-4 h-4" />}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                 <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase">
                     {selectedWorkerId === 'all' ? 'Recuento Único' : 'En periodo'}
                 </span>
              </div>
           </div>

           <div onClick={() => {setShowCancelledDetails(false); setShowFuelDetails(false); setShowSitePresence(!showSitePresence);}} className={`bg-white rounded-[12px] p-2 border shadow-sm relative overflow-hidden group hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer ${showSitePresence ? 'border-green-300 ring-2 ring-green-50' : 'border-slate-100'}`}>
              <div className="absolute right-0 top-0 w-32 h-32 bg-green-50 rounded-full -mr-10 -mt-10 group-hover:bg-green-100 transition-colors" />
              <div className="relative z-10 flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-2xl font-[900] text-slate-900 mb-1">
                    {sitePresenceStats.totalDays}
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Horas por Sede</p>
                </div>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-sm transition-colors ${showSitePresence ? 'bg-green-600 text-white' : 'bg-white text-green-600'}`}>
                  {showSitePresence ? <MapPin className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                 <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-colors ${showSitePresence ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700'}`}>
                    {showSitePresence ? 'Ver Resumen' : 'Análisis Diario'}
                 </span>
              </div>
           </div>

           <div className="bg-white rounded-[12px] p-2 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
              <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-50 rounded-full -mr-10 -mt-10 group-hover:bg-emerald-100 transition-colors" />
              <div className="relative z-10 flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-2xl font-[900] text-slate-900 mb-1">
                    {stats.totalManHours.toLocaleString('es-ES', { maximumFractionDigits: 2 })} h
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Horas {selectedWorkerId === 'all' ? 'Globales' : 'Trabajador'}</p>
                </div>
                <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                 <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase">Realizadas</span>
              </div>
           </div>

           <div onClick={() => {setShowCancelledDetails(!showCancelledDetails); setShowFuelDetails(false);}} className={`bg-white rounded-[12px] p-2 border shadow-sm relative overflow-hidden group hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer ${showCancelledDetails ? 'border-red-300 ring-2 ring-red-50' : 'border-slate-100'}`}>
              <div className="absolute right-0 top-0 w-32 h-32 bg-red-50 rounded-full -mr-10 -mt-10 group-hover:bg-red-100 transition-colors" />
              <div className="relative z-10 flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-2xl font-[900] text-slate-900 mb-1">
                    {cancelledJobs.length}
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Servicios Anulados</p>
                </div>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-sm transition-colors ${showCancelledDetails ? 'bg-red-600 text-white' : 'bg-white text-red-600'}`}>
                  {showCancelledDetails ? <X className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                 <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-colors ${showCancelledDetails ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700'}`}>
                    {showCancelledDetails ? 'Ver Detalle' : `Tasa: ${cancellationRate}%`}
                 </span>
              </div>
           </div>

           <div onClick={() => {setShowFuelDetails(!showFuelDetails); setShowCancelledDetails(false);}} className={`bg-white rounded-[12px] p-2 border shadow-sm relative overflow-hidden group hover:shadow-xl hover:scale-[1.02] transition-all duration-150 cursor-pointer ${showFuelDetails ? 'border-amber-300 ring-2 ring-amber-50' : 'border-slate-100'}`}>
              <div className="absolute right-0 top-0 w-32 h-32 bg-amber-50 rounded-full -mr-10 -mt-10 group-hover:bg-amber-100 transition-colors" />
              <div className="relative z-10 flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-2xl font-[900] text-slate-900 mb-1">
                    {fuelRecordsInScope.length}
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Repostajes</p>
                  <div className="mt-1">
                    <h4 className="text-lg font-[900] text-amber-600">
                      {fuelRecordsInScope.reduce((sum, record) => sum + record.cost, 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </h4>
                    <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Total Gasto Combustible</p>
                  </div>
                </div>
                <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-amber-600 shadow-sm">
                  <Fuel className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                 <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-colors ${showFuelDetails ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700'}`}>
                    {showFuelDetails ? 'Ver Detalle' : `${fuelRecordsInScope.length} registros`}
                 </span>
              </div>
           </div>

        </div>

        {showSitePresence ? (
           <div className="bg-white rounded-[32px] border border-green-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
              <div className="p-8 border-b border-green-50 bg-green-50/30 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
                      <MapPin className="w-6 h-6" />
                   </div>
                   <div>
                      <h3 className="text-lg font-black text-green-900 uppercase italic">Análisis de Horas por Sede</h3>
                      <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Desglose diario de presencia en cada sede</p>
                   </div>
                </div>
                <button onClick={() => setShowSitePresence(false)} className="p-2 hover:bg-green-100 rounded-xl text-green-400 hover:text-green-700 transition-colors">
                   <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-xl border border-green-200">
                    <MapPin className="w-4 h-4 text-green-600" />
                    <select 
                        className="text-[10px] font-bold text-green-700 bg-transparent outline-none uppercase cursor-pointer"
                        value={selectedSiteId}
                        onChange={(e) => setSelectedSiteId(e.target.value)}
                    >
                      <option value="all">Todas las Sedes</option>
                      {sitePresenceStats.sites
                        .sort((a, b) => a.siteName.localeCompare(b.siteName))
                        .map(site => (
                        <option key={site.siteId} value={site.siteId}>{site.siteName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                   <table className="w-full text-left">
                      <thead>
                         <tr className="bg-green-50/50 border-b border-green-100">
                            <th className="px-6 py-4 text-[10px] font-black text-green-400 uppercase tracking-widest">Sede</th>
                            <th className="px-6 py-4 text-[10px] font-black text-green-400 uppercase tracking-widest text-center">Total Horas</th>
                            <th className="px-6 py-4 text-[10px] font-black text-green-400 uppercase tracking-widest text-center">Total Operarios</th>
                            <th className="px-6 py-4 text-[10px] font-black text-green-400 uppercase tracking-widest text-center">Días Activos</th>
                            <th className="px-6 py-4 text-[10px] font-black text-green-400 uppercase tracking-widest text-center">Media Horas/Día</th>
                            <th className="px-6 py-4 text-[10px] font-black text-green-400 uppercase tracking-widest text-center"></th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-green-50">
                         {sitePresenceStats.sites
                            .filter(site => selectedSiteId === 'all' || site.siteId === selectedSiteId)
                            .length > 0 ? (
                            sitePresenceStats.sites
                               .filter(site => selectedSiteId === 'all' || site.siteId === selectedSiteId)
                               .map(site => (
                                  <React.Fragment key={site.siteId}>
                                     <tr className="hover:bg-green-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                           <div className="flex items-center gap-2">
                                              <Building2 className="w-4 h-4 text-green-600" />
                                              <span className="text-xs font-black text-slate-900">{site.siteName}</span>
                                           </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                           <span className="inline-flex items-center justify-center px-3 py-1 bg-green-100 text-green-700 rounded-lg font-black text-xs">
                                              {site.totalHours.toFixed(1)} h
                                           </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                           <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-700 font-black text-xs">
                                              {site.totalWorkers}
                                           </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                           <span className="inline-flex items-center justify-center px-3 py-1 bg-blue-100 text-blue-700 rounded-lg font-black text-xs">
                                              {site.totalDays}
                                           </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                           <span className="inline-flex items-center justify-center px-3 py-1 bg-purple-100 text-purple-700 rounded-lg font-black text-xs">
                                              {site.totalDays > 0 ? (site.totalHours / site.totalDays).toFixed(1) : '0.0'} h
                                           </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                           <button
                                              onClick={() => toggleSiteExpansion(site.siteId)}
                                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                                           >
                                              {expandedSites[site.siteId] ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                           </button>
                                        </td>
                                     </tr>
                                     {expandedSites[site.siteId] && (
                                        <tr>
                                           <td colSpan={6} className="px-6 py-4 bg-green-50/50">
                                              <div className="space-y-3">
                                                 <h4 className="text-xs font-black text-green-700 uppercase tracking-widest mb-3">Detalle de Operarios</h4>
                                                 {siteWorkersDetails[site.siteId]?.length > 0 ? (
                                                    <div className="space-y-2">
                                                       {siteWorkersDetails[site.siteId]
                                                          .sort((a, b) => a.date.localeCompare(b.date) || a.workerName.localeCompare(b.workerName))
                                                          .map((detail, index) => (
                                                             <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-100">
                                                                <div className="flex items-center gap-3">
                                                                   <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                                                      <User className="w-4 h-4 text-green-600" />
                                                                   </div>
                                                                   <div>
                                                                      <p className="text-xs font-black text-slate-900">{detail.workerName}</p>
                                                                      <p className="text-[9px] text-slate-500">{detail.date}</p>
                                                                   </div>
                                                                </div>
                                                                <div className="flex items-center gap-4">
                                                                   <div className="text-right">
                                                                      <p className="text-[9px] text-slate-500">Horario</p>
                                                                      <p className="text-xs font-black text-slate-900">{detail.startTime} - {detail.endTime}</p>
                                                                   </div>
                                                                   <div className="text-right">
                                                                      <p className="text-[9px] text-slate-500">Horas</p>
                                                                      <p className="text-xs font-black text-green-700">{detail.hoursAtSite.toFixed(1)}h</p>
                                                                   </div>
                                                                </div>
                                                             </div>
                                                          ))}
                                                    </div>
                                                 ) : (
                                                    <p className="text-center text-slate-400 text-xs font-black">No hay operarios asignados a esta sede en el periodo seleccionado</p>
                                                 )}
                                              </div>
                                           </td>
                                        </tr>
                                     )}
                                  </React.Fragment>
                               ))
                         ) : (
                            <tr>
                               <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                  <MapPin className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                                  <p className="font-black uppercase text-xs tracking-widest">No hay datos de presencia en este periodo</p>
                               </td>
                            </tr>
                         )}
                      </tbody>
                   </table>
                </div>
              </div>
           </div>
        ) : (
           <div className="bg-white rounded-[32px] border border-red-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
              <div className="p-8 border-b border-red-50 bg-red-50/30 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
                      <FileText className="w-6 h-6" />
                   </div>
                   <div>
                      <h3 className="text-lg font-black text-red-900 uppercase italic">Registro de Anulaciones</h3>
                      <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Detalle de servicios cancelados en el periodo</p>
                   </div>
                </div>
                <button onClick={() => setShowCancelledDetails(false)} className="p-2 hover:bg-red-100 rounded-xl text-red-400 hover:text-red-700 transition-colors">
                   <X className="w-6 h-6" />
                </button>
              </div>

              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="bg-red-50/50 border-b border-red-100">
                          <th className="px-6 py-4 text-[10px] font-black text-red-400 uppercase tracking-widest">Fecha</th>
                          <th className="px-6 py-4 text-[10px] font-black text-red-400 uppercase tracking-widest">Horario</th>
                          <th className="px-6 py-4 text-[10px] font-black text-red-400 uppercase tracking-widest">Cliente / Sede</th>
                          <th className="px-6 py-4 text-[10px] font-black text-red-400 uppercase tracking-widest">Servicio Contratado</th>
                          <th className="px-6 py-4 text-[10px] font-black text-red-400 uppercase tracking-widest text-center">Operarios</th>
                          <th className="px-6 py-4 text-[10px] font-black text-red-400 uppercase tracking-widest">Motivo</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-red-50">
                       {cancelledJobs.length > 0 ? (
                          cancelledJobs.map(job => {
                             const client = planning.clients.find(c => c.id === job.clientId);
                             const center = client?.centers.find(ct => ct.id === job.centerId);
                             return (
                                <tr key={job.id} className="hover:bg-red-50/30 transition-colors">
                                   <td className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                         <CalendarDays className="w-4 h-4 text-red-300" />
                                         <span className="text-xs font-black text-slate-700">{formatDateDMY(job.date)}</span>
                                      </div>
                                   </td>
                                   <td className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                         <Clock className="w-4 h-4 text-red-300" />
                                         <span className="text-xs font-bold text-slate-500">{job.startTime} - {job.endTime}</span>
                                      </div>
                                   </td>
                                   <td className="px-6 py-4">
                                      <div>
                                         <p className="text-xs font-black text-slate-900">{client?.name || 'Desconocido'}</p>
                                         <p className="text-[9px] font-bold text-slate-400 uppercase">{center?.name || 'Sede Principal'}</p>
                                      </div>
                                   </td>
                                   <td className="px-6 py-4">
                                      <span className="text-xs font-bold text-slate-600 uppercase">{job.customName || job.type}</span>
                                   </td>
                                   <td className="px-6 py-4 text-center">
                                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 text-red-700 font-black text-xs">
                                         {job.requiredWorkers}
                                      </span>
                                   </td>
                                   <td className="px-6 py-4 max-w-xs">
                                      {job.cancellationReason ? (
                                         <p className="text-[10px] font-medium text-red-600 bg-red-50 p-2 rounded-lg italic">
                                            "{job.cancellationReason}"
                                         </p>
                                      ) : (
                                         <span className="text-[10px] text-slate-300 italic">Sin motivo especificado</span>
                                      )}
                                   </td>
                                </tr>
                             );
                          })
                       ) : (
                          <tr>
                             <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                                <p className="font-black uppercase text-xs tracking-widest">No hay anulaciones en este periodo</p>
                             </td>
                          </tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        )}

        {!showCancelledDetails && !showFuelDetails && !showSitePresence && (
            <div className="bg-white rounded-[32px] border border-blue-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                <div className="p-8 border-b border-blue-50 bg-blue-50/30 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-blue-900 uppercase italic">
                                {selectedWorkerId === 'all' ? 'Registro Actividad Operarios' : 'Historial Individual (Tareas y Ausencias)'}
                            </h3>
                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                                {selectedWorkerId === 'all' 
                                    ? 'Listado detallado de todas las asignaciones diarias' 
                                    : `${selectedWorker?.name} (${selectedWorker?.code})`
                                }
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={exportActivityList}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white rounded-xl transition-all font-black text-[10px] uppercase tracking-widest shadow-sm"
                    >
                        <Download className="w-4 h-4" /> Exportar Listado
                    </button>
                </div>

                <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                    <table className="w-full text-left relative">
                        <thead className="sticky top-0 z-10">
                        <tr className="bg-blue-50 border-b border-blue-100">
                            <th className="px-6 py-4 text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-50">Fecha</th>
                            <th className="px-6 py-4 text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-50">Operario</th>
                            <th className="px-6 py-4 text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-50">Cliente / Sede</th>
                            <th className="px-6 py-4 text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-50">Tarea / Ausencia</th>
                            <th className="px-6 py-4 text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-50">Horario / Nota</th>
                            <th className="px-6 py-4 text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-50 text-right">Estado</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-50">
                        {flattenedActivity.map(item => {
                            if (item.isAbsence) {
                               return (
                                <tr key={item.id} className="bg-amber-50/40 hover:bg-amber-100/50 transition-colors italic">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <CalendarDays className="w-4 h-4 text-amber-400" />
                                            <span className="text-xs font-black text-slate-700">{formatDateDMY(item.date)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded bg-amber-100 flex items-center justify-center text-[9px] font-black text-amber-600">
                                                {item.worker.code}
                                            </div>
                                            <span className="text-xs font-bold text-slate-700">{item.worker.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[10px] font-black text-amber-600 uppercase bg-white px-2 py-1 rounded border border-amber-100">AUSENCIA</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                           {item.absenceType?.includes('BAJA') ? <Stethoscope className="w-3 h-3 text-red-400" /> : <Briefcase className="w-3 h-3 text-blue-400" />}
                                           <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{item.absenceType}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-[10px] text-slate-500 font-medium truncate max-w-xs" title={item.noteText}>{item.noteText || '-'}</p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-[9px] font-black text-amber-700 bg-amber-100 px-2 py-1 rounded-lg uppercase">REGISTRADA</span>
                                    </td>
                                </tr>
                               );
                            }
                            
                            const endTime = (item.job!.isFinished && item.job!.actualEndTime) ? item.job!.actualEndTime : item.job!.endTime;
                            return (
                                <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <CalendarDays className="w-4 h-4 text-blue-300" />
                                            <span className="text-xs font-black text-slate-700">{formatDateDMY(item.date)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-600">
                                                {item.worker.code}
                                            </div>
                                            <span className="text-xs font-bold text-slate-700 truncate max-w-[150px]">{item.worker.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="text-xs font-black text-slate-900">{item.clientName}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">{item.centerName}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-bold text-slate-700 uppercase bg-slate-100 px-2 py-1 rounded-lg truncate max-w-[150px] block">
                                            {item.job!.customName || item.job!.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-3 h-3 text-slate-300" />
                                            <span className="text-xs font-bold text-slate-500">{item.job!.startTime} - {endTime}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {item.job!.isFinished ? (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 uppercase">
                                                <CheckCircle2 className="w-3 h-3" /> Finalizada
                                            </span>
                                        ) : (
                                            <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-lg uppercase">
                                                Pendiente
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {flattenedActivity.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                    <Briefcase className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                                    <p className="font-black uppercase text-xs tracking-widest">No hay actividad registrada con los filtros actuales</p>
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {showFuelDetails ? (
           <div className="bg-white rounded-[32px] border border-amber-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
              <div className="p-8 border-b border-amber-50 bg-amber-50/30 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                      <Fuel className="w-6 h-6" />
                   </div>
                   <div>
                      <h3 className="text-lg font-black text-amber-900 uppercase italic">Registro de Repostajes</h3>
                      <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Detalle de combustible en el periodo</p>
                   </div>
                </div>
                <button onClick={() => setShowFuelDetails(false)} className="p-2 hover:bg-amber-100 rounded-xl text-amber-400 hover:text-amber-700 transition-colors">
                   <X className="w-6 h-6" />
                </button>
              </div>

              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="bg-amber-50/50 border-b border-amber-100">
                          <th className="px-6 py-4 text-[10px] font-black text-amber-400 uppercase tracking-widest">Fecha</th>
                          <th className="px-6 py-4 text-[10px] font-black text-amber-400 uppercase tracking-widest">Operario</th>
                          <th className="px-6 py-4 text-[10px] font-black text-amber-400 uppercase tracking-widest">Litros</th>
                          <th className="px-6 py-4 text-[10px] font-black text-amber-400 uppercase tracking-widest">Coste</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-50">
                       {fuelRecordsInScope.length > 0 ? (
                          fuelRecordsInScope.map(record => {
                             const worker = planning.workers.find(w => w.id === record.workerId);
                             return (
                                <tr key={record.id} className="hover:bg-amber-50/30 transition-colors">
                                   <td className="px-6 py-4">
                                      <p className="text-xs font-black text-slate-900">{formatDateDMY(record.date)}</p>
                                   </td>
                                   <td className="px-6 py-4">
                                      <p className="text-xs font-black text-slate-900">{worker?.name || 'Desconocido'}</p>
                                      <p className="text-[9px] font-bold text-slate-400 uppercase">{worker?.code || 'N/A'}</p>
                                   </td>
                                   <td className="px-6 py-4 text-center">
                                      <span className="inline-flex items-center justify-center px-3 py-1 bg-amber-100 text-amber-700 font-black text-xs rounded-lg">
                                         {record.liters} L
                                      </span>
                                   </td>
                                   <td className="px-6 py-4">
                                      <span className="inline-flex items-center justify-center px-3 py-1 bg-green-100 text-green-700 font-black text-xs rounded-lg">
                                         {record.cost.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                      </span>
                                   </td>
                                </tr>
                             );
                          })
                       ) : (
                          <tr>
                             <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                                <p className="font-black uppercase text-xs tracking-widest">No hay repostajes en este periodo</p>
                             </td>
                          </tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        ) : null}

      </div>
    </div>
  );
};

export default StatisticsPanel;
