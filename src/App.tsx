import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { 
  CalendarIcon, Users, Building2, Car, HeartPulse, Settings, Download, Upload, Cloud, CloudOff, AlertCircle, CheckCircle2, X, ChevronLeft, ChevronRight, CalendarDays, Search, Plus, Trash2, Edit2, Copy, FileText, Loader2, LayoutGrid, Table, ListTodo, Bell, MessageSquare, Send, Filter, ArrowRight, Clock, User, Mail, Phone, MapPin, Briefcase, Star, TrendingUp, Activity, DownloadCloud, Database, RotateCcw, BarChart3, MessageCircle, Calendar, CheckCircle, XCircle, GraduationCap, FileSpreadsheet, ChevronDown, Sparkles, ClipboardList, Hash, Save, StickyNote, Fuel, AlertTriangle, RefreshCw, Camera 
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useSupabaseData } from './hooks/useSupabaseData';
import LoginScreen from './components/LoginScreen';
import WorkerSidebar from './components/WorkerSidebar';
import PlanningBoard from './components/PlanningBoard';
import StatisticsPanel from './components/StatisticsPanel';
import CompactPlanningView from './components/CompactPlanningView';
import FleetManager from './components/FleetManager';
import { PlanningState, Worker, Client, Job, Holiday, Vehicle, FuelRecord, DailyNote, MedicalCourse, Course, StandardTask, VehicleAssignment, ContractType, WorkerStatus, WorkerStatusRecord, ViewType, JobType, NoteType, WorkerControlData, WorkerControl } from './lib/types';
import { formatDateDMY, isHoliday, getWorkerDisplayName, getCurrentWorkerStatus, getCurrentWorkerStatusForDate, getNextStatusChange, addOrUpdateStatusRecord, removeStatusRecord, validateAssignment, getWorkerSSFormat } from './lib/utils';
import { WORKER_ROLES } from './lib/constants';

// Funciones para Supabase (Opción B - JSONB) - ELIMINADAS
// Ahora usamos el hook useSupabaseData

// Función para formatear fechas en formato DD/MM/YYYY
const formatDateEuropean = (dateStr: string) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}-${month}-${year}`;
};

// Función para mostrar día de la semana + fecha
const formatDateWithDay = (dateStr: string) => {
  const date = new Date(dateStr);
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dayName = days[date.getDay()];
  const formattedDate = formatDateEuropean(dateStr);
  return `${dayName}, ${formattedDate}`;
};
import * as XLSX from 'xlsx';

interface SimpleCalendarSelectorProps {
  currentDate: string;
  customHolidays: Holiday[];
  onSelect: (date: string) => void;
  onClose: () => void;
  jobs: Job[];
}

const SimpleCalendarSelector: React.FC<SimpleCalendarSelectorProps> = ({ currentDate, customHolidays, onSelect, onClose, jobs }) => {
  const [viewDate, setViewDate] = useState(new Date(currentDate));

  useEffect(() => {
    setViewDate(new Date(currentDate));
  }, [currentDate]);
  
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const startOffset = (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1); 
  
  const prevMonthDays = daysInMonth(viewDate.getFullYear(), viewDate.getMonth() - 1);
  const currentMonthDays = daysInMonth(viewDate.getFullYear(), viewDate.getMonth());
  
  const dayElements = [];
  for (let i = startOffset - 1; i >= 0; i--) {
    dayElements.push(<div key={`prev-${i}`} className="h-10 flex items-center justify-center text-slate-200 text-[10px] font-bold">{prevMonthDays - i}</div>);
  }
  
  for (let i = 1; i <= currentMonthDays; i++) {
    const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const isSelected = currentDate === dateStr;
    const isToday = new Date().toISOString().split('T')[0] === dateStr;
    const hasJobs = jobs.some(j => j.date === dateStr);
    const holiday = isHoliday(dateStr, customHolidays);
    
    dayElements.push(
      <button 
        key={i} 
        onClick={() => onSelect(dateStr)}
        className={`h-10 rounded-lg flex flex-col items-center justify-center transition-all relative group ${
          isSelected ? 'bg-slate-900 text-white shadow-md' : 
          holiday ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-100' :
          'hover:bg-slate-100 text-slate-700'
        }`}
        title={holiday ? holiday.name : undefined}
      >
        <span className={`text-xs font-black ${isToday && !isSelected ? 'text-blue-600' : ''}`}>{i}</span>
        <div className="flex gap-0.5 mt-0.5">
          {hasJobs && (
            <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-400'}`} />
          )}
          {holiday && (
            <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-amber-400'}`} />
          )}
        </div>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 border border-slate-200" onClick={e => e.stopPropagation()}>
         <div className="flex justify-between items-center mb-4">
             <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider">Seleccionar Fecha</h3>
             <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors"><X className="w-4 h-4 text-slate-400" /></button>
         </div>
         <div className="flex justify-between items-center mb-4 px-2">
            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-1 hover:bg-slate-100 rounded-lg"><ChevronLeft className="w-4 h-4 text-slate-500" /></button>
            <span className="font-black capitalize text-slate-900 text-sm">{viewDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}</span>
            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-1 hover:bg-slate-100 rounded-lg"><ChevronRight className="w-4 h-4 text-slate-500" /></button>
         </div>
         <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['L','M','X','J','V','S','D'].map(d => <span key={d} className="text-[9px] font-black text-slate-400 uppercase">{d}</span>)}
         </div>
         <div className="grid grid-cols-7 gap-1 mb-4">
             {dayElements}
         </div>
         <div className="flex flex-col gap-2">
             <button onClick={() => { onSelect(new Date().toISOString().split('T')[0]); onClose(); }} className="w-full py-2 bg-blue-50 text-blue-600 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-colors">Ir a Hoy</button>
         </div>
      </div>
    </div>
  );
};

// ─── App Component ─────────────────────────────────────────────────────────────
const App: React.FC = () => {
  // ── Autenticación ──────────────────────────────────────────────────────────
  const [session, setSession] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    (supabase.auth as any).getSession().then(({ data: { session } }: any) => {
      setSession(session);
      setIsAuthLoading(false);
    });
    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange((_event: any, session: any) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await (supabase.auth as any).signOut();
  };

  // ── Hook de datos granular (v2) ────────────────────────────────────────────
  const {
    planning, setPlanning, dbStatus, isSaving,
    saveWorker: persistWorker,
    deleteWorker: persistDeleteWorker,
    saveClient: persistClient,
    deleteClient: persistDeleteClient,
    saveJob: persistJob,
    deleteJob: persistDeleteJob,
    saveStandardTask: persistStandardTask,
    deleteStandardTask: persistDeleteStandardTask,
    saveVehicle: persistVehicle,
    deleteVehicle: persistDeleteVehicle,
    saveVehicleAssignment: persistVehicleAssignment,
    deleteVehicleAssignment: persistDeleteVehicleAssignment,
    saveFuelRecord: persistFuelRecord,
    deleteFuelRecord: persistDeleteFuelRecord,
    saveDailyNote: persistDailyNote,
    deleteDailyNote: persistDeleteDailyNote,
    saveMedicalCourse: persistMedicalCourse,
    deleteMedicalCourse: persistDeleteMedicalCourse,
    reloadMedicalCoursesFromSupabase,
    saveCourse: persistCourse,
    deleteCourse: persistDeleteCourse,
    saveHoliday: persistHoliday,
    deleteHoliday: persistDeleteHoliday,
    saveWorkerControl, deleteWorkerControl,
    showNotification, notification,
  } = useSupabaseData();

  // ── Estado de UI ───────────────────────────────────────────────────────────
  const [view, setView] = useState<ViewType>('planning');
  const [viewMode, setViewMode] = useState<'day' | 'range'>('day');
  const [rangeStartDate, setRangeStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [rangeEndDate, setRangeEndDate] = useState(new Date().toISOString().split('T')[0]);

  const backupInputRef = useRef<HTMLInputElement>(null);
  const [draggedWorkerId, setDraggedWorkerId] = useState<string | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [workerTableSearch, setWorkerTableSearch] = useState('');
  const [showArchivedWorkers, setShowArchivedWorkers] = useState(false);
  const [workerAvailabilityFilter, setWorkerAvailabilityFilter] = useState<'all' | 'free' | 'assigned'>('all');
  const [workerContractFilter, setWorkerContractFilter] = useState<'all' | 'fixedDiscontinuous' | 'others'>('all');
  const [workerStatusFilter, setWorkerStatusFilter] = useState<{[key: string]: boolean}>({
    'DISPONIBLE': true, 'VACACIONES': true, 'BAJA_MEDICA': true, 'BAJA_PATERNIDAD': true, 'PERMISO_RETRIBUIDO': true, 'FALTA': true, 'REPOSO': true
  });
  const [medicalWorkerSearch, setMedicalWorkerSearch] = useState('');
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'job' | 'worker' | 'client' | 'task' | 'course', name: string } | null>(null);
  const [confirmDeleteCourse, setConfirmDeleteCourse] = useState<string | null>(null);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [showBackupModal, setShowBackupModal] = useState(false);
const [selectedMonth, setSelectedMonth] = useState(() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
});

// Estado para el mes de exportación de fijos discontinuos
const [fdExportMonth, setFdExportMonth] = useState(() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
});
const [workerControlData, setWorkerControlData] = useState<{[month: string]: {[workerId: string]: {[day: string]: string}}}>({});
const [selectedCell, setSelectedCell] = useState<{workerId: string, day: number} | null>(null);
const [workerFilter, setWorkerFilter] = useState('');
const [isSyncingFromGrid, setIsSyncingFromGrid] = useState(false);
const [vacationModal, setVacationModal] = useState<{workerId: string} | null>(null);
const [vacationModalData, setVacationModalData] = useState<{totalDays: number, carryOver: number}>({totalDays: 34, carryOver: 0});

// Función para actualizar el mes seleccionado
const handleMonthChange = (newMonth: string) => {
   setSelectedMonth(newMonth);
   // No limpiar datos, solo cambiar el mes
};

// Función para obtener días del mes según el mes seleccionado
const getMonthDays = (monthString: string) => {
   const [year, month] = monthString.split('-').map(Number);
   const daysInMonth = new Date(year, month, 0).getDate(); // Último día del mes
   return Array.from({ length: daysInMonth }, (_, i) => i + 1);
};

// Función para obtener día de la semana para una fecha
const getDayOfWeek = (year: number, month: number, day: number) => {
   return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
};

// Función para obtener el día actual
const getCurrentDay = () => {
  const now = new Date();
  return now.getDate();
};

// Función para obtener valor de celda
const getCellValue = (workerId: string, day: number) => {
   const monthData = workerControlData[selectedMonth] || {};
   const workerData = monthData[workerId] || {};
   return workerData[day] || '';
};

// Función para obtener anticipo de un trabajador en el mes
const getWorkerAdvance = (workerId: string) => {
   const advanceControl = planning.workerControls.find(c => 
      c.worker_id === workerId && 
      c.month === selectedMonth && 
      c.id.includes('advance')
   );
   return advanceControl?.advance || '';
};

// Función para guardar anticipo de un trabajador
const saveWorkerAdvance = async (workerId: string, advance: string) => {
   const advanceId = `${workerId}-${selectedMonth}-advance`;
   
   if (advance && advance.trim()) {
      // Limitar a 4 cifras máximo
      const numericAdvance = advance.replace(/[^0-9]/g, '');
      const finalAdvance = numericAdvance.slice(0, 4);
      
      await saveWorkerControl({
         id: advanceId,
         worker_id: workerId,
         date: `${selectedMonth}-99`, // Día 99 para indicar que no es un día real del mes
         value: 'ADV', // Valor especial para identificar anticipos pendientes
         month: selectedMonth,
         advance: finalAdvance
      });
      
      showNotification(`Anticipo de ${finalAdvance}€ guardado para ${planning.workers.find(w => w.id === workerId)?.name}`, 'success');
   } else {
      // Eliminar anticipo si está vacío
      await deleteWorkerControl(advanceId);
      showNotification('Anticipo eliminado', 'info');
   }
};

// Función para marcar anticipo como pagado
const markAdvanceAsPaid = async (workerId: string) => {
   const advanceId = `${workerId}-${selectedMonth}-advance`;
   const currentAdvance = getWorkerAdvance(workerId);
   
   if (currentAdvance && currentAdvance !== '0') {
      await saveWorkerControl({
         id: advanceId,
         worker_id: workerId,
         date: `${selectedMonth}-99`,
         value: 'ADV-PAID', // Cambiar a pagado
         month: selectedMonth,
         advance: currentAdvance
      });
      
      showNotification(`Anticipo marcado como pagado para ${planning.workers.find(w => w.id === workerId)?.name}`, 'success');
   }
};

// Función para desmarcar anticipo como pagado (volver a pendiente)
const markAdvanceAsUnpaid = async (workerId: string) => {
   const advanceId = `${workerId}-${selectedMonth}-advance`;
   const currentAdvance = getWorkerAdvance(workerId);
   
   if (currentAdvance && currentAdvance !== '0') {
      await saveWorkerControl({
         id: advanceId,
         worker_id: workerId,
         date: `${selectedMonth}-99`,
         value: 'ADV', // Cambiar a pendiente
         month: selectedMonth,
         advance: currentAdvance
      });
      
      showNotification(`Anticipo marcado como pendiente para ${planning.workers.find(w => w.id === workerId)?.name}`, 'info');
   }
};

// Función para verificar si el anticipo está pagado
const isAdvancePaid = (workerId: string): boolean => {
   const advanceId = `${workerId}-${selectedMonth}-advance`;
   const advanceControl = planning.workerControls.find(c => 
      c.worker_id === workerId && 
      c.month === selectedMonth && 
      c.date === `${selectedMonth}-99`
   );
   return advanceControl?.value === 'ADV-PAID';
};

// Función para actualizar valor de celda
const updateCellValue = async (workerId: string, day: number, value: string) => {
   // Validar si el día es festivo o fin de semana
   const [year, month] = selectedMonth.split('-').map(Number);
   const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
   const dayOfWeek = getDayOfWeek(year, month, day);
   const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Domingo=0, Sábado=6
   const holidayData = isHoliday(dateStr, planning.customHolidays);
   const isHolidayDay = !!holidayData;
   
   // Permitir B (baja médica) y P (paternidad) en festivos/fin de semana
   // Permitir V (vacaciones) solo en fines de semana, NO en festivos
   // Permitir horas (números) en festivos/fin de semana
   // Bloquear F (faltas), D (permiso), R (reposo) en festivos/fin de semana
   const isAllowedValue = value === 'B' || value === 'P' || (value === 'V' && isWeekend && !isHolidayDay);
   
   // Solo bloquear si realmente es fin de semana O festivo, pero permitir horas
   const isBlockedValue = (isWeekend || isHolidayDay) && (['F', 'D', 'R'].includes(value) || (value === 'V' && isHolidayDay));
   
   // Impedir guardar valores bloqueados en festivos o fines de semana
   if (isBlockedValue) {
      const context = isHolidayDay ? 'días festivos' : 'fines de semana';
      const reason = value === 'F' ? 'faltas' : value === 'V' ? 'vacaciones' : value === 'R' ? 'reposos' : value === 'D' ? 'permisos' : 'estados';
      showNotification(
         `No se pueden registrar ${reason} en ${context}`, 
         'warning'
      );
      setSelectedCell(null);
      return;
   }
   
   // Si es un número (horas), no cerrar modal inmediatamente
   const isNumeric = value && !isNaN(Number(value));
   
   if (!isNumeric) {
      // Para letras (V, B, P, etc.), cerrar modal inmediatamente para respuesta rápida
      setSelectedCell(null);
   }
   
   // Sincronizar con statusRecords
   await syncToStatusRecords(workerId, day, value);
   
   // Cerrar modal después de procesar si era un número
   if (isNumeric) {
      setSelectedCell(null);
   }
};

// Función para manejar clic en celda
const handleCellClick = (workerId: string, day: number) => {
   setSelectedCell({ workerId, day });
};

// Función para sincronizar celdas desde registros de estados
const syncFromStatusRecords = useCallback(async (showSummary: boolean = false) => {
   const [year, month] = selectedMonth.split('-').map(Number);
   const monthDays = getMonthDays(selectedMonth);

   // Cargar datos manuales (F, D, R, horas) desde Supabase
   const manualData: {[workerId: string]: {[day: number]: string}} = {};
   planning.workerControls
      .filter(control => control.month === selectedMonth && control.value !== 'ADV') // Excluir anticipos
      .forEach(control => {
         if (!manualData[control.worker_id]) {
            manualData[control.worker_id] = {};
         }
         const day = parseInt(control.date.split('-')[2], 10);
         // Solo procesar días válidos (1-31), excluir día 99 de anticipos
         if (day >= 1 && day <= 31) {
            manualData[control.worker_id][day] = control.value;
         }
      });

   // Construir datos de todos los operarios en un único objeto
   const newMonthData: {[workerId: string]: {[day: string]: string}} = {};

   planning.workers.forEach(worker => {
      const newWorkerData: {[day: string]: string} = {};

      monthDays.forEach(day => {
         const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
         const manualValue = manualData[worker.id]?.[day] || '';

         if (manualValue) {
            newWorkerData[day] = manualValue;
         } else {
            const currentStatus = getCurrentWorkerStatusForDate(worker, dateStr);
            let statusCode = '';
            switch(currentStatus.status) {
               case 'VACACIONES':
               case 'Vacaciones': statusCode = 'V'; break;
               case 'BAJA_MEDICA':
               case 'Baja Médica': statusCode = 'B'; break;
               case 'BAJA_PATERNIDAD':
               case 'Baja Paternidad': statusCode = 'P'; break;
               case 'PERMISO_RETRIBUIDO':
               case 'Permiso Retribuido': statusCode = 'D'; break;
               case 'FALTA':
               case 'Falta': statusCode = 'F'; break;
               case 'REPOSO':
               case 'Reposo': statusCode = 'R'; break;
               default: statusCode = ''; break;
            }
            newWorkerData[day] = statusCode;
         }
      });

      newMonthData[worker.id] = newWorkerData;
   });

   // Una sola actualización de estado con todos los datos
   setWorkerControlData(prev => ({
      ...prev,
      [selectedMonth]: newMonthData
   }));

   if (showSummary) {
      showNotification('Sincronización completada', 'success');
   }
}, [selectedMonth, planning.workers, planning.workerControls, showNotification]);

// Función para sincronizar cambios manuales del grid a statusRecords
const syncToStatusRecords = useCallback(async (workerId: string, day: number, value: string) => {
   console.log('🔄 Sincronizando cambio manual a statusRecords...');
   
   setIsSyncingFromGrid(true); // Activar bandera
   
   const worker = planning.workers.find(w => w.id === workerId);
   if (!worker) {
      console.error('❌ Worker no encontrado:', workerId);
      setIsSyncingFromGrid(false);
      return;
   }
   
   const [year, month] = selectedMonth.split('-').map(Number);
   const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
   
   // Verificar si es un número (horas)
   const isNumeric = value && !isNaN(Number(value));
   
   if (isNumeric) {
      // Es un número (horas) - actualizar directamente en el grid y guardar en Supabase
      setWorkerControlData(prev => {
         const monthData = prev[selectedMonth] || {};
         const workerData = monthData[workerId] || {};
         
         return {
            ...prev,
            [selectedMonth]: {
               ...monthData,
               [workerId]: {
                  ...workerData,
                  [day]: value
               }
            }
         };
      });
      
      // Guardar en Supabase usando el hook
      await saveWorkerControl({
         id: `${workerId}-${dateStr}`,
         worker_id: workerId,
         date: dateStr,
         value: value,
         month: selectedMonth
      });
      
      showNotification(`Horas "${value}" registradas para ${worker.name} el día ${day}`, 'success');
   } else {
      // Es una letra o vacío - procesar directamente en el grid
      // F, D, R son códigos manuales que se guardan en Supabase
      
      // Actualizar el grid con el nuevo valor
      setWorkerControlData(prev => {
         const monthData = prev[selectedMonth] || {};
         const workerData = monthData[workerId] || {};
         
         return {
            ...prev,
            [selectedMonth]: {
               ...monthData,
               [workerId]: {
                  ...workerData,
                  [day]: value
               }
            }
         };
      });
      
      // Guardar el valor original para la lógica de eliminación de tareas
      const originalValue = value;
      
      // Solo procesar como estado si es V, B, P, D, F, R
      let statusType: WorkerStatus | null = null;
      switch(value) {
         case 'V': statusType = WorkerStatus.VACACIONES; break;
         case 'B': statusType = WorkerStatus.BAJA_MEDICA; break;
         case 'P': statusType = WorkerStatus.BAJA_PATERNIDAD; break;
         case 'D': statusType = WorkerStatus.PERMISO_RETRIBUIDO; break;
         case 'F': statusType = WorkerStatus.FALTA; break;
         case 'R': statusType = WorkerStatus.REPOSO; break;
         default: statusType = null; break;
      }
      
      if (statusType) {
         // Paso 1: eliminar el día actual de cualquier registro que lo cubra (con división si está en el medio)
         let updatedWorker = removeStatusRecordForDate(worker, dateStr);

         // Paso 2: recopilar todos los días del mes con el mismo statusType leyendo
         // directamente de statusRecords (no del grid desactualizado)
         const sameStatusDays: number[] = [day];
         const monthDays = getMonthDays(selectedMonth);
         monthDays.forEach(d => {
            if (d === day) return;
            const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const s = getCurrentWorkerStatusForDate(updatedWorker, dStr);
            const sCode = s.status === WorkerStatus.VACACIONES ? 'V' :
                          s.status === WorkerStatus.BAJA_MEDICA ? 'B' :
                          s.status === WorkerStatus.BAJA_PATERNIDAD ? 'P' :
                          s.status === WorkerStatus.PERMISO_RETRIBUIDO ? 'D' :
                          s.status === WorkerStatus.FALTA ? 'F' :
                          s.status === WorkerStatus.REPOSO ? 'R' : '';
            if (sCode === value) sameStatusDays.push(d);
         });

         // Paso 3: eliminar los registros del statusType que pertenecen exclusivamente a este mes
         // (los que cruzan meses ya quedaron divididos en el Paso 1)
         const lastDayOfMonth = new Date(year, month, 0).getDate();
         const monthStart = `${selectedMonth}-01`;
         const monthEnd = `${selectedMonth}-${String(lastDayOfMonth).padStart(2, '0')}`;
         updatedWorker = {
            ...updatedWorker,
            statusRecords: (updatedWorker.statusRecords || []).filter(record => {
               if (record.status !== statusType) return true;
               // Mantener si empieza antes de este mes (es un registro cross-month ya recortado)
               if (record.startDate < monthStart) return true;
               // Mantener si termina después de este mes
               if ((record.endDate || record.startDate) > monthEnd) return true;
               // Eliminar si está completamente dentro de este mes
               return false;
            })
         };

         // Paso 4: crear rangos contiguos y añadirlos
         const ranges = createContiguousRanges(sameStatusDays, year, month);
         ranges.forEach(range => {
            updatedWorker = addOrUpdateStatusRecord(updatedWorker, statusType!, range.start, range.end, planning.customHolidays);
         });

         const currentStatus = getCurrentWorkerStatus(updatedWorker);
         const finalWorker = {
            ...updatedWorker,
            status: currentStatus.status,
            statusStartDate: currentStatus.startDate,
            statusEndDate: currentStatus.endDate
         };

         await persistWorker(finalWorker);

         // Si es F, R, D, eliminar de tareas de todos los días afectados por el estado
         if (['F', 'R', 'D'].includes(originalValue)) {
            let updatedJobs = 0;
            
            // Eliminar de tareas de todos los días en el rango
            for (const range of ranges) {
               const start = new Date(range.start);
               const end = new Date(range.end);
               
               // Recorrer cada día del rango
               for (let date = start; date <= end; date.setDate(date.getDate() + 1)) {
                  const dateStr = date.toISOString().split('T')[0];
                  const jobsForDay = planning.jobs.filter(job => job.date === dateStr && !job.isCancelled);
                  
                  for (const job of jobsForDay) {
                     if (job.assignedWorkerIds.includes(workerId)) {
                        // Eliminar operario de la tarea
                        const updatedJob = {
                           ...job,
                           assignedWorkerIds: job.assignedWorkerIds.filter(id => id !== workerId)
                        };
                        
                        // Actualizar en el estado local
                        setPlanning(prev => ({
                           ...prev,
                           jobs: prev.jobs.map(j => j.id === job.id ? updatedJob : j)
                        }));
                        
                        // Guardar en Supabase
                        await persistJob(updatedJob);
                        updatedJobs++;
                     }
                  }
               }
            }
            
            if (updatedJobs > 0) {
               const daysAffected = ranges.length === 1 
                  ? `del día ${formatDateDMY(ranges[0].start)}`
                  : `de ${ranges.length} días afectados`;
               showNotification(`${worker.name} eliminado de ${updatedJobs} tarea(s) ${daysAffected}`, 'info');
            }
         }

         if (ranges.length === 1) {
            showNotification(`Estado "${statusType}" registrado del ${formatDateDMY(ranges[0].start)} al ${formatDateDMY(ranges[0].end)} para ${worker.name}`, 'success');
         } else {
            showNotification(`Estado "${statusType}" registrado en ${ranges.length} periodos para ${worker.name}`, 'success');
         }
      } else if (value === '') {
         // Si se borra el código o está vacío, eliminar registros para ese día
         const updatedWorker = removeStatusRecordForDate(worker, dateStr);
         const currentStatus = getCurrentWorkerStatus(updatedWorker);
         const finalWorker = { 
            ...updatedWorker, 
            status: currentStatus.status, 
            statusStartDate: currentStatus.startDate, 
            statusEndDate: currentStatus.endDate 
         };
         
         await persistWorker(finalWorker);
         
         // Eliminar de Supabase también
         await deleteWorkerControl(`${workerId}-${dateStr}`);
         
         showNotification(`Estado eliminado para ${worker.name} el ${formatDateDMY(dateStr)}`, 'info');
      } else {
         // F, D, R - guardar en Supabase
         await saveWorkerControl({
            id: `${workerId}-${dateStr}`,
            worker_id: workerId,
            date: dateStr,
            value: value,
            month: selectedMonth
         });
         
         const label = value === 'F' ? 'Falta' : 
                      value === 'D' ? 'Permiso Retribuido' : 
                      value === 'R' ? 'Reposo Domiciliario' : value;
         showNotification(`${label} "${value}" registrado para ${worker.name} el día ${day}`, 'success');
      }
   }
   
   setIsSyncingFromGrid(false); // Desactivar bandera
}, [selectedMonth, planning.workers, persistWorker, showNotification, saveWorkerControl, deleteWorkerControl]);

// Función para crear rangos contiguos desde una lista de días
const createContiguousRanges = (days: number[], year: number, month: number): Array<{start: string, end: string}> => {
   if (days.length === 0) return [];
   
   // Ordenar días
   days.sort((a, b) => a - b);
   
   const ranges: Array<{start: string, end: string}> = [];
   let rangeStart = days[0];
   let rangeEnd = days[0];
   
   for (let i = 1; i < days.length; i++) {
      if (days[i] === rangeEnd + 1) {
         // Día contiguo, extender rango
         rangeEnd = days[i];
      } else {
         // Día no contiguo, cerrar rango actual y empezar nuevo
         const range = {
            start: `${year}-${String(month).padStart(2, '0')}-${String(rangeStart).padStart(2, '0')}`,
            end: `${year}-${String(month).padStart(2, '0')}-${String(rangeEnd).padStart(2, '0')}`
         };
         ranges.push(range);
         
         rangeStart = days[i];
         rangeEnd = days[i];
      }
   }
   
   // Añadir el último rango
   const finalRange = {
      start: `${year}-${String(month).padStart(2, '0')}-${String(rangeStart).padStart(2, '0')}`,
      end: `${year}-${String(month).padStart(2, '0')}-${String(rangeEnd).padStart(2, '0')}`
   };
   ranges.push(finalRange);
   
   return ranges;
};

// Función auxiliar para eliminar registros de estado para una fecha específica
// Divide el rango en dos si la fecha está en el medio
const removeStatusRecordForDate = (worker: Worker, dateStr: string): Worker => {
   if (!worker.statusRecords || worker.statusRecords.length === 0) {
      return worker;
   }

   const targetDate = new Date(dateStr + 'T00:00:00');

   const shiftDate = (date: Date, days: number): string => {
      const d = new Date(date);
      d.setDate(d.getDate() + days);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
   };

   const newRecords: WorkerStatusRecord[] = [];

   worker.statusRecords.forEach(record => {
      const recStart = new Date((record.startDate || dateStr) + 'T00:00:00');
      const recEnd = record.endDate ? new Date(record.endDate + 'T00:00:00') : recStart;

      if (targetDate < recStart || targetDate > recEnd) {
         // No cubre esta fecha, mantener intacto
         newRecords.push(record);
      } else if (record.startDate === dateStr && record.endDate === dateStr) {
         // Registro de un solo día, eliminar completamente
      } else if (record.startDate === dateStr) {
         // La fecha es el inicio del rango, acortar por la derecha
         newRecords.push({ ...record, startDate: shiftDate(targetDate, 1) });
      } else if (record.endDate === dateStr) {
         // La fecha es el fin del rango, acortar por la izquierda
         newRecords.push({ ...record, endDate: shiftDate(targetDate, -1) });
      } else {
         // La fecha está en el medio: dividir en dos registros
         newRecords.push({ ...record, endDate: shiftDate(targetDate, -1) });
         newRecords.push({ ...record, id: `${record.id}-${Date.now()}`, startDate: shiftDate(targetDate, 1) });
      }
   });

   return { ...worker, statusRecords: newRecords };
};

// Efecto para sincronizar automáticamente al cambiar de mes o vista
useEffect(() => {
   if (view === 'workerControl' && selectedMonth) {
      syncFromStatusRecords();
   }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [view, selectedMonth]);

// Efecto para sincronizar cuando cambian workers o workerControls (tiempo real entre usuarios)
useEffect(() => {
   if (view === 'workerControl' && selectedMonth && planning.workers.length > 0 && !isSyncingFromGrid) {
      syncFromStatusRecords();
   }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [planning.workers, planning.workerControls, isSyncingFromGrid]);

// Detector de visibilidad para identificar throttling
useEffect(() => {
   const handleVisibilityChange = () => {
      console.log(`👁️ [VISIBILITY] Cambio de estado: ${document.hidden ? 'BACKGROUND' : 'FOREGROUND'}`);
      if (!document.hidden) {
         console.log('👁️ [VISIBILITY] App volvió a primer plano - Forzando sincronización completa');
         
         // Forzar sincronización inmediata al volver
         if (view === 'workerControl' && selectedMonth && planning.workers.length > 0 && !isSyncingFromGrid) {
            syncFromStatusRecords();
         }
         
         // 🔄 FORZAR ACTUALIZACIÓN COMPLETA para vista de planificación
         if (view === 'planning') {
            console.log('🔄 [FORCE] Forzando actualización completa de planning');
            
            // Forzar una actualización del estado para romper cualquier cache de React
            setPlanning(prev => ({ ...prev }));
            
            // También forzar recarga de datos si hace más de 30 segundos en background
            const now = Date.now();
            const lastBackgroundTime = parseInt(localStorage.getItem('lastBackgroundTime') || '0');
            
            if (now - lastBackgroundTime > 30000) { // 30 segundos
               console.log('🔄 [FORCE] Tiempo en background > 30s, forzando recarga completa');
               window.location.reload(); // Recarga completa como último recurso
            }
         }
      } else {
         // Guardar timestamp cuando pasa a background
         localStorage.setItem('lastBackgroundTime', Date.now().toString());
      }
   };

   document.addEventListener('visibilitychange', handleVisibilityChange);
   
   return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
   };
}, [view, selectedMonth, planning.workers, planning.workerControls, isSyncingFromGrid, syncFromStatusRecords]);

// Función para obtener color de celda según valor
const getCellColor = (value: string) => {
   if (value === '') return 'bg-white border border-slate-200';
   
   // Si es un número (horas)
   if (!isNaN(Number(value))) {
      return 'bg-blue-50 text-blue-700 border border-blue-200';
   }
   
   const colors: {[key: string]: string} = {
      'B': 'bg-red-100 text-red-700',      // Baja médica
      'P': 'bg-orange-100 text-orange-700', // Baja paternidad
      'F': 'bg-yellow-100 text-yellow-700', // Falta asistencia (cambiado a amarillo)
      'D': 'bg-gray-100 text-gray-700',     // Permiso retribuido (cambiado a gris)
      'R': 'bg-sky-100 text-sky-700',      // Reposo domiciliario (cambiado a azul claro)
      'V': 'bg-green-100 text-green-700'    // Vacaciones (cambiado a verde)
   };
   return colors[value] || 'bg-slate-100 text-slate-700';
};

// Función para calcular totales por operario
const calculateWorkerTotals = (workerId: string) => {
   const monthData = workerControlData[selectedMonth] || {};
   const workerData = monthData[workerId] || {};
   const days = getMonthDays(selectedMonth);
   
   let totalHours = 0;
   let totalFaltas = 0;
   let totalBajaMedica = 0;
   let totalReposo = 0;
   let totalVacaciones = 0;
   
   days.forEach(day => {
      const value = workerData[day] || '';
      
      if (!isNaN(Number(value))) {
         totalHours += Number(value);
      } else {
         switch(value) {
            case 'F': totalFaltas++; break;
            case 'B': totalBajaMedica++; break;
            case 'R': totalReposo++; break;
            case 'V': totalVacaciones++; break;
            case 'D': totalVacaciones++; break; // Permiso retribuido cuenta como vacaciones
         }
      }
   });
   
   return { totalHours, totalFaltas, totalBajaMedica, totalReposo, totalVacaciones };
};

// Función para calcular totales generales de todos los operarios
const calculateGrandTotals = (month: string) => {
   const monthData = workerControlData[month] || {};
   const days = getMonthDays(month);
   
   let grandTotalHours = 0;
   let grandTotalFaltas = 0;
   let grandTotalBajaMedica = 0;
   let grandTotalReposo = 0;
   let grandTotalVacaciones = 0;
   
   // Iterar sobre todos los operarios del mes
   Object.keys(monthData).forEach(workerId => {
      const workerData = monthData[workerId] || {};
      
      days.forEach(day => {
         const value = workerData[day] || '';
         
         if (!isNaN(Number(value))) {
            grandTotalHours += Number(value);
         } else {
            switch(value) {
               case 'F': grandTotalFaltas++; break;
               case 'B': grandTotalBajaMedica++; break;
               case 'R': grandTotalReposo++; break;
               case 'V': grandTotalVacaciones++; break;
               case 'D': grandTotalVacaciones++; break; // Permiso retribuido cuenta como vacaciones
            }
         }
      });
   });
   
   return { 
      totalHours: grandTotalHours, 
      totalFaltas: grandTotalFaltas, 
      totalBajaMedica: grandTotalBajaMedica, 
      totalReposo: grandTotalReposo, 
      totalVacaciones: grandTotalVacaciones 
   };
};

// Función para calcular totales por día de todos los operarios
const calculateDayTotals = (day: number) => {
   const monthData = workerControlData[selectedMonth] || {};
   let dayTotalHours = 0;
   
   // Iterar sobre todos los operarios del mes
   Object.keys(monthData).forEach(workerId => {
      const workerData = monthData[workerId] || {};
      const value = workerData[day] || '';
      
      if (!isNaN(Number(value))) {
         dayTotalHours += Number(value);
      }
   });
   
   return { totalHours: dayTotalHours };
};

// ── Liquidación de horas ──────────────────────────────────────────────────
const isHoursSettled = (workerId: string): boolean => {
   const settledId = `${workerId}-${selectedMonth}-settled`;
   return planning.workerControls.some(c => c.id === settledId && c.value === 'L');
};

const toggleHoursSettled = async (workerId: string) => {
   const settledId = `${workerId}-${selectedMonth}-settled`;
   
   if (isHoursSettled(workerId)) {
      await deleteWorkerControl(settledId);
   } else {
      try {
         await saveWorkerControl({
            id: settledId,
            worker_id: workerId,
            date: `${selectedMonth}-31`, // Usar día 31 para evitar conflicto con días reales
            value: 'L',
            month: selectedMonth
         });
      } catch (error: any) {
         // Si es error de duplicado, eliminar directamente y crear nuevo registro
         if (error.message?.includes('duplicate key') || error.code === '23505') {
            try {
               // Eliminación directa sin pasar por el estado local
               await supabase
                  .from('worker_control_data')
                  .delete()
                  .eq('id', settledId);
               
               // Esperar un momento y crear el nuevo registro
               await new Promise(resolve => setTimeout(resolve, 500));
               
               await saveWorkerControl({
                  id: settledId,
                  worker_id: workerId,
                  date: `${selectedMonth}-31`, // Usar día 31 para evitar conflicto con días reales
                  value: 'L',
                  month: selectedMonth
               });
            } catch (directError: any) {
               throw directError;
            }
         } else {
            throw error;
         }
      }
   }
};

// Suma las horas de meses anteriores no liquidados para acumular el saldo
const calculateAccumulatedHours = (workerId: string): number => {
   // Buscar el último mes liquidado anterior al mes actual
   const settledMonths = planning.workerControls
      .filter(c => c.worker_id === workerId && c.id === `${workerId}-${c.month}-settled` && c.value === 'L' && c.month < selectedMonth)
      .map(c => c.month)
      .sort();
   const lastSettledMonth = settledMonths.length > 0 ? settledMonths[settledMonths.length - 1] : null;

   // Sumar horas numéricas de todos los meses no liquidados anteriores al actual
   let accumulated = 0;
   planning.workerControls
      .filter(c => {
         if (c.worker_id !== workerId) return false;
         if (c.id === `${workerId}-${c.month}-settled`) return false; // ignorar registros de liquidación
         if (c.month >= selectedMonth) return false;               // solo meses anteriores
         if (lastSettledMonth && c.month <= lastSettledMonth) return false; // excluir hasta el último cierre
         const num = parseFloat(c.value);
         return !isNaN(num);
      })
      .forEach(c => { accumulated += parseFloat(c.value); });

   return accumulated;
};

// ── Balance de vacaciones ──────────────────────────────────────────────────
const calculateVacationBalance = (workerId: string) => {
   const year = selectedMonth.split('-')[0];
   const worker = planning.workers.find(w => w.id === workerId);
   const config = worker?.vacationConfig?.[year] || { totalDays: 34, carryOver: 0 };

   // Contar días V del año desde statusRecords (fuente de verdad)
   let usedDays = 0;
   if (worker?.statusRecords) {
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;
      worker.statusRecords
         .filter(r => r.status === WorkerStatus.VACACIONES || r.status === WorkerStatus.PERMISO_RETRIBUIDO || (r.status as string) === 'Vacaciones' || (r.status as string) === 'VACACIONES')
         .forEach(r => {
            const start = new Date(Math.max(new Date(r.startDate + 'T00:00:00').getTime(), new Date(yearStart + 'T00:00:00').getTime()));
            const end = new Date(Math.min(new Date((r.endDate || r.startDate) + 'T00:00:00').getTime(), new Date(yearEnd + 'T00:00:00').getTime()));
            if (end >= start) {
               usedDays += Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
            }
         });
   }

   const entitled = config.totalDays + config.carryOver;
   const remaining = entitled - usedDays;
   return { totalDays: config.totalDays, carryOver: config.carryOver, entitled, usedDays, remaining };
};

const openVacationModal = (workerId: string) => {
   const year = selectedMonth.split('-')[0];
   const worker = planning.workers.find(w => w.id === workerId);
   const config = worker?.vacationConfig?.[year] || { totalDays: 34, carryOver: 0 };
   setVacationModalData({ totalDays: config.totalDays, carryOver: config.carryOver });
   setVacationModal({ workerId });
};

const saveVacationConfig = async () => {
   if (!vacationModal) return;
   const year = selectedMonth.split('-')[0];
   const worker = planning.workers.find(w => w.id === vacationModal.workerId);
   if (!worker) return;
   const updatedWorker = {
      ...worker,
      vacationConfig: {
         ...(worker.vacationConfig || {}),
         [year]: { totalDays: vacationModalData.totalDays, carryOver: vacationModalData.carryOver }
      }
   };
   await saveWorker(updatedWorker);
   setVacationModal(null);
   showNotification('Configuración de vacaciones guardada', 'success');
};
  const [showSSReport, setShowSSReport] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [selectedNotificationWorkerId, setSelectedNotificationWorkerId] = useState<string | null>(null);
  const [whatsappWorkerSearch, setWhatsappWorkerSearch] = useState('');
  const [showCalendarSelector, setShowCalendarSelector] = useState(false);
  const [workerListModal, setWorkerListModal] = useState<{clientId: string, centerId: string, date: string} | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [editingStatusRecord, setEditingStatusRecord] = useState<{id?: string, status: WorkerStatus, startDate: string, endDate: string} | null>(null);
  const [showAddRecordForm, setShowAddRecordForm] = useState(false);
  const [duplicatingJob, setDuplicatingJob] = useState<Job | null>(null);
  const [duplicationDate, setDuplicationDate] = useState<string>('');
  const [keepWorkersOnDuplicate, setKeepWorkersOnDuplicate] = useState(false);
  const [keepDeliveryNoteOnDuplicate, setKeepDeliveryNoteOnDuplicate] = useState(false);
  const [workerDaysModal, setWorkerDaysModal] = useState<{worker: Worker, month: string} | null>(null);
  const [newCourseName, setNewCourseName] = useState('');
  
  // Variables para calculadora de kilómetros
  const [matrizDistancias, setMatrizDistancias] = useState(new Map());
  const [sedesMatriz, setSedesMatriz] = useState([]);
  const [origenSeleccionado, setOrigenSeleccionado] = useState('');
  const [destinoSeleccionado, setDestinoSeleccionado] = useState('');
  const [kilometrosCalculados, setKilometrosCalculados] = useState(0);
  
  // Variables para calculadora de kilómetros pagados
  const [operarioSeleccionado, setOperarioSeleccionado] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [kilometrosPagados, setKilometrosPagados] = useState(0);
  const [detallesKilometros, setDetallesKilometros] = useState([]);
  const [calculandoKilometros, setCalculandoKilometros] = useState(false);
  const [dbTab, setDbTab] = useState<'tasks' | 'courses'>('tasks');
  const [editingStandardTask, setEditingStandardTask] = useState<StandardTask | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [taskSearch, setTaskSearch] = useState('');
  const [editingDailyNote, setEditingDailyNote] = useState<DailyNote | null>(null);
  const [workerNoteFilters, setWorkerNoteFilters] = useState<{[key: string]: boolean}>({
    'info': true, 'time': true, 'medical': true
  });
  const [newFuelRecord, setNewFuelRecord] = useState<{liters: string, cost: string, odometer: string, date: string}>({
    liters: '', cost: '', odometer: '', date: new Date().toISOString().split('T')[0]
  });
  const [availableCourses, setAvailableCourses] = useState<string[]>([
    'Curso de Manipulador de Alimentos', 'Curso de Carretillero',
    'Curso de Prevención de Riesgos Laborales', 'Curso de Primeros Auxilios',
    'Curso de Altura', 'Curso de Electricidad Básica', 'Curso de Soldadura', 'Curso de Montaje de Andamios'
  ]);
  const [availableProviders, setAvailableProviders] = useState<string[]>(() => {
    const saved = localStorage.getItem('availableProviders');
    return saved ? JSON.parse(saved) : [
      'Mutua',
      'Servicio Médico',
      'Recursos Laborales',
      'Prevención de Riesgos',
      'Centro Médico'
    ];
  });
  const [medicalCourseName, setMedicalCourseName] = useState('');
  const [medicalProviderName, setMedicalProviderName] = useState('');
  const [showAddMedicalCourse, setShowAddMedicalCourse] = useState(false);
  const [showAddMedicalProvider, setShowAddMedicalProvider] = useState(false);
  const [workerSearchFilter, setWorkerSearchFilter] = useState('');
  const [medicalWorkerFilter, setMedicalWorkerFilter] = useState('');
const [planningFilter, setPlanningFilter] = useState('');
  const [exportHistory, setExportHistory] = useState(() => {
    const saved = localStorage.getItem('exportHistory');
    return saved ? JSON.parse(saved) : {};
  });
  const [highlightedWorker, setHighlightedWorker] = useState<string | null>(null);
  const [highlightTimeout, setHighlightTimeout] = useState<NodeJS.Timeout | null>(null);
  const APP_VERSION = 'v2.0.0';
  // Stubs de compatibilidad con UI (en v2 el guardado es granular, no hay "auto-backup" separado)
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [lastAutoBackupTime, setLastAutoBackupTime] = useState<Date | null>(null);
  const [autoBackupSchedule, setAutoBackupSchedule] = useState(false); // DESACTIVADO TEMPORALMENTE - Causaba bucle infinito

  // ── Backup automático cada 3 horas (6:00-21:00) ─────────────────────
  const performAutoBackup = useCallback(() => {
    if (!autoBackupEnabled || !autoBackupSchedule) return;
    
    console.log('🔄 Auto-backup desactivado temporalmente para evitar bucle infinito');
    return; // SALIDA TEMPRANA PARA EVITAR BUCLE
    
    try {
      const dataStr = JSON.stringify(planning, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const now = new Date();
      const timestamp = now.toISOString().split('T')[0] + '_' + now.toTimeString().split(' ')[0].replace(/:/g, '-');
      link.download = `AUTO_BACKUP_${timestamp}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      setLastAutoBackupTime(now);
      console.log(`🔄 Auto-backup realizado: ${timestamp}`);
      
      // Guardar historial de backups automáticos
      const backupHistory = JSON.parse(localStorage.getItem('autoBackupHistory') || '[]');
      backupHistory.push({ timestamp: timestamp, size: Math.round(dataStr.length / 1024) });
      // Mantener solo últimos 50 backups
      if (backupHistory.length > 50) backupHistory.shift();
      localStorage.setItem('autoBackupHistory', JSON.stringify(backupHistory));
      
    } catch (error) {
      console.error('❌ Error en auto-backup:', error);
    }
  }, [planning, autoBackupEnabled, autoBackupSchedule]);

  // ── Sistema de Backup Automático Simple y Robusto - DESACTIVADO (duplicado)
  // NOTA: Ya existe un sistema de backup cada 3 horas en performAutoBackup
  // Este sistema causaba múltiples archivos AUTO_BACKUP
  /*
  useEffect(() => {
    if (!autoBackupEnabled) return;
    
    console.log('Iniciando sistema de backup automático simple');
    
    // Backup cada hora (3600000 ms = 1 hora)
    const hourlyBackup = setInterval(() => {
      try {
        const dataStr = JSON.stringify(planning, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const now = new Date();
        const timestamp = now.toISOString().split('T')[0] + '_' + now.toTimeString().split(' ')[0].replace(/:/g, '-');
        link.download = `AUTO_BACKUP_${timestamp}.json`;
        link.click();
        URL.revokeObjectURL(url);
        
        console.log(`Backup automático cada hora: ${timestamp}`);
      } catch (error) {
        console.error('Error en backup automático:', error);
      }
    }, 3600000); // 1 hora
    
    // Backup al cerrar página
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      try {
        const dataStr = JSON.stringify(planning, null, 2);
      } catch (error) {
        console.error('Error al capturar antes de cerrar:', error);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
    //}, [planning]); // Comentado junto con el useEffect
    */

// ... (rest of the code remains the same)
  const updateExportHistory = useCallback((newHistory: any) => {
    setExportHistory(newHistory);
    localStorage.setItem('exportHistory', JSON.stringify(newHistory));
  }, []);

  // ── Auto-actualización de estados de operarios ─────────────────────────────
  useEffect(() => {
    if (!planning.workers.length) return;
    const today = new Date().toISOString().split('T')[0];
    const workersNeedingUpdate = planning.workers.filter(worker => {
      if (worker.status === WorkerStatus.DISPONIBLE || !worker.statusStartDate || !worker.statusEndDate) return false;
      return new Date(today) > new Date(worker.statusEndDate);
    });
    if (workersNeedingUpdate.length > 0) {
      workersNeedingUpdate.forEach(worker => {
        const updated = { ...worker, status: WorkerStatus.DISPONIBLE, statusStartDate: undefined, statusEndDate: undefined };
        persistWorker(updated);
      });
    }
  }, [planning.currentDate]);

  // ── Filtrado de planificación (cliente u operario) ─────────────────────────────
  const filteredPlanning = useMemo(() => {
    if (!planningFilter.trim()) {
      return planning; // Si no hay filtro, devolver planning original
    }

    const filter = planningFilter.toLowerCase().trim();
    
    // Filtrar tareas que coincidan con cliente u operario (lógica OR)
    const filteredJobs = planning.jobs.filter(job => {
      // Buscar por nombre de cliente
      const client = planning.clients.find(c => c.id === job.clientId);
      const clientMatch = client?.name.toLowerCase().includes(filter);
      
      // Buscar por operario (código, nombre o apellido)
      const workerMatch = job.assignedWorkerIds.some(workerId => {
        const worker = planning.workers.find(w => w.id === workerId);
        if (!worker) return false;
        
        return (
          (worker.code && worker.code.toLowerCase().includes(filter)) ||
          (worker.name && worker.name.toLowerCase().includes(filter)) ||
          (worker.surname && worker.surname.toLowerCase().includes(filter))
        );
      });
      
      // Lógica OR: mostrar si coincide cliente O operario
      return clientMatch || workerMatch;
    });

    return {
      ...planning,
      jobs: filteredJobs
    };
  }, [planning, planningFilter]);

  // ── Funciones de UI ────────────────────────────────────────────────────────

  const handleWorkerHighlight = useCallback((workerId: string) => {
    if (highlightTimeout) clearTimeout(highlightTimeout);
    if (highlightedWorker === workerId) { setHighlightedWorker(null); setHighlightTimeout(null); return; }
    setHighlightedWorker(workerId);
    const timeout = setTimeout(() => { setHighlightedWorker(null); setHighlightTimeout(null); }, 10000);
    setHighlightTimeout(timeout);
  }, [highlightedWorker, highlightTimeout]);

  // ── Exportar listado de acceso ─────────────────────────────────────────────
  const exportWorkerAccessList = useCallback((centerId: string, date: string) => {
    try {
      const centerJobs = planning.jobs.filter(j => j.centerId === centerId && j.date === date && !j.isCancelled);
      const assignedWorkerIds = new Set(centerJobs.flatMap(j => j.assignedWorkerIds));
      const workersToExport = planning.workers.filter(w => assignedWorkerIds.has(w.id));
      const client = planning.clients.find(c => c.centers.some(ct => ct.id === centerId));
      const center = client?.centers.find(ct => ct.id === centerId);
      const today = new Date().toISOString().split('T')[0];
      const exportKey = `${centerId}_${date}`;
      const currentHistory = exportHistory;
      const previousExport = currentHistory[exportKey];
      const isFirstExport = !previousExport || previousExport.date !== today;
      const newWorkers = isFirstExport ? workersToExport : workersToExport.filter(w => !previousExport.workerIds.includes(w.id));
      const finalWorkers = isFirstExport ? workersToExport : newWorkers;
      if (finalWorkers.length === 0 && !isFirstExport) { showNotification("No hay nuevos operarios desde la última exportación", "info"); return; }
      // Convertir fecha de AAA-MM-DD a DD-MM-AAAA
      const [year, month, day] = date.split('-');
      const formattedDate = `${day}-${month}-${year}`;
      
      
      // Limpiar el nombre del cliente: quitar guiones bajos, espacios extra y caracteres especiales
      let cleanClientName = (client?.name || 'EMPRESA')
        .replace(/_/g, ' ')           // Reemplazar guiones bajos con espacios
        .replace(/\s+/g, ' ')        // Reemplazar múltiples espacios con uno solo
        .trim();                      // Quitar espacios al inicio y final
      
      
      // Obtener número de exportación para el sufijo
      const exportCount = (currentHistory[exportKey]?.exportCount || 0) + 1;
      const suffix = exportCount > 1 ? `-${exportCount}` : '';
      
      const fileName = isFirstExport 
        ? `LISTADO ACCESO "${cleanClientName}" ${formattedDate}${suffix}.xlsx` 
        : `NUEVOS ACCESO "${cleanClientName}" ${formattedDate}${suffix}.xlsx`;
      
      const wb = XLSX.utils.book_new();
      
      // Solo incluir operarios fijos en la primera exportación
      let allWorkers = finalWorkers;
      
      if (isFirstExport) {
        // Operarios fijos solo en la primera exportación
        const fixedWorkers = [
          { dni: '24371414Q', name: 'JOSE LUIS RUIZ TARREGA' },
          { dni: '48581091P', name: 'VICENTE CARRATALA ANASTASIO' }
        ];
        
        // Combinar operarios fijos + resto (evitando duplicados)
        const fixedDnis = new Set(fixedWorkers.map(w => w.dni));
        const otherWorkers = finalWorkers.filter(w => !fixedDnis.has(w.dni));
        allWorkers = [...fixedWorkers, ...otherWorkers];
      }

      const excelData = [
        [`${fileName.replace('.xlsx', '')}`],
        ['NIF', 'NOMBRE', 'APELLIDOS', 'EMPRESA'],
        ...allWorkers.map(worker => {
          const nameParts = (worker.name || '').split(' ');
          return [worker.dni || '', nameParts[0] || '', nameParts.slice(1).join(' ') || '', 'DESCARGAS JOSAN SL'];
        })
      ];
      const ws = XLSX.utils.aoa_to_sheet(excelData);
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
      ws['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 25 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Listado Acceso');
      updateExportHistory({ ...currentHistory, [exportKey]: { date: today, workerIds: Array.from(assignedWorkerIds), exportCount: (currentHistory[exportKey]?.exportCount || 0) + 1, lastExportTime: new Date().toISOString() } });
      XLSX.writeFile(wb, fileName);
      showNotification(isFirstExport ? `Listado completo exportado: ${fileName}` : `Nuevos operarios exportados: ${fileName}`, 'success');
      
    } catch (error) {
      console.error('Error al exportar listado de acceso:', error);
      showNotification('Error al exportar listado de acceso', 'error');
    }
  }, [planning, exportHistory, showNotification, updateExportHistory]);

  // ── Alertas médicas ────────────────────────────────────────────────────────
  const calculateMedicalAlerts = useCallback((courses: MedicalCourse[], workers: Worker[]): MedicalAlert[] => {
    const today = new Date();
    const alerts: MedicalAlert[] = [];

    // 1. Para cada trabajador, encontrar el reconocimiento médico MÁS RECIENTE
    const latestMedicalCourses = new Map<string, MedicalCourse>();
    
    courses
      .filter(course => course.type === 'recognition' && course.issueDate) // Solo reconocimientos médicos con fecha de realización
      .forEach(course => {
        course.assignedWorkerIds.forEach(workerId => {
          const existingCourse = latestMedicalCourses.get(workerId);
          const currentIssueDate = new Date(course.issueDate);
          const existingIssueDate = existingCourse ? new Date(existingCourse.issueDate || '') : new Date(0);
          
          // Si este reconocimiento es más reciente que el existente, reemplazarlo
          if (!existingCourse || currentIssueDate > existingIssueDate) {
            latestMedicalCourses.set(workerId, course);
          }
        });
      });

    // 2. Generar alertas basadas en el reconocimiento más reciente de cada trabajador
    latestMedicalCourses.forEach((course, workerId) => {
      if (!course.expiryDate) return;
      const expiryDate = new Date(course.expiryDate);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry > 30) return; // Solo alertar si caduca en 30 días o menos
      const alertLevel: 'critical' | 'warning' = daysUntilExpiry < 0 ? 'critical' : 'warning';
      const worker = workers.find(w => w.id === workerId);
      if (worker) {
        alerts.push({ 
          id: `${course.id}-${workerId}`, 
          workerId: worker.id, 
          courseId: course.id, 
          courseName: course.type === 'recognition' ? 'Reconocimiento Médico' : course.name || 'Curso', 
          workerName: worker.name, 
          type: course.type, 
          provider: course.provider, 
          expiryDate: course.expiryDate!, 
          daysUntilExpiry, 
          alertLevel 
        });
      }
    });

    // 3. Alertas para trabajadores SIN certificado médico
    const workersWithMedicalCourses = new Set<string>(latestMedicalCourses.keys());

    // Encontrar trabajadores sin reconocimiento médico
    workers
      .filter(worker => !worker.isArchived) // Solo trabajadores activos
      .forEach(worker => {
        if (!workersWithMedicalCourses.has(worker.id)) {
          // Este trabajador no tiene ningún reconocimiento médico
          alerts.push({
            id: `no-medical-${worker.id}`,
            workerId: worker.id,
            courseId: 'no-medical',
            courseName: 'SIN RECONOCIMIENTO MÉDICO!',
            workerName: worker.name,
            type: 'recognition',
            provider: 'N/A',
            expiryDate: new Date(0).toISOString().split('T')[0], // Fecha antigua para mostrar primero
            daysUntilExpiry: -9999, // Valor muy negativo para mostrar al principio
            alertLevel: 'critical'
          });
        }
      });

    return alerts.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  }, []);

  // ── Efecto para calcular alertas automáticamente ─────────────────────────────
  useEffect(() => {
    const updatedAlerts = calculateMedicalAlerts(planning.medicalCourses, planning.workers);
    setPlanning(prev => ({ ...prev, medicalAlerts: updatedAlerts }));
  }, [planning.medicalCourses, planning.workers, calculateMedicalAlerts]);

  // ── CRUD: Medical courses ──────────────────────────────────────────────────
  const addMedicalCourse = useCallback(async (course: Omit<MedicalCourse, 'id' | 'createdAt' | 'updatedAt'>) => {
    // Crear un registro por cada operario seleccionado
    const newCourses: MedicalCourse[] = course.assignedWorkerIds.map(workerId => ({
      ...course,
      id: `${Date.now()}-${workerId}`, // ID único por operario
      assignedWorkerIds: [workerId], // Un solo operario por registro
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    // Guardar todos los registros (saveMedicalCourse ya actualiza el estado)
    for (const newCourse of newCourses) {
      await persistMedicalCourse(newCourse);
    }
    showNotification(`${newCourses.length} registro(s) médico(s) añadido(s)`, 'success');
  }, [persistMedicalCourse, showNotification]);

  const updateMedicalCourseHandler = useCallback(async (course: MedicalCourse) => {
    if (!course.id) {
      console.error('course.id es undefined - cancelando operación');
      showNotification('Error: ID del registro no válido', 'error');
      return;
    }
    
    const existing = planning.medicalCourses.find((c) => c.id === course.id);
    
    if (!existing) {
      console.error('No se encontró el registro con ID:', course.id);
      showNotification('Error: Registro no encontrado', 'error');
      return;
    }
    
    const updated = { ...existing, ...course, updatedAt: new Date().toISOString() };
    
    await persistMedicalCourse(updated);
    showNotification('Registro médico actualizado', 'success');
  }, [persistMedicalCourse, showNotification]);

  const deleteMedicalCourseHandler = useCallback(async (id: string) => {
    
    // Si el ID es undefined, no hacer nada para evitar eliminar todos los registros
    if (!id) {
      console.error('❌ Intentando eliminar con ID undefined - operación cancelada');
      showNotification('Error: ID del registro no válido', 'error');
      return;
    }
    
    
    const existing = planning.medicalCourses.find((c) => c.id === id);
    
    if (!existing) {
      console.error('No se encontró el registro con ID:', id);
      showNotification('Error: Registro no encontrado', 'error');
      return;
    }
    
    // Eliminar del estado local primero
    const remaining = planning.medicalCourses.filter((c) => c.id !== id);
    
    setPlanning(prev => ({ ...prev, medicalCourses: remaining }));
    
    // Eliminar de la base de datos
    await persistDeleteMedicalCourse(id);
    
    showNotification('Registro médico eliminado', 'success');
  }, [planning.medicalCourses, persistDeleteMedicalCourse, showNotification]);

  const addNewMedicalCourse = useCallback(() => {
    if (medicalCourseName.trim() && !availableCourses.includes(medicalCourseName.trim())) {
      setAvailableCourses(prev => [...prev, medicalCourseName.trim()]);
      setMedicalCourseName(''); setShowAddMedicalCourse(false);
    }
  }, [medicalCourseName, availableCourses]);

  const addNewMedicalProvider = useCallback(() => {
    if (medicalProviderName.trim() && !availableProviders.includes(medicalProviderName.trim())) {
      const newProviders = [...availableProviders, medicalProviderName.trim()];
      setAvailableProviders(newProviders);
      localStorage.setItem('availableProviders', JSON.stringify(newProviders));
      setMedicalProviderName(''); 
      setShowAddMedicalProvider(false);
    }
  }, [medicalProviderName, availableProviders]);

  // ── CRUD: Jobs ─────────────────────────────────────────────────────────────
  const handleDragStart = (worker: Worker) => setDraggedWorkerId(worker.id);

  const handleAssignWorker = useCallback(async (workerId: string, jobId: string, sourceJobId: string | null = null) => {
    const worker = planning.workers.find(w => w.id === workerId);
    const job = planning.jobs.find(j => j.id === jobId);
    if (!worker || !job) return;
    if (job.isCancelled) { showNotification("No se pueden asignar operarios a una tarea anulada", "error"); return; }
    const validation = validateAssignment(worker, job, planning.jobs, planning.customHolidays, planning.clients);
    if (validation.error) { showNotification(validation.error, 'error'); return; }
    if (validation.warning) { showNotification(validation.warning, 'warning'); }
    
    const updatedJobs: Job[] = planning.jobs.map(j => {
      let assigned = [...j.assignedWorkerIds];
      let workerTimes = { ...j.workerTimes };
      if (sourceJobId && j.id === sourceJobId) { assigned = assigned.filter(id => id !== workerId); if (workerTimes[workerId]) delete workerTimes[workerId]; }
      if (j.id === jobId) { assigned = [...assigned.filter(id => id !== workerId), workerId]; }
      const newJob = { ...j, assignedWorkerIds: assigned, workerTimes };
      // Solo incluir si realmente cambió
      if (JSON.stringify(j.assignedWorkerIds) !== JSON.stringify(newJob.assignedWorkerIds) ||
          JSON.stringify(j.workerTimes) !== JSON.stringify(newJob.workerTimes)) {
        return newJob;
      }
      return j; // No cambió, retornar original
    }).filter(j => {
      // Solo guardar los que realmente cambiaron
      const original = planning.jobs.find(orig => orig.id === j.id);
      return JSON.stringify(original?.assignedWorkerIds) !== JSON.stringify(j.assignedWorkerIds) ||
             JSON.stringify(original?.workerTimes) !== JSON.stringify(j.workerTimes);
    });
    const targetJob = updatedJobs.find(j => j.id === jobId);
    const sourceJob = sourceJobId ? updatedJobs.find(j => j.id === sourceJobId) : null;
    const assignedWorker = planning.workers.find(w => w.id === workerId);
    if (targetJob && assignedWorker) {
      showNotification(`${assignedWorker.name} asignado a la tarea`, "success");
    }
    if (sourceJob && assignedWorker) {
      showNotification(`${assignedWorker.name} movido de otra tarea`, "info");
    }
    
    // Actualizar el estado local manteniendo TODOS los jobs, solo modificando los que cambiaron
    setPlanning(prev => {
      const allJobs = prev.jobs.map(job => {
        const updatedJob = updatedJobs.find(uj => uj.id === job.id);
        return updatedJob || job;
      });
      return { ...prev, jobs: allJobs };
    });
    
    // Guardar cada job individualmente
    console.log('🔄 About to save jobs:', updatedJobs.length);
    try {
      await Promise.all(updatedJobs.map(job => {
          return persistJob(job);
      }));
    } catch (error) {
      console.error('Error saving jobs:', error);
    }
    if (!validation.warning) showNotification("Mozo asignado", "success");
  }, [planning, persistJob, showNotification]);

  const handleRemoveWorker = useCallback(async (workerId: string, jobId: string) => {
    const job = planning.jobs.find(j => j.id === jobId);
    if (!job) return;
    const worker = planning.workers.find(w => w.id === workerId);
    const workerTimes = { ...job.workerTimes };
    if (workerTimes[workerId]) delete workerTimes[workerId];
    const updatedJob = { ...job, assignedWorkerIds: job.assignedWorkerIds.filter(id => id !== workerId), workerTimes };
    await persistJob(updatedJob);
    if (worker) {
      showNotification(`${worker.name} eliminado de la tarea`, "info");
    }
  }, [planning.jobs, planning.workers, persistJob, showNotification]);

  const saveJob = useCallback(async (job: Job) => {
    if (!job.clientId || !job.centerId) { showNotification("Error: Cliente/Centro requeridos", "error"); return; }
    await persistJob(job);
    setEditingJob(null);
    showNotification("Tarea guardada correctamente", "success");
  }, [persistJob, showNotification]);

  const handleUpdateJobReinforcementGroups = useCallback(async (jobId: string, groups: ReinforcementGroup[]) => {
    const job = planning.jobs.find(j => j.id === jobId);
    if (!job) return;
    
    const reinforcementWorkerIds = groups.flatMap(group => group.workerIds);
    const newWorkerTimes: Record<string, string> = {};
    groups.forEach(group => { 
      group.workerIds.forEach(workerId => { 
        newWorkerTimes[workerId] = group.startTime; 
      }); 
    });
    
    // CORRECCIÓN: Mantener solo workerTimes de operarios principales y refuerzos activos
    const mainWorkerTimes: Record<string, string> = {};
    job.assignedWorkerIds.forEach(workerId => {
      // Si no está en refuerzo, mantener hora principal
      if (!reinforcementWorkerIds.includes(workerId)) {
        mainWorkerTimes[workerId] = job.workerTimes?.[workerId] || job.startTime;
      }
    });
    
    // Combinar workerTimes principales + de refuerzo
    const finalWorkerTimes = { ...mainWorkerTimes, ...newWorkerTimes };
    
    // CORRECCIÓN: Si no hay grupos de refuerzo, solo mantener operarios principales (sin horarios especiales)
    const mainWorkerIds = groups.length === 0 
      ? job.assignedWorkerIds.filter(id => !job.workerTimes || job.workerTimes[id] === job.startTime)
      : job.assignedWorkerIds.filter(id => !reinforcementWorkerIds.includes(id));
    
    // CORRECCIÓN: Limpiar workerTimes de operarios eliminados
    const cleanedWorkerTimes: Record<string, string> = {};
    [...mainWorkerIds, ...reinforcementWorkerIds].forEach(workerId => {
      cleanedWorkerTimes[workerId] = finalWorkerTimes[workerId] || job.startTime;
    });
    
    const updatedJob = { 
      ...job, 
      reinforcementGroups: groups, 
      workerTimes: cleanedWorkerTimes, 
      assignedWorkerIds: [...mainWorkerIds, ...reinforcementWorkerIds] 
    };
    
    // Usar saveJob en lugar de persistJob para actualizar estado local
    await saveJob(updatedJob);
    
    showNotification("Grupos de refuerzo actualizados", "success");
  }, [planning.jobs, saveJob, showNotification]);

  const handleReorderJobs = useCallback(async (sourceJobId: string, targetJobId: string) => {
    // Reorder is local-only (no need to persist order)
    setPlanning(prev => {
      const jobs = [...prev.jobs];
      const sIdx = jobs.findIndex(j => j.id === sourceJobId);
      const tIdx = jobs.findIndex(j => j.id === targetJobId);
      if (sIdx === -1 || tIdx === -1 || sIdx === tIdx) return prev;
      const [moved] = jobs.splice(sIdx, 1);
      jobs.splice(tIdx, 0, moved);
      return { ...prev, jobs };
    });
  }, [setPlanning]);

  const handleReorderClients = useCallback(async (sourceClientId: string, targetClientId: string) => {
    setPlanning(prev => {
      const clients = [...prev.clients];
      const sIdx = clients.findIndex(c => c.id === sourceClientId);
      const tIdx = clients.findIndex(c => c.id === targetClientId);
      if (sIdx === -1 || tIdx === -1 || sIdx === tIdx) return prev;
      const [moved] = clients.splice(sIdx, 1);
      clients.splice(tIdx, 0, moved);
      return { ...prev, clients };
    });
  }, [setPlanning]);

  const handleMigrateData = async () => {
    if (!confirm('⚠️ ESTA ACCIÓN IMPORTARÁ TODOS LOS DATOS DEL PROYECTO ANTIGUO\n\nEsto sobrescribirá cualquier dato existente. ¿Estás seguro de continuar?')) {
      return;
    }

    try {
      showNotification('Iniciando migración de datos...', 'info');
      
      
      const response = await fetch('/api/migrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirm: true })
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        
        showNotification(`❌ Error en migración: ${errorData.message || response.statusText}`, 'error');
        return;
      }

      const result = await response.json();

      showNotification('✅ Migración completada exitosamente', 'success');
      
      if (result.results && result.results.length > 0) {
        console.log('📊 Resultados de la migración:');
        result.results.forEach((result, index) => {
          console.log(`${index + 1}. ${result}`);
        });
      }
      
        // Recargar la página para mostrar los nuevos datos
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        
    } catch (error) {
      console.error('❌ Error de conexión:', error);
      showNotification('❌ Error de conexión durante la migración', 'error');
    }
  };

  const handleOpenNewJob = (clientId: string = '', date?: string) => {
    const selectedClient = clientId ? planning.clients.find(c => c.id === clientId) : null;
    const newJob: Job = { id: `j-${Date.now()}`, date: date || planning.currentDate, clientId: selectedClient?.id || '', centerId: selectedClient?.centers?.[0]?.id || '', type: JobType.DESCARGA, startTime: '', endTime: '', requiredWorkers: 3, assignedWorkerIds: [], ref: '', deliveryNote: '', locationDetails: '', isCancelled: false };
    setEditingJob(newJob);
  };

  const handleOpenDuplicate = (job: Job) => { 
    // Calcular el día siguiente
    const nextDay = new Date(job.date);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split('T')[0];
    
    setDuplicatingJob(job); 
    setDuplicationDate(nextDayStr); // ✅ Usa el día siguiente
    setKeepWorkersOnDuplicate(false); 
  };

  const handleDuplicateJob = useCallback(async () => {
    if (!duplicatingJob || !duplicationDate) return;
    
    // Extraer solo las propiedades que queremos copiar explícitamente
    const { 
      id, 
      date, 
      assignedWorkerIds, 
      ref, 
      deliveryNote, 
      reinforcementGroups, // 🚨 NO queremos copiar los grupos de refuerzo
      workerTimes, // 🚨 Tampoco queremos copiar los tiempos personalizados
      ...restOfJob 
    } = duplicatingJob;
    
    const newJob: Job = { 
      ...restOfJob, // Copiar todo excepto las propiedades excluidas arriba
      id: `j-${Date.now()}`, 
      date: duplicationDate, 
      assignedWorkerIds: keepWorkersOnDuplicate ? duplicatingJob.assignedWorkerIds : [],
      ref: keepDeliveryNoteOnDuplicate ? (duplicatingJob.ref || '') : '', // Control explícito del ref
      deliveryNote: keepDeliveryNoteOnDuplicate ? (duplicatingJob.deliveryNote || '') : '', // Control explícito del deliveryNote
      reinforcementGroups: [], // 🛡️ FORZAR: Siempre vacío en duplicación
      workerTimes: {} // 🛡️ FORZAR: Siempre vacío en duplicación
    };
    
    
    try {
      await persistJob(newJob);
      
      setDuplicatingJob(null);
      setKeepDeliveryNoteOnDuplicate(false); // Resetear estado
      showNotification("Tarea duplicada", "success");
      
    } catch (error) {
      console.error('Error al duplicar tarea:', error);
      showNotification("Error al duplicar tarea", "error");
    }
  }, [duplicatingJob, duplicationDate, keepWorkersOnDuplicate, keepDeliveryNoteOnDuplicate, persistJob, showNotification]);

  const handleOpenNote = (workerId: string) => {
    const existing = planning.dailyNotes?.find(n => n.workerId === workerId && n.date === planning.currentDate);
    setEditingDailyNote(existing || { id: `note-${Date.now()}`, workerId, date: planning.currentDate, text: '', type: 'info' });
  };

  // ── Cálculo de días trabajados para FIJOS DISCONTINUOS ───────────────────────
  const calculateWorkerDays = useCallback((workerId: string, yearMonth: string) => {
    const [year, month] = yearMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    
    // Función para formatear fecha local sin desfase UTC
    const formatDateLocal = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    // Obtener todos los días del mes
    const daysInMonth = [];
    for (let day = 1; day <= lastDay.getDate(); day++) {
      daysInMonth.push(new Date(year, month - 1, day));
    }
    
    // 🛡️ EXCLUIR "RECONOCIMIENTO MÉDICO" - No es trabajo real para FD
    const getFilteredJobs = (jobs: Job[]) => {
      return jobs.filter(job => {
        // Excluir explícitamente tareas de RECONOCIMIENTO MÉDICO
        const medicalRecognitionClient = planning.clients.find(c => 
          c.name === "RECONOCIMIENTO MÉDICO"
        );
        if (medicalRecognitionClient && job.clientId === medicalRecognitionClient.id) {
          return false; // 🚨 Excluir esta tarea
        }
        return true; // ✅ Incluir todas las demás
      });
    };
    
    // Filtrar tareas del operario en el mes (excluyendo RECONOCIMIENTO MÉDICO)
    const allWorkerJobs = planning.jobs.filter(job => 
      job.assignedWorkerIds.includes(workerId) &&
      job.date.startsWith(yearMonth)
    );
    const workerJobs = getFilteredJobs(allWorkerJobs);
    
    // Obtener días trabajados del mes actual
    const workedDays = new Set<string>();
    workerJobs.forEach(job => {
      workedDays.add(job.date);
    });

    // Ampliar con días frontera de meses adyacentes (hasta 3 días antes/después)
    // para detectar fines de semana que cruzan el límite de mes
    const extendedWorkedDays = new Set<string>(workedDays);
    
    // 🛡️ APLICAR MISMO FILTRO A TAREAS DE MESES ADYACENTES
    const allExtendedJobs = planning.jobs
      .filter(job => job.assignedWorkerIds.includes(workerId) && !job.date.startsWith(yearMonth));
    const filteredExtendedJobs = getFilteredJobs(allExtendedJobs);
    
    filteredExtendedJobs.forEach(job => {
      const jobDate = new Date(job.date + 'T00:00:00');
      const diffFromStart = (firstDay.getTime() - jobDate.getTime()) / 86400000;
      const diffFromEnd = (jobDate.getTime() - lastDay.getTime()) / 86400000;
      if (diffFromStart >= 0 && diffFromStart <= 3) extendedWorkedDays.add(job.date);
      if (diffFromEnd >= 0 && diffFromEnd <= 3) extendedWorkedDays.add(job.date);
    });
    
    // Detectar fines de semana (viernes+lunes trabajados, incluyendo cruces de mes)
    const weekendDays = new Set<string>();
    const extendedDates = Array.from(extendedWorkedDays).map(dateStr => new Date(dateStr + 'T00:00:00'));
    
    extendedDates.forEach(date => {
      const dayOfWeek = date.getDay(); // 0=domingo, 1=lunes, ..., 5=viernes, 6=sábado
      
      if (dayOfWeek === 5) { // Viernes
        const monday = new Date(date);
        monday.setDate(date.getDate() + 3); // viernes -> lunes
        
        if (extendedWorkedDays.has(formatDateLocal(monday))) {
          const saturday = new Date(date);
          saturday.setDate(date.getDate() + 1);
          const sunday = new Date(date);
          sunday.setDate(date.getDate() + 2);
          
          // Solo añadir fines de semana que pertenezcan al mes actual
          const saturdayStr = formatDateLocal(saturday);
          const sundayStr = formatDateLocal(sunday);
          
          if (saturdayStr.startsWith(yearMonth)) {
            weekendDays.add(saturdayStr);
          }
          if (sundayStr.startsWith(yearMonth)) {
            weekendDays.add(sundayStr);
          }
        }
      }
    });
    
    // Calcular nóminas (bloques de trabajo consecutivos)
    const nominasCount = (() => {
      if (workedDays.size === 0) return 0;
      
      // Obtener todos los días del mes ordenados
      const allDaysInMonth = daysInMonth.map(date => formatDateLocal(date));
      const workedDaysArray = Array.from(workedDays).sort();
      
      let nominas = 1; // Al menos una nómina si hay días trabajados
      let inWorkBlock = false;
      let firstWorkDayFound = false;
      
      for (const day of allDaysInMonth) {
        const isWorked = workedDays.has(day);
        const isWeekend = weekendDays.has(day);
        const isEffectiveWorkDay = isWorked || isWeekend; // Días que cuentan como trabajo
        
        if (!firstWorkDayFound && isEffectiveWorkDay) {
          // Encontramos el primer día de trabajo
          firstWorkDayFound = true;
          inWorkBlock = true;
        } else if (firstWorkDayFound) {
          if (isEffectiveWorkDay && !inWorkBlock) {
            // Volvemos a trabajar después de un break → nueva nómina
            nominas++;
            inWorkBlock = true;
          } else if (!isEffectiveWorkDay && inWorkBlock) {
            // Dejamos de trabajar → empieza un break
            inWorkBlock = false;
          }
        }
      }
      
      return nominas;
    })();
    
    // Generar array con información de cada día
    const calendarDays = daysInMonth.map(date => {
      const dateStr = formatDateLocal(date);
      const isWorked = workedDays.has(dateStr);
      const isWeekend = weekendDays.has(dateStr);
      const dayOfWeek = date.getDay();
      
      return {
        date: dateStr,
        day: date.getDate(),
        isWorked,
        isWeekend,
        isWeekendDay: dayOfWeek === 0 || dayOfWeek === 6, // domingo o sábado
        dayOfWeek
      };
    });
    
    // Ajustar para que la semana empiece en lunes (calendario español)
    const adjustedCalendarDays = [];
    const firstDayOfWeek = firstDay.getDay(); // 0=domingo, 1=lunes, ..., 6=sábado
    const emptyDaysAtStart = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Si es domingo, 6 días vacíos, si es lunes 0, etc.
    
    // Añadir días vacíos al inicio
    for (let i = 0; i < emptyDaysAtStart; i++) {
      adjustedCalendarDays.push(null);
    }
    
    // Añadir los días del mes
    adjustedCalendarDays.push(...calendarDays);
    
    const workedCount = Array.from(workedDays).length;
    const weekendCount = weekendDays.size;
    const totalCount = workedCount + weekendCount;
    
    return {
      calendarDays: adjustedCalendarDays,
      workedCount,
      weekendCount,
      totalCount,
      nominasCount
    };
  }, [planning.jobs]);

  // ── Exportar Días Trabajados FIJOS DISCONTINUOS ─────────────────────────────
  const exportFDDaysToExcel = () => {
    try {
      if (!workerDaysModal) return;
      
      const { worker, calculationResult } = workerDaysModal;
      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const [year, month] = workerDaysModal.month.split('-').map(Number);
      const monthName = monthNames[month - 1];
      
      // Preparar datos para Excel
      const excelData: any[][] = [];
      
      // Cabecera principal
      excelData.push([`DÍAS TRABAJADOS FIJOS DISCONTINUOS - ${monthName} ${year}`]);
      excelData.push([]); // Fila vacía
      
      // Cabeceras de columnas
      const headers = ['Código Operario', 'Nombre Completo', 'DNI', 'Días Trabajados', 'Fines de Semana', 'Total', 'Bloques de Nóminas'];
      excelData.push(headers);
      excelData.push([]); // Fila vacía
      
      // Datos del operario
      const row = [
        worker.code || '',
        worker.name || '',
        worker.dni || '',
        calculationResult.workedCount,
        calculationResult.weekendCount,
        calculationResult.totalCount,
        calculationResult.nominasCount
      ];
      
      excelData.push(row);
      
      // Crear archivo Excel
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(excelData);
      
      // Configurar anchos de columna
      ws['!cols'] = [
        { wch: 15 }, // Código Operario
        { wch: 30 }, // Nombre Completo
        { wch: 15 }, // DNI
        { wch: 15 }, // Días Trabajados
        { wch: 15 }, // Fines de Semana
        { wch: 10 }, // Total
        { wch: 18 }  // Bloques de Nóminas
      ];
      
      // Combinar celda de título
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];
      
      // Estilo para la cabecera principal
      ws['A1'].s = {
        font: { bold: true, sz: 16 },
        alignment: { horizontal: 'center' }
      };
      
      XLSX.utils.book_append_sheet(wb, ws, 'Días Trabajados');
      
      // Generar nombre de archivo
      const fileName = `Días Trabajados FD ${worker.code} ${monthName} ${year}.xlsx`;
      
      // Descargar archivo
      XLSX.writeFile(wb, fileName);
      
      showNotification(`Días trabajados exportados: ${fileName}`, 'success');
      
    } catch (error) {
      console.error('Error al exportar días trabajados:', error);
      showNotification('Error al exportar días trabajados', 'error');
    }
  };

  // ── Exportar TODOS los Días Trabajados FIJOS DISCONTINUOS ───────────────────
  const exportAllFDDaysToExcel = () => {
    try {
      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const [year, month] = fdExportMonth.split('-').map(Number);
      const monthName = monthNames[month - 1];
      
      // Filtrar solo FIJOS DISCONTINUOS
      const fdWorkers = planning.workers.filter(w => w.contractType === ContractType.FIJO_DISCONTINUO && !w.isArchived);
      
      if (fdWorkers.length === 0) {
        showNotification("No hay FIJOS DISCONTINUOS para exportar", "info");
        return;
      }
      
      // Preparar datos para Excel
      const excelData: any[][] = [];
      
      // Cabecera principal
      excelData.push([`DÍAS TRABAJADOS FIJOS DISCONTINUOS - ${monthName} ${year}`]);
      excelData.push([]); // Fila vacía
      
      // Cabeceras de columnas
      const headers = ['Código Operario', 'Nombre Completo', 'DNI', 'Días Trabajados', 'Fines de Semana', 'Total', 'Bloques de Nóminas'];
      excelData.push(headers);
      excelData.push([]); // Fila vacía
      
      // Datos de todos los operarios FD
      fdWorkers.forEach(worker => {
        const calculationResult = calculateWorkerDays(worker.id, fdExportMonth);
        
        const row = [
          worker.code || '',
          worker.name || '',
          worker.dni || '',
          calculationResult.workedCount,
          calculationResult.weekendCount,
          calculationResult.totalCount,
          calculationResult.nominasCount
        ];
        
        excelData.push(row);
      });
      
      // Fila de totales generales
      const totalsRow = ['TOTALES', '', '', '', '', '', ''];
      excelData.push([]);
      excelData.push(totalsRow);
      
      // Calcular totales generales
      let totalWorked = 0;
      let totalWeekend = 0;
      let totalDays = 0;
      let totalNominas = 0;
      
      fdWorkers.forEach(worker => {
        const result = calculateWorkerDays(worker.id, fdExportMonth);
        totalWorked += result.workedCount;
        totalWeekend += result.weekendCount;
        totalDays += result.totalCount;
        totalNominas += result.nominasCount;
      });
      
      // Fila con totales calculados
      const totalsData = ['', '', 'TOTALES', totalWorked, totalWeekend, totalDays, ''];
      excelData.push(totalsData);
      
      // Crear archivo Excel
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(excelData);
      
      // Configurar anchos de columna
      ws['!cols'] = [
        { wch: 15 }, // Código Operario
        { wch: 30 }, // Nombre Completo
        { wch: 15 }, // DNI
        { wch: 15 }, // Días Trabajados
        { wch: 15 }, // Fines de Semana
        { wch: 10 }, // Total
        { wch: 18 }  // Bloques de Nóminas
      ];
      
      // Combinar celda de título
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];
      
      // Estilo para la cabecera principal
      ws['A1'].s = {
        font: { bold: true, sz: 16 },
        alignment: { horizontal: 'center' }
      };
      
      XLSX.utils.book_append_sheet(wb, ws, 'Días Trabajados FD');
      
      // Generar nombre de archivo
      const fileName = `Días Trabajados FD Todos ${monthName} ${year}.xlsx`;
      
      // Descargar archivo
      XLSX.writeFile(wb, fileName);
      
      showNotification(`Días trabajados de ${fdWorkers.length} FIJOS DISCONTINUOS exportados: ${fileName}`, 'success');
      
    } catch (error) {
      console.error('Error al exportar días trabajados FD:', error);
      showNotification('Error al exportar días trabajados FD', 'error');
    }
  };

  const handleOpenNewWorker = () => {
    setEditingWorker({ id: `w-${Date.now()}`, code: '', name: '', apodo: undefined, dni: '', phone: '', role: 'Mozo Almacén', status: WorkerStatus.DISPONIBLE, contractType: ContractType.FIJO_DISCONTINUO, hasVehicle: false, startTime: '09:00', endTime: '17:00', restrictions: [], restrictedClientIds: [], skills: [JobType.MANIPULACION], completedCourses: [] });
  };

  // ── Cargar Matriz de Distancias ───────────────────────────────────────────
  const cargarMatrizDistancias = async () => {
    try {
      // Añadir timestamp para evitar caché
      const timestamp = new Date().getTime();
      const response = await fetch(`/data/matriz-distancias.xlsx?t=${timestamp}`);
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Extraer nombres de sedes de la primera fila y primera columna
      const sedes = data[0].slice(1); // Primera fila sin el primer elemento vacío
      const matriz = new Map();
      
      // Procesar matriz (empezando desde fila 1, columna 1)
      for (let i = 1; i < data.length; i++) {
        const origen = data[i][0]; // Primera columna
        for (let j = 1; j < data[i].length; j++) {
          const destino = sedes[j - 1];
          const distancia = data[i][j];
          
          if (origen && destino && distancia > 0) {
            const clave = `${origen}|${destino}`;
            matriz.set(clave, distancia);
          }
        }
      }
      
      console.log(`Matriz cargada: ${matriz.size} distancias, ${sedes.length} sedes`);
      setMatrizDistancias(matriz);
      setSedesMatriz(sedes);
      showNotification(`Matriz actualizada: ${sedes.length} sedes, ${matriz.size} distancias`, 'success');
    } catch (error) {
      console.error('Error cargando matriz:', error);
      showNotification('Error al cargar matriz de distancias', 'error');
    }
  };

  // ── Calcular kilómetros entre sedes ─────────────────────────────────────
  const calcularKilometros = () => {
    if (!origenSeleccionado || !destinoSeleccionado) {
      setKilometrosCalculados(0);
      return;
    }
    
    if (origenSeleccionado === destinoSeleccionado) {
      setKilometrosCalculados(0);
      return;
    }
    
    const clave = `${origenSeleccionado}|${destinoSeleccionado}`;
    const distancia = matrizDistancias.get(clave) || 0;
    setKilometrosCalculados(distancia);
  };

  // ── Cargar matriz al iniciar la app ─────────────────────────────────────
  useEffect(() => {
    cargarMatrizDistancias();
  }, []);

  // ── Recalcular cuando cambian los selectores ───────────────────────────
  useEffect(() => {
    calcularKilometros();
  }, [origenSeleccionado, destinoSeleccionado, matrizDistancias]);

  // ── Funciones para Kilómetros Pagados ─────────────────────────────────
  const obtenerSedeTarea = (job: Job) => {
    const client = planning.clients.find(c => c.id === job.clientId);
    const center = client?.centers.find(ct => ct.id === job.centerId);
    return `${client?.name} - ${center?.name}`;
  };

  const obtenerSedeTareaConColor = (job: Job, index: number) => {
    const client = planning.clients.find(c => c.id === job.clientId);
    const center = client?.centers.find(ct => ct.id === job.centerId);
    const nombreSede = `${client?.name} - ${center?.name}`;
    
    // Colores para las sedes según su posición
    const colores = [
      'text-gray-600',    // Primera sede - gris
      'text-blue-600',    // Segunda sede - azul
      'text-green-600',   // Tercera sede - verde
      'text-purple-600',  // Cuarta sede - púrpura
      'text-orange-600',  // Quinta sede - naranja
      'text-pink-600',    // Sexta sede - rosa
      'text-indigo-600',  // Séptima sede - índigo
      'text-red-600',     // Octava sede - rojo
      'text-teal-600',    // Novena sede - teal
      'text-amber-600'    // Décima sede - ámbar
    ];
    
    const color = colores[index % colores.length];
    
    return {
      nombre: nombreSede,
      color: color
    };
  };

  const obtenerTareasDia = (operarioId: string, fecha: string) => {
    return planning.jobs
      .filter(job => 
        job.date === fecha && 
        job.assignedWorkerIds.includes(operarioId) && 
        !job.isCancelled
      )
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const obtenerDiasRango = (fechaInicio: string, fechaFin: string) => {
    const dias = [];
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    
    for (let dia = new Date(inicio); dia <= fin; dia.setDate(dia.getDate() + 1)) {
      dias.push(dia.toISOString().split('T')[0]);
    }
    
    return dias;
  };

  const calcularDistancia = (origen: string, destino: string) => {
    const clave = `${origen}|${destino}`;
    return matrizDistancias.get(clave) || 0;
  };

  const calcularKilometrosPagados = async () => {
    if (!operarioSeleccionado || !fechaInicio || !fechaFin) {
      showNotification('Por favor, completa todos los campos', 'warning');
      return;
    }

    setCalculandoKilometros(true);
    
    try {
      let totalKm = 0;
      const detalles = [];
      
      const dias = obtenerDiasRango(fechaInicio, fechaFin);
      
      for (const fecha of dias) {
        const tareasDia = obtenerTareasDia(operarioSeleccionado, fecha);
        
        if (tareasDia.length === 0) continue;
        
        let kmDia = 0;
        const detallesDia = {
          fecha,
          tareas: tareasDia.length,
          kmPrimero: { valor: 0, paga: false, destino: '' },
          kmIntermedios: 0,
          intermediosDetalles: [],
          kmUltimo: { valor: 0, paga: false, origen: '' },
          kmTotal: 0,
          sedesTrabajadas: [],
          sedesConColores: []
        };
        
        // Primer trayecto: OFICINA → primera sede
        const primerDestinoInfo = obtenerSedeTareaConColor(tareasDia[0], 0);
        const kmPrimero = calcularDistancia('OFICINA - VALENCIA', primerDestinoInfo.nombre);
        const pagaPrimero = kmPrimero >= 17;
        
        detallesDia.kmPrimero = { valor: kmPrimero, paga: pagaPrimero, destino: primerDestinoInfo.nombre };
        detallesDia.sedesTrabajadas.push(primerDestinoInfo.nombre);
        detallesDia.sedesConColores.push(primerDestinoInfo);
        
        if (pagaPrimero) {
          kmDia += kmPrimero;
        }
        
        // Trayectos intermedios - SIEMPRE PAGAN (sin importar distancia)
        let kmIntermedios = 0;
        const intermediosDetalles = [];
        
        for (let i = 1; i < tareasDia.length; i++) {
          const origenInfo = obtenerSedeTareaConColor(tareasDia[i-1], i-1);
          const destinoInfo = obtenerSedeTareaConColor(tareasDia[i], i);
          const kmIntermedio = calcularDistancia(origenInfo.nombre, destinoInfo.nombre);
          kmIntermedios += kmIntermedio;
          
          intermediosDetalles.push({
            origen: origenInfo.nombre,
            destino: destinoInfo.nombre,
            km: kmIntermedio,
            siemprePaga: true
          });
          
          if (!detallesDia.sedesTrabajadas.includes(destinoInfo.nombre)) {
            detallesDia.sedesTrabajadas.push(destinoInfo.nombre);
            detallesDia.sedesConColores.push(destinoInfo);
          }
        }
        
        detallesDia.kmIntermedios = kmIntermedios;
        detallesDia.intermediosDetalles = intermediosDetalles;
        kmDia += kmIntermedios; // SIEMPRE se añaden
        
        // Último trayecto: última sede → OFICINA
        const ultimaTarea = tareasDia[tareasDia.length-1];
        const ultimoOrigenInfo = obtenerSedeTareaConColor(ultimaTarea, tareasDia.length-1);
        const kmUltimo = calcularDistancia(ultimoOrigenInfo.nombre, 'OFICINA - VALENCIA');
        const pagaUltimo = kmUltimo >= 17;
        
        detallesDia.kmUltimo = { valor: kmUltimo, paga: pagaUltimo, origen: ultimoOrigenInfo.nombre };
        
        if (pagaUltimo) {
          kmDia += kmUltimo;
        }
        
        detallesDia.kmTotal = kmDia;
        totalKm += kmDia;
        detalles.push(detallesDia);
      }
      
      setKilometrosPagados(totalKm);
      setDetallesKilometros(detalles);
      
      showNotification(`Cálculo completado: ${totalKm.toFixed(1)} km pagados`, 'success');
      
    } catch (error) {
      console.error('Error calculando kilómetros:', error);
      showNotification('Error al calcular kilómetros', 'error');
    } finally {
      setCalculandoKilometros(false);
    }
  };

  // ── Exportar Kilómetros Pagados a Excel ───────────────────────────────────
  const exportKilometrosPagados = () => {
    try {
      if (kilometrosPagados === 0 || detallesKilometros.length === 0) {
        showNotification("No hay datos para exportar", "info");
        return;
      }
      
      const operario = planning.workers.find(w => w.id === operarioSeleccionado);
      const operarioNombre = operario?.name || 'Operario';
      
      // Preparar datos para Excel
      const excelData: any[][] = [];
      
      // Cabecera principal
      excelData.push([`INFORME DE KILÓMETROS PAGADOS - ${operarioNombre}`]);
      excelData.push([`Período: ${formatDateDMY(fechaInicio)} al ${formatDateDMY(fechaFin)}`]);
      excelData.push([]); // Fila vacía
      
      // Resumen general
      excelData.push(['RESUMEN GENERAL']);
      excelData.push(['Total Kilómetros Pagados:', kilometrosPagados.toFixed(1), 'km']);
      excelData.push(['Días Trabajados:', detallesKilometros.length]);
      excelData.push(['Media Diaria:', (kilometrosPagados / detallesKilometros.length).toFixed(1), 'km']);
      excelData.push([]);
      
      // Cabeceras de tabla detallada
      const headers = [
        'Fecha',
        'Sedes Trabajadas',
        'Primer Trayecto (OFICINA → Sede)',
        'Km Primer Trayecto',
        'Paga Primer Trayecto',
        'Trayectos Intermedios',
        'Km Intermedios',
        'Último Trayecto (Sede → OFICINA)',
        'Km Último Trayecto',
        'Paga Último Trayecto',
        'Total Km Pagados Día'
      ];
      excelData.push(headers);
      excelData.push([]); // Fila vacía
      
      // Datos detallados por día
      detallesKilometros.forEach(dia => {
        const sedesStr = dia.sedesTrabajadas.join(' → ');
        const intermediosStr = dia.intermediosDetalles
          .map(d => `${d.origen} → ${d.destino} (${d.km}km)`)
          .join(' | ');
        
        const row = [
          formatDateDMY(dia.fecha),
          sedesStr,
          `OFICINA → ${dia.kmPrimero.destino}`,
          dia.kmPrimero.valor.toFixed(1),
          dia.kmPrimero.paga ? 'SÍ' : 'NO',
          intermediosStr || 'Sin intermedios',
          dia.kmIntermedios.toFixed(1),
          `${dia.kmUltimo.origen} → OFICINA`,
          dia.kmUltimo.valor.toFixed(1),
          dia.kmUltimo.paga ? 'SÍ' : 'NO',
          dia.kmTotal.toFixed(1)
        ];
        
        excelData.push(row);
      });
      
      // Estadísticas finales
      excelData.push([]);
      excelData.push(['ESTADÍSTICAS ADICIONALES']);
      excelData.push(['Primeros trayectos pagados:', detallesKilometros.filter(d => d.kmPrimero.paga).length, 'de', detallesKilometros.length]);
      excelData.push(['Últimos trayectos pagados:', detallesKilometros.filter(d => d.kmUltimo.paga).length, 'de', detallesKilometros.length]);
      excelData.push(['Total km intermedios:', detallesKilometros.reduce((sum, d) => sum + d.kmIntermedios, 0).toFixed(1), 'km']);
      
      // Crear archivo Excel
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(excelData);
      
      // Configurar anchos de columna
      ws['!cols'] = [
        { wch: 12 }, // Fecha
        { wch: 40 }, // Sedes Trabajadas
        { wch: 30 }, // Primer Trayecto
        { wch: 15 }, // Km Primer Trayecto
        { wch: 15 }, // Paga Primer Trayecto
        { wch: 50 }, // Trayectos Intermedios
        { wch: 15 }, // Km Intermedios
        { wch: 30 }, // Último Trayecto
        { wch: 15 }, // Km Último Trayecto
        { wch: 15 }, // Paga Último Trayecto
        { wch: 18 }  // Total Km Pagados Día
      ];
      
      // Combinar celdas de título
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } }
      ];
      
      // Estilos para cabeceras principales
      ws['A1'].s = {
        font: { bold: true, sz: 16 },
        alignment: { horizontal: 'center' }
      };
      ws['A2'].s = {
        font: { bold: true, sz: 12 },
        alignment: { horizontal: 'center' }
      };
      
      XLSX.utils.book_append_sheet(wb, ws, 'Kilómetros Pagados');
      
      // Generar nombre de archivo
      const fileName = `Kilometros Pagados ${operarioNombre} ${fechaInicio} a ${fechaFin}.xlsx`;
      
      // Descargar archivo
      XLSX.writeFile(wb, fileName);
      
      showNotification(`Kilómetros pagados exportados: ${fileName}`, 'success');
      
    } catch (error) {
      console.error('Error al exportar kilómetros pagados:', error);
      showNotification('Error al exportar kilómetros pagados', 'error');
    }
  };

  // ── Exportar Clientes a Excel ───────────────────────────────────────────────
  const exportClientsToExcel = () => {
    try {
      if (planning.clients.length === 0) {
        showNotification("No hay clientes para exportar", "info");
        return;
      }
      
      // Preparar datos para Excel
      const excelData: any[][] = [];
      
      // Cabecera principal
      excelData.push(['LISTADO DE CLIENTES Y SEDES']);
      excelData.push([]); // Fila vacía
      
      // Cabeceras de columnas
      const headers = ['Nombre Cliente', 'SEDE', 'Dirección de la Sede'];
      excelData.push(headers);
      excelData.push([]); // Fila vacía
      
      // Datos de clientes y sus sedes
      planning.clients.forEach(client => {
        if (client.centers && client.centers.length > 0) {
          // Una fila por cada sede
          client.centers.forEach(center => {
            const row = [
              client.name || '',
              center.name || '',
              center.address || ''
            ];
            excelData.push(row);
          });
        } else {
          // Cliente sin sedes
          const row = [
            client.name || '',
            'SIN SEDES',
            ''
          ];
          excelData.push(row);
        }
      });
      
      // Estadísticas finales
      const totalClients = planning.clients.length;
      const totalCenters = planning.clients.reduce((sum, client) => sum + (client.centers?.length || 0), 0);
      
      excelData.push([]);
      excelData.push(['RESUMEN']);
      excelData.push(['Total Clientes:', totalClients]);
      excelData.push(['Total Sedes:', totalCenters]);
      
      // Crear archivo Excel
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(excelData);
      
      // Configurar anchos de columna
      ws['!cols'] = [
        { wch: 30 }, // Nombre Cliente
        { wch: 25 }, // SEDE
        { wch: 40 }  // Dirección de la Sede
      ];
      
      // Combinar celda de título
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];
      
      // Estilo para la cabecera principal
      ws['A1'].s = {
        font: { bold: true, sz: 16 },
        alignment: { horizontal: 'center' }
      };
      
      XLSX.utils.book_append_sheet(wb, ws, 'Clientes y Sedes');
      
      // Generar nombre de archivo
      const fileName = `Clientes y Sedes ${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Descargar archivo
      XLSX.writeFile(wb, fileName);
      
      showNotification(`Clientes exportados: ${fileName}`, 'success');
      
    } catch (error) {
      console.error('Error al exportar clientes:', error);
      showNotification('Error al exportar clientes', 'error');
    }
  };

  const saveWorker = useCallback(async (worker: Worker | null) => {
    if (!worker || !worker.name || !worker.code) { showNotification("Nombre y Código requeridos", "error"); return; }
    await persistWorker(worker);
    setEditingWorker(null);
    showNotification(`Operario "${worker.name}" guardado correctamente`, "success");
  }, [persistWorker, showNotification]);

  // Función para calcular días trabajados por fijos discontinuos
const calculateFDDaysStats = useCallback(() => {
  const currentMonth = fdExportMonth;
  
  // Filtrar solo FIJOS DISCONTINUOS no archivados
  const fdWorkers = planning.workers.filter(w => w.contractType === ContractType.FIJO_DISCONTINUO && !w.isArchived);
  
  if (fdWorkers.length === 0) {
    return {
      workersWithDays: 0,
      laborableDays: 0,
      weekendDays: 0,
      totalDays: 0
    };
  }
  
  let totalLaborableDays = 0;
  let totalWeekendDays = 0;
  let workersWithDays = 0;
  
  // Usar la misma lógica que calculateWorkerDays para cada operario
  fdWorkers.forEach(worker => {
    const result = calculateWorkerDays(worker.id, currentMonth);
    
    if (result.workedCount > 0 || result.weekendCount > 0) {
      workersWithDays++;
    }
    
    totalLaborableDays += result.workedCount;
    totalWeekendDays += result.weekendCount;
  });
  
  return {
    workersWithDays,
    laborableDays: totalLaborableDays,
    weekendDays: totalWeekendDays,
    totalDays: totalLaborableDays + totalWeekendDays
  };
}, [planning.workers, planning.jobs, fdExportMonth, calculateWorkerDays]);

const fdDaysStats = calculateFDDaysStats();

const getCorrectWorkerStatus = (worker: Worker): WorkerStatus => getCurrentWorkerStatus(worker).status;

  const handleUpdateWorkerStatus = useCallback(async (workerId: string, status: WorkerStatus) => {
    const worker = planning.workers.find(w => w.id === workerId);
    if (!worker) return;
    await persistWorker({ ...worker, status });
  }, [planning.workers, persistWorker]);

  const handleAddStatusRecord = useCallback(async () => {
    if (!editingWorker) {
      return;
    }
    
    // SIEMPRE verificar si editingStatusRecord es null y manejarlo
    if (!editingStatusRecord) {
      // Leer los valores directamente de los inputs del formulario con selectores más específicos
      // Buscar el formulario de registro de estado específico
      const statusForm = Array.from(document.querySelectorAll('.bg-slate-50.rounded-xl')).find(form => {
        const label = form.querySelector('label');
        return label?.textContent?.includes('Estado');
      }) as HTMLElement;
      
      if (!statusForm) {
        return;
      }
      
      const statusSelect = statusForm.querySelector('select') as HTMLSelectElement;
      const dateInputs = statusForm.querySelectorAll('input[type="date"]');
      const startDateInput = dateInputs[0] as HTMLInputElement;
      const endDateInput = dateInputs[1] as HTMLInputElement;
      
      const status = statusSelect?.value as WorkerStatus || WorkerStatus.VACACIONES;
      const startDate = startDateInput?.value || '';
      let endDate = endDateInput?.value || startDate;
      
      // Verificar si está marcado como IND. (solo si el botón está presionado)
      const indButton = statusForm.querySelector('button[aria-pressed="true"]') as HTMLButtonElement;
      if (indButton && indButton.textContent?.includes('IND.')) {
        endDate = 'IND.';
      }
      
      // Validar que las fechas no estén vacías
      if (!startDate || startDate === '') {
        showNotification("Debes seleccionar una fecha de inicio", "error");
        return;
      }
      
      if (!endDate || endDate === '') {
        showNotification("Debes seleccionar una fecha de fin", "error");
        return;
      }
      
      // Usar los valores del formulario
      try {
        const updatedWorker = addOrUpdateStatusRecord(editingWorker, status, startDate, endDate, planning.customHolidays);
        const currentStatus = getCurrentWorkerStatus(updatedWorker);
        const finalWorker = { ...updatedWorker, status: currentStatus.status, statusStartDate: currentStatus.startDate, statusEndDate: currentStatus.endDate };
        setEditingWorker(finalWorker);
        await persistWorker(finalWorker);
        setShowAddRecordForm(false);
        showNotification("Registro de estado añadido", "success");
      } catch (error) {
        showNotification(error instanceof Error ? error.message : "Error al añadir registro de estado", "error");
      }
      return;
    }
    
    if (!editingStatusRecord.startDate) { 
      showNotification("Debes seleccionar una fecha de inicio", "error"); 
      return; 
    }
    
    if (!editingStatusRecord.endDate || editingStatusRecord.endDate === '') { 
      showNotification("Debes seleccionar una fecha de fin o marcar como IND.", "error"); 
      return; 
    }
    
    
    try {
      const updatedWorker = addOrUpdateStatusRecord(editingWorker, editingStatusRecord.status, editingStatusRecord.startDate, editingStatusRecord.endDate, planning.customHolidays);
      const currentStatus = getCurrentWorkerStatus(updatedWorker);
      const finalWorker = { ...updatedWorker, status: currentStatus.status, statusStartDate: currentStatus.startDate, statusEndDate: currentStatus.endDate };
      setEditingWorker(finalWorker);
      await persistWorker(finalWorker);
      setEditingStatusRecord(null);
      setShowAddRecordForm(false);
      
      // Verificar si las vacaciones incluyen festivos para advertir
      if (editingStatusRecord.status === WorkerStatus.VACACIONES) {
        const start = new Date(editingStatusRecord.startDate);
        const end = editingStatusRecord.endDate === 'IND.' ? new Date('9999-12-31') : new Date(editingStatusRecord.endDate);
        const holidaysInRange: string[] = [];
        
        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
          const dateStr = date.toISOString().split('T')[0];
          if (isHoliday(dateStr, planning.customHolidays)) {
            const holiday = planning.customHolidays.find(h => h.date === dateStr) || isHoliday(dateStr, planning.customHolidays);
            holidaysInRange.push(`${dateStr} (${holiday?.name || 'Festivo'})`);
          }
        }
        
        if (holidaysInRange.length > 0) {
          showNotification(
            `Vacaciones guardadas. Nota: Incluyen festivos: ${holidaysInRange.join(', ')}`,
            'warning'
          );
        } else {
          showNotification("Registro de estado añadido", "success");
        }
      } else {
        showNotification("Registro de estado añadido", "success");
      }
    } catch (error) {
      showNotification(error instanceof Error ? error.message : "Error al añadir registro de estado", "error");
    }
  }, [editingWorker, persistWorker, showNotification]);

  const handleEditStatusRecord = useCallback((recordId: string) => {
    const worker = planning.workers.find(w => w.id === editingWorker?.id);
    if (!worker) return;

    // Buscar el registro de estado por ID
    const statusRecord = worker.statusRecords?.find(r => r.id === recordId);
    if (!statusRecord) return;

    // Cargar el registro para edición
    setEditingStatusRecord({
      id: statusRecord.id,
      status: statusRecord.status,
      startDate: statusRecord.startDate,
      endDate: statusRecord.endDate || ''
    });
    setShowAddRecordForm(true);
  }, [editingWorker, planning.workers]);

  const handleDeleteStatusRecord = useCallback(async (recordId: string) => {
    const worker = planning.workers.find(w => w.id === editingWorker?.id);
    if (!worker) return;

    // Eliminar el registro de estado por ID
    const updatedWorker = {
      ...worker,
      statusRecords: worker.statusRecords?.filter(r => r.id !== recordId) || []
    };
    
    // Recalcular el estado actual
    const currentStatus = getCurrentWorkerStatus(updatedWorker);
    const finalWorker = { 
      ...updatedWorker, 
      status: currentStatus.status, 
      statusStartDate: currentStatus.startDate, 
      statusEndDate: currentStatus.endDate 
    };
    
    setEditingWorker(finalWorker);
    await persistWorker(finalWorker);
    showNotification("Registro de estado eliminado", "success");
  }, [editingWorker, planning.workers, persistWorker, showNotification]);

  const handleCheckWorkerStatuses = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const workersNeedingUpdate = planning.workers.filter(w => w.status !== WorkerStatus.DISPONIBLE && w.statusEndDate && w.statusEndDate < today);
    if (workersNeedingUpdate.length > 0) {
      await Promise.all(workersNeedingUpdate.map(w => persistWorker({ ...w, status: WorkerStatus.DISPONIBLE, statusStartDate: undefined, statusEndDate: undefined })));
      showNotification(`${workersNeedingUpdate.length} operario(s) actualizados a Disponible`, 'success');
    } else {
      showNotification("Todos los operarios tienen el estado correcto", "success");
    }
  }, [planning.workers, persistWorker, showNotification]);

  // ── CRUD: Clients ──────────────────────────────────────────────────────────
  const saveClient = useCallback(async (client: Client | null) => {
    if (!client || !client.name) { showNotification("Nombre empresa requerido", "error"); return; }
    await persistClient(client);
    setEditingClient(null);
    showNotification(`Cliente "${client.name}" guardado correctamente`, "success");
  }, [persistClient, showNotification]);

  const handleOpenNewClientHandler = () => {
    setEditingClient({ id: `c-${Date.now()}`, name: '', cif: '', logo: '?', phone: '', contactPerson: '', email: '', location: '', priority: 3, centers: [], regularTasks: [], requiredCourses: [], allowFreeTextTask: true });
  };

  // ── CRUD: Standard tasks ───────────────────────────────────────────────────
  const handleOpenNewStandardTask = () => setEditingStandardTask({ id: `st-${Date.now()}`, name: '', type: JobType.MANIPULACION, defaultWorkers: 2, notes: '', assignedClientIds: [] });

  const saveStandardTask = useCallback(async (task: StandardTask) => {
    if (!task.name) return;
    await persistStandardTask(task);
    setEditingStandardTask(null);
    showNotification("Tarea estándar guardada", "success");
  }, [persistStandardTask, showNotification]);

  const deleteStandardTask = useCallback(async (taskId: string) => {
    await persistDeleteStandardTask(taskId);
    setEditingStandardTask(null);
    showNotification("Tarea eliminada", "success");
  }, [persistDeleteStandardTask, showNotification]);

  // ── CRUD: Courses ──────────────────────────────────────────────────────────
  const handleAddGlobalCourse = useCallback(async () => {
    if (!newCourseName.trim()) return;
    const newCourse: Course = { id: `course-${Date.now()}`, name: newCourseName.trim(), description: '', validityMonths: 12, assignedWorkerIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await persistCourse(newCourse);
    setNewCourseName('');
    showNotification("Curso añadido", "success");
  }, [newCourseName, persistCourse, showNotification]);

  const deleteCourse = useCallback(async (id: string) => {
    await persistDeleteCourse(id);
    setEditingCourse(null);
    showNotification("Curso eliminado", "success");
  }, [persistDeleteCourse, showNotification]);

  const saveCourse = useCallback(async (course: Course) => {
    await persistCourse({ ...course, updatedAt: new Date().toISOString() });
    setEditingCourse(null);
    showNotification("Curso guardado", "success");
  }, [persistCourse, showNotification]);

  const addWorkerToCourse = useCallback(async (courseId: string, workerId: string) => {
    const course = planning.courses.find(c => c.id === courseId);
    if (!course) return;
    await persistCourse({ ...course, assignedWorkerIds: [...course.assignedWorkerIds, workerId], updatedAt: new Date().toISOString() });
    showNotification("Operario añadido al curso", "success");
  }, [planning.courses, persistCourse, showNotification]);

  const removeWorkerFromCourse = useCallback(async (courseId: string, workerId: string) => {
    const course = planning.courses.find(c => c.id === courseId);
    if (!course) return;
    await persistCourse({ ...course, assignedWorkerIds: course.assignedWorkerIds.filter(id => id !== workerId), updatedAt: new Date().toISOString() });
    showNotification("Operario eliminado del curso", "success");
  }, [planning.courses, persistCourse, showNotification]);

  const getWorkerCourses = (workerId: string) => planning.courses.filter(course => course.assignedWorkerIds.includes(workerId));
  const isCourseExpired = (_course: Course, _workerId: string) => false;

  // ── CRUD: Daily notes ──────────────────────────────────────────────────────
  const saveDailyNote = useCallback(async () => {
    if (!editingDailyNote) return;
    if (!editingDailyNote.text.trim()) { await persistDeleteDailyNote(editingDailyNote.id); setEditingDailyNote(null); return; }
    await persistDailyNote(editingDailyNote);
    setEditingDailyNote(null);
    showNotification("Nota guardada", "success");
  }, [editingDailyNote, persistDailyNote, persistDeleteDailyNote, showNotification]);

  const deleteDailyNote = useCallback(async (id: string) => {
    await persistDeleteDailyNote(id);
    setEditingDailyNote(null);
    showNotification("Nota eliminada", "success");
  }, [persistDeleteDailyNote, showNotification]);

  // ── CRUD: Vehicles ─────────────────────────────────────────────────────────
  const handleAddVehicle = useCallback(async (v: Vehicle) => {
    await persistVehicle(v);
    showNotification("Vehículo añadido", "success");
  }, [persistVehicle, showNotification]);

  const handleEditVehicle = useCallback(async (v: Vehicle) => {
    await persistVehicle(v);
    showNotification("Vehículo actualizado", "success");
  }, [persistVehicle, showNotification]);

  const handleDeleteVehicle = useCallback(async (id: string) => {
    await persistDeleteVehicle(id);
    showNotification("Vehículo eliminado", "success");
  }, [persistDeleteVehicle, showNotification]);

  const handleAssignVehicle = useCallback(async (vehicleId: string, workerId: string) => {
    // Eliminar asignaciones previas del mismo vehículo o trabajador en la fecha actual
    const toDelete = planning.vehicleAssignments.filter(a => a.date === planning.currentDate && (a.workerId === workerId || a.vehicleId === vehicleId));
    await Promise.all(toDelete.map(a => persistDeleteVehicleAssignment(a.id)));
    const newAssignment: VehicleAssignment = { id: `va-${Date.now()}`, vehicleId, workerId, date: planning.currentDate };
    await persistVehicleAssignment(newAssignment);
    showNotification("Vehículo asignado", "success");
  }, [planning, persistVehicleAssignment, persistDeleteVehicleAssignment, showNotification]);

  const handleRemoveAssignment = useCallback(async (assignmentId: string) => {
    await persistDeleteVehicleAssignment(assignmentId);
  }, [persistDeleteVehicleAssignment]);

  // ── CRUD: Fuel ─────────────────────────────────────────────────────────────
  const handleAddFuel = useCallback(async () => {
    if (!editingWorker || !newFuelRecord.cost) return;
    const rec: FuelRecord = { id: `f-${Date.now()}`, workerId: editingWorker.id, date: newFuelRecord.date, liters: parseFloat(newFuelRecord.liters) || 0, cost: parseFloat(newFuelRecord.cost), odometer: parseFloat(newFuelRecord.odometer) || 0 };
    await persistFuelRecord(rec);
    setNewFuelRecord({ liters: '', cost: '', odometer: '', date: new Date().toISOString().split('T')[0] });
    showNotification("Repostaje guardado", "success");
  }, [editingWorker, newFuelRecord, persistFuelRecord, showNotification]);

  const handleDeleteFuel = useCallback(async (id: string) => {
    await persistDeleteFuelRecord(id);
    showNotification("Repostaje eliminado", "success");
  }, [persistDeleteFuelRecord, showNotification]);

  // ── Eliminación con confirmación ───────────────────────────────────────────
  const executeDelete = useCallback(async () => {
    if (!itemToDelete) return;
    const { id, type } = itemToDelete;
    if (type === 'job') await persistDeleteJob(id);
    else if (type === 'worker') await persistDeleteWorker(id);
    else if (type === 'client') await persistDeleteClient(id);
    else if (type === 'task') await persistDeleteStandardTask(id);
    else if (type === 'course') await persistDeleteCourse(id);
    setItemToDelete(null);
    setEditingJob(null); setEditingWorker(null); setEditingClient(null); setEditingStandardTask(null); setEditingCourse(null);
    showNotification("Eliminado correctamente", "success");
  }, [itemToDelete, persistDeleteJob, persistDeleteWorker, persistDeleteClient, persistDeleteStandardTask, persistDeleteCourse, showNotification]);

  // ── Navegación de fechas ───────────────────────────────────────────────────
  const handleDateChange = (newDate: string) => {
    setPlanning(prev => ({ ...prev, currentDate: newDate }));
  };

  const shiftDate = (days: number) => {
    const d = new Date(planning.currentDate);
    d.setDate(d.getDate() + days);
    handleDateChange(d.toISOString().split('T')[0]);
  };

  const goToToday = () => {
    handleDateChange(new Date().toISOString().split('T')[0]);
  };

  // ── Notificaciones SS ──────────────────────────────────────────────────────
  const toggleNotificationStatus = useCallback(async (workerId: string, date: string, markAsDone: boolean) => {
    const key = date;
    const current = planning.notifications[key] || [];
    const updated = markAsDone ? [...current.filter(id => id !== workerId), workerId] : current.filter(id => id !== workerId);
    const newNotifications = { ...planning.notifications, [key]: updated };
    setPlanning(prev => ({ ...prev, notifications: newNotifications }));
    // Persist to app_settings
    const { error } = await supabase.from('app_settings').upsert({ key: 'notifications', value: newNotifications });
    if (error) console.error('Error guardando notificaciones:', error);
  }, [planning.notifications, setPlanning]);

  const handleCopyList = (list: Worker[], type: 'altas' | 'bajas') => {
    
    // Obtener fecha actual en formato DD-MM-YYYY
    const today = new Date();
    const dateStr = today.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    }).replace(/\//g, '-');
    
    // Crear encabezado y lista
    const header = `${type.toUpperCase()} ${dateStr}`;
    const workerList = list.map(w => `${getWorkerSSFormat(w)}`).join('\n');
    const text = `${header}\n\n${workerList}`;
    
    console.log('📝 Texto a copiar:', text);
    
    // Función para copiar texto (fallback para navegadores que no soportan clipboard API)
    const copyToClipboard = (text: string) => {
      // Método 1: Usar clipboard API si está disponible
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
      }
      
      // Método 2: Fallback para navegadores antiguos
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      return new Promise<void>((resolve, reject) => {
        try {
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          if (successful) {
            resolve();
          } else {
            reject(new Error('Fallback copy failed'));
          }
        } catch (err) {
          document.body.removeChild(textArea);
          reject(err);
        }
      });
    };
    
    copyToClipboard(text).then(() => {
      showNotification(`Lista de ${type} copiada`, 'success');
    }).catch((error) => {
      console.error('Error copiando al clipboard:', error);
      showNotification('Error al copiar', 'error');
    });
  };

  // ── Exportar backup JSON ───────────────────────────────────────────────────
  const exportBackup = () => {
    const dataStr = JSON.stringify(planning, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const now = new Date();
    link.download = `backup_${now.toISOString().split('T')[0]}_${now.toTimeString().split(' ')[0].replace(/:/g, '-')}.json`;
    link.click();
    showNotification(`Backup exportado: ${Math.round(dataStr.length / 1024)}KB`, 'success');
  };

  const exportCleanBackup = exportBackup; // En v2 no hay diferencia

  const exportDatabaseToExcel = () => showNotification("Función disponible", "info");
  const downloadExcelTemplate = () => showNotification("Plantilla descargada", "info");

  // ── Exportar Control de Operarios ─────────────────────────────────────────────
  const exportWorkerControlData = () => {
    try {
      // Obtener días del mes seleccionado
      const days = getMonthDays(selectedMonth);
      const [year, month] = selectedMonth.split('-').map(Number);
      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const monthName = monthNames[month - 1];
      
      // Filtrar operarios no archivados y ordenar por código
      const activeWorkers = planning.workers
        .filter(w => !w.isArchived)
        .sort((a, b) => {
          // Extraer parte numérica del código (ej: X001 -> 1, X010 -> 10)
          const getCodeNumber = (code: string) => {
            const match = code?.match(/\d+/);
            return match ? parseInt(match[0]) : 0;
          };
          
          const codeA = getCodeNumber(a.code || '');
          const codeB = getCodeNumber(b.code || '');
          
          return codeA - codeB;
        });
      
      // Preparar datos para Excel
      const excelData: any[][] = [];
      
      // Cabecera principal
      excelData.push([`CONTROL DE OPERARIOS - ${monthName} ${year}`]);
      excelData.push([]); // Fila vacía
      
      // Cabeceras de columnas
      const headers = ['Código', 'Nombre', 'DNI', 'Contrato'];
      
      // Añadir días del mes
      days.forEach(day => {
        headers.push(`${day}`);
      });
      
      // Añadir columnas de totales
      headers.push('Faltas', 'Baja Médica', 'Reposo', 'Vacaciones', 'Horas', 'Saldo Vacaciones', 'Anticipo', 'S. Bruto', 'S. Neto');
      
      excelData.push(headers);
      excelData.push([]); // Fila vacía después de cabeceras
      
      // Datos de cada operario
      activeWorkers.forEach(worker => {
        const row = [
          worker.code || '',
          worker.name || '',
          worker.dni || '',
          worker.contractType || ''
        ];
        
        // Añadir datos de cada día
        days.forEach(day => {
          const cellValue = getCellValue(worker.id, day);
          row.push(cellValue || '');
        });
        
        // Calcular totales para este operario
        const totals = calculateWorkerTotals(worker.id);
        const vac = calculateVacationBalance(worker.id);
        const advance = getWorkerAdvance(worker.id);
        const accumulated = calculateAccumulatedHours(worker.id);
        const displayTotal = totals.totalHours + accumulated; // Mismo valor que en el grid
        
        row.push(
          totals.totalFaltas || 0,
          totals.totalBajaMedica || 0,
          totals.totalReposo || 0,
          totals.totalVacaciones || 0,
          displayTotal || 0, // 🎯 CORREGIDO: Usar displayTotal como en el grid
          vac.remaining || 0,
          advance || 0,
          worker.salary || '',
          worker.netSalary || (worker.salary ? Math.round(worker.salary * 0.8) : '') // S. Neto (80% del S. Bruto si no hay valor específico)
        );
        
        excelData.push(row);
      });
      
      // Fila de totales generales
      const grandTotals = calculateGrandTotals(selectedMonth);
      const totalsRow = ['TOTALES', '', '', ''];
      
      // Totales por día
      days.forEach(day => {
        const dayTotal = calculateDayTotals(day);
        totalsRow.push(dayTotal.totalHours || 0);
      });
      
      // Totales generales
      totalsRow.push(
        grandTotals.totalFaltas || 0,
        grandTotals.totalBajaMedica || 0,
        grandTotals.totalReposo || 0,
        grandTotals.totalVacaciones || 0,
        grandTotals.totalHours || 0,
        '',
        '',
        activeWorkers.reduce((sum, w) => sum + (w.salary || 0), 0),
        activeWorkers.reduce((sum, w) => sum + (w.netSalary || (w.salary ? Math.round(w.salary * 0.8) : 0)), 0)
      );
      
      excelData.push([]);
      excelData.push(totalsRow);
      
      // Crear archivo Excel
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(excelData);
      
      // Configurar anchos de columna
      const colWidths = [
        { wch: 10 }, // Código
        { wch: 25 }, // Nombre
        { wch: 12 }, // DNI
        { wch: 10 }, // Contrato
        ...days.map(() => ({ wch: 6 })), // Días del mes
        { wch: 8 },  // Faltas
        { wch: 10 }, // Baja Médica
        { wch: 8 },  // Reposo
        { wch: 10 }, // Vacaciones
        { wch: 8 },  // Horas
        { wch: 12 }, // Saldo Vacaciones
        { wch: 8 },  // Anticipo
        { wch: 10 }, // S. Bruto
        { wch: 10 }  // S. Neto
      ];
      ws['!cols'] = colWidths;
      
      // Combinar celda de título
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];
      
      // Estilo para la cabecera principal
      ws['A1'].s = {
        font: { bold: true, sz: 16 },
        alignment: { horizontal: 'center' }
      };
      
      XLSX.utils.book_append_sheet(wb, ws, 'Control Operarios');
      
      // Generar nombre de archivo
      const fileName = `Control Operarios ${monthName} ${year}.xlsx`;
      
      // Descargar archivo
      XLSX.writeFile(wb, fileName);
      
      showNotification(`Control de operarios exportado: ${fileName}`, 'success');
      
    } catch (error) {
      console.error('Error al exportar control de operarios:', error);
      showNotification('Error al exportar el control de operarios', 'error');
    }
  };

  // ── Importar backup JSON ───────────────────────────────────────────────────
  const importData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      showNotification("Importando datos...", "info");
      if (file.name.endsWith('.json')) {
        const text = await file.text();
        const importedData = JSON.parse(text);
        // Guardar cada entidad en su tabla correspondiente
        const promises: Promise<any>[] = [];
        (importedData.workers || []).forEach((w: Worker) => promises.push(persistWorker(w)));
        (importedData.clients || []).forEach((c: Client) => promises.push(persistClient(c)));
        (importedData.jobs || []).forEach((j: Job) => promises.push(persistJob(j)));
        (importedData.standardTasks || []).forEach((t: StandardTask) => promises.push(persistStandardTask(t)));
        (importedData.vehicles || []).forEach((v: Vehicle) => promises.push(persistVehicle(v)));
        (importedData.vehicleAssignments || []).forEach((a: VehicleAssignment) => promises.push(persistVehicleAssignment(a)));
        (importedData.fuelRecords || []).forEach((r: FuelRecord) => promises.push(persistFuelRecord(r)));
        (importedData.dailyNotes || []).forEach((n: DailyNote) => promises.push(persistDailyNote(n)));
        (importedData.medicalCourses || []).forEach((c: MedicalCourse) => promises.push(persistMedicalCourse(c)));
        (importedData.courses || []).forEach((c: Course) => promises.push(persistCourse(c)));
        (importedData.customHolidays || []).forEach((h: Holiday) => promises.push(persistHoliday(h)));
        await Promise.all(promises);
        showNotification("¡Datos importados correctamente!", "success");
      }
      setShowBackupModal(false);
    } catch (error) {
      showNotification("Error al importar el archivo", "error");
    }
  };

  // ── Funciones de UI auxiliares ─────────────────────────────────────────────
  const handleShowWorkerList = (clientId: string, centerId: string, date: string) => setWorkerListModal({ clientId, centerId, date });

  const generateWorkerListText = (clientId: string, centerId: string, date: string) => {
    const relevantJobs = planning.jobs.filter(job => job.clientId === clientId && job.centerId === centerId && job.date === date && !job.isCancelled);
    const allWorkerIds = new Set<string>();
    relevantJobs.forEach(job => job.assignedWorkerIds.forEach(id => allWorkerIds.add(id)));
    const workers = Array.from(allWorkerIds).map(id => planning.workers.find(w => w.id === id)).filter(Boolean).sort((a, b) => a!.name.localeCompare(b!.name)) as Worker[];
    const client = planning.clients.find(c => c.id === clientId);
    const center = client?.centers.find(ct => ct.id === centerId);
    let text = `LISTADO DE OPERARIOS\n====================\n\nCLIENTE: ${client?.name || 'Desconocido'}\nSEDE: ${center?.name || 'Desconocido'}\nFECHA: ${formatDateDMY(date)}\nTOTAL OPERARIOS: ${workers.length}\n\n---------------------\nOPERARIOS ASIGNADOS:\n---------------------\n\n`;
    workers.forEach((w, i) => { text += `${i + 1}. ${w.name}\n   DNI: ${w.dni}\n   CATEGORÍA: ${w.role}\n\n`; });
    return text;
  };

  const copyWorkerListToClipboard = (clientId: string, centerId: string, date: string) => {
    const text = generateWorkerListText(clientId, centerId, date);
    
    if (!navigator.clipboard) {
      console.error('❌ Navigator.clipboard no disponible, usando fallback');
      const textarea = document.createElement('textarea');
      textarea.value = text; 
      textarea.style.position = 'fixed'; 
      textarea.style.left = '-999999px';
      document.body.appendChild(textarea); 
      textarea.select(); 
      document.execCommand('copy');
      document.body.removeChild(textarea); 
      showNotification('Listado copiado', 'success');
      return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
      showNotification('Listado copiado al portapapeles', 'success');
    }).catch((error) => {
      console.error('Error copiando al clipboard:', error);
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text; 
      textarea.style.position = 'fixed'; 
      textarea.style.left = '-999999px';
      document.body.appendChild(textarea); 
      textarea.select(); 
      document.execCommand('copy');
      document.body.removeChild(textarea); 
      showNotification('Listado copiado', 'success');
    });
  };

  const generateWhatsAppMessage = (workerId: string): string => {
    const worker = planning.workers.find(w => w.id === workerId);
    if (!worker) return '';
    const workerJobs = planning.jobs.filter(j => j.date === planning.currentDate && !j.isCancelled && j.assignedWorkerIds.includes(workerId));
    if (workerJobs.length === 0) return `Hola ${getWorkerDisplayName(worker)}, mañana no tienes asignación.`;
    
    // Ordenar tareas por hora de inicio para tomar la primera del día
    const sortedJobs = workerJobs.sort((a, b) => a.startTime.localeCompare(b.startTime));
    const firstJob = sortedJobs[0];
    
    const client = planning.clients.find(c => c.id === firstJob.clientId);
    const center = client?.centers.find(ct => ct.id === firstJob.centerId);
    return `Hola ${getWorkerDisplayName(worker)}, mañana ${formatDateWithDay(planning.currentDate)} tienes asignación en *${client?.name || 'cliente'}* (${center?.name || 'sede'}) de ${firstJob.startTime} a ${firstJob.endTime}.`;
  };

  // ── Memos ──────────────────────────────────────────────────────────────────
  const datesToShow = useMemo(() => {
    if (viewMode === 'day') return [planning.currentDate];
    const d = [];
    let c = new Date(rangeStartDate);
    const end = new Date(rangeEndDate);
    while (c <= end) { d.push(c.toISOString().split('T')[0]); c.setDate(c.getDate() + 1); }
    return d;
  }, [viewMode, planning.currentDate, rangeStartDate, rangeEndDate]);

  const cleanupOldData = (data: PlanningState): PlanningState => ({
    ...data,
    standardTasks: (data.standardTasks || []).filter(t => t.id && t.name && t.defaultWorkers && t.type && Array.isArray(t.assignedClientIds)),
    clients: (data.clients || []).map(c => ({ ...c })), // Eliminar regularTasks
    courses: (data.courses || []).filter(c => c.id && c.name && Array.isArray(c.assignedWorkerIds)),
    workers: data.workers || [], jobs: data.jobs || [], vehicles: data.vehicles || [], vehicleAssignments: data.vehicleAssignments || [], holidays: data.holidays || []
  });

  const cleanedPlanning = useMemo(() => cleanupOldData(planning), [planning]);

  const filteredWorkersTable = useMemo(() => {
    let workers = cleanedPlanning.workers.filter(w => !showArchivedWorkers ? !w.isArchived : true);
    workers = workers.filter(w => w.name.toLowerCase().includes(workerTableSearch.toLowerCase()) || (w.apodo && w.apodo.toLowerCase().includes(workerTableSearch.toLowerCase())));
    
    // Ordenar por código numérico
    workers = workers.sort((a, b) => {
      const numA = parseInt(a.code.replace(/\D/g, ''), 10);
      const numB = parseInt(b.code.replace(/\D/g, ''), 10);
      return numA - numB;
    });
    
    if (workerAvailabilityFilter !== 'all') {
      const todayJobs = cleanedPlanning.jobs.filter(job => job.date === cleanedPlanning.currentDate && !job.isCancelled);
      const assignedIds = new Set(todayJobs.flatMap(j => j.assignedWorkerIds));
      if (workerAvailabilityFilter === 'free') workers = workers.filter(w => !assignedIds.has(w.id));
      else if (workerAvailabilityFilter === 'assigned') workers = workers.filter(w => assignedIds.has(w.id));
    }
    
    if (workerContractFilter !== 'all') {
      if (workerContractFilter === 'fixedDiscontinuous') workers = workers.filter(w => w.contractType === ContractType.FIJO_DISCONTINUO);
      else workers = workers.filter(w => w.contractType === ContractType.FIJO_CONTINUO);
    }
    
    const activeStatusFilters = Object.keys(workerStatusFilter).filter(k => workerStatusFilter[k]);
    const statusMapping: {[k: string]: string} = { 'DISPONIBLE': 'Disponible', 'VACACIONES': 'Vacaciones', 'BAJA_MEDICA': 'Baja Médica', 'BAJA_PATERNIDAD': 'Baja Paternidad', 'PERMISO_RETRIBUIDO': 'Permiso Retribuido', 'FALTA': 'Falta', 'REPOSO': 'Reposo' };
    if (activeStatusFilters.length > 0) workers = workers.filter(w => activeStatusFilters.some(k => getCorrectWorkerStatus(w) === statusMapping[k]));
    
    return workers;
  }, [cleanedPlanning.workers, workerTableSearch, showArchivedWorkers, workerAvailabilityFilter, workerContractFilter, workerStatusFilter, cleanedPlanning.jobs, cleanedPlanning.currentDate]);

  const loadExampleData = async () => {
    await Promise.all([
      ...MOCK_WORKERS.map(w => persistWorker(w)),
      ...MOCK_CLIENTS.map(c => persistClient(c)),
      ...MOCK_JOBS.map(j => persistJob(j)),
      ...MOCK_VEHICLES.map(v => persistVehicle(v)),
      ...MOCK_STANDARD_TASKS.map(t => persistStandardTask(t)),
    ]);
    showNotification("Datos de ejemplo cargados", "success");
  };

  // tryRecoverData y advancedDataRecovery no son necesarios en v2
  // (los datos siempre están en tablas), pero los dejamos como stubs para compatibilidad con JSX
  const [dataRecoveryMode, setDataRecoveryMode] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const tryRecoverData = async () => showNotification("En v2 los datos se cargan automáticamente desde las tablas", "info");
  const advancedDataRecovery = async () => showNotification("En v2 los datos se cargan automáticamente desde las tablas", "info");
  const saveToSupabase = async (showSuccess = false) => { if (showSuccess) showNotification("Datos sincronizados", "success"); };

  // Función de compatibilidad para el botón "Capturar Hoy"
  const captureTodaySnapshot = () => {
    const today = new Date().toISOString().split('T')[0];
    captureDaySnapshotAsImage(today);
  };

  // Función Mejorada de Captura de Imagen - Vista Compacta Específica
  const captureDaySnapshotAsImage = useCallback(async (date: string) => {
    try {
      console.log(`Iniciando captura de vista compacta: ${date}`);
      
      // Guardar la vista actual
      const originalViewMode = view;
      console.log('Vista original:', originalViewMode);
      
      // Forzar cambio a vista compacta
      if (view !== 'compact') {
        console.log('Cambiando a vista compacta para captura...');
        setView('compact');
        
        // Esperar más tiempo y verificar que el elemento aparezca
        console.log('Esperando a que se renderice la vista compacta...');
        let attempts = 0;
        let compactElement = null;
        
        while (attempts < 10 && !compactElement) {
          await new Promise(resolve => setTimeout(resolve, 500));
          compactElement = document.querySelector('[data-compact-view="true"]');
          console.log(`Intento ${attempts + 1}: Elemento compacta encontrado:`, !!compactElement);
          attempts++;
        }
        
        if (!compactElement) {
          console.error('No se pudo encontrar la vista compacta después de 5 segundos');
          showNotification('Error: No se pudo cargar la vista compacta', 'error');
          setView(originalViewMode);
          return;
        }
      }
      
      // Buscar específicamente la vista compacta
      const targetElement = document.querySelector('[data-compact-view="true"]');
      
      if (!targetElement) {
        console.error('No se encontró la vista compacta para capturar');
        showNotification('Error: No se encontró la vista compacta', 'error');
        setView(originalViewMode);
        return;
      }
      
      console.log('Vista compacta encontrada para captura:', targetElement.tagName, targetElement.className);
      
      if (window.html2canvas) {
        // Captura de alta calidad de la vista compacta
        console.log('Iniciando captura con html2canvas...');
        const canvas = await window.html2canvas(targetElement, {
          backgroundColor: '#ffffff',
          scale: 2, // Alta resolución
          logging: false,
          useCORS: true,
          allowTaint: true,
          width: targetElement.scrollWidth,
          height: targetElement.scrollHeight,
          scrollX: 0,
          scrollY: 0,
          foreignObjectRendering: true,
          imageTimeout: 15000
        });
        
        // Descargar como PNG de alta calidad
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const timeString = new Date().toTimeString().slice(0,5).replace(/:/g, 'h');
            link.download = `CAPTURA_COMPACTA_${date.replace(/-/g, '_')}_${timeString}.png`;
            link.click();
            URL.revokeObjectURL(url);
            
            // Guardar registro de captura
            localStorage.setItem(`lastCapture_${date}`, new Date().toISOString());
            console.log(`Vista compacta guardada: ${date} - ${timeString}`);
            showNotification(`Captura compacta guardada: ${date} - ${timeString}`, 'success');
          }
        }, 'image/png', 0.95); // 95% calidad
        
        // Restaurar vista original después de un momento
        setTimeout(() => {
          if (originalViewMode !== 'compact') {
            console.log('Restaurando vista original:', originalViewMode);
            setView(originalViewMode);
          }
        }, 1000);
        
      } else {
        console.warn('html2canvas no disponible. Instálalo para capturas de imagen.');
        showNotification(
          'Para capturas de imagen, instala html2canvas',
          { type: 'warning', duration: 5000 }
        );
        
        // Restaurar vista original
        if (originalViewMode !== 'compact') {
          setView(originalViewMode);
        }
      }
    } catch (error) {
      console.error('Error en captura de vista compacta:', error);
      showNotification(
        'Error al capturar vista compacta. Intente manualmente.',
        { type: 'error' }
      );
      
      // Restaurar vista original en caso de error
      setView(originalViewMode);
    }
  }, [view, setView]);

  const filteredTasks = useMemo(() => cleanedPlanning.standardTasks.filter(t => t.name.toLowerCase().includes(taskSearch.toLowerCase())), [cleanedPlanning.standardTasks, taskSearch]);
  const notifiedCount = (planning.notifications[planning.currentDate] || []).length;

  // ─── Reporte SS ─────────────────────────────────────────────────────────────
  const ssReport = useMemo(() => {
    // Función para obtener el día laborable anterior
    const getPreviousWorkday = (date: Date): Date => {
      const prevDay = new Date(date);
      prevDay.setDate(prevDay.getDate() - 1);
      
      // Retroceder hasta encontrar un día laborable (no fin de semana ni festivo)
      while (true) {
        const dayOfWeek = prevDay.getDay();
        const dateStr = prevDay.toISOString().split('T')[0];
        
        // Si es sábado (6) o domingo (0), seguir retrocediendo
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          prevDay.setDate(prevDay.getDate() - 1);
          continue;
        }
        
        // Si es festivo, seguir retrocediendo
        if (isHoliday(dateStr, cleanedPlanning.holidays || [])) {
          prevDay.setDate(prevDay.getDate() - 1);
          continue;
        }
        
        break;
      }
      
      return prevDay;
    };
    
    const currentDate = new Date(planning.currentDate);
    const prevWorkday = getPreviousWorkday(currentDate);
    
    // Obtener operarios fijos discontinuos que trabajaron cada día
    const getWorkersForDate = (date: Date): Worker[] => {
      const dateStr = date.toISOString().split('T')[0];
      
      // 🛡️ EXCLUIR "RECONOCIMIENTO MÉDICO" - No es trabajo real para Previsión Social
      const dayJobs = cleanedPlanning.jobs.filter(job => {
        if (job.date !== dateStr || job.isCancelled) return false;
        
        // Excluir explícitamente tareas de RECONOCIMIENTO MÉDICO
        const medicalRecognitionClient = cleanedPlanning.clients.find(c => 
          c.name === "RECONOCIMIENTO MÉDICO"
        );
        if (medicalRecognitionClient && job.clientId === medicalRecognitionClient.id) {
          return false; // 🚨 Excluir esta tarea
        }
        
        return true; // ✅ Incluir todas las demás
      });
      
      const assignedWorkerIds = new Set(dayJobs.flatMap(job => job.assignedWorkerIds));
      
      return cleanedPlanning.workers.filter(worker => 
        worker.contractType === ContractType.FIJO_DISCONTINUO && 
        assignedWorkerIds.has(worker.id)
      );
    };
    
    const todayWorkers = getWorkersForDate(currentDate);
    const yesterdayWorkers = getWorkersForDate(prevWorkday);
    
    // ALTAS: trabajan hoy pero no ayer
    const altas = todayWorkers.filter(worker => !yesterdayWorkers.some(w => w.id === worker.id));
    
    // BAJAS: trabajaron ayer pero no hoy
    const bajas = yesterdayWorkers.filter(worker => !todayWorkers.some(w => w.id === worker.id));
    
    return { 
      prevDate: prevWorkday.toISOString().split('T')[0], 
      altas, 
      bajas 
    };
  }, [cleanedPlanning.workers, cleanedPlanning.jobs, cleanedPlanning.holidays, planning.currentDate]);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (isAuthLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;
  if (!session) return <LoginScreen />;
  
  // Mostrar pantalla de error si no hay conexión con Supabase
  if (dbStatus === 'error') {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="max-w-md mx-auto p-8 bg-white rounded-2xl shadow-lg text-center">
          <CloudOff className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Error de conexión</h2>
          <p className="text-slate-600 mb-6">
            No se puede conectar a la base de datos. Verifica las variables de entorno de Supabase.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm font-semibold text-amber-800 mb-2">Verifica en .env.local:</p>
            <code className="text-xs text-amber-700 block">
              VITE_SUPABASE_URL<br/>
              VITE_SUPABASE_ANON_KEY
            </code>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden text-slate-900">
      <input type="file" ref={backupInputRef} className="hidden" accept=".json,.xlsx,.xls" onChange={importData} />
      
      {notification && (
        <>
          {console.log('🔔 Renderizando notificación:', notification)}
          <div className={`fixed top-4 right-4 z-[1000] px-6 py-4 rounded-xl shadow-lg border max-w-md animate-in slide-in-from-right duration-200 ${
            notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-900' :
            notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-900' :
            notification.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-900' :
            'bg-blue-50 border-blue-200 text-blue-900'
          }`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-bold text-sm">{notification.message}</p>
              </div>
              <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* MODAL DE RECUPERACIÓN DE DATOS */}
      {dataRecoveryMode && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[24px] p-6 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Database className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-2">Recuperación de Datos</h2>
              <p className="text-sm text-slate-600 mb-4">
                No se encontraron datos guardados en la base de datos.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-amber-800">
                  <strong>Importante:</strong> Tus datos anteriores deberían estar guardados en Supabase. 
                  Elige una opción para continuar.
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={tryRecoverData}
                disabled={dbStatus === 'loading'}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-black text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {dbStatus === 'loading' ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Buscando datos...
                  </div>
                ) : (
                  "Intentar recuperar datos anteriores"
                )}
              </button>
              
              <button
                onClick={advancedDataRecovery}
                disabled={dbStatus === 'loading'}
                className="w-full py-3 bg-purple-600 text-white rounded-lg font-black text-sm hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {dbStatus === 'loading' ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Búsqueda avanzada...
                  </div>
                ) : (
                  "🔍 Búsqueda Avanzada (Todos los backups)"
                )}
              </button>
              
              <button
                onClick={loadExampleData}
                className="w-full py-3 bg-slate-100 text-slate-600 rounded-lg font-black text-sm hover:bg-slate-200 transition-colors"
              >
                Cargar datos de ejemplo
              </button>
              
              <button
                onClick={() => setDataRecoveryMode(false)}
                className="w-full py-3 bg-white border border-slate-200 text-slate-500 rounded-lg font-black text-sm hover:bg-slate-50 transition-colors"
              >
                Continuar con aplicación vacía
              </button>
            </div>
          </div>
        </div>
      )}

      <div 
        className={`fixed bottom-4 left-4 z-[400] px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border shadow-sm transition-all cursor-pointer ${
          dbStatus === 'connected' ? 'bg-green-50 text-green-600 border-green-100 hover:bg-green-100' : 
          dbStatus === 'saving' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
          dbStatus === 'loading' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
          dbStatus === 'saved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
          'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'
        }`}
        onClick={() => {
          if (dbStatus === 'connected' || dbStatus === 'error') {
            saveToSupabase(true);
          }
        }}
        title={dbStatus === 'connected' || dbStatus === 'error' ? 'Clic para guardar manualmente' : undefined}
      >
         {dbStatus === 'connected' && <><Cloud className="w-3 h-3" /> {lastSavedTime ? `Guardado ${lastSavedTime.toLocaleTimeString()}` : 'Conectado'}</>}
         {dbStatus === 'saving' && <><RotateCcw className="w-3 h-3 animate-spin" /> Guardando...</>}
         {dbStatus === 'loading' && <><Loader2 className="w-3 h-3 animate-spin" /> Cargando...</>}
         {dbStatus === 'saved' && <><CheckCircle2 className="w-3 h-3" /> Guardado</>}
         {dbStatus === 'error' && <><CloudOff className="w-3 h-3" /> Sin conexión (Clic para reintentar)</>}
      </div>
      {/* Indicador de Backup Automático - Arriba */}
      {autoBackupEnabled && (
        <div className="fixed bottom-16 left-4 z-[400] px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border shadow-sm transition-all bg-amber-50 text-amber-600 border-amber-100">
          <DownloadCloud className="w-3 h-3" />
          Backup Activo
        </div>
      )}

      {/* Indicador de Sincronización - Crítico para seguridad de datos */}
      {dbStatus === 'loading' && (
        <div className="fixed top-6 right-20 z-[400] px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border shadow-sm transition-all bg-orange-50 text-orange-600 border-orange-100">
          <RefreshCw className="w-3 h-3 animate-spin" />
          Sincronizando...
        </div>
      )}
      
      {dbStatus === 'connected' && (
        <div className="fixed top-6 right-20 z-[400] px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border shadow-sm transition-all bg-green-50 text-green-600 border-green-100">
          <CheckCircle2 className="w-3 h-3" />
          Sincronizado
        </div>
      )}
      
      {dbStatus === 'error' && (
        <div className="fixed top-6 right-20 z-[400] px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border shadow-sm transition-all bg-red-50 text-red-600 border-red-100">
          <AlertCircle className="w-3 h-3" />
          Sin conexión
        </div>
      )}

      {/* SIDEBAR NAVIGATION */}
      <aside className="w-20 bg-slate-900 flex flex-col items-center py-8 gap-8 shrink-0 z-50 shadow-2xl">
         <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/50 mb-4 cursor-default"><LayoutGrid className="w-6 h-6 text-white" /></div>
         <nav className="flex-1 flex flex-col gap-4 w-full px-3">
            <button onClick={() => setView('planning')} className={`p-3 rounded-xl transition-all flex justify-center ${view === 'planning' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} title="Planificación"><CalendarIcon className="w-6 h-6" /></button>
            <button onClick={() => setView('compact')} className={`p-3 rounded-xl transition-all flex justify-center ${view === 'compact' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} title="Vista Compacta"><Table className="w-6 h-6" /></button>
            <button onClick={() => setShowSSReport(true)} className="p-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all flex justify-center" title="Reporte SS"><ListTodo className="w-6 h-6" /></button>
            <button onClick={() => setView('workers')} className={`p-3 rounded-xl transition-all flex justify-center ${view === 'workers' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} title="Gestión Operarios"><Users className="w-6 h-6" /></button>
            <button onClick={() => { setView('medical'); setPlanning(prev => ({ ...prev, selectedMedicalTab: 'courses' })); }} className={`p-3 rounded-xl transition-all flex justify-center ${view === 'medical' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} title="Salud Laboral"><HeartPulse className="w-6 h-6" /></button>
            <button onClick={() => setView('clients')} className={`p-3 rounded-xl transition-all flex justify-center ${view === 'clients' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} title="Gestión Clientes"><Building2 className="w-6 h-6" /></button>
            <button onClick={() => setView('workerControl')} className={`p-3 rounded-xl transition-all flex justify-center ${view === 'workerControl' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} title="Control Operarios"><CalendarDays className="w-6 h-6" /></button>
            <button onClick={() => setView('fleet')} className={`p-3 rounded-xl transition-all flex justify-center ${view === 'fleet' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} title="Gestión de Flota"><Car className="w-6 h-6" /></button>
            <button onClick={() => setView('stats')} className={`p-3 rounded-xl transition-all flex justify-center ${view === 'stats' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} title="Estadísticas"><BarChart3 className="w-6 h-6" /></button>
            <button onClick={() => setShowBackupModal(true)} className={`p-3 rounded-xl transition-all flex justify-center ${view === 'backup' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} title="Copias de Seguridad"><DownloadCloud className="w-4 h-4" /></button>
            <button onClick={exportBackup} className="p-3 rounded-xl transition-all flex justify-center text-slate-400 hover:bg-slate-800 hover:text-white" title="Backup Rápido"><Download className="w-4 h-4" /></button>
         </nav>
      </aside>

      <div className="flex-1 flex overflow-hidden relative">
         {(view === 'planning' || view === 'fleet') && (
           <WorkerSidebar 
            workers={planning.workers} 
            planning={planning}
            selectedWorkerId={selectedWorkerId}
            onSelectWorker={setSelectedWorkerId}
            onUpdateWorkerStatus={handleUpdateWorkerStatus}
            onDragStart={handleDragStart}
            getCorrectWorkerStatus={getCorrectWorkerStatus}
            onWorkerHighlight={handleWorkerHighlight}
            workerControlData={workerControlData}
          />
         )}

         {view === 'planning' && (
             <div className="flex-1 flex flex-col min-w-0 bg-slate-50 relative">
                <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 z-20 shadow-sm">
                   <div className="flex items-center gap-4">
                      <h1 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter">Planificación</h1>
                      <div className="flex p-1 bg-slate-100 rounded-xl">
                          <button onClick={() => setViewMode('day')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'day' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>Diaria</button>
                          <button onClick={() => setViewMode('range')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'range' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>Multi-día</button>
                      </div>
                      {viewMode === 'day' ? (
                          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl animate-in fade-in zoom-in-95 duration-200">
                            <button onClick={() => shiftDate(-1)} className="p-2 hover:bg-white rounded-lg shadow-sm transition-all text-slate-500"><ChevronLeft className="w-4 h-4" /></button>
                            <button onClick={() => setShowCalendarSelector(true)} className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm text-xs font-black uppercase tracking-widest text-slate-700 hover:text-blue-600 transition-colors text-center" style={{width: '240px'}}><CalendarDays className="w-4 h-4 text-blue-500" />{formatDateWithDay(planning.currentDate)}</button>
                            <button onClick={() => shiftDate(1)} className="p-2 hover:bg-white rounded-lg shadow-sm transition-all text-slate-500"><ChevronRight className="w-4 h-4" /></button>
                          </div>
                      ) : (
                          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl animate-in fade-in zoom-in-95 duration-200">
                             <div className="flex items-center gap-1 px-3 py-2 bg-white rounded-lg shadow-sm">
                                <input type="date" className="text-xs font-bold text-slate-700 bg-transparent outline-none uppercase" value={rangeStartDate} onChange={(e) => { setRangeStartDate(e.target.value); if(e.target.value > rangeEndDate) setRangeEndDate(e.target.value); }} />
                                <span className="text-slate-300 mx-1">-</span>
                                <input type="date" className="text-xs font-bold text-slate-700 bg-transparent outline-none uppercase" value={rangeEndDate} onChange={(e) => setRangeEndDate(e.target.value)} min={rangeStartDate} />
                             </div>
                          </div>
                      )}
                      <button onClick={goToToday} className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-colors">Hoy</button>
                      <input 
                        type="text" 
                        value={planningFilter}
                        onChange={(e) => setPlanningFilter(e.target.value)}
                        className="w-48 p-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="🔍 Cliente u operario..."
                      />
                   </div>
                   <div className="flex items-center gap-3">
                      <button onClick={() => setShowNotificationsModal(true)} className="relative p-3 bg-slate-50 rounded-xl hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors">
                         <MessageCircle className="w-5 h-5" />
                         {notifiedCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full border-2 border-white"></span>}
                      </button>
                   </div>
                </header>
                <PlanningBoard planning={filteredPlanning} datesToShow={datesToShow} onDropWorker={handleAssignWorker} onRemoveWorker={handleRemoveWorker} onAddJob={handleOpenNewJob} onEditJob={setEditingJob} onDuplicateJob={handleOpenDuplicate} onShowWorkerList={handleShowWorkerList} onExportAccessList={exportWorkerAccessList} highlightedWorker={highlightedWorker} onDragStartFromBoard={(wId) => setDraggedWorkerId(wId)} onReorderJob={handleReorderJobs} onReorderClient={handleReorderClients} onEditNote={handleOpenNote} onUpdateJobReinforcementGroups={handleUpdateJobReinforcementGroups} draggedWorkerId={draggedWorkerId} showNotification={showNotification} persistJob={persistJob} />
             </div>
         )}
         {view === 'compact' && <CompactPlanningView planning={planning} />}
         
         {view === 'fleet' && (
            <div className="flex-1 flex flex-col min-w-0 bg-slate-50 relative">
               <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 z-20 shadow-sm">
                   <div className="flex items-center gap-4">
                      <h1 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter">Flota</h1>
                      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl animate-in fade-in zoom-in-95 duration-200">
                        <button onClick={() => shiftDate(-1)} className="p-2 hover:bg-white rounded-lg shadow-sm transition-all text-slate-500"><ChevronLeft className="w-4 h-4" /></button>
                        <button onClick={() => setShowCalendarSelector(true)} className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm text-xs font-black uppercase tracking-widest text-slate-700 hover:text-blue-600 transition-colors"><CalendarDays className="w-4 h-4 text-blue-500" />{formatDateWithDay(planning.currentDate)}</button>
                        <button onClick={() => shiftDate(1)} className="p-2 hover:bg-white rounded-lg shadow-sm transition-all text-slate-500"><ChevronRight className="w-4 h-4" /></button>
                      </div>
                      <button onClick={goToToday} className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-colors">Hoy</button>
                   </div>
               </header>

               {/* Calculadora de Kilómetros Pagados */}
               <div className="bg-white m-6 p-6 rounded-2xl border border-slate-100">
                  <h3 className="text-lg font-black text-slate-900 mb-6">Calculadora de Kilómetros Pagados</h3>
                  
                  {/* Filtros */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Operario (con vehículo)</label>
                      <select 
                        value={operarioSeleccionado}
                        onChange={(e) => setOperarioSeleccionado(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Seleccionar operario...</option>
                        {planning.workers
                          .filter(w => !w.isArchived && w.hasVehicle)
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map(worker => (
                            <option key={worker.id} value={worker.id}>
                              {worker.name} 🚗
                            </option>
                          ))}
                      </select>
                      {planning.workers.filter(w => !w.isArchived && w.hasVehicle).length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          ⚠️ No hay operarios con vehículo propio
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Fecha Inicio</label>
                      <input 
                        type="date"
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Fecha Fin</label>
                      <input 
                        type="date"
                        value={fechaFin}
                        onChange={(e) => setFechaFin(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  
                  {/* Botón de cálculo */}
                  <div className="flex gap-3 mb-6">
                    <button 
                      onClick={calcularKilometrosPagados}
                      disabled={calculandoKilometros}
                      className="px-6 py-3 bg-green-600 text-white rounded-xl font-black text-[12px] uppercase tracking-widest hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {calculandoKilometros ? 'Calculando...' : 'Calcular Kilómetros Pagados'}
                    </button>
                    
                    {kilometrosPagados > 0 && (
                      <button 
                        onClick={exportKilometrosPagados}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-[12px] uppercase tracking-widest hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        Exportar a Excel
                      </button>
                    )}
                  </div>
                  
                  {/* Resultados */}
                  {kilometrosPagados > 0 && (
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                      {/* Resumen completo en una sola línea */}
                      <div className="flex items-center justify-center gap-8 mb-6">
                        {/* Total kilómetros */}
                        <div className="flex items-center gap-2">
                          <h4 className="text-3xl font-black text-slate-800">
                            {kilometrosPagados.toFixed(1)} km
                          </h4>
                          <p className="text-lg text-slate-600 font-bold uppercase tracking-widest">
                            Total Kilómetros Pagados
                          </p>
                        </div>
                        
                        {/* Separador */}
                        <div className="w-px h-8 bg-slate-300"></div>
                        
                        {/* Estadísticas */}
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <div className="text-xl font-bold text-slate-700">
                              {detallesKilometros.filter(d => d.kmPrimero.paga).length}
                            </div>
                            <div className="text-xs text-slate-500">Primeros trayectos pagados</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-bold text-slate-700">
                              {detallesKilometros.reduce((sum, d) => sum + d.kmIntermedios, 0).toFixed(1)}
                            </div>
                            <div className="text-xs text-slate-500">Km intermedios totales</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-bold text-slate-700">
                              {detallesKilometros.filter(d => d.kmUltimo.paga).length}
                            </div>
                            <div className="text-xs text-slate-500">Últimos trayectos pagados</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Detalles por día con más altura */}
                      <div className="max-h-80 overflow-y-auto pr-2">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-300">
                              <th className="text-left py-2 w-28 pr-4">Fecha</th>
                              <th className="text-left py-2 flex-1">Sedes Trabajadas</th>
                              <th className="text-center py-2 w-20 pl-4">Primer</th>
                              <th className="text-center py-2 w-20 pl-4">Intermedios</th>
                              <th className="text-center py-2 w-20 pl-4">Último</th>
                              <th className="text-right py-2 w-20 pr-4">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detallesKilometros.map((dia, index) => (
                              <tr key={index} className="border-b border-slate-100">
                                <td className="py-2 text-xs pr-4">{formatDateDMY(dia.fecha)}</td>
                                <td className="py-2">
                                  <div className="text-xs whitespace-normal truncate" title={dia.sedesTrabajadas.join(' → ')}>
                                    {dia.sedesConColores.map((sede, index) => (
                                      <span key={index} className={`font-semibold ${sede.color}`}>
                                        {sede.nombre}
                                        {index < dia.sedesConColores.length - 1 && (
                                          <span className="text-slate-400 mx-1">→</span>
                                        )}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="text-center py-2 pl-4">
                                  <div>
                                    <span className={dia.kmPrimero.paga ? 'text-green-600' : 'text-red-600'}>
                                      {dia.kmPrimero.valor.toFixed(1)}km
                                    </span>
                                    {dia.kmPrimero.paga && (
                                      <div className="text-xs text-green-500">✓</div>
                                    )}
                                  </div>
                                </td>
                                <td className="text-center py-2 text-green-600 pl-4">
                                  <div>
                                    {dia.kmIntermedios.toFixed(1)}km
                                    {dia.intermediosDetalles.length > 0 && (
                                      <div className="text-xs text-green-500">
                                        {dia.intermediosDetalles.length} trayectos
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="text-center py-2 pl-4">
                                  <div>
                                    <span className={dia.kmUltimo.paga ? 'text-green-600' : 'text-red-600'}>
                                      {dia.kmUltimo.valor.toFixed(1)}km
                                    </span>
                                    {dia.kmUltimo.paga && (
                                      <div className="text-xs text-green-500">✓</div>
                                    )}
                                  </div>
                                </td>
                                <td className="text-right py-2 font-bold text-slate-800 pr-4">
                                  {dia.kmTotal.toFixed(1)}km
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
               </div>

               {/* Calculadora de Kilómetros */}
               <div className="bg-white m-6 p-6 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-slate-900">Calculadora de Kilómetros</h3>
                    <button 
                      onClick={cargarMatrizDistancias}
                      className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-blue-100 transition-colors"
                    >
                      Recargar Matriz
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Origen</label>
                      <select 
                        value={origenSeleccionado}
                        onChange={(e) => setOrigenSeleccionado(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Seleccionar origen...</option>
                        {sedesMatriz
                          .sort((a, b) => a.localeCompare(b))
                          .map((sede, index) => (
                            <option key={index} value={sede}>{sede}</option>
                          ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Destino</label>
                      <select 
                        value={destinoSeleccionado}
                        onChange={(e) => setDestinoSeleccionado(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Seleccionar destino...</option>
                        {sedesMatriz
                          .sort((a, b) => a.localeCompare(b))
                          .map((sede, index) => (
                            <option key={index} value={sede}>{sede}</option>
                          ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Kilómetros</label>
                      <div className="w-full bg-blue-50 border-2 border-blue-200 rounded-xl px-4 py-3 font-black text-blue-700 text-center">
                        {kilometrosCalculados > 0 ? `${kilometrosCalculados} km` : '--'}
                      </div>
                    </div>
                  </div>
               </div>

               <FleetManager 
                  planning={planning}
                  onAddVehicle={handleAddVehicle}
                  onEditVehicle={handleEditVehicle}
                  onDeleteVehicle={handleDeleteVehicle}
                  onAssignWorker={handleAssignVehicle}
                  onRemoveAssignment={handleRemoveAssignment}
                  draggedWorkerId={draggedWorkerId}
               />
            </div>
         )}

         {view === 'workers' && (
           <div className="flex-1 bg-slate-50 overflow-y-auto p-8 custom-scrollbar">
             <div className="flex items-center justify-between mb-8">
               <h2 className="text-2xl font-black text-slate-900 italic uppercase">Gestión de Operarios</h2>
               <div className="flex items-center gap-3">
                 <button 
                   onClick={handleCheckWorkerStatuses}
                   className="bg-amber-600 text-white px-6 py-4 rounded-[24px] font-black text-[12px] uppercase tracking-widest flex items-center gap-2 hover:bg-amber-700 transition-colors"
                   title="Verificar y actualizar estados automáticamente"
                 >
                   <CheckCircle2 className="w-4 h-4" />
                   Verificar Estados
                 </button>
                 <button onClick={handleOpenNewWorker} className="bg-slate-900 text-white px-6 py-4 rounded-[24px] font-black text-[12px] uppercase tracking-widest">+ Nuevo Operario</button>
               </div>
             </div>
             <div className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm mb-6">
                <div className="flex items-center gap-4 mb-4">
                  <Search className="w-5 h-5 text-slate-400" />
                  <input type="text" placeholder="Buscar operario..." className="flex-1 bg-transparent text-sm font-bold outline-none" value={workerTableSearch} onChange={(e) => setWorkerTableSearch(e.target.value)} />
                </div>
                
                <div className="flex items-center gap-6 border-t border-slate-100 pt-4">
                  {/* Filtro de Disponibilidad */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Disponibilidad</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setWorkerAvailabilityFilter('all')}
                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-colors ${
                          workerAvailabilityFilter === 'all' 
                            ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                            : 'bg-white text-slate-400 border border-slate-200'
                        }`}
                      >
                        Todos
                      </button>
                      <button
                        onClick={() => setWorkerAvailabilityFilter('free')}
                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-colors ${
                          workerAvailabilityFilter === 'free' 
                            ? 'bg-green-100 text-green-700 border border-green-200' 
                            : 'bg-white text-slate-400 border border-slate-200'
                        }`}
                      >
                        Libres
                      </button>
                      <button
                        onClick={() => setWorkerAvailabilityFilter('assigned')}
                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-colors ${
                          workerAvailabilityFilter === 'assigned' 
                            ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                            : 'bg-white text-slate-400 border border-slate-200'
                        }`}
                      >
                        Asignados
                      </button>
                    </div>
                  </div>

                  {/* Filtro de Contrato */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contrato</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setWorkerContractFilter('all')}
                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-colors ${
                          workerContractFilter === 'all' 
                            ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                            : 'bg-white text-slate-400 border border-slate-200'
                        }`}
                      >
                        Todos
                      </button>
                      <button
                        onClick={() => setWorkerContractFilter('fixedDiscontinuous')}
                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-colors ${
                          workerContractFilter === 'fixedDiscontinuous' 
                            ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                            : 'bg-white text-slate-400 border border-slate-200'
                        }`}
                      >
                        Fijos Discontinuos
                      </button>
                      <button
                        onClick={() => setWorkerContractFilter('others')}
                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-colors ${
                          workerContractFilter === 'others' 
                            ? 'bg-slate-100 text-slate-700 border border-slate-200' 
                            : 'bg-white text-slate-400 border border-slate-200'
                        }`}
                      >
                        Resto
                      </button>
                    </div>
                  </div>

                  {/* Filtro de Estado */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</span>
                    <button
                      onClick={() => {
                        const allActive = Object.values(workerStatusFilter).every(v => v);
                        if (allActive) {
                          // Si todos están activos, desactivar todos
                          setWorkerStatusFilter({
                            'DISPONIBLE': false,
                            'VACACIONES': false,
                            'BAJA_MEDICA': false,
                            'BAJA_PATERNIDAD': false,
                            'PERMISO_RETRIBUIDO': false,
                            'FALTA': false,
                            'REPOSO': false
                          });
                        } else {
                          // Si no todos están activos, activar todos
                          setWorkerStatusFilter({
                            'DISPONIBLE': true,
                            'VACACIONES': true,
                            'BAJA_MEDICA': true,
                            'BAJA_PATERNIDAD': true,
                            'PERMISO_RETRIBUIDO': true,
                            'FALTA': true,
                            'REPOSO': true
                          });
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                        Object.values(workerStatusFilter).every(v => v) 
                          ? 'bg-slate-900 text-white shadow-sm' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => {
                        const allActive = Object.values(workerStatusFilter).every(v => v);
                        setWorkerStatusFilter((prev: Record<string, boolean>) => ({
                          ...prev, 
                          'DISPONIBLE': !prev['DISPONIBLE'],
                          // Si todos estaban activos, desactivar los demás al cambiar este
                          ...(allActive ? {
                            'VACACIONES': false,
                            'BAJA_MEDICA': false,
                            'BAJA_PATERNIDAD': false,
                            'PERMISO_RETRIBUIDO': false,
                            'FALTA': false,
                            'REPOSO': false
                          } : {})
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                        workerStatusFilter['DISPONIBLE'] 
                          ? 'bg-green-500 text-white shadow-sm' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Disponible
                    </button>
                    <button
                      onClick={() => {
                        const allActive = Object.values(workerStatusFilter).every(v => v);
                        setWorkerStatusFilter((prev: Record<string, boolean>) => ({
                          ...prev, 
                          'VACACIONES': !prev['VACACIONES'],
                          // Si todos estaban activos, desactivar los demás al cambiar este
                          ...(allActive ? {
                            'DISPONIBLE': false,
                            'BAJA_MEDICA': false,
                            'BAJA_PATERNIDAD': false,
                            'PERMISO_RETRIBUIDO': false,
                            'FALTA': false,
                            'REPOSO': false
                          } : {})
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                        workerStatusFilter['VACACIONES'] 
                          ? 'bg-amber-500 text-white shadow-sm' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Vacaciones
                    </button>
                    <button
                      onClick={() => {
                        const allActive = Object.values(workerStatusFilter).every(v => v);
                        setWorkerStatusFilter((prev: Record<string, boolean>) => ({
                          ...prev, 
                          'BAJA_MEDICA': !prev['BAJA_MEDICA'],
                          // Si todos estaban activos, desactivar los demás al cambiar este
                          ...(allActive ? {
                            'DISPONIBLE': false,
                            'VACACIONES': false,
                            'BAJA_PATERNIDAD': false,
                            'PERMISO_RETRIBUIDO': false,
                            'FALTA': false,
                            'REPOSO': false
                          } : {})
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                        workerStatusFilter['BAJA_MEDICA'] 
                          ? 'bg-red-500 text-white shadow-sm' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Baja Médica
                    </button>
                    <button
                      onClick={() => {
                        const allActive = Object.values(workerStatusFilter).every(v => v);
                        setWorkerStatusFilter((prev: Record<string, boolean>) => ({
                          ...prev, 
                          'BAJA_PATERNIDAD': !prev['BAJA_PATERNIDAD'],
                          // Si todos estaban activos, desactivar los demás al cambiar este
                          ...(allActive ? {
                            'DISPONIBLE': false,
                            'VACACIONES': false,
                            'BAJA_MEDICA': false,
                            'PERMISO_RETRIBUIDO': false,
                            'FALTA': false,
                            'REPOSO': false
                          } : {})
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                        workerStatusFilter['BAJA_PATERNIDAD'] 
                          ? 'bg-purple-500 text-white shadow-sm' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Baja Paternidad
                    </button>
                    <button
                      onClick={() => {
                        const allActive = Object.values(workerStatusFilter).every(v => v);
                        setWorkerStatusFilter((prev: Record<string, boolean>) => ({
                          ...prev, 
                          'PERMISO_RETRIBUIDO': !prev['PERMISO_RETRIBUIDO'],
                          // Si todos estaban activos, desactivar los demás al cambiar este
                          ...(allActive ? {
                            'DISPONIBLE': false,
                            'VACACIONES': false,
                            'BAJA_MEDICA': false,
                            'BAJA_PATERNIDAD': false,
                            'FALTA': false,
                            'REPOSO': false
                          } : {})
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                        workerStatusFilter['PERMISO_RETRIBUIDO'] 
                          ? 'bg-orange-500 text-white shadow-sm' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Permiso Retribuido
                    </button>
                    <button
                      onClick={() => {
                        const allActive = Object.values(workerStatusFilter).every(v => v);
                        setWorkerStatusFilter((prev: Record<string, boolean>) => ({
                          ...prev, 
                          'FALTA': !prev['FALTA'],
                          // Si todos estaban activos, desactivar los demás al cambiar este
                          ...(allActive ? {
                            'DISPONIBLE': false,
                            'VACACIONES': false,
                            'BAJA_MEDICA': false,
                            'BAJA_PATERNIDAD': false,
                            'PERMISO_RETRIBUIDO': false,
                            'REPOSO': false
                          } : {})
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                        workerStatusFilter['FALTA'] 
                          ? 'bg-rose-500 text-white shadow-sm' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Falta
                    </button>
                    <button
                      onClick={() => {
                        const allActive = Object.values(workerStatusFilter).every(v => v);
                        setWorkerStatusFilter((prev: Record<string, boolean>) => ({
                          ...prev, 
                          'REPOSO': !prev['REPOSO'],
                          // Si todos estaban activos, desactivar los demás al cambiar este
                          ...(allActive ? {
                            'DISPONIBLE': false,
                            'VACACIONES': false,
                            'BAJA_MEDICA': false,
                            'BAJA_PATERNIDAD': false,
                            'PERMISO_RETRIBUIDO': false,
                            'FALTA': false
                          } : {})
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                        workerStatusFilter['REPOSO'] 
                          ? 'bg-indigo-500 text-white shadow-sm' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Reposo
                    </button>
                  </div>

                  {/* Filtro de Archivados */}
                  <div className="flex items-center gap-3 border-l border-slate-100 pl-6">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Archivados</span>
                    <button 
                      onClick={() => setShowArchivedWorkers(!showArchivedWorkers)} 
                      className={`w-10 h-6 rounded-full p-1 transition-colors ${showArchivedWorkers ? 'bg-blue-600' : 'bg-slate-200'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${showArchivedWorkers ? 'translate-x-4' : ''}`} />
                    </button>
                  </div>

                  {/* Estadísticas de días trabajados FD */}
                  <div className="flex items-center gap-4 border-l border-slate-100 pl-6">
                    <div className="bg-slate-50 px-3 py-2 rounded-lg">
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-slate-600">
                          <strong>FD:</strong> {fdDaysStats.workersWithDays}
                        </span>
                        <span className="text-blue-600 font-bold">
                          <strong>Lab:</strong> {fdDaysStats.laborableDays}
                        </span>
                        <span className="text-purple-600 font-bold">
                          <strong>Fin:</strong> {fdDaysStats.weekendDays}
                        </span>
                        <span className="text-green-600 font-bold flex items-center gap-2">
                          <strong>Total:</strong> {fdDaysStats.totalDays}
                          <select 
                            value={fdExportMonth}
                            onChange={(e) => setFdExportMonth(e.target.value)}
                            className="text-xs px-2 py-1 border border-green-300 rounded bg-white text-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                            title="Seleccionar mes para exportar"
                          >
                            {(() => {
                              const months = [];
                              const currentDate = new Date();
                              for (let i = 0; i < 12; i++) {
                                const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
                                const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                                const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                                const monthName = monthNames[date.getMonth()];
                                months.push(
                                  <option key={monthStr} value={monthStr}>
                                    {monthName} {date.getFullYear()}
                                  </option>
                                );
                              }
                              return months;
                            })()}
                          </select>
                          <button 
                            onClick={exportAllFDDaysToExcel}
                            className="p-1 hover:bg-green-100 text-green-600 hover:text-green-700 rounded transition-colors"
                            title="Exportar todos los FIJOS DISCONTINUOS a Excel"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                          </button>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
             <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
               <table className="w-full text-left border-collapse">
                 <thead className="bg-slate-100 border-b border-slate-200 sticky top-0 z-10">
                   <tr>
                     <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest w-24">Código</th>
                     <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest w-60">Nombre</th>
                     <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest w-80">Apellidos</th>
                     <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest w-24">DNI</th>
                     <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest w-24">Teléfono</th>
                     <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Vehículo</th>
                     <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Estado</th>
                     <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest w-40">Cambio Estado</th>
                     <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest w-40">Hasta</th>
                     <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Días Trab.</th>
                     <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Editar</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {filteredWorkersTable.map((worker, index) => {
                    let codeClass = '';
                    if (worker.contractType === ContractType.INDEFINIDO) {
                       codeClass = 'bg-slate-900 text-white border-slate-900 shadow-sm'; 
                     } else if (worker.contractType === ContractType.AUTONOMO || worker.contractType === ContractType.AUTONOMA_COLABORADORA) {
                        codeClass = 'bg-blue-50 text-blue-600 border-blue-100';
                     } else {
                        codeClass = 'bg-red-50 text-red-600 border-red-100';
                     }

                     return (
                     <tr key={worker.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3">
                           <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-[10px] border ${codeClass}`}>
                              {worker.code}
                           </div>
                        </td>
                        <td className="px-6 py-3">
                           <p className="font-black text-slate-900 text-sm">
                             {worker.firstName || worker.name?.split(' ')[0] || worker.name}
                           </p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{worker.role}</p>
                        </td>
                        <td className="px-6 py-3">
                           <p className="font-black text-slate-900 text-sm">
                             {worker.lastName || worker.name?.split(' ').slice(1).join(' ') || ''}
                           </p>
                        </td>
                        <td className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">{worker.dni}</td>
                        <td className="px-6 py-3 text-xs font-bold text-slate-500">{worker.phone}</td>
                        <td className="px-6 py-3 text-center">
                           {worker.hasVehicle ? <Car className="w-4 h-4 text-green-500 mx-auto" /> : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="px-6 py-3">
                           <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                              (() => {
                                const correctStatus = getCorrectWorkerStatus(worker);
                                return correctStatus === WorkerStatus.DISPONIBLE ? 'bg-green-100 text-green-700' : 
                                       correctStatus.includes('Baja') ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';
                              })()
                           }`}>
                              {getCorrectWorkerStatus(worker)}
                           </span>
                        </td>
                        <td className="px-6 py-3 text-xs font-bold text-slate-600">
                           {(() => {
                             const nextChange = getNextStatusChange(worker);
                             if (!nextChange) {
                               return <span className="text-slate-300">Sin cambios</span>;
                             }
                             
                             const statusColor = nextChange.status === WorkerStatus.DISPONIBLE ? 'text-green-600' :
                                              nextChange.status.includes('Baja') ? 'text-red-600' : 'text-amber-600';
                             
                             return (
                               <div className="flex flex-col">
                                 <span className="text-slate-700">{formatDateDMY(nextChange.date)}</span>
                                 <span className={`text-[9px] uppercase ${statusColor}`}>{nextChange.status}</span>
                               </div>
                             );
                           })()}
                        </td>
                        <td className="px-6 py-3 text-xs font-bold text-slate-600">
                           {(() => {
                             const currentStatus = getCurrentWorkerStatus(worker);
                             
                             // Si está disponible, mostrar el próximo registro futuro
                             if (currentStatus.status === WorkerStatus.DISPONIBLE) {
                               const today = new Date().toISOString().split('T')[0];
                               const futureRecords = worker.statusRecords?.filter(record => 
                                 new Date(record.startDate) > new Date(today)
                               ).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
                               
                               if (futureRecords && futureRecords.length > 0) {
                                 const nextRecord = futureRecords[0];
                                 return nextRecord.endDate ? formatDateDMY(nextRecord.endDate) : <span className="text-red-600 font-black">IND.</span>;
                               }
                               
                               return <span className="text-slate-300">-</span>;
                             }
                             
                             // Si está en estado no disponible, mostrar la fecha fin del registro actual
                             if (currentStatus.endDate) {
                               return formatDateDMY(currentStatus.endDate);
                             }
                             
                             return <span className="text-red-600 font-black">IND.</span>;
                           })()}
                        </td>
                        <td className="px-6 py-3 text-center">
                           {worker.contractType === ContractType.FIJO_DISCONTINUO ? (
                              <button 
                                onClick={() => setWorkerDaysModal({worker, month: new Date().toISOString().slice(0, 7)})}
                                className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl transition-colors"
                                title="Calcular días trabajados"
                              >
                                 <Calendar className="w-4 h-4" />
                              </button>
                           ) : (
                              <span className="text-slate-300 text-xs">-</span>
                           )}
                        </td>
                        <td className="px-6 py-3 text-right">
                           <button onClick={() => {
                                                    setEditingWorker(worker);
                           }} className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl transition-colors">
                              <Edit2 className="w-4 h-4" />
                           </button>
                        </td>
                     </tr>
                   )})}
                 </tbody>
               </table>
             </div>
           </div>
         )}
         {view === 'medical' && (
           <div className="flex-1 bg-slate-50 overflow-y-auto p-8 custom-scrollbar">
             <div className="flex items-center justify-between mb-8">
               <div>
                 <h2 className="text-2xl font-black text-slate-900 italic uppercase">🏥 Salud Laboral</h2>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Gestión Médica y Formación</p>
               </div>
               <div className="flex items-center gap-2">
                 {planning.medicalAlerts.length > 0 && (
                   <div className="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-xs font-bold">
                     🔴 {planning.medicalAlerts.length} alertas
                   </div>
                 )}
                 <button 
                   onClick={() => {
                     const newCourse: MedicalCourse = {
                       id: Date.now().toString(),
                       name: '', // Vacío para reconocimientos, se llenará para cursos
                       type: 'recognition',
                       provider: 'Mutua',
                       issueDate: new Date().toISOString().split('T')[0],
                       expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                       status: 'active',
                       assignedWorkerIds: [],
                       createdAt: new Date().toISOString(),
                       updatedAt: new Date().toISOString()
                     };
                     setPlanning(prev => ({ ...prev, editingMedicalCourse: newCourse }));
                   }}
                   className="px-3 py-1.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                 >
                   <Plus className="w-4 h-4" />
                   Nuevo Registro
                 </button>
                 <button 
                   onClick={() => {
                     console.log('🔄 Botón de recarga presionado - INICIO');
                     console.log('🔄 reloadMedicalCoursesFromSupabase existe:', typeof reloadMedicalCoursesFromSupabase);
                     console.log('🔄 reloadMedicalCoursesFromSupabase es función:', typeof reloadMedicalCoursesFromSupabase === 'function');
                     
                     if (typeof reloadMedicalCoursesFromSupabase === 'function') {
                       console.log('🔄 Llamando a reloadMedicalCoursesFromSupabase...');
                       reloadMedicalCoursesFromSupabase().then(() => {
                         console.log('🔄 reloadMedicalCoursesFromSupabase completado');
                       }).catch(error => {
                         console.error('🔄 Error en reloadMedicalCoursesFromSupabase:', error);
                       });
                     } else {
                       console.error('🔄 reloadMedicalCoursesFromSupabase no es una función');
                     }
                   }}
                   className="px-3 py-1.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors flex items-center gap-2 text-sm"
                   title="Recargar registros médicos desde Supabase"
                 >
                   <RefreshCw className="w-4 h-4" />
                   Recargar
                 </button>
               </div>
             </div>

             {/* Tabs de navegación */}
             <div className="flex gap-4 mb-6 border-b border-slate-200">
               <button 
                 onClick={() => setPlanning(prev => ({ ...prev, selectedMedicalTab: 'courses' }))}
                 className={`pb-3 px-1 text-xs font-black uppercase tracking-wider border-b-2 transition-colors ${
                   planning.selectedMedicalTab === 'courses' 
                     ? 'text-blue-600 border-blue-600' 
                     : 'text-slate-400 border-transparent hover:text-slate-600'
                 }`}
               >
                 📚 Registros Médicos
               </button>
               <button 
                 onClick={() => setPlanning(prev => ({ ...prev, selectedMedicalTab: 'alerts' }))}
                 className={`pb-3 px-1 text-xs font-black uppercase tracking-wider border-b-2 transition-colors ${
                   planning.selectedMedicalTab === 'alerts' 
                     ? 'text-blue-600 border-blue-600' 
                     : 'text-slate-400 border-transparent hover:text-slate-600'
                 }`}
               >
                 ⚠️ Alertas ({planning.medicalAlerts.length})
               </button>
               <button 
                 onClick={() => setPlanning(prev => ({ ...prev, selectedMedicalTab: 'workers' }))}
                 className={`pb-3 px-1 text-xs font-black uppercase tracking-wider border-b-2 transition-colors ${
                   planning.selectedMedicalTab === 'workers' 
                     ? 'text-blue-600 border-blue-600' 
                     : 'text-slate-400 border-transparent hover:text-slate-600'
                 } text-xs`}
               >
                 👥 Operarios
               </button>
             </div>

             {/* Registros Médicos */}
            {planning.selectedMedicalTab === 'courses' && (
              <div>
                <div className="mb-4">
                  <input
                    type="text"
                    value={medicalWorkerFilter}
                    onChange={(e) => setMedicalWorkerFilter(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="🔍 Filtrar registros por operario..."
                  />
                </div>
                
                {/* Vista compacta de registros */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  {/* Header */}
                  <div className="grid gap-2 p-3 bg-slate-50 border-b border-slate-200" style={{ gridTemplateColumns: '16.67% 11.67% 38.33% 11.67% 11.67% 10%' }}>
                    <div className="text-xs font-bold text-slate-700 uppercase border-r border-slate-100 pr-2">Tipo</div>
                    <div className="text-xs font-bold text-slate-700 uppercase border-r border-slate-100 pr-2">Proveedor</div>
                    <div className="text-xs font-bold text-slate-700 uppercase border-r border-slate-100 pr-2">Operarios</div>
                    <div className="text-xs font-bold text-slate-700 uppercase border-r border-slate-100 pr-2">Realización</div>
                    <div className="text-xs font-bold text-slate-700 uppercase border-r border-slate-100 pr-2">Caducidad</div>
                    <div className="text-xs font-bold text-slate-700 uppercase">Acciones</div>
                  </div>
                  
                  {/* Filtrar y mostrar registros */}
                  {(() => {
                    const filteredCourses = planning.medicalCourses.filter(course => 
                      medicalWorkerFilter === '' || 
                      course.assignedWorkerIds.some(workerId => {
                        const worker = planning.workers.find(w => w.id === workerId);
                        return worker && (
                          worker.name.toLowerCase().includes(medicalWorkerFilter.toLowerCase()) ||
                          worker.code.toLowerCase().includes(medicalWorkerFilter.toLowerCase())
                        );
                      })
                    ).sort((a, b) => {
                      // Ordenar por fecha de realización (issueDate) - más reciente primero
                      const getDateA = a.issueDate || a.date || a.createdAt || '';
                      const getDateB = b.issueDate || b.date || b.createdAt || '';
                      
                      const dateA = new Date(getDateA).getTime();
                      const dateB = new Date(getDateB).getTime();
                      
                      // Si no hay fechas válidas, usar el ID como fallback
                      if (isNaN(dateA) && isNaN(dateB)) {
                        const idA = a.id || '';
                        const idB = b.id || '';
                        return idB.localeCompare(idA); // Descendente
                      }
                      
                      if (isNaN(dateA)) return 1; // A va al final
                      if (isNaN(dateB)) return -1; // B va al final
                      
                      return dateB - dateA; // Descendente (más reciente primero)
                    });
                    
                    return filteredCourses.map(course => {
                      const assignedWorker = course.assignedWorkerIds[0]; // Solo hay un operario por registro
                      const worker = planning.workers.find(w => w.id === assignedWorker);
                      const workerName = worker ? worker.name : '';
                      
                      // Generar ID único si no existe
                      const generateUniqueId = (course: any) => {
                        if (course.id) return course.id;
                        const workerId = course.assignedWorkerIds[0] || 'unknown';
                        const issueDate = course.issueDate || 'unknown';
                        const provider = course.provider || 'unknown';
                        return `${workerId}-${issueDate}-${provider}`;
                      };
                      
                      const courseId = generateUniqueId(course);
                      
                      // Crear una copia del curso con ID válido
                      const courseWithId = { ...course, id: courseId };
                      
                      return (
                        <div key={courseId} className="grid gap-2 p-3 border-b border-slate-100 hover:bg-slate-50 items-center" style={{ gridTemplateColumns: '16.67% 11.67% 38.33% 11.67% 11.67% 10%' }}>
                          <div className="text-sm font-medium text-slate-900 truncate border-r border-slate-100 pr-2">
                            {course.type === 'recognition' ? '🏥 Reconocimiento médico' : (course.name || '📚 Curso')}
                          </div>
                          <div className="text-sm text-slate-600 truncate border-r border-slate-100 pr-2">
                            {course.provider}
                          </div>
                          <div className="text-sm text-slate-600 border-r border-slate-100 pr-2">
                            {workerName || '-'}
                          </div>
                          <div className="text-sm text-slate-600 truncate border-r border-slate-100 pr-2">
                            {formatDateEuropean(course.issueDate) || '-'}
                          </div>
                          <div className="text-sm text-slate-600 truncate border-r border-slate-100 pr-2">
                            {formatDateEuropean(course.expiryDate) || '-'}
                          </div>
                          <div className="flex gap-1 justify-center items-center">
                            <button 
                              onClick={() => {
                                setPlanning(prev => ({ ...prev, editingMedicalCourse: courseWithId }));
                              }}
                              className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={() => {
                                if (confirm('¿Eliminar este registro médico?')) {
                                  deleteMedicalCourseHandler(courseId);
                                }
                              }}
                              className="p-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
                
                {/* Mensaje cuando no hay registros */}
                {planning.medicalCourses.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    <HeartPulse className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-bold uppercase text-xs tracking-widest">No hay registros médicos</p>
                  </div>
                )}
              </div>
            )}

             {/* Alertas */}
             {planning.selectedMedicalTab === 'alerts' && (
               <div>
                 {/* Vista compacta de alertas */}
                 <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                   {/* Header */}
                   <div className="grid grid-cols-5 gap-2 p-3 bg-slate-50 border-b border-slate-200">
                     <div className="text-xs font-bold text-slate-700 uppercase">Operario</div>
                     <div className="text-xs font-bold text-slate-700 uppercase">Tipo</div>
                     <div className="text-xs font-bold text-slate-700 uppercase">Proveedor</div>
                     <div className="text-xs font-bold text-slate-700 uppercase">Realización</div>
                     <div className="text-xs font-bold text-slate-700 uppercase">Caducidad</div>
                   </div>
                   
                   {/* Mostrar alertas */}
                   {(() => {
                     if (planning.medicalAlerts.length === 0) {
                       return (
                         <div className="text-center py-8 text-slate-400">
                           <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                           <p className="font-bold uppercase text-xs tracking-widest">No hay alertas activas</p>
                           <p className="text-xs text-slate-400 mt-2">Solo se muestran registros que caducan en 30 días o menos</p>
                         </div>
                       );
                     }
                     
                     return planning.medicalAlerts.map(alert => {
                       const alertColor = alert.alertLevel === 'critical' ? 'border-red-500 bg-red-50' : 'border-yellow-500 bg-yellow-50';
                       const alertIcon = alert.alertLevel === 'critical' ? '🔴' : '🟡';
                       
                       return (
                         <div key={alert.id} className={`grid grid-cols-5 gap-2 p-3 border-l-4 ${alertColor} hover:opacity-80 transition-opacity items-center`}>
                           <div className="text-sm font-medium text-slate-900">
                             <div className="flex items-center gap-2">
                               <span className="text-lg">{alertIcon}</span>
                               <div>
                                 <div className="font-medium">{alert.workerName}</div>
                                 <div className="text-xs text-slate-500">
                                   {alert.daysUntilExpiry < 0 ? `${Math.abs(alert.daysUntilExpiry)} días caducado` : `${alert.daysUntilExpiry} días`}
                                 </div>
                               </div>
                             </div>
                           </div>
                           <div className="text-sm text-slate-600">
                             {alert.type === 'recognition' ? '🏥 Reconocimiento' : alert.courseName}
                           </div>
                           <div className="text-sm text-slate-600 truncate">
                             {alert.provider}
                           </div>
                           <div className="text-sm text-slate-600">
                             {new Date(alert.expiryDate).toLocaleDateString('es-ES', { 
                               day: '2-digit', 
                               month: '2-digit', 
                               year: 'numeric' 
                             })}
                           </div>
                           <div className="text-sm font-medium">
                             <span className={`px-2 py-1 rounded text-xs ${
                               alert.alertLevel === 'critical' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                             }`}>
                               {alert.alertLevel === 'critical' ? 'CADUCADO' : 'PRÓXIMO'}
                             </span>
                           </div>
                         </div>
                       );
                     });
                   })()}
                 </div>
               </div>
             )}

             {/* Operarios */}
            {planning.selectedMedicalTab === 'workers' && (
               <div className="space-y-4">
                 {/* Buscador de operarios */}
                 <div className="relative">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                   <input
                     type="text"
                     placeholder="Buscar operario por nombre o código..."
                     className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                     value={medicalWorkerSearch}
                     onChange={(e) => setMedicalWorkerSearch(e.target.value)}
                   />
                 </div>
                 {planning.workers.filter(worker => !worker.isArchived && (
                   medicalWorkerSearch === '' || 
                   worker.name.toLowerCase().includes(medicalWorkerSearch.toLowerCase()) || 
                   worker.code.toLowerCase().includes(medicalWorkerSearch.toLowerCase())
                 )).sort((a, b) => {
                    // Extraer números del código (ej: X001 -> 001, 002, etc.)
                    const numA = parseInt(a.code.replace(/\D/g, ''), 10);
                    const numB = parseInt(b.code.replace(/\D/g, ''), 10);
                    return numA - numB;
                  }).map(worker => {
                   const workerMedicalCourses = planning.medicalCourses
                     .filter(course => course.assignedWorkerIds.includes(worker.id))
                     .sort((a, b) => {
                       // Extraer timestamp del ID si es posible, o usar updatedAt/createdAt
                       const getTimestamp = (course: any) => {
                         // Intentar extraer timestamp del ID (formato: timestamp-workerId)
                         const idTimestamp = course.id ? parseInt(course.id.split('-')[0]) : 0;
                         if (!isNaN(idTimestamp) && idTimestamp > 1000000000000) return idTimestamp;
                         
                         // Usar fechas si existen
                         if (course.updatedAt) return new Date(course.updatedAt).getTime();
                         if (course.createdAt) return new Date(course.createdAt).getTime();
                         if (course.date) return new Date(course.date).getTime();
                         
                         // Último recurso: usar el ID completo como string
                         return course.id ? course.id.toString() : '';
                       };
                       
                       const valueA = getTimestamp(a);
                       const valueB = getTimestamp(b);
                       
                       // Orden descendente (más reciente primero)
                       if (typeof valueA === 'number' && typeof valueB === 'number') {
                         return valueB - valueA;
                       }
                       
                       // Si son strings, ordenar alfabéticamente invertido
                       return valueB.toString().localeCompare(valueA.toString());
                     });
                   const workerAlerts = planning.medicalAlerts.filter(alert => alert.workerId === worker.id);
                   const hasAlerts = workerAlerts.length > 0;
                   
                   return (
                     <div key={worker.id} className={`bg-white rounded-xl p-6 border ${
                       hasAlerts ? 'border-red-200 bg-red-50' : 'border-slate-200'
                     }`}>
                       <div className="flex items-center justify-between mb-4">
                         <div className="flex items-center gap-3">
                           <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                             <Users className="w-6 h-6 text-slate-600" />
                           </div>
                           <div>
                             <h4 className="font-bold text-slate-900">{worker.name}</h4>
                             <p className="text-xs text-slate-500">{worker.code} • {worker.role}</p>
                           </div>
                         </div>
                         {hasAlerts && (
                           <div className="bg-red-100 text-red-700 px-0.5 py-0.25 rounded text-xs font-bold text-xs">
                             {workerAlerts.length} alertas
                           </div>
                         )}
                       </div>
                       {workerMedicalCourses.length > 0 && (
                         <div className="mt-4 pt-4 border-t border-slate-200">
                           <h5 className="text-sm font-bold text-slate-900 mb-2">Registros asignados:</h5>
                           <div className="space-y-2">
                             {workerMedicalCourses.map(course => (
                               <div key={course.id} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded">
                                 <div>
                                   <span className="font-medium text-xs">
                                     {course.type === 'recognition' 
                                       ? '🏥 Reconocimiento Médico' 
                                       : course.name || '📚 Curso Formación Laboral'}
                                   </span>
                                   <span className="text-xs text-slate-500 ml-2 text-xs">
                                     {course.type === 'recognition' ? '🏥' : '📚'} • {course.provider}
                                   </span>
                                 </div>
                                 <div className="text-xs text-slate-500 text-xs">
                                   {course.expiryDate && `Caduca: ${new Date(course.expiryDate).toLocaleDateString('es-ES')}`}
                                 </div>
                               </div>
                             ))}
                           </div>
                         </div>
                       )}
                     </div>
                   );
                 })}
               </div>
             )}
           </div>
         )}
         {view === 'clients' && (
           <div className="flex-1 bg-slate-50 overflow-y-auto p-8 custom-scrollbar">
             <div className="flex items-center justify-between mb-8">
               <h2 className="text-2xl font-black text-slate-900 italic uppercase">Gestión de Clientes</h2>
               <div className="flex gap-3">
                 <button 
                   onClick={exportClientsToExcel}
                   className="bg-green-600 text-white px-6 py-4 rounded-[24px] font-black text-[12px] uppercase tracking-widest flex items-center gap-2 hover:bg-green-700 transition-colors"
                 >
                   <FileSpreadsheet className="w-4 h-4" />
                   Exportar Clientes
                 </button>
                 <button onClick={handleOpenNewClientHandler} className="bg-slate-900 text-white px-6 py-4 rounded-[24px] font-black text-[12px] uppercase tracking-widest">+ Nuevo Cliente</button>
               </div>
             </div>
             <div className="grid grid-cols-4 gap-4">
               {planning.clients.sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                 <div key={c.id} onClick={() => setEditingClient(c)} className="bg-white p-4 rounded-2xl border border-slate-100 hover:shadow-md transition-all cursor-pointer">
                    <h3 className="font-black text-slate-900">{c.name}</h3>
                    <p className="text-xs text-slate-400 uppercase font-bold">{c.location}</p>
                 </div>
               ))}
             </div>
           </div>
         )}
         {view === 'databases' && (
            <div className="flex-1 bg-slate-50 overflow-y-auto p-8 custom-scrollbar">
               <h2 className="text-2xl font-black text-slate-900 italic uppercase mb-8">Bases de Datos</h2>
               <div className="flex gap-4 mb-4">
                  <button onClick={() => setDbTab('tasks')} className={`px-4 py-2 rounded-xl font-bold text-xs uppercase ${dbTab==='tasks'?'bg-blue-600 text-white':'bg-white text-slate-500'}`}>Tareas</button>
                  <button onClick={() => setDbTab('courses')} className={`px-4 py-2 rounded-xl font-bold text-xs uppercase ${dbTab==='courses'?'bg-blue-600 text-white':'bg-white text-slate-500'}`}>Cursos</button>
               </div>
               {dbTab === 'tasks' && (
                 <div>
                    <button onClick={handleOpenNewStandardTask} className="mb-4 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase">Nueva Tarea</button>
                    <div className="space-y-2">
                      {filteredTasks.map(t => (
                        <div key={t.id} onClick={() => setEditingStandardTask(t)} className="bg-white p-4 rounded-xl border border-slate-200 cursor-pointer hover:border-blue-400 transition-colors">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-black text-slate-900 mb-1">{t.name}</h3>
                              <div className="flex items-center gap-4 text-xs text-slate-500">
                                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-black uppercase">
                                  {(t as any).type || 'Sin tipo'}
                                </span>
                                <span className="font-black">{t.defaultWorkers} operarios</span>
                              </div>
                              {t.notes && <p className="text-xs text-slate-400 mt-2 line-clamp-2">{t.notes}</p>}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className="text-xs text-slate-400">
                                {(t as any).assignedClientIds?.length || 0} cliente{(t as any).assignedClientIds?.length !== 1 ? 's' : ''}
                              </span>
                              {(t as any).assignedClientIds && (t as any).assignedClientIds.length > 0 && (
                                <div className="flex flex-wrap gap-1 max-w-32">
                                  {(t as any).assignedClientIds.slice(0, 2).map((clientId: string) => {
                                    const client = planning.clients.find(c => c.id === clientId);
                                    return client ? (
                                      <span key={clientId} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-black">
                                        {client.name.split(' ')[0]}
                                      </span>
                                    ) : null;
                                  })}
                                  {(t as any).assignedClientIds.length > 2 && (
                                    <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-black">
                                      +{(t as any).assignedClientIds.length - 2}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                 </div>
               )}
               {dbTab === 'courses' && (
                 <div>
                    <div className="flex gap-2 mb-4">
                      <input 
                        className="p-2 rounded-xl border" 
                        placeholder="Nuevo curso" 
                        value={newCourseName} 
                        onChange={e=>setNewCourseName(e.target.value)} 
                      />
                      <button 
                        onClick={handleAddGlobalCourse} 
                        className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-xs"
                      >
                        Añadir
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {planning.courses.map(course => (
                        <div key={course.id} className="bg-white p-4 rounded-xl border border-slate-200">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h3 className="font-bold text-lg text-slate-900">{course.name}</h3>
                              {course.description && (
                                <p className="text-sm text-slate-600 mt-1">{course.description}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg">
                                  Validez: {course.validityMonths || 12} meses
                                </span>
                                <span className="text-xs text-slate-500">
                                  {course.assignedWorkerIds.length} operarios asignados
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingCourse(course)}
                                className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600"
                                title="Editar curso"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setItemToDelete({ id: course.id, type: 'course', name: course.name })}
                                className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-500"
                                title="Eliminar curso"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          {/* Operarios asignados */}
                          <div className="border-t pt-3">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-bold text-slate-700 uppercase">Operarios con este curso</span>
                              <button
                                onClick={() => setEditingCourse(course)}
                                className="text-xs bg-blue-600 text-white px-2 py-1 rounded-lg hover:bg-blue-700"
                              >
                                Gestionar
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {course.assignedWorkerIds.length > 0 ? (
                                course.assignedWorkerIds.map(workerId => {
                                  const worker = planning.workers.find(w => w.id === workerId);
                                  return worker ? (
                                    <span key={workerId} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg">
                                      {worker.name}
                                    </span>
                                  ) : null;
                                })
                              ) : (
                                <span className="text-xs text-slate-400 italic">No hay operarios asignados</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {planning.courses.length === 0 && (
                        <div className="text-center py-8 text-slate-400">
                          <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p className="font-bold uppercase text-xs tracking-widest">No hay cursos registrados</p>
                        </div>
                      )}
                    </div>
                 </div>
               )}
            </div>
         )}
         {view === 'workerControl' && (
            <div className="flex-1 bg-slate-50 overflow-y-auto p-8 custom-scrollbar">
               <div className="flex items-center justify-between mb-6">
                  <div>
                     <h2 className="text-2xl font-black text-slate-900 italic uppercase">📅 Control de Operarios</h2>
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Control Diario de Asistencia y Horas</p>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200">
                        <CalendarDays className="w-4 h-4 text-slate-600" />
                        <select 
                           className="font-black text-sm text-slate-700 outline-none bg-transparent"
                           value={selectedMonth}
                           onChange={(e) => handleMonthChange(e.target.value)}
                        >
                           <option value="2026-01">Enero 2026</option>
                           <option value="2026-02">Febrero 2026</option>
                           <option value="2026-03">Marzo 2026</option>
                           <option value="2026-04">Abril 2026</option>
                           <option value="2026-05">Mayo 2026</option>
                           <option value="2026-06">Junio 2026</option>
                           <option value="2026-07">Julio 2026</option>
                           <option value="2026-08">Agosto 2026</option>
                           <option value="2026-09">Septiembre 2026</option>
                           <option value="2026-10">Octubre 2026</option>
                           <option value="2026-11">Noviembre 2026</option>
                           <option value="2026-12">Diciembre 2026</option>
                        </select>
                     </div>
                     <button 
                        onClick={exportWorkerControlData}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-black"
                     >
                        <Download className="w-4 h-4" />
                        Exportar
                     </button>
                     <button 
                        onClick={() => syncFromStatusRecords(true)}
                        className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center gap-2 text-sm font-black"
                     >
                        <RotateCcw className="w-4 h-4" />
                        Sincronizar Estados
                     </button>
                  </div>
               </div>

               {/* Leyenda de códigos - movida arriba */}
               <div className="mb-4 bg-white rounded-xl border border-slate-200 p-3">
                  <h4 className="font-black text-xs text-slate-900 mb-2">Leyenda de Códigos</h4>
                  <div className="flex flex-wrap gap-2">
                     <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-blue-50 text-blue-700 rounded flex items-center justify-center text-[8px] font-bold">#</div>
                        <span className="text-[10px] text-slate-600">Horas</span>
                     </div>
                     <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-yellow-100 text-yellow-700 rounded flex items-center justify-center text-[8px] font-bold">F</div>
                        <span className="text-[10px] text-slate-600">Falta</span>
                     </div>
                     <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-red-100 text-red-700 rounded flex items-center justify-center text-[8px] font-bold">B</div>
                        <span className="text-[10px] text-slate-600">Baja médica</span>
                     </div>
                     <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-orange-100 text-orange-700 rounded flex items-center justify-center text-[8px] font-bold">P</div>
                        <span className="text-[10px] text-slate-600">Baja paternidad</span>
                     </div>
                     <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-gray-100 text-gray-700 rounded flex items-center justify-center text-[8px] font-bold">D</div>
                        <span className="text-[10px] text-slate-600">Permiso retribuido</span>
                     </div>
                     <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-sky-100 text-sky-700 rounded flex items-center justify-center text-[8px] font-bold">R</div>
                        <span className="text-[10px] text-slate-600">Reposo domiciliario</span>
                     </div>
                     <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-green-100 text-green-700 rounded flex items-center justify-center text-[8px] font-bold">V</div>
                        <span className="text-[10px] text-slate-600">Vacaciones</span>
                     </div>
                  </div>
               </div>

               {/* Grid de Control de Operarios - 30% más pequeño */}
               <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto max-h-[91vh] overflow-y-auto">
                  <table className="w-full min-w-[800px] text-xs">
                     {/* Header con días del mes */}
                     <thead className="bg-slate-700 border-b border-slate-800 sticky top-0 z-10">
                        <tr>
                           <th className="p-1 text-xs font-black text-white uppercase text-center border-r border-slate-600 min-w-[120px]">
                              <div className="flex gap-3 items-center ml-8">
                                    <input 
                                       type="text"
                                       placeholder=""
                                       value={workerFilter}
                                       onChange={(e) => setWorkerFilter(e.target.value)}
                                       className="w-20 px-1 py-0.5 text-[8px] text-slate-700 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                    <button
                                       onClick={() => setWorkerContractFilter('all')}
                                       className={`px-1 py-0.5 text-[7px] rounded transition-colors ${
                                          workerContractFilter === 'all' 
                                             ? 'bg-blue-600 text-white' 
                                             : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                       }`}
                                       title="Todos los operarios"
                                    >
                                       Todos
                                    </button>
                                    <button
                                       onClick={() => setWorkerContractFilter('fixedDiscontinuous')}
                                       className={`px-1 py-0.5 text-[7px] rounded transition-colors ${
                                          workerContractFilter === 'fixedDiscontinuous' 
                                             ? 'bg-red-600 text-white' 
                                             : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                       }`}
                                       title="Fijos Discontinuos"
                                    >
                                       FD
                                    </button>
                                    <button
                                       onClick={() => setWorkerContractFilter('others')}
                                       className={`px-1 py-0.5 text-[7px] rounded transition-colors ${
                                          workerContractFilter === 'others' 
                                                ? 'bg-green-600 text-white' 
                                                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                       }`}
                                       title="Resto de operarios"
                                    >
                                       Resto
                                    </button>
                                 </div>
                           </th>
                           {/* Días del mes - dinámico según el mes seleccionado */}
                           {(() => {
                              const [year, month] = selectedMonth.split('-').map(Number);
                              const days = getMonthDays(selectedMonth);
                              return days.map(day => {
                                 const dayOfWeek = getDayOfWeek(year, month, day);
                                 const isCurrentDay = day === getCurrentDay() && month === new Date().getMonth() + 1 && year === new Date().getFullYear();
                                 return (
                                    <th key={day} className={`p-1 text-center border-r border-slate-600 min-w-[25px] ${isCurrentDay ? 'bg-green-600' : ''}`}>
                                       <div className="text-xs font-black text-white">
                                          {day}
                                       </div>
                                       <div className="text-[7px] text-slate-300">
                                          {['D', 'L', 'M', 'X', 'J', 'V', 'S'][dayOfWeek]}
                                       </div>
                                    </th>
                                 );
                              });
                           })()}
                           {/* Columnas de totales */}
                           <th className="p-1 text-xs font-black text-white uppercase text-center border-l border-slate-600 min-w-[35px]">Faltas</th>
                           <th className="p-1 text-xs font-black text-white uppercase text-center border-l border-slate-600 min-w-[40px]">Horas</th>
                           <th className="p-1 text-xs font-black text-white uppercase text-center border-r border-slate-600 min-w-[35px]">Baja</th>
                           <th className="p-1 text-xs font-black text-white uppercase text-center border-r border-slate-600 min-w-[35px]">Reposo</th>
                           <th className="p-1 text-xs font-black text-white uppercase text-center border-r border-slate-600 min-w-[35px]">Vac. Mes</th>
                           <th className="p-1 text-xs font-black text-white uppercase text-center border-r border-slate-600 min-w-[40px]">Saldo Vac.</th>
                           <th className="p-1 text-xs font-black text-white uppercase text-center border-r border-slate-600 min-w-[35px]">Anticipo</th>
                           <th className="p-1 text-xs font-black text-white uppercase text-center border-r border-slate-600 min-w-[45px]">S. Bruto</th>
                           <th className="p-1 text-xs font-black text-white uppercase text-center min-w-[45px]">S. Neto</th>
                        </tr>
                     </thead>
                     
                     {/* Filas de operarios */}
                     <tbody>
                        {(() => {
                           const activeWorkers = planning.workers
                              .filter(w => !w.isArchived) // Usar el mismo filtro que Gestión de Operarios
                              .sort((a, b) => {
                                 const numA = parseInt(a.code.replace(/\D/g, ''), 10);
                                 const numB = parseInt(b.code.replace(/\D/g, ''), 10);
                                 return numA - numB;
                              })
                              .filter(worker => {
                                 const matchesSearch = !workerFilter || 
                                    worker.name.toLowerCase().includes(workerFilter.toLowerCase()) || 
                                    worker.code.toLowerCase().includes(workerFilter.toLowerCase());
                                 
                                 const matchesContract = workerContractFilter === 'all' || 
                                    (workerContractFilter === 'fixedDiscontinuous' && worker.contractType === ContractType.FIJO_DISCONTINUO) ||
                                    (workerContractFilter === 'others' && worker.contractType !== ContractType.FIJO_DISCONTINUO);
                                 
                                 return matchesSearch && matchesContract;
                              });
                           
                           return activeWorkers.map(worker => {
                              const totals = calculateWorkerTotals(worker.id);
                              return (
                                 <tr key={worker.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                                    {/* Nombre del operario */}
                                    <td className="p-1 border-r border-slate-200 bg-white">
                                       <div className="flex items-center gap-2">
                                          <div className="font-black text-xs text-slate-900 min-w-[35px] text-right">
                                             {worker.code}
                                          </div>
                                          <div className={`font-black text-xs flex-1 ${worker.contractType === ContractType.FIJO_DISCONTINUO ? 'text-red-600' : 'text-slate-900'}`}>
                                             {worker.name}
                                          </div>
                                       </div>
                                    </td>
                                    
                                    {/* Celdas de días - dinámicas según el mes seleccionado */}
                                    {(() => {
                                       const days = getMonthDays(selectedMonth);
                                       const [currentYear, currentMonth] = selectedMonth.split('-').map(Number);
                                       const [year, month] = selectedMonth.split('-').map(Number);
                                       const today = new Date();
                                       const isCurrentMonth = currentYear === today.getFullYear() && currentMonth === today.getMonth() + 1;
                                       const currentDay = today.getDate();
                                       
                                       return days.map(day => {
                                          const cellValue = getCellValue(worker.id, day);
                                          const isCurrentDay = isCurrentMonth && day === currentDay;
                                          const dayOfWeek = getDayOfWeek(year, month, day);
                                          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Domingo=0, Sábado=6
                                          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                          const holidayData = isHoliday(dateStr, planning.customHolidays);
                                          const isHolidayDay = !!holidayData;
                                          const isNonWorkingDay = isWeekend || isHolidayDay;
                                          
                                          return (
                                             <td 
                                                key={day} 
                                                className={`p-1 text-center cursor-pointer hover:bg-blue-50 transition-colors border-r border-slate-200 ${
                                                   isHolidayDay ? 'bg-red-50' : 
                                                   isWeekend ? 'bg-slate-100' : 
                                                   isCurrentDay ? 'bg-green-300' : 'bg-white'
                                                }`}
                                                onClick={() => {
                                                   // Permitir clic en festivos/fin de semana para poder registrar B (baja) o P (paternidad)
                                                   // El bloqueo se hará al intentar guardar valores no permitidos
                                                   handleCellClick(worker.id, day);
                                                }}
                                             >
                                                <div className={`w-5 h-5 mx-auto flex items-center justify-center text-[10px] font-black rounded ${getCellColor(cellValue)} hover:opacity-80`}>
                                                   {cellValue}
                                                </div>
                                             </td>
                                          );
                                       });
                                    })()}
                                    
                                    {/* Columnas de totales */}
                                    <td className="p-1 text-center border-l border-slate-200 bg-white">
                                       <div className="text-xs font-black text-yellow-600">
                                          {totals.totalFaltas}
                                       </div>
                                    </td>
                                    {/* Horas con acumulado y liquidación */}
                                    <td className="p-1 text-center border-l border-r border-slate-200 bg-white">
                                       {(() => {
                                          const settled = isHoursSettled(worker.id);
                                          const accumulated = calculateAccumulatedHours(worker.id);
                                          const displayTotal = totals.totalHours + accumulated;
                                          const hasAccumulated = accumulated !== 0;
                                          const tooltipText = settled
                                             ? `Liquidadas ✓ | Mes: ${totals.totalHours >= 0 ? '+' : ''}${totals.totalHours}h`
                                             : hasAccumulated
                                                ? `Mes: ${totals.totalHours >= 0 ? '+' : ''}${totals.totalHours}h | Acumulado anterior: ${accumulated >= 0 ? '+' : ''}${accumulated}h | Total: ${displayTotal >= 0 ? '+' : ''}${displayTotal}h`
                                                : `Mes: ${totals.totalHours >= 0 ? '+' : ''}${totals.totalHours}h | Pulsar para liquidar`;
                                          return (
                                             <button
                                                onClick={() => toggleHoursSettled(worker.id)}
                                                title={tooltipText}
                                                className={`w-full flex items-center justify-center gap-0.5 px-1 py-0.5 rounded-lg transition-colors ${settled ? 'bg-green-100 text-green-700' : displayTotal < 0 ? 'text-red-600 hover:bg-red-50' : 'text-blue-600 hover:bg-blue-50'}`}
                                             >
                                                <span className="text-xs font-black">
                                                   {displayTotal >= 0 ? '+' : ''}{displayTotal}
                                                </span>
                                                {settled && <CheckCircle className="w-3 h-3 flex-shrink-0" />}
                                                {!settled && hasAccumulated && <span className="text-[9px] opacity-60">↑</span>}
                                             </button>
                                          );
                                       })()}
                                    </td>
                                    <td className="p-1 text-center border-l border-r border-slate-200 bg-white">
                                       <div className="text-xs font-black text-red-600">
                                          {totals.totalBajaMedica}
                                       </div>
                                    </td>
                                    <td className="p-1 text-center border-l border-r border-slate-200 bg-white">
                                       <div className="text-xs font-black text-sky-600">
                                          {totals.totalReposo}
                                       </div>
                                    </td>
                                    <td className="p-1 text-center border-r border-slate-200 bg-white">
                                       <div className="text-xs font-black text-green-600">
                                          {totals.totalVacaciones}
                                       </div>
                                    </td>
                                    {/* Saldo vacaciones anual */}
                                    <td className="p-1 text-center border-r border-slate-200 bg-white">
                                       {(() => {
                                          const vac = calculateVacationBalance(worker.id);
                                          const color = vac.remaining > 0 ? 'text-emerald-600' : vac.remaining < 0 ? 'text-red-600' : 'text-slate-400';
                                          return (
                                             <button
                                                onClick={() => openVacationModal(worker.id)}
                                                title={`Derecho: ${vac.totalDays} días${vac.carryOver !== 0 ? ` + ${vac.carryOver} arrastre` : ''} | Disfrutados: ${vac.usedDays} | Pendientes: ${vac.remaining}`}
                                                className="w-full flex items-center justify-center px-1 py-0.5 rounded-lg hover:bg-emerald-50 transition-colors"
                                             >
                                                <span className={`text-xs font-black ${color}`}>{vac.remaining}</span>
                                             </button>
                                          );
                                       })()}
                                    </td>
                                    {/* Columna de Anticipos */}
                                    <td className="p-1 text-center border-r border-slate-200 bg-white">
                                       <div className="flex items-center justify-center gap-1">
                                          <input
                                             type="text"
                                             placeholder="0"
                                             value={getWorkerAdvance(worker.id)}
                                             onChange={(e) => {
                                                const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                                                saveWorkerAdvance(worker.id, value);
                                             }}
                                             className={`px-1 py-0.5 text-[10px] text-center border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                                (() => {
                                                   const adv = getWorkerAdvance(worker.id);
                                                   const isPaid = isAdvancePaid(worker.id);
                                                   if (adv && adv !== '0') {
                                                      return isPaid 
                                                         ? 'border-green-700 bg-green-700 text-white font-bold' 
                                                         : 'border-orange-400 bg-orange-100 text-orange-700 font-bold';
                                                   }
                                                   return 'border-slate-300';
                                                })()
                                             }`}
                                             maxLength={4}
                                             title="Anticipo mensual (máximo 4 cifras)"
                                             style={{
                                                width: '40px'
                                             }}
                                          />
                                          {/* Icono siempre visible */}
                                          <button
                                             onClick={() => {
                                                if (getWorkerAdvance(worker.id) && getWorkerAdvance(worker.id) !== '0') {
                                                   if (isAdvancePaid(worker.id)) {
                                                      markAdvanceAsUnpaid(worker.id);
                                                   } else {
                                                      markAdvanceAsPaid(worker.id);
                                                   }
                                                }
                                             }}
                                             className={`p-0.5 transition-colors text-[8px] font-bold ${
                                                (() => {
                                                   const adv = getWorkerAdvance(worker.id);
                                                   const isPaid = isAdvancePaid(worker.id);
                                                   if (adv && adv !== '0') {
                                                      return isPaid 
                                                         ? 'bg-green-500 text-white rounded hover:bg-green-600' 
                                                         : 'bg-orange-500 text-white rounded hover:bg-orange-600';
                                                   }
                                                   return 'bg-slate-200 text-slate-400 rounded hover:bg-slate-300';
                                                })()
                                             }`}
                                             title={(() => {
                                                const adv = getWorkerAdvance(worker.id);
                                                const isPaid = isAdvancePaid(worker.id);
                                                if (adv && adv !== '0') {
                                                   return isPaid 
                                                         ? 'Marcar anticipo como pendiente' 
                                                         : 'Marcar anticipo como pagado';
                                                }
                                                return 'Anticipo vacío';
                                             })()}
                                          >
                                             {(() => {
                                                const adv = getWorkerAdvance(worker.id);
                                                const isPaid = isAdvancePaid(worker.id);
                                                if (adv && adv !== '0') {
                                                   return isPaid ? '✓' : '€';
                                                }
                                                return '€';
                                             })()}
                                          </button>
                                       </div>
                                    </td>
                                    {/* Columna Salario Bruto */}
                                    <td className="p-1 text-center border-r border-slate-200 bg-white">
                                       <input
                                          type="number"
                                          placeholder="0"
                                          value={worker.salary || ''}
                                          onChange={(e) => {
                                             const value = e.target.value;
                                             const updatedWorker = { ...worker, salary: value ? parseFloat(value) : undefined };
                                             saveWorker(updatedWorker);
                                          }}
                                          className={`w-16 px-1 py-0.5 text-[10px] text-center border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 [-moz-appearance:_textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden ${
                                             worker.salary && worker.salary > 0 
                                                ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold' 
                                                : 'border-slate-300'
                                          }`}
                                          title="Salario Bruto (€)"
                                       />
                                    </td>
                                    {/* Columna Salario Neto */}
                                    <td className="p-1 text-center bg-white">
                                       <input
                                          type="number"
                                          placeholder="0"
                                          value={worker.netSalary || ''}
                                          onChange={(e) => {
                                             const value = e.target.value;
                                             const updatedWorker = { ...worker, netSalary: value ? parseFloat(value) : undefined };
                                             saveWorker(updatedWorker);
                                          }}
                                          className={`w-16 px-1 py-0.5 text-[10px] text-center border rounded focus:outline-none focus:ring-1 focus:ring-green-500 [-moz-appearance:_textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden ${
                                             worker.netSalary && worker.netSalary > 0 
                                                ? 'border-green-600 bg-green-50 text-green-700 font-bold' 
                                                : 'border-slate-300'
                                          }`}
                                          title="Salario Neto (€)"
                                       />
                                    </td>
                                 </tr>
                              );
                           });
                        })()}

                        {/* Fila de Totales Generales */}
                        <tr className="border-t-2 border-slate-300 bg-slate-50 font-black">
                           {/* Celda TOTALES - coincide con la columna Operario de las filas */}
                           <td className="p-2 text-center border-r border-slate-200 bg-white">
                              <span className="text-xs text-slate-700 uppercase tracking-widest">TOTALES</span>
                           </td>
                           
                           {/* Totales por día - mismo número que en las filas de operarios */}
                           {(() => {
                              const days = getMonthDays(selectedMonth);
                              return days.map(day => {
                                 const dayTotal = calculateDayTotals(day);
                                 return (
                                    <td key={day} className="p-1 text-center border-r border-slate-200">
                                       <span className="text-xs text-slate-700">
                                          {dayTotal.totalHours >= 0 ? '+' : ''}{dayTotal.totalHours}
                                       </span>
                                    </td>
                                 );
                              });
                           })()}
                           
                           {/* Columna Faltas */}
                           <td className="p-1 text-center border-l border-slate-200">
                              <span className="text-xs text-yellow-600">{calculateGrandTotals(selectedMonth).totalFaltas}</span>
                           </td>
                           
                           {/* Columna Horas */}
                           <td className="p-1 text-center border-l border-r border-slate-200">
                              <span className="text-xs text-blue-600">
                                 {calculateGrandTotals(selectedMonth).totalHours >= 0 ? '+' : ''}{calculateGrandTotals(selectedMonth).totalHours}
                              </span>
                           </td>
                           
                           {/* Columna Baja */}
                           <td className="p-1 text-center border-l border-r border-slate-200">
                              <span className="text-xs text-red-600">{calculateGrandTotals(selectedMonth).totalBajaMedica}</span>
                           </td>
                           
                           {/* Columna Reposo */}
                           <td className="p-1 text-center border-l border-r border-slate-200">
                              <span className="text-xs text-sky-600">{calculateGrandTotals(selectedMonth).totalReposo}</span>
                           </td>
                           
                           {/* Columna Vac. Mes */}
                           <td className="p-1 text-center border-r border-slate-200">
                              <span className="text-xs text-green-600">{calculateGrandTotals(selectedMonth).totalVacaciones}</span>
                           </td>
                           
                           {/* Columna Saldo Vac. */}
                           <td className="p-1 text-center border-r border-slate-200">
                              <span className="text-xs text-emerald-600">-</span>
                           </td>
                           
                           {/* Columna Anticipo */}
                           <td className="p-1 text-center border-r border-slate-200">
                              <span className="text-xs text-slate-600">
                                 {(() => {
                                    const activeWorkers = planning.workers.filter(w => !w.isArchived);
                                    return activeWorkers.reduce((sum, w) => {
                                       const advance = getWorkerAdvance(w.id);
                                       return sum + (parseInt(advance) || 0);
                                    }, 0);
                                 })()}€
                              </span>
                           </td>
                           
                           {/* Columna S. Bruto */}
                           <td className="p-1 text-center border-r border-slate-200">
                              <span className="text-xs text-blue-600 font-bold">
                                 {planning.workers.filter(w => !w.isArchived).reduce((sum, w) => sum + (w.salary || 0), 0)}€
                              </span>
                           </td>
                           
                           {/* Columna S. Neto */}
                           <td className="p-1 text-center">
                              <span className="text-xs text-green-600 font-bold">
                                 {planning.workers.filter(w => !w.isArchived).reduce((sum, w) => sum + (w.netSalary || 0), 0)}€
                              </span>
                           </td>
                        </tr>
                     </tbody>
                  </table>
               </div>
            </div>
         )}
         
         {/* Modal de vacaciones */}
         {vacationModal && (() => {
            const worker = planning.workers.find(w => w.id === vacationModal.workerId);
            const year = selectedMonth.split('-')[0];
            const vac = calculateVacationBalance(vacationModal.workerId);
            return (
               <div className="fixed inset-0 z-[400] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setVacationModal(null)}>
                  <div className="bg-white w-full max-w-sm rounded-[28px] p-6 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                     <div className="flex justify-between items-center mb-5">
                        <div>
                           <h3 className="text-base font-black text-slate-900 uppercase italic">Vacaciones {year}</h3>
                           <p className="text-xs text-slate-500 font-bold">{worker?.name}</p>
                        </div>
                        <button onClick={() => setVacationModal(null)} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
                           <X className="w-4 h-4 text-slate-500" />
                        </button>
                     </div>

                     {/* Resumen actual */}
                     <div className="grid grid-cols-3 gap-2 mb-5">
                        <div className="bg-blue-50 rounded-xl p-3 text-center">
                           <div className="text-xl font-black text-blue-700">{vac.entitled}</div>
                           <div className="text-[10px] font-bold text-blue-500 uppercase">Derecho</div>
                           <div className="text-[9px] text-blue-400">{vac.totalDays} + {vac.carryOver} arr.</div>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-3 text-center">
                           <div className="text-xl font-black text-amber-700">{vac.usedDays}</div>
                           <div className="text-[10px] font-bold text-amber-500 uppercase">Disfrutados</div>
                        </div>
                        <div className={`rounded-xl p-3 text-center ${vac.remaining >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                           <div className={`text-xl font-black ${vac.remaining >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{vac.remaining}</div>
                           <div className={`text-[10px] font-bold uppercase ${vac.remaining >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>Pendientes</div>
                        </div>
                     </div>

                     <div className="border-t border-slate-100 pt-4 space-y-3">
                        <p className="text-xs font-bold text-slate-500 uppercase">Configurar para {year}</p>
                        <div className="flex items-center gap-3">
                           <label className="text-xs font-black text-slate-700 w-36 flex-shrink-0">Días anuales</label>
                           <input
                              type="number"
                              min={0}
                              max={365}
                              value={vacationModalData.totalDays}
                              onChange={e => setVacationModalData(prev => ({ ...prev, totalDays: Math.max(0, parseInt(e.target.value) || 0) }))}
                              className="flex-1 border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-black text-center focus:ring-2 focus:ring-blue-100 outline-none"
                           />
                        </div>
                        <div className="flex items-center gap-3">
                           <label className="text-xs font-black text-slate-700 w-36 flex-shrink-0">Arrastre año anterior</label>
                           <input
                              type="number"
                              min={-99}
                              max={99}
                              value={vacationModalData.carryOver}
                              onChange={e => setVacationModalData(prev => ({ ...prev, carryOver: parseInt(e.target.value) || 0 }))}
                              className="flex-1 border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-black text-center focus:ring-2 focus:ring-blue-100 outline-none"
                           />
                        </div>
                     </div>

                     <div className="flex gap-2 mt-5">
                        <button onClick={() => setVacationModal(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-black text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
                        <button onClick={saveVacationConfig} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 transition-colors">Guardar</button>
                     </div>
                  </div>
               </div>
            );
         })()}

         {/* Modal de selección de código */}
         {selectedCell && (
            <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setSelectedCell(null)}>
               <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="text-lg font-black text-slate-900 italic uppercase">Seleccionar Código</h3>
                     <button onClick={() => setSelectedCell(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                     </button>
                  </div>
                  
                  <div className="mb-4">
                     <p className="text-sm text-slate-600">
                        Operario: <span className="font-black text-slate-900">
                           {planning.workers.find(w => w.id === selectedCell.workerId)?.name}
                        </span>
                     </p>
                     <p className="text-sm text-slate-600">
                        Día: <span className="font-black text-slate-900">{selectedCell.day}</span>
                     </p>
                  </div>
                  
                  {/* Input para horas */}
                  <div className="mb-4">
                     <label className="block text-xs font-black text-slate-700 mb-2">Horas (número decimal)</label>
                     <input 
                        type="number" 
                        step="0.5"
                        placeholder="Ej: 8, 4.5, -2"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyDown={(e) => {
                           if (e.key === 'Enter') {
                              const value = (e.target as HTMLInputElement).value;
                              if (value && !isNaN(Number(value))) {
                                 updateCellValue(selectedCell.workerId, selectedCell.day, value);
                              }
                           }
                        }}
                     />
                  </div>
                  
                  {/* Códigos de estado */}
                  <div className="grid grid-cols-3 gap-2">
                     {[
                        { code: 'B', label: 'Baja Médica', color: 'bg-red-100 text-red-700' },
                        { code: 'P', label: 'Baja Paternidad', color: 'bg-orange-100 text-orange-700' },
                        { code: 'F', label: 'Falta', color: 'bg-yellow-100 text-yellow-700' },
                        { code: 'D', label: 'Permiso Retribuido', color: 'bg-gray-100 text-gray-700' },
                        { code: 'R', label: 'Reposo Domiciliario', color: 'bg-sky-100 text-sky-700' },
                        { code: 'V', label: 'Vacaciones', color: 'bg-green-100 text-green-700' },
                        { code: '', label: 'Limpiar', color: 'bg-white border border-slate-300 text-slate-600' }
                     ].map(({ code, label, color }) => (
                        <button
                           key={code || 'clear'}
                           onClick={() => updateCellValue(selectedCell.workerId, selectedCell.day, code)}
                           className={`p-3 rounded-xl font-black text-xs transition-all hover:scale-105 ${color} hover:opacity-80`}
                        >
                           {code || '✕'}
                           <div className="text-[8px] mt-1">{label}</div>
                        </button>
                     ))}
                  </div>
               </div>
            </div>
         )}
         {view === 'stats' && <StatisticsPanel planning={cleanedPlanning} />}
      </div>

      {showBackupModal && (
         <div className="fixed inset-0 z-[300] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowBackupModal(false)}>
            <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
               <h3 className="text-lg font-black text-slate-900 italic uppercase mb-4">COPIAS DE SEGURIDAD</h3>
               <div className="space-y-3">
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
                     <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-amber-800 uppercase tracking-wider">Backup Automático</span>
                        <button
                           onClick={() => setAutoBackupEnabled(!autoBackupEnabled)}
                           className={`w-12 h-6 rounded-full transition-colors ${
                              autoBackupEnabled ? 'bg-amber-500' : 'bg-amber-200'
                           }`}
                        >
                           <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                              autoBackupEnabled ? 'translate-x-6' : 'translate-x-0.5'
                           }`} />
                        </button>
                     </div>
                     <p className="text-[10px] text-amber-700">
                        {autoBackupEnabled 
                           ? '✅ Activo: Cada hora + al cerrar página' 
                           : '❌ Inactivo: Sin backups automáticos'
                        }
                     </p>
                  </div>
                  
                  <button onClick={exportBackup} className="w-full py-4 bg-blue-50 rounded-2xl font-black text-xs uppercase tracking-widest text-blue-600 hover:bg-blue-100 flex items-center justify-center gap-2 transition-colors"><DownloadCloud className="w-4 h-4" /> Exportar Backup COMPLETO</button>
                  <button onClick={captureTodaySnapshot} className="w-full py-4 bg-purple-50 rounded-2xl font-black text-xs uppercase tracking-widest text-purple-600 hover:bg-purple-100 flex items-center justify-center gap-2 transition-colors"><Camera className="w-4 h-4" /> Capturar Hoy (21:30 Auto)</button>
                  <button onClick={exportDatabaseToExcel} className="w-full py-4 bg-green-50 rounded-2xl font-black text-xs uppercase tracking-widest text-green-600 hover:bg-green-100 flex items-center justify-center gap-2 transition-colors"><FileSpreadsheet className="w-4 h-4" /> Exportar Todo a Excel</button>
                  
                  <button onClick={handleMigrateData} className="w-full py-4 bg-red-50 rounded-2xl font-black text-xs uppercase tracking-widest text-red-600 hover:bg-red-100 flex items-center justify-center gap-2 transition-colors"><Database className="w-4 h-4" /> Importar Datos Antiguos</button>
                  
                  <button onClick={() => backupInputRef.current?.click()} className="w-full py-4 bg-slate-100 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-600 hover:bg-slate-200 flex items-center justify-center gap-2 transition-colors"><Upload className="w-4 h-4" /> Importar Excel / JSON</button>
               </div>
            </div>
         </div>
      )}

      {showSSReport && (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowSSReport(false)}>
           <div className="bg-white w-full max-w-4xl rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
              
              <div className="flex justify-between items-start mb-8 shrink-0">
                 <div>
                    <h2 className="text-3xl font-[900] text-slate-900 italic uppercase tracking-tighter mb-2">Previsión Seguridad Social</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                       Comparativa: <span className="text-slate-900">{formatDateDMY(ssReport.prevDate)}</span> <ArrowRight className="w-3 h-3 inline mx-1" /> <span className="text-blue-600">{formatDateWithDay(planning.currentDate)}</span>
                    </p>
                 </div>
                 <button onClick={() => setShowSSReport(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
              </div>

              <div className="grid grid-cols-2 gap-8 flex-1 overflow-hidden">
                 <div className="bg-green-50/50 rounded-[32px] p-6 border border-green-100 flex flex-col h-full overflow-hidden relative group">
                    <div className="flex items-center justify-between mb-6 shrink-0">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-green-200">
                             <TrendingUp className="w-5 h-5" />
                          </div>
                          <div>
                             <h3 className="text-lg font-black text-green-900 uppercase">Altas</h3>
                             <span className="text-[10px] font-black bg-white px-2 py-1 rounded text-green-600 border border-green-200">{ssReport.altas.length} Operarios</span>
                          </div>
                       </div>
                       <button onClick={() => handleCopyList(ssReport.altas, 'altas')} className="p-2 bg-white hover:bg-green-100 text-green-600 rounded-xl transition-colors shadow-sm" title="Copiar lista"><Copy className="w-4 h-4" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                       {ssReport.altas.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-green-300 opacity-50">
                             <CheckCircle2 className="w-12 h-12 mb-2" />
                             <p className="text-xs font-black uppercase">Sin altas previstas</p>
                          </div>
                       ) : (
                          ssReport.altas.map(w => (
                             <div key={w.id} className="bg-white p-3 rounded-xl border border-green-100 shadow-sm flex justify-between items-center">
                                <div>
                                   <p className="font-black text-slate-700 text-sm">{getWorkerSSFormat(w)}</p>
                                </div>
                                <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded">{w.code}</span>
                             </div>
                          ))
                       )}
                    </div>
                 </div>

                 <div className="bg-red-50/50 rounded-[32px] p-6 border border-red-100 flex flex-col h-full overflow-hidden relative group">
                    <div className="flex items-center justify-between mb-6 shrink-0">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-red-200">
                             <TrendingUp className="w-5 h-5 transform rotate-180" />
                          </div>
                          <div>
                             <h3 className="text-lg font-black text-red-900 uppercase">Bajas</h3>
                             <span className="text-[10px] font-black bg-white px-2 py-1 rounded text-red-600 border border-red-200">{ssReport.bajas.length} Operarios</span>
                          </div>
                       </div>
                       <button onClick={() => handleCopyList(ssReport.bajas, 'bajas')} className="p-2 bg-white hover:bg-red-100 text-red-600 rounded-xl transition-colors shadow-sm" title="Copiar lista"><Copy className="w-4 h-4" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                       {ssReport.bajas.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-red-300 opacity-50">
                             <CheckCircle2 className="w-12 h-12 mb-2" />
                             <p className="text-xs font-black uppercase">Sin bajas previstas</p>
                          </div>
                       ) : (
                          ssReport.bajas.map(w => (
                             <div key={w.id} className="bg-white p-3 rounded-xl border border-red-100 shadow-sm flex justify-between items-center">
                                <div>
                                   <p className="font-black text-slate-700 text-sm">{getWorkerSSFormat(w)}</p>
                                </div>
                                <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-1 rounded">{w.code}</span>
                             </div>
                          ))
                       )}
                    </div>
                 </div>
              </div>

           </div>
        </div>
      )}
      
      {editingJob && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setEditingJob(null)}>
           <div className="bg-white w-full max-w-2xl rounded-[40px] p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
              
              <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
                 <div>
                    <h2 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter">Gestión de Servicio</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Planificación y Recursos</p>
                 </div>
                 <button onClick={() => setEditingJob(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
              </div>

              <div className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Cliente</label>
                       <div className="relative">
                          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <select 
                             className="w-full bg-slate-50 border-none rounded-xl pl-12 pr-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                             value={editingJob.clientId}
                             onChange={e => {
                                const client = planning.clients.find(c => c.id === e.target.value);
                                setEditingJob({
                                   ...editingJob, 
                                   clientId: e.target.value,
                                   centerId: client?.centers[0]?.id || '' 
                                });
                             }}
                          >
                             <option value="">Seleccionar Cliente</option>
                             {planning.clients.sort((a, b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                       </div>
                    </div>

                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Sede / Centro</label>
                       <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <select 
                             className="w-full bg-slate-50 border-none rounded-xl pl-12 pr-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                             value={editingJob.centerId}
                             onChange={e => setEditingJob({...editingJob, centerId: e.target.value})}
                             disabled={!editingJob.clientId}
                          >
                             <option value="">Seleccionar Sede</option>
                             {planning.clients.find(c => c.id === editingJob.clientId)?.centers.map(ct => (
                                <option key={ct.id} value={ct.id}>{ct.name}</option>
                             ))}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                       </div>
                    </div>
                 </div>

                 <div className="bg-slate-50/50 rounded-2xl p-1 border border-slate-100">
                    <div className="grid grid-cols-3 gap-2">
                       <div className="space-y-1 p-2 bg-white rounded-xl shadow-sm border border-slate-50">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha</label>
                          <input 
                             type="date" 
                             className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-700 focus:ring-0 outline-none"
                             value={editingJob.date}
                             onChange={e => setEditingJob({...editingJob, date: e.target.value})}
                          />
                       </div>
                       <div className="space-y-1 p-2 bg-white rounded-xl shadow-sm border border-slate-50">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Inicio</label>
                          <input 
                             type="time" 
                             className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-700 focus:ring-0 outline-none"
                             value={editingJob.startTime}
                             onChange={e => setEditingJob({...editingJob, startTime: e.target.value})}
                          />
                       </div>
                       <div className="space-y-1 p-2 bg-white rounded-xl shadow-sm border border-slate-50">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fin</label>
                          <input 
                             type="time" 
                             className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-700 focus:ring-0 outline-none"
                             value={editingJob.endTime}
                             onChange={e => setEditingJob({...editingJob, endTime: e.target.value})}
                          />
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tipo de Servicio</label>
                       <div className="relative">
                          <select 
                             className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                             value={editingJob.type}
                             onChange={e => setEditingJob({...editingJob, type: e.target.value as JobType})}
                          >
                             {Object.values(JobType).map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                       </div>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Dotación (Nº Operarios)</label>
                       <div className="flex items-center gap-3">
                          <button 
                             onClick={() => setEditingJob({...editingJob, requiredWorkers: Math.max(1, editingJob.requiredWorkers - 1)})}
                             className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
                          >
                             <ChevronLeft className="w-5 h-5" />
                          </button>
                          <div className="flex-1 bg-slate-50 rounded-xl flex items-center justify-center font-black text-xl text-slate-800 h-10 border border-slate-100">
                             {editingJob.requiredWorkers}
                          </div>
                          <button 
                             onClick={() => setEditingJob({...editingJob, requiredWorkers: editingJob.requiredWorkers + 1})}
                             className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
                          >
                             <ChevronRight className="w-5 h-5" />
                          </button>
                       </div>
                    </div>

                    {/* 🆕 Checkbox de imposición */}
                    <div className="flex items-center gap-2 mt-3">
                       <input
                          type="checkbox"
                          id="isImposed"
                          checked={editingJob.isImposed || false}
                          onChange={(e) => setEditingJob({...editingJob, isImposed: e.target.checked})}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                       />
                       <label htmlFor="isImposed" className="text-xs text-slate-600 cursor-pointer">
                         Imposición del cliente
                       </label>
                    </div>
                 </div>

                 <div className="bg-slate-50 rounded-2xl p-5 space-y-4 border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                       <div className="flex items-center gap-2">
                          <ClipboardList className="w-4 h-4 text-blue-500" />
                          <h3 className="text-xs font-black text-slate-700 uppercase">Detalles Operativos</h3>
                       </div>
                       {editingJob.id && (
                          <div className="flex gap-2">
                             <button 
                                onClick={() => setEditingJob({...editingJob, isFinished: !editingJob.isFinished, isCancelled: false})}
                                className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-colors border ${editingJob.isFinished ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-slate-400 border-slate-200'}`}
                             >
                                Finalizada
                             </button>
                             <button 
                                onClick={() => setEditingJob({...editingJob, isCancelled: !editingJob.isCancelled, isFinished: false})}
                                className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-colors border ${editingJob.isCancelled ? 'bg-red-100 text-red-700 border-red-200' : 'bg-white text-slate-400 border-slate-200'}`}
                             >
                                Anulada
                             </button>
                          </div>
                       )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div className="relative">
                          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                          <input 
                             placeholder="Referencia" 
                             className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none"
                             value={editingJob.ref || ''}
                             onChange={e => setEditingJob({...editingJob, ref: e.target.value})}
                          />
                       </div>
                       <div className="relative">
                          <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                          <input 
                             placeholder="Albarán" 
                             className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none"
                             value={editingJob.deliveryNote || ''}
                             onChange={e => setEditingJob({...editingJob, deliveryNote: e.target.value})}
                          />
                       </div>
                    </div>
                    
                    <div className="relative">
                       <Edit2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                       <input 
                          type="text"
                          placeholder="Nombre personalizado de la tarea (Opcional)" 
                          className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none"
                          value={editingJob.customName || ''}
                          onChange={e => setEditingJob({...editingJob, customName: e.target.value})}
                       />
                    </div>

                    <div className="relative">
                       <StickyNote className="absolute left-3 top-3 w-3 h-3 text-orange-400" />
                       <textarea
                          placeholder="Notas (comentarios visibles en la tarea)"
                          rows={3}
                          className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-orange-100 outline-none resize-none"
                          value={editingJob.notes || ''}
                          onChange={e => setEditingJob({...editingJob, notes: e.target.value})}
                       />
                    </div>
                 </div>

                 <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-2">
                    {editingJob.id ? (
                        <button 
                           onClick={() => setItemToDelete({ id: editingJob.id, type: 'job', name: 'esta tarea' })}
                           className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-red-500 hover:bg-red-50 transition-colors text-xs uppercase tracking-widest group"
                        >
                           <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" /> Eliminar
                        </button>
                    ) : <div></div>}
                    
                    <div className="flex gap-3">
                       <button onClick={() => setEditingJob(null)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 text-sm transition-colors">Cancelar</button>
                       <button onClick={() => saveJob(editingJob)} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2">
                          <Save className="w-4 h-4" /> Guardar Tarea
                       </button>
                    </div>
                 </div>

              </div>
           </div>
        </div>
      )}

      {editingDailyNote && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setEditingDailyNote(null)}>
          <div className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter">Gestionar Nota</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Nota diaria de operario</p>
              </div>
              <button onClick={() => setEditingDailyNote(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Operario</label>
                <div className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-slate-700">
                  {planning.workers.find(w => w.id === editingDailyNote.workerId)?.name || 'Operario no encontrado'}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Fecha</label>
                <div className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-slate-700">
                  {formatDateDMY(editingDailyNote.date)}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tipo de nota</label>
                <div className="relative">
                  <select 
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none appearance-none" 
                    value={editingDailyNote.type}
                    onChange={e => setEditingDailyNote({...editingDailyNote, type: e.target.value as NoteType})}
                  >
                    <option value="info">Información</option>
                    <option value="time">Horario</option>
                    <option value="medical">Médico</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDown className="w-4 h-4 text-slate-400" /></div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Texto de la nota</label>
                <textarea 
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24 text-sm" 
                  placeholder="Escribe aquí la nota..."
                  value={editingDailyNote.text}
                  onChange={e => setEditingDailyNote({...editingDailyNote, text: e.target.value})}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-100">
              <button 
                onClick={() => deleteDailyNote(editingDailyNote.id)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-red-500 hover:bg-red-50 transition-colors text-xs uppercase tracking-widest group"
              >
                <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" /> Eliminar Nota
              </button>
              
              <div className="flex gap-3">
                <button onClick={() => setEditingDailyNote(null)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 text-sm transition-colors">Cancelar</button>
                <button onClick={saveDailyNote} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2">
                  <Save className="w-4 h-4" /> Guardar Nota
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {editingWorker && (() => {
        console.log('🎨 Renderizando modal de edición para:', editingWorker);
        return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setEditingWorker(null)}>
          <div className="bg-white w-full max-w-4xl rounded-[32px] p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
            
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-900 italic uppercase tracking-tight">Editar Operario</h2>
              <button onClick={() => setEditingWorker(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            {/* Primera fila: Nombre - Apellidos - Apodo */}
            <div className="grid grid-cols-12 gap-4 mb-6">
              <div className="col-span-5 space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre</label>
                 <input 
                   className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" 
                   value={editingWorker.firstName || ''} 
                   onChange={e => {
                     const firstName = e.target.value;
                     const lastName = editingWorker.lastName || '';
                     setEditingWorker({
                       ...editingWorker, 
                       firstName,
                       lastName,
                       name: `${firstName} ${lastName}`.trim()
                     });
                   }} 
                   placeholder="Juan"
                 />
              </div>
              <div className="col-span-5 space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Apellidos</label>
                 <input 
                   className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" 
                   value={editingWorker.lastName || ''} 
                   onChange={e => {
                     const firstName = editingWorker.firstName || '';
                     const lastName = e.target.value;
                     setEditingWorker({
                       ...editingWorker, 
                       firstName,
                       lastName,
                       name: `${firstName} ${lastName}`.trim()
                     });
                   }} 
                   placeholder="García López"
                 />
              </div>
              <div className="col-span-2 space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Apodo</label>
                 <input className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" value={editingWorker.apodo || ''} onChange={e => setEditingWorker({...editingWorker, apodo: e.target.value || undefined})} placeholder="Apodo" />
              </div>
            </div>

            {/* Segunda fila: Código - DNI - Teléfono */}
            <div className="grid grid-cols-12 gap-4 mb-6">
              <div className="col-span-3 space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Código</label>
                 <input className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" value={editingWorker.code} onChange={e => setEditingWorker({...editingWorker, code: e.target.value})} />
              </div>
              <div className="col-span-4 space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">DNI / NIE</label>
                 <input className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" value={editingWorker.dni} onChange={e => setEditingWorker({...editingWorker, dni: e.target.value})} />
              </div>
              <div className="col-span-5 space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Teléfono</label>
                 <input className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" value={editingWorker.phone} onChange={e => setEditingWorker({...editingWorker, phone: e.target.value})} />
              </div>
            </div>

            {/* Tercera fila: Cargo/Puesto - Tipo Contrato - Estado Actual */}
            <div className="grid grid-cols-12 gap-4 mb-6">
              <div className="col-span-4 space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Cargo / Puesto</label>
                 <div className="relative">
                   <select className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none appearance-none" value={editingWorker.role} onChange={e => setEditingWorker({...editingWorker, role: e.target.value})}>
                     {WORKER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                   </select>
                   <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDown className="w-4 h-4 text-slate-400" /></div>
                 </div>
              </div>
              <div className="col-span-4 space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tipo Contrato</label>
                 <div className="relative">
                   <select className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none appearance-none" value={editingWorker.contractType} onChange={e => setEditingWorker({...editingWorker, contractType: e.target.value as ContractType})}>
                     {Object.values(ContractType).map(t => <option key={t} value={t}>{t}</option>)}
                   </select>
                   <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDown className="w-4 h-4 text-slate-400" /></div>
                 </div>
              </div>
              <div className="col-span-4 space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Estado Actual</label>
                 <div className="flex items-center gap-2 h-full">
                   <span className={`flex-1 px-3 py-3 rounded-xl text-xs font-black uppercase text-center ${
                     getCurrentWorkerStatus(editingWorker).status === WorkerStatus.DISPONIBLE ? 'bg-green-100 text-green-700' :
                     getCurrentWorkerStatus(editingWorker).status === WorkerStatus.VACACIONES ? 'bg-amber-100 text-amber-700' :
                     getCurrentWorkerStatus(editingWorker).status.includes('Baja') ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                   }`}>
                     {getCurrentWorkerStatus(editingWorker).status}
                   </span>
                 </div>
              </div>
            </div>

            {/* Cuarta fila: Salario Bruto - Salario Neto */}
            <div className="grid grid-cols-12 gap-4 mb-6">
              <div className="col-span-6 space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Salario Bruto (€)</label>
                 <input 
                   className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" 
                   value={editingWorker.salary || ''} 
                   onChange={e => setEditingWorker({...editingWorker, salary: e.target.value ? parseFloat(e.target.value) : undefined})} 
                   placeholder="1500"
                   type="number"
                 />
              </div>
              <div className="col-span-6 space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Salario Neto (€)</label>
                 <input 
                   className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" 
                   value={editingWorker.netSalary || ''} 
                   onChange={e => setEditingWorker({...editingWorker, netSalary: e.target.value ? parseFloat(e.target.value) : undefined})} 
                   placeholder="1200"
                   type="number"
                 />
              </div>
            </div>

            {/* Resto del contenido del modal */}

            <div className="flex gap-4 mb-8">
              <label className="flex items-center gap-3 bg-slate-50 px-4 py-3 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors flex-1">
                <input type="checkbox" className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300" checked={editingWorker.hasVehicle} onChange={e => setEditingWorker({...editingWorker, hasVehicle: e.target.checked})} />
                <span className="text-xs font-black text-slate-600 uppercase tracking-wide">Vehículo Propio</span>
              </label>
              <label className="flex items-center gap-3 bg-slate-50 px-4 py-3 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors flex-1">
                <input type="checkbox" className="w-5 h-5 rounded text-slate-600 focus:ring-slate-500 border-gray-300" checked={editingWorker.isArchived || false} onChange={e => setEditingWorker({...editingWorker, isArchived: e.target.checked})} />
                <span className="text-xs font-black text-slate-600 uppercase tracking-wide">Archivado</span>
              </label>
            </div>

            <div className="bg-blue-50/50 rounded-2xl p-6 mb-6 border border-blue-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <h3 className="font-black text-blue-900 uppercase tracking-widest text-xs">Formación y Cursos</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {planning.courses.map(course => (
                  <label key={course.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-blue-100 cursor-pointer hover:border-blue-300 transition-all">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                      checked={editingWorker.completedCourses?.includes(course.name)}
                      onChange={e => {
                        const current = editingWorker.completedCourses || [];
                        const updated = e.target.checked 
                          ? [...current, course.name]
                          : current.filter(c => c !== course.name);
                        setEditingWorker({...editingWorker, completedCourses: updated});
                      }}
                    />
                    <span className="text-[10px] font-bold text-slate-600 uppercase leading-tight">{course.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-amber-50/50 rounded-2xl p-6 mb-6 border border-amber-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                  <Fuel className="w-5 h-5" />
                </div>
                <h3 className="font-black text-amber-900 uppercase tracking-widest text-xs">Control Combustible</h3>
              </div>
              
              <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm mb-4">
                 <div className="grid grid-cols-3 gap-3 mb-3">
                    <input type="date" className="bg-slate-50 border-none rounded-lg px-3 py-2 text-xs font-bold text-slate-700" value={newFuelRecord.date} onChange={e => setNewFuelRecord({...newFuelRecord, date: e.target.value})} />
                    <input type="number" placeholder="Litros (Opcional)" className="bg-slate-50 border-none rounded-lg px-3 py-2 text-xs font-bold text-slate-700 placeholder:text-slate-400" value={newFuelRecord.liters} onChange={e => setNewFuelRecord({...newFuelRecord, liters: e.target.value})} />
                    <input type="number" placeholder="€ Coste" className="bg-slate-50 border-none rounded-lg px-3 py-2 text-xs font-bold text-slate-700 placeholder:text-slate-400" value={newFuelRecord.cost} onChange={e => setNewFuelRecord({...newFuelRecord, cost: e.target.value})} />
                 </div>
                 <button onClick={handleAddFuel} className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-black text-[10px] uppercase tracking-widest transition-colors shadow-lg shadow-amber-200">Registrar Repostaje</button>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                 {planning.fuelRecords.filter(r => r.workerId === editingWorker.id).length === 0 ? (
                   <p className="text-center text-[10px] text-amber-400 font-bold italic py-4">Sin registros</p>
                 ) : (
                   planning.fuelRecords
                     .filter(r => r.workerId === editingWorker.id)
                     .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                     .map(record => (
                     <div key={record.id} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-amber-50 text-xs">
                        <span className="font-bold text-slate-600">{formatDateDMY(record.date)}</span>
                        <div className="flex gap-4">
                           <span className="font-medium text-slate-500">{record.liters ? `${record.liters} L` : '-'}</span>
                           <span className="font-black text-amber-600">{record.cost} €</span>
                        </div>
                        <button onClick={() => handleDeleteFuel(record.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                     </div>
                   ))
                 )}
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-slate-400" />
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registros de Estados</label>
                </div>
                <button
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0];
                    const newRecord = {
                      status: WorkerStatus.VACACIONES,
                      startDate: today,
                      endDate: today
                    };
                    setEditingStatusRecord(newRecord);
                    setShowAddRecordForm(true);
                    
                    // Forzar una actualización del estado para asegurar que se guarde
                    setTimeout(() => {
                    }, 100);
                  }}
                  className="px-3 py-1 bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase hover:bg-blue-600 transition-colors"
                >
                  + Añadir Registro
                </button>
              </div>

              {showAddRecordForm && (
                <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</label>
                      <select
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={editingStatusRecord?.status || WorkerStatus.VACACIONES}
                        onChange={e => setEditingStatusRecord(prev => prev ? {...prev, status: e.target.value as WorkerStatus} : null)}
                      >
                        <option value={WorkerStatus.VACACIONES}>Vacaciones</option>
                        <option value={WorkerStatus.BAJA_MEDICA}>Baja Médica</option>
                        <option value={WorkerStatus.BAJA_PATERNIDAD}>Baja Paternidad</option>
                        <option value={WorkerStatus.PERMISO_RETRIBUIDO}>Permiso Retribuido</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha Inicio</label>
                      <input
                        type="date"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={editingStatusRecord?.startDate || ''}
                        onChange={e => setEditingStatusRecord(prev => prev ? {...prev, startDate: e.target.value} : null)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha Fin</label>
                      <div className="flex gap-2">
                        <input
                          type="date"
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                          value={editingStatusRecord?.endDate === 'IND.' ? '' : (editingStatusRecord?.endDate || '')}
                          onChange={e => setEditingStatusRecord(prev => prev ? {...prev, endDate: e.target.value} : null)}
                          placeholder="Seleccionar fecha"
                          disabled={editingStatusRecord?.endDate === 'IND.'}
                        />
                        <button
                          type="button"
                          onClick={() => setEditingStatusRecord(prev => prev ? {...prev, endDate: prev?.endDate === 'IND.' ? '' : 'IND.'} : null)}
                          className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase transition-colors ${
                            editingStatusRecord?.endDate === 'IND.' 
                              ? 'bg-red-600 text-white' 
                              : 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600'
                          }`}
                        >
                          IND.
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddStatusRecord}
                      className="px-3 py-1 bg-green-500 text-white rounded-lg text-[10px] font-black uppercase hover:bg-green-600 transition-colors"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => {
                        setShowAddRecordForm(false);
                        setEditingStatusRecord(null);
                      }}
                      className="px-3 py-1 bg-slate-300 text-slate-700 rounded-lg text-[10px] font-black uppercase hover:bg-slate-400 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-2 font-black text-slate-400 uppercase tracking-wider text-[10px]">Estado</th>
                      <th className="text-left py-2 px-2 font-black text-slate-400 uppercase tracking-wider text-[10px]">Fecha Inicio</th>
                      <th className="text-left py-2 px-2 font-black text-slate-400 uppercase tracking-wider text-[10px]">Fecha Fin</th>
                      <th className="text-left py-2 px-2 font-black text-slate-400 uppercase tracking-wider text-[10px]">Total Días</th>
                      <th className="text-center py-2 px-2 font-black text-slate-400 uppercase tracking-wider text-[10px]">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!editingWorker.statusRecords || editingWorker.statusRecords.length === 0) ? (
                      <tr>
                        <td colSpan={5} className="text-center py-4 text-slate-400 font-black text-[10px]">
                          Sin registros
                        </td>
                      </tr>
                    ) : (
                      editingWorker.statusRecords.map(record => (
                        <tr key={record.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2 px-2">
                            <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${
                              record.status === WorkerStatus.VACACIONES ? 'bg-amber-100 text-amber-700' :
                              record.status.includes('Baja') ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {record.status}
                            </span>
                          </td>
                          <td className="py-2 px-2 font-medium text-slate-600">{formatDateDMY(record.startDate)}</td>
                          <td className="py-2 px-2 font-medium text-slate-600">{formatDateDMY(record.endDate)}</td>
                          <td className="py-2 px-2 font-black text-slate-700">{record.totalDays} días</td>
                          <td className="py-2 px-2 text-center">
                            <div className="flex gap-1 justify-center">
                              <button
                                onClick={() => handleEditStatusRecord(record.id)}
                                className="p-1 hover:bg-blue-50 text-blue-400 hover:text-blue-600 rounded transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteStatusRecord(record.id)}
                                className="p-1 hover:bg-red-50 text-red-400 hover:text-red-600 rounded transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mb-8">
               <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notas y Observaciones</label>
               </div>
               <textarea 
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-medium text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24" 
                  placeholder="Añadir notas sobre el operario..."
                  value={editingWorker.notes || ''}
                  onChange={e => setEditingWorker({...editingWorker, notes: e.target.value})}
               />
            </div>

            <div className="mb-8">
               <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                     <StickyNote className="w-4 h-4 text-slate-400" />
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notas de Tareas Diarias</label>
                  </div>
                  <div className="flex gap-2">
                     <button
                        onClick={() => setWorkerNoteFilters(prev => ({...prev, info: !prev.info}))}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                           workerNoteFilters.info 
                             ? 'bg-blue-500 text-white' 
                             : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                     >
                        Información
                     </button>
                     <button
                        onClick={() => setWorkerNoteFilters(prev => ({...prev, time: !prev.time}))}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                           workerNoteFilters.time 
                             ? 'bg-green-500 text-white' 
                             : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                     >
                        Horario
                     </button>
                     <button
                        onClick={() => setWorkerNoteFilters(prev => ({...prev, medical: !prev.medical}))}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                           workerNoteFilters.medical 
                             ? 'bg-red-500 text-white' 
                             : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                     >
                        Médico
                     </button>
                  </div>
               </div>
               
               <div className="bg-slate-50 rounded-xl p-4 max-h-60 overflow-y-auto custom-scrollbar">
                  {planning.dailyNotes?.filter(note => 
                     note.workerId === editingWorker.id && 
                     workerNoteFilters[note.type]
                  ).length === 0 ? (
                     <p className="text-center text-[10px] text-slate-400 font-bold py-4">
                        No hay notas para los filtros seleccionados
                     </p>
                  ) : (
                     <div className="space-y-2">
                        {planning.dailyNotes
                           .filter(note => 
                              note.workerId === editingWorker.id && 
                              workerNoteFilters[note.type]
                           )
                           .sort((a, b) => b.date.localeCompare(a.date))
                           .map(note => (
                              <div key={note.id} className="bg-white p-3 rounded-lg border border-slate-200">
                                 <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                       <span className="text-[9px] font-bold text-slate-500">
                                          {formatDateDMY(note.date)}
                                       </span>
                                       <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                          note.type === 'info' 
                                             ? 'bg-blue-100 text-blue-600'
                                             : note.type === 'time'
                                             ? 'bg-green-100 text-green-600'
                                             : 'bg-red-100 text-red-600'
                                       }`}>
                                          {note.type === 'info' ? 'Información' : 
                                           note.type === 'time' ? 'Horario' : 'Médico'}
                                       </span>
                                    </div>
                                 </div>
                                 <p className="text-[10px] text-slate-700 font-medium leading-relaxed">
                                    {note.text}
                                 </p>
                              </div>
                           ))}
                     </div>
                  )}
               </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-slate-100">
               <button 
                  onClick={() => setItemToDelete({ id: editingWorker.id, type: 'worker', name: editingWorker.name })} 
                  className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors"
               >
                  <Trash2 className="w-5 h-5" />
               </button>
               <div className="flex gap-3">
                  <button onClick={() => setEditingWorker(null)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors text-sm">Cancelar</button>
                  <button onClick={() => saveWorker(editingWorker)} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">Guardar</button>
               </div>
            </div>

          </div>
        </div>
        );
      })()}

      {editingClient && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setEditingClient(null)}>
           <div className="bg-white w-full max-w-4xl rounded-[40px] p-10 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-6">
                 <div>
                    <h2 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter">Ficha Cliente</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Gestión comercial y operativa</p>
                 </div>
                 <button onClick={() => setEditingClient(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre Fiscal / Comercial</label>
                    <input className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-black text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-lg" placeholder="Nombre Empresa" value={editingClient.name} onChange={e => setEditingClient({...editingClient, name: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">CIF</label>
                        <input className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="B-12345678" value={editingClient.cif} onChange={e => setEditingClient({...editingClient, cif: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Acrónimo/Logo</label>
                        <input className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="ABC" maxLength={3} value={editingClient.logo} onChange={e => setEditingClient({...editingClient, logo: e.target.value.toUpperCase()})} />
                    </div>
                 </div>
              </div>

              <div className="bg-slate-50 rounded-[24px] p-6 mb-8 border border-slate-100">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 shadow-sm"><Phone className="w-4 h-4" /></div>
                    <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">Datos de Contacto</h3>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input className="bg-white border-none rounded-xl px-4 py-3 font-bold text-slate-600 text-xs focus:ring-2 focus:ring-blue-200 outline-none" placeholder="Persona de Contacto" value={editingClient.contactPerson} onChange={e => setEditingClient({...editingClient, contactPerson: e.target.value})} />
                    <input className="bg-white border-none rounded-xl px-4 py-3 font-bold text-slate-600 text-xs focus:ring-2 focus:ring-blue-200 outline-none" placeholder="Teléfono" value={editingClient.phone} onChange={e => setEditingClient({...editingClient, phone: e.target.value})} />
                    <input className="bg-white border-none rounded-xl px-4 py-3 font-bold text-slate-600 text-xs focus:ring-2 focus:ring-blue-200 outline-none" placeholder="Email" value={editingClient.email} onChange={e => setEditingClient({...editingClient, email: e.target.value})} />
                    <input className="bg-white border-none rounded-xl px-4 py-3 font-bold text-slate-600 text-xs focus:ring-2 focus:ring-blue-200 outline-none" placeholder="Dirección Principal" value={editingClient.location} onChange={e => setEditingClient({...editingClient, location: e.target.value})} />
                 </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-blue-500" />
                            <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">Sedes / Centros</h3>
                        </div>
                        <button 
                            onClick={() => setEditingClient({
                                ...editingClient, 
                                centers: [...editingClient.centers, { id: `ct-${Date.now()}`, name: '', address: '', publicTransport: true }]
                            })}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-colors"
                        >
                            + Añadir Sede
                        </button>
                    </div>
                    <div className="space-y-3">
                        {editingClient.centers.map((center, idx) => (
                            <div key={center.id} className="bg-white border border-slate-200 p-4 rounded-xl relative group hover:border-blue-300 transition-colors">
                                <button 
                                    onClick={() => setEditingClient({
                                        ...editingClient,
                                        centers: editingClient.centers.filter((_, i) => i !== idx)
                                    })}
                                    className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                                <div className="space-y-2">
                                    <input 
                                        className="w-full font-black text-sm text-slate-800 placeholder:text-slate-300 border-none p-0 focus:ring-0" 
                                        placeholder="Nombre Sede (ej: MAD4)" 
                                        value={center.name} 
                                        onChange={e => {
                                            const newCenters = [...editingClient.centers];
                                            newCenters[idx].name = e.target.value;
                                            setEditingClient({...editingClient, centers: newCenters});
                                        }} 
                                    />
                                    <input 
                                        className="w-full font-medium text-xs text-slate-500 placeholder:text-slate-300 border-none p-0 focus:ring-0" 
                                        placeholder="Dirección completa" 
                                        value={center.address} 
                                        onChange={e => {
                                            const newCenters = [...editingClient.centers];
                                            newCenters[idx].address = e.target.value;
                                            setEditingClient({...editingClient, centers: newCenters});
                                        }} 
                                    />
                                </div>
                            </div>
                        ))}
                        {editingClient.centers.length === 0 && <p className="text-center text-[10px] text-slate-400 italic py-4">Sin sedes registradas</p>}
                    </div>
                 </div>

                 <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                        <GraduationCap className="w-4 h-4 text-purple-500" />
                        <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">Formación Requerida</h3>
                    </div>
                    <div className="bg-purple-50/50 rounded-2xl p-4 border border-purple-100 grid grid-cols-1 gap-2">
                        {planning.courses.map(course => (
                            <label key={course.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg transition-colors cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300"
                                    checked={editingClient.requiredCourses.includes(course.name)}
                                    onChange={e => {
                                        const current = editingClient.requiredCourses || [];
                                        const updated = e.target.checked ? [...current, course.name] : current.filter(c => c !== course.name);
                                        setEditingClient({...editingClient, requiredCourses: updated});
                                    }}
                                />
                                <span className="text-[10px] font-bold text-slate-600 uppercase">{course.name}</span>
                            </label>
                        ))}
                    </div>
                 </div>
              </div>

              <div className="flex items-center justify-between pt-8 mt-8 border-t border-slate-100">
                 <button onClick={() => { setItemToDelete({ id: editingClient.id, type: 'client', name: editingClient.name }); }} className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-red-500 hover:bg-red-50 transition-colors text-xs uppercase tracking-widest">
                    <Trash2 className="w-4 h-4" /> Eliminar Cliente
                 </button>
                 <div className="flex gap-3">
                    <button onClick={() => setEditingClient(null)} className="px-8 py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-colors text-xs uppercase tracking-widest">Cancelar</button>
                    <button onClick={() => saveClient(editingClient)} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">Guardar Cambios</button>
                 </div>
              </div>

           </div>
        </div>
      )}

      {/* MODAL DUPLICAR TAREA */}
      {duplicatingJob && (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4" onClick={() => { setDuplicatingJob(null); setKeepDeliveryNoteOnDuplicate(false); }}>
           <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                 <div>
                    <h3 className="text-xl font-black text-slate-900 italic uppercase">Duplicar Tarea</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{duplicatingJob.customName || duplicatingJob.type}</p>
                 </div>
                 <button onClick={() => { setDuplicatingJob(null); setKeepDeliveryNoteOnDuplicate(false); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              
              <div className="space-y-4 mb-8">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Fecha Destino</label>
                    <input 
                       type="date" 
                       className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                       value={duplicationDate}
                       onChange={e => setDuplicationDate(e.target.value)}
                    />
                 </div>
                 
                 <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group">
                       <input 
                          type="checkbox" 
                          checked={keepWorkersOnDuplicate}
                          onChange={e => setKeepWorkersOnDuplicate(e.target.checked)}
                       />
                       <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-700 uppercase group-hover:text-blue-700 transition-colors">Mantener Operarios</span>
                          <span className="text-[9px] font-bold text-slate-400">Copiar la asignación actual</span>
                       </div>
                    </label>
                    
                    <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group">
                       <input 
                          type="checkbox" 
                          checked={keepDeliveryNoteOnDuplicate}
                          onChange={e => setKeepDeliveryNoteOnDuplicate(e.target.checked)}
                       />
                       <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-700 uppercase group-hover:text-blue-700 transition-colors">Mantener Albarán</span>
                          <span className="text-[9px] font-bold text-slate-400">Copiar número de albarán</span>
                       </div>
                    </label>
                 </div>

              </div>

              <div className="flex gap-3">
                 <button onClick={() => { setDuplicatingJob(null); setKeepDeliveryNoteOnDuplicate(false); }} className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors text-xs uppercase tracking-widest">Cancelar</button>
                 <button onClick={handleDuplicateJob} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 transform active:scale-95">
                    <Copy className="w-4 h-4" /> Duplicar
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL CÁLCULO DÍAS TRABAJADOS */}
      {workerDaysModal && (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setWorkerDaysModal(null)}>
           <div className="bg-white w-full max-w-4xl rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                 <div>
                    <h3 className="text-xl font-black text-slate-900 italic uppercase">Días Trabajados</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{workerDaysModal.worker.name} - {workerDaysModal.worker.code}</p>
                 </div>
                 <button onClick={() => setWorkerDaysModal(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              
              <div className="space-y-6 mb-8">
                 <div className="flex items-center gap-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Mes</label>
                    <input 
                       type="month" 
                       className="bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                       value={workerDaysModal.month}
                       onChange={e => setWorkerDaysModal({...workerDaysModal, month: e.target.value})}
                    />
                    <button 
                       onClick={() => {
                         const result = calculateWorkerDays(workerDaysModal.worker.id, workerDaysModal.month);
                         setWorkerDaysModal({...workerDaysModal, calculationResult: result});
                       }}
                       className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
                    >
                       Calcular
                    </button>
                 </div>
                 
                 {workerDaysModal.calculationResult && (
                    <div className="space-y-4">
                       <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl">
                          <div className="text-center">
                             <div className="text-2xl font-black text-green-600">{workerDaysModal.calculationResult.workedCount}</div>
                             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Días Trabajados</div>
                          </div>
                          <div className="text-center">
                             <div className="text-2xl font-black text-orange-500">{workerDaysModal.calculationResult.weekendCount}</div>
                             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fines de Semana</div>
                          </div>
                          <div className="text-center flex items-center justify-between gap-2">
                             <div>
                                <div className="text-2xl font-black text-blue-600">{workerDaysModal.calculationResult.totalCount}</div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</div>
                             </div>
                             <button 
                                onClick={exportFDDaysToExcel}
                                className="p-2 hover:bg-green-50 text-green-600 hover:text-green-700 rounded-lg transition-colors"
                                title="Exportar a Excel"
                             >
                                <FileSpreadsheet className="w-5 h-5" />
                             </button>
                          </div>
                          <div className="text-center">
                             <div className="text-2xl font-black text-purple-600">{workerDaysModal.calculationResult.nominasCount}</div>
                             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NÓMINAS</div>
                          </div>
                       </div>
                       
                       <div className="grid grid-cols-7 gap-1 p-4 bg-white border border-slate-200 rounded-xl">
                          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                             <div key={day} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest py-2">
                                {day}
                             </div>
                          ))}
                          {workerDaysModal.calculationResult.calendarDays.map((dayInfo, index) => (
                             <div 
                                key={index}
                                className={`
                                   flex items-center justify-center text-xs font-black rounded-lg transition-colors h-8
                                   ${!dayInfo ? '' : 
                                     dayInfo.isWorked ? 'bg-green-100 text-green-700' : 
                                     dayInfo.isWeekend ? 'bg-orange-100 text-orange-700' : 
                                     dayInfo.isWeekendDay ? 'bg-slate-100 text-slate-400' : 'text-slate-600'}
                                `}
                             >
                                {dayInfo ? dayInfo.day : ''}
                             </div>
                          ))}
                       </div>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* MODAL NOTIFICACIONES WHATSAPP (DISEÑO CENTRAL DE AVISOS) */}
      {showNotificationsModal && (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4" onClick={() => {
          setShowNotificationsModal(false);
          setWhatsappWorkerSearch(''); // Limpiar búsqueda al cerrar
        }}>
           <div className="bg-slate-50 w-full max-w-6xl h-[85vh] rounded-[32px] shadow-2xl animate-in zoom-in-95 flex overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
              
              {/* SIDEBAR LISTA (IZQUIERDA) */}
              <div className="w-1/3 bg-white border-r border-slate-200 flex flex-col">
                 <div className="p-6 border-b border-slate-100 bg-white z-10">
                    <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tight">Central Avisos</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                       {new Date(planning.currentDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <div className="flex items-center gap-2 mt-4">
                       <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase border border-amber-100">
                          {planning.jobs.filter(j => j.date === planning.currentDate && !j.isCancelled).flatMap(j => j.assignedWorkerIds).filter((id, i, arr) => arr.indexOf(id) === i && !(planning.notifications[planning.currentDate] || []).includes(id)).length} Pendientes
                       </span>
                    </div>
                 </div>
                 
                 {/* CAMPO DE BÚSQUEDA */}
                 <div className="p-4 bg-white border-b border-slate-200">
                    <div className="relative">
                       <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                       <input
                          type="text"
                          placeholder="Buscar operario por nombre, código o DNI..."
                          value={whatsappWorkerSearch}
                          onChange={(e) => setWhatsappWorkerSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                       />
                    </div>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2 bg-slate-50/50">
                    {planning.jobs
                       .filter(j => j.date === planning.currentDate && !j.isCancelled)
                       .flatMap(j => j.assignedWorkerIds)
                       .filter((id, index, self) => self.indexOf(id) === index)
                       .map(workerId => {
                          const worker = planning.workers.find(w => w.id === workerId);
                          if (!worker) return null;
                          
                          // Aplicar filtro de búsqueda
                          const searchLower = whatsappWorkerSearch.toLowerCase();
                          const matchesSearch = !whatsappWorkerSearch || 
                            worker.name.toLowerCase().includes(searchLower) ||
                            worker.code?.toLowerCase().includes(searchLower) ||
                            worker.dni?.toLowerCase().includes(searchLower) ||
                            worker.apodo?.toLowerCase().includes(searchLower);
                          
                          if (!matchesSearch) return null;
                          
                          const isNotified = (planning.notifications[planning.currentDate] || []).includes(workerId);
                          const isSelected = selectedNotificationWorkerId === workerId;

                          return (
                             <div 
                                key={workerId} 
                                onClick={() => setSelectedNotificationWorkerId(workerId)}
                                className={`p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-md ${
                                   isSelected 
                                      ? 'bg-white border-blue-500 ring-2 ring-blue-100 shadow-lg relative z-10' 
                                      : 'bg-white border-slate-200 hover:border-blue-300 text-slate-500'
                                }`}
                             >
                                <div className="flex justify-between items-start mb-2">
                                   <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                      {worker.code}
                                   </div>
                                   {isNotified ? (
                                      <span className="text-[9px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded uppercase">Enviado</span>
                                   ) : (
                                      <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase">Pendiente</span>
                                   )}
                                </div>
                                <h4 className={`font-black text-sm uppercase ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>{worker.name}</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{worker.role}</p>
                             </div>
                          );
                       })}
                    {planning.jobs.filter(j => j.date === planning.currentDate && !j.isCancelled).length === 0 && (
                       <div className="p-8 text-center text-slate-400">
                          <p className="text-xs font-bold uppercase">No hay operarios hoy</p>
                       </div>
                    )}
                 </div>
              </div>

              {/* AREA PREVISUALIZACIÓN (DERECHA) */}
              <div className="flex-1 flex flex-col bg-slate-50 relative">
                 <div className="absolute top-4 right-4 z-20">
                    <button onClick={() => setShowNotificationsModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X className="w-6 h-6" /></button>
                 </div>

                 {selectedNotificationWorkerId ? (
                    (() => {
                       const worker = planning.workers.find(w => w.id === selectedNotificationWorkerId);
                       const workerJobs = planning.jobs.filter(j => j.date === planning.currentDate && !j.isCancelled && j.assignedWorkerIds.includes(selectedNotificationWorkerId));
                       const isNotified = (planning.notifications[planning.currentDate] || []).includes(selectedNotificationWorkerId);
                       
                       // CALCULAR FECHA
                       const dateObj = new Date(planning.currentDate);
                       const dateStr = dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
                       
                       const message = `Hola ${worker?.name.split(' ')[0]},\n\nServicio para: ${dateStr}\n\n${(() => {
                          // Obtener solo la primera tarea del operario ordenada por hora
                          const firstJob = workerJobs
                            .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
                          
                          if (!firstJob) return '';
                          
                          const client = planning.clients.find(c => c.id === firstJob.clientId);
                          const center = client?.centers.find(ct => ct.id === firstJob.centerId);
                          const address = center?.address || client?.location || '';
                          const mapUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : '';
                          
                          // Determinar la hora correcta del operario
                          let workerStartTime = firstJob.startTime;
                          
                          // Si el operario está en grupos de refuerzo, buscar su hora real
                          if (firstJob.reinforcementGroups && firstJob.reinforcementGroups.length > 0) {
                            for (const group of firstJob.reinforcementGroups) {
                              if (group.workerIds.includes(selectedNotificationWorkerId)) {
                                workerStartTime = group.startTime;
                                break;
                              }
                            }
                          }
                          
                          return `   • *Cliente:* ${client?.name}\n   • *Centro:* ${center?.name || 'Sede Principal'}\n   • *Dirección:* ${address}\n   • *Ver en Mapa:* ${mapUrl}\n\n   • *Hora Inicio:* ${workerStartTime}\n   • *Tarea:* ${firstJob.customName || firstJob.type}\n\n*📱 Recordaros que tenéis la obligatoriedad de fichar diariamente la jornada laboral*`;
                        })()}\n\nPor favor, confirma recepción del mensaje`;

                       const encodedMessage = encodeURIComponent(message);
                       const whatsappUrl = `https://api.whatsapp.com/send/?phone=34${worker?.phone.replace(/\s+/g, '').replace(/^34/, '')}&text=${encodedMessage}&type=phone_number&app_absent=0`;

                       return (
                          <div className="flex-1 flex flex-col h-full">
                             <div className="flex-1 p-8 overflow-y-auto custom-scrollbar flex items-center justify-center bg-slate-100">
                                <div className="bg-white rounded-tr-3xl rounded-bl-3xl rounded-br-3xl p-6 shadow-sm max-w-sm w-full relative border border-slate-200">
                                   <div className="absolute -left-2 top-0 w-0 h-0 border-t-[10px] border-t-white border-l-[10px] border-l-transparent" />
                                   <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 font-medium">{message}</p>
                                   <div className="mt-2 flex justify-end">
                                      <span className="text-[9px] text-slate-400 font-bold">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                   </div>
                                </div>
                             </div>
                             <div className="p-6 bg-white border-t border-slate-200 shrink-0 flex items-center gap-4">
                                <a 
                                   href={whatsappUrl} 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   onClick={() => toggleNotificationStatus(selectedNotificationWorkerId, planning.currentDate, true)}
                                   className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-green-100 transition-all hover:-translate-y-0.5"
                                >
                                   <Send className="w-4 h-4" /> Enviar WhatsApp
                                </a>
                                {isNotified ? (
                                   <button 
                                      onClick={() => toggleNotificationStatus(selectedNotificationWorkerId, planning.currentDate, false)}
                                      className="px-6 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors"
                                   >
                                      Marcar Pendiente
                                   </button>
                                ) : (
                                   <button 
                                      onClick={() => toggleNotificationStatus(selectedNotificationWorkerId, planning.currentDate, true)}
                                      className="px-6 py-4 bg-blue-50 text-blue-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-100 transition-colors"
                                   >
                                      Marcar Enviado
                                   </button>
                                )}
                             </div>
                          </div>
                       );
                    })()
                 ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-8">
                       <MessageCircle className="w-16 h-16 mb-4 opacity-50" />
                       <p className="font-black uppercase tracking-widest text-sm">Selecciona un operario</p>
                       <p className="text-xs font-bold mt-2 text-slate-400">Visualiza y envía los avisos por WhatsApp</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

    {/* CALENDARIO SELECTOR */}
    {showCalendarSelector && (
      <SimpleCalendarSelector
        currentDate={planning.currentDate}
        customHolidays={planning.customHolidays}
        onSelect={handleDateChange}
        onClose={() => setShowCalendarSelector(false)}
        jobs={planning.jobs}
      />
    )}

    {/* MODAL LISTADO DE OPERARIOS */}
    {workerListModal && (
      <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setWorkerListModal(null)}>
        <div className="bg-white w-full max-w-2xl rounded-[40px] p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
          
          <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter">Listado de Operarios</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                {(() => {
                  const client = planning.clients.find(c => c.id === workerListModal.clientId);
                  const center = client?.centers.find(ct => ct.id === workerListModal.centerId);
                  return `${client?.name || 'Cliente'} - ${center?.name || 'Sede'} - ${formatDateDMY(workerListModal.date)}`;
                })()}
              </p>
            </div>
            <button onClick={() => setWorkerListModal(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Listado de operarios */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Operarios Asignados</h3>
                <button
                  onClick={() => copyWorkerListToClipboard(workerListModal.clientId, workerListModal.centerId, workerListModal.date)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Copiar Listado
                </button>
              </div>
              
              <div className="space-y-2">
                {(() => {
                  // Obtener todas las tareas del cliente en esa fecha y sede
                  const relevantJobs = planning.jobs.filter(job => 
                    job.clientId === workerListModal.clientId && 
                    job.centerId === workerListModal.centerId && 
                    job.date === workerListModal.date && 
                    !job.isCancelled
                  );

                  // Recolectar todos los operarios únicos
                  const allWorkerIds = new Set<string>();
                  relevantJobs.forEach(job => {
                    job.assignedWorkerIds.forEach(workerId => {
                      allWorkerIds.add(workerId);
                    });
                  });

                  // Obtener información completa de los operarios
                  const workers = Array.from(allWorkerIds)
                    .map(workerId => planning.workers.find(w => w.id === workerId))
                    .filter(worker => worker !== undefined && !worker.archived) // Excluir operarios archivados
                    .sort((a, b) => {
                      const numA = parseInt(a.code.replace(/\D/g, ''), 10);
                      const numB = parseInt(b.code.replace(/\D/g, ''), 10);
                      return numA - numB;
                    });

                  if (workers.length === 0) {
                    return (
                      <div className="text-center py-8 text-slate-400">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm font-black uppercase tracking-wider">No hay operarios asignados</p>
                      </div>
                    );
                  }

                  return workers.map((worker, index) => (
                    <div key={worker.id} className="bg-white rounded-xl p-4 border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-black text-slate-900">{worker.name}</p>
                            <p className="text-xs text-slate-500">DNI: {worker.dni}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-slate-600">{worker.role}</p>
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* MODAL EDICIÓN TAREA ESTÁNDAR */}
    {editingStandardTask && (
      <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setEditingStandardTask(null)}>
        <div className="bg-white w-full max-w-lg rounded-[24px] p-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
          
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-3">
            <h2 className="text-lg font-black text-slate-900 italic uppercase tracking-tighter">
              {editingStandardTask.id.startsWith('st-') ? 'Nueva Tarea' : 'Editar Tarea'}
            </h2>
            <div className="flex items-center gap-2">
              {!editingStandardTask.id.startsWith('st-') && (
                <button
                  onClick={() => deleteStandardTask(editingStandardTask.id)}
                  className="p-1.5 hover:bg-red-50 rounded-full transition-colors text-red-500"
                  title="Eliminar tarea"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => setEditingStandardTask(null)} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Nombre */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Nombre</label>
              <input
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-50"
                value={editingStandardTask.name}
                onChange={e => setEditingStandardTask({...editingStandardTask, name: e.target.value})}
                placeholder="Nombre de la tarea"
              />
            </div>

            {/* Tipo de Servicio y Nº Operarios en una fila */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Tipo</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-50"
                  value={editingStandardTask.type}
                  onChange={e => setEditingStandardTask({...editingStandardTask, type: e.target.value as JobType})}
                >
                  <option value="">Seleccionar</option>
                  <option value={JobType.CARGA}>Carga</option>
                  <option value={JobType.DESCARGA}>Descarga</option>
                  <option value={JobType.PICKING}>Picking</option>
                  <option value={JobType.MANIPULACION}>Manipulación</option>
                  <option value={JobType.OPERATIVA_EXTERNA}>Operativa Ext.</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Operarios</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-50"
                  value={editingStandardTask.defaultWorkers}
                  onChange={e => setEditingStandardTask({...editingStandardTask, defaultWorkers: parseInt(e.target.value) || 1})}
                />
              </div>
            </div>

            {/* Notas - más compacto */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Notas (máx. 8 palabras)</label>
              <textarea
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-50 resize-none"
                rows={2}
                maxLength={80}
                value={editingStandardTask.notes}
                onChange={e => {
                  const words = e.target.value.trim().split(/\s+/);
                  if (words.length <= 8) {
                    setEditingStandardTask({...editingStandardTask, notes: e.target.value});
                  }
                }}
                placeholder="Notas breves sobre la tarea..."
              />
              <p className="text-[10px] text-slate-400">
                {editingStandardTask.notes.trim().split(/\s+/).filter(w => w).length}/8 palabras
              </p>
            </div>

            {/* Asignación a Clientes - más compacto */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Asignar a Clientes</label>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 max-h-32 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-2">
                  {planning.clients.sort((a, b) => a.name.localeCompare(b.name)).map(client => (
                    <label key={client.id} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1.5 rounded transition-colors">
                      <input
                        type="checkbox"
                        className="w-3 h-3 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        checked={editingStandardTask.assignedClientIds.includes(client.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setEditingStandardTask({
                              ...editingStandardTask,
                              assignedClientIds: [...editingStandardTask.assignedClientIds, client.id]
                            });
                          } else {
                            setEditingStandardTask({
                              ...editingStandardTask,
                              assignedClientIds: editingStandardTask.assignedClientIds.filter(id => id !== client.id)
                            });
                          }
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-xs text-slate-900 truncate">{client.name}</p>
                        <p className="text-[9px] text-slate-500 truncate">{client.location}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <p className="text-[9px] text-slate-400">
                Clientes asignados a esta tarea estándar
              </p>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={() => setEditingStandardTask(null)}
              className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg font-black text-[10px] uppercase tracking-wider hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => saveStandardTask(editingStandardTask)}
              disabled={!editingStandardTask.name || !editingStandardTask.type}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-black text-[10px] uppercase tracking-wider hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingStandardTask.id.startsWith('st-') ? 'Crear' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* MODAL DE EDICIÓN DE CURSOS */}
    {editingCourse && (
      <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-2xl rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-slate-900 italic uppercase">Editar Curso</h2>
            <button
              onClick={() => setEditingCourse(null)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Información básica */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Nombre del Curso</label>
                <input
                  type="text"
                  className="w-full mt-2 p-3 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                  value={editingCourse.name}
                  onChange={(e) => setEditingCourse({...editingCourse, name: e.target.value})}
                  placeholder="Nombre del curso"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Descripción</label>
                <textarea
                  className="w-full mt-2 p-3 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
                  rows={3}
                  value={editingCourse.description || ''}
                  onChange={(e) => setEditingCourse({...editingCourse, description: e.target.value})}
                  placeholder="Descripción del curso (opcional)"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Validez (meses)</label>
                <input
                  type="number"
                  className="w-full mt-2 p-3 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                  value={editingCourse.validityMonths || 12}
                  onChange={(e) => setEditingCourse({...editingCourse, validityMonths: parseInt(e.target.value) || 12})}
                  min="1"
                  max="120"
                />
                <p className="text-xs text-slate-500 mt-1">Tiempo en meses que el curso mantiene su validez</p>
              </div>
            </div>

            {/* Asignación de operarios */}
            <div className="space-y-4">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Operarios Asignados</label>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 max-h-60 overflow-y-auto">
                <div className="space-y-2">
                  {planning.workers
                    .filter(w => !w.isArchived)
                    .map(worker => {
                      const isAssigned = editingCourse.assignedWorkerIds.includes(worker.id);
                      return (
                        <label key={worker.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 cursor-pointer hover:bg-blue-50 transition-colors">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                            checked={isAssigned}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditingCourse({
                                  ...editingCourse,
                                  assignedWorkerIds: [...editingCourse.assignedWorkerIds, worker.id]
                                });
                              } else {
                                setEditingCourse({
                                  ...editingCourse,
                                  assignedWorkerIds: editingCourse.assignedWorkerIds.filter(id => id !== worker.id)
                                });
                              }
                            }}
                          />
                          <div className="flex-1">
                            <p className="font-bold text-sm text-slate-900">{worker.name}</p>
                            <p className="text-xs text-slate-500">{worker.code} • {worker.contract}</p>
                          </div>
                          {isAssigned && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg">
                              Asignado
                            </span>
                          )}
                        </label>
                      );
                    })}
                </div>
              </div>
              <p className="text-xs text-slate-500">
                {editingCourse.assignedWorkerIds.length} operarios seleccionados
              </p>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 mt-8 pt-6 border-t border-slate-100">
            <button
              onClick={() => setEditingCourse(null)}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => saveCourse(editingCourse)}
              disabled={!editingCourse.name.trim()}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Guardar Curso
            </button>
          </div>
        </div>
      </div>
    )}

    {/* 🏥 MODAL DE EDICIÓN DE REGISTROS MÉDICOS */}
    {planning.editingMedicalCourse && (
      <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-2xl rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900 italic uppercase mb-2">
                {planning.medicalCourses.some(c => c.id === planning.editingMedicalCourse.id) ? 'Editar Registro Médico' : 'Nuevo Registro Médico'}
              </h2>
              <p className="text-sm text-slate-600">
                {planning.editingMedicalCourse.type === 'recognition' ? '🏥 Reconocimiento Médico' : '📚 Curso Médico'}
              </p>
            </div>
            <button 
              onClick={() => setPlanning(prev => ({ ...prev, editingMedicalCourse: null }))}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Información básica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Tipo</label>
                <select
                  value={planning.editingMedicalCourse.type}
                  onChange={(e) => setPlanning(prev => ({ 
                    ...prev, 
                    editingMedicalCourse: prev.editingMedicalCourse ? { ...prev.editingMedicalCourse, type: e.target.value as 'recognition' | 'course' } : null 
                  }))}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="recognition">🏥 Reconocimiento Médico</option>
                  <option value="course">📚 Curso Formación Laboral</option>
                </select>
              </div>
              {planning.editingMedicalCourse.type === 'course' && (
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Nombre del Curso</label>
                  <div className="flex gap-2 flex-wrap">
                    <select
                      value={planning.editingMedicalCourse.name || ''}
                      onChange={(e) => setPlanning(prev => ({ 
                        ...prev, 
                        editingMedicalCourse: prev.editingMedicalCourse ? { ...prev.editingMedicalCourse, name: e.target.value } : null 
                      }))}
                      className="flex-1 min-w-0 p-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="">Seleccionar curso...</option>
                      {availableCourses.map(course => (
                        <option key={course} value={course}>{course}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setShowAddMedicalCourse(true)}
                      className="px-3 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex-shrink-0"
                      title="Añadir nuevo curso"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    {planning.editingMedicalCourse.name && availableCourses.includes(planning.editingMedicalCourse.name) && (
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar el curso "${planning.editingMedicalCourse.name}"?`)) {
                            deleteMedicalCourseHandler(planning.editingMedicalCourse.id!);
                            setPlanning(prev => ({ 
                              ...prev, 
                              editingMedicalCourse: prev.editingMedicalCourse ? { ...prev.editingMedicalCourse, name: '' } : null 
                            }));
                          }
                        }}
                        className="px-3 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors flex-shrink-0"
                        title="Eliminar curso"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal para añadir nuevo curso */}
            {showAddMedicalCourse && (
              <div className="fixed inset-0 z-[400] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95">
                  <h3 className="text-lg font-black text-slate-900 mb-4">Añadir Nuevo Curso</h3>
                  <input
                    type="text"
                    value={medicalCourseName}
                    onChange={(e) => setMedicalCourseName(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                    placeholder="Nombre del nuevo curso..."
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowAddMedicalCourse(false);
                        setMedicalCourseName('');
                      }}
                      className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={addNewMedicalCourse}
                      disabled={!medicalCourseName.trim()}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      Añadir Curso
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Proveedor</label>
                <div className="flex gap-2 flex-wrap">
                  <select
                    value={planning.editingMedicalCourse.provider}
                    onChange={(e) => setPlanning(prev => ({ 
                      ...prev, 
                      editingMedicalCourse: prev.editingMedicalCourse ? { ...prev.editingMedicalCourse, provider: e.target.value } : null 
                    }))}
                    className="flex-1 min-w-0 p-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">Seleccionar proveedor...</option>
                    {availableProviders.map(provider => (
                      <option key={provider} value={provider}>{provider}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowAddMedicalProvider(true)}
                    className="px-3 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex-shrink-0"
                    title="Añadir nuevo proveedor"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  {planning.editingMedicalCourse.provider && availableProviders.includes(planning.editingMedicalCourse.provider) && (
                    <button
                      onClick={() => {
                        if (confirm(`¿Eliminar el proveedor "${planning.editingMedicalCourse.provider}"?`)) {
                          // Eliminar el proveedor de la lista de disponibles
                          const newProviders = availableProviders.filter(p => p !== planning.editingMedicalCourse.provider);
                          setAvailableProviders(newProviders);
                          localStorage.setItem('availableProviders', JSON.stringify(newProviders));
                          // Limpiar el campo del formulario
                          setPlanning(prev => ({ 
                            ...prev, 
                            editingMedicalCourse: prev.editingMedicalCourse ? { ...prev.editingMedicalCourse, provider: '' } : null 
                          }));
                        }
                      }}
                      className="px-3 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors flex-shrink-0"
                      title="Eliminar proveedor"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Estado (calculado)</label>
                <input
                  type="text"
                  value={planning.editingMedicalCourse.status}
                  disabled
                  className="w-full p-3 border border-slate-200 rounded-xl bg-slate-100 text-slate-600"
                  readOnly
                />
              </div>
            </div>

            {/* Modal para añadir nuevo proveedor */}
            {showAddMedicalProvider && (
              <div className="fixed inset-0 z-[400] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95">
                  <h3 className="text-lg font-black text-slate-900 mb-4">Añadir Nuevo Proveedor</h3>
                  <input
                    type="text"
                    value={medicalProviderName}
                    onChange={(e) => setMedicalProviderName(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                    placeholder="Nombre del nuevo proveedor..."
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowAddMedicalProvider(false);
                        setMedicalProviderName('');
                      }}
                      className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={addNewMedicalProvider}
                      disabled={!medicalProviderName.trim()}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      Añadir Proveedor
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Fecha de Realización</label>
                <input
                  type="date"
                  value={planning.editingMedicalCourse.issueDate || ''}
                  onChange={(e) => {
                    const issueDate = e.target.value;
                    const currentExpiryDate = planning.editingMedicalCourse?.expiryDate || '';
                    
                    // Auto-calcular fecha de caducidad (1 año después) siempre que haya fecha de realización
                    let expiryDate = currentExpiryDate;
                    if (issueDate) {
                      const issue = new Date(issueDate);
                      issue.setFullYear(issue.getFullYear() + 1);
                      expiryDate = issue.toISOString().split('T')[0];
                    }
                    
                    setPlanning(prev => ({ 
                      ...prev, 
                      editingMedicalCourse: prev.editingMedicalCourse ? { 
                        ...prev.editingMedicalCourse, 
                        issueDate,
                        expiryDate
                      } : null 
                    }));
                  }}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                    Fecha de Caducidad
                  </label>
                  {planning.editingMedicalCourse.issueDate && (
                    <span className="text-xs text-blue-600 font-normal">(auto: +1 año)</span>
                  )}
                </div>
                <input
                  type="date"
                  value={planning.editingMedicalCourse.expiryDate || ''}
                  onChange={(e) => setPlanning(prev => ({ 
                    ...prev, 
                    editingMedicalCourse: prev.editingMedicalCourse ? { ...prev.editingMedicalCourse, expiryDate: e.target.value } : null 
                  }))}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Operarios asignados */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Operarios Asignados</label>
              <div className="mb-3">
                <input
                  type="text"
                  value={workerSearchFilter}
                  onChange={(e) => setWorkerSearchFilter(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="🔍 Buscar operarios..."
                />
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-3">
                {planning.workers
                  .filter(w => !w.isArchived)
                  .filter(w => 
                    workerSearchFilter === '' || 
                    w.name.toLowerCase().includes(workerSearchFilter.toLowerCase()) ||
                    w.code.toLowerCase().includes(workerSearchFilter.toLowerCase())
                  )
                  .map(worker => (
                  <label key={worker.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={planning.editingMedicalCourse?.assignedWorkerIds.includes(worker.id) || false}
                      onChange={(e) => {
                        if (!planning.editingMedicalCourse) return;
                        
                        const updatedIds = e.target.checked
                          ? [...planning.editingMedicalCourse.assignedWorkerIds, worker.id]
                          : planning.editingMedicalCourse.assignedWorkerIds.filter(id => id !== worker.id);
                        
                        setPlanning(prev => ({ 
                          ...prev, 
                          editingMedicalCourse: prev.editingMedicalCourse ? { ...prev.editingMedicalCourse, assignedWorkerIds: updatedIds } : null 
                        }));
                      }}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-medium text-slate-900">{worker.name}</span>
                      <span className="text-xs text-slate-500 ml-2">{worker.code}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-8 pt-6 border-t border-slate-100">
            <button
              onClick={() => setPlanning(prev => ({ ...prev, editingMedicalCourse: null }))}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                if (!planning.editingMedicalCourse) return;
                
                // Verificar si es un registro nuevo (No existe en la lista)
                const isNewRecord = !planning.medicalCourses.some(c => c.id === planning.editingMedicalCourse!.id);
                
                if (isNewRecord) {
                  // Es un nuevo registro
                  addMedicalCourse(planning.editingMedicalCourse);
                } else {
                  // Es un registro existente
                  updateMedicalCourseHandler(planning.editingMedicalCourse);
                }
                setPlanning(prev => ({ ...prev, editingMedicalCourse: null }));
              }}
              disabled={!planning.editingMedicalCourse.name.trim() && planning.editingMedicalCourse.type === 'course'}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {planning.medicalCourses.some(c => c.id === planning.editingMedicalCourse?.id) ? 'Guardar Cambios' : 'Crear Registro'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
    {itemToDelete && (
      <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">Confirmar Eliminación</h2>
            <p className="text-sm text-slate-600">
              ¿Estás seguro de que deseas eliminar {itemToDelete.name}? Esta acción no se puede deshacer.
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setItemToDelete(null)}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-lg font-black text-sm hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={executeDelete}
              className="flex-1 py-3 bg-red-600 text-white rounded-lg font-black text-sm hover:bg-red-700 transition-colors"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    )}

    {/* INDICADOR DE VERSIÓN */}
    <div className="fixed bottom-2 right-2 text-[8px] text-slate-400 font-mono z-[999]">
      v2.0.0
    </div>
  </div>
);
};

export default App;
