import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { 
  CalendarIcon, Users, Building2, Car, HeartPulse, Settings, Download, Upload, Cloud, CloudOff, AlertCircle, CheckCircle2, X, ChevronLeft, ChevronRight, CalendarDays, Search, Plus, Trash2, Edit2, Copy, FileText, Loader2, LayoutGrid, Table, ListTodo, Bell, MessageSquare, Send, Filter, ArrowRight, Clock, User, Mail, Phone, MapPin, Briefcase, Star, TrendingUp, Activity, DownloadCloud, Database, RotateCcw, BarChart3, MessageCircle, Calendar, CheckCircle, GraduationCap, FileSpreadsheet, ChevronDown, Sparkles, ClipboardList, Hash, Save, StickyNote, Fuel, AlertTriangle, RefreshCw 
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useSupabaseData } from './hooks/useSupabaseData';
import LoginScreen from './components/LoginScreen';
import WorkerSidebar from './components/WorkerSidebar';
import PlanningBoard from './components/PlanningBoard';
import StatisticsPanel from './components/StatisticsPanel';
import CompactPlanningView from './components/CompactPlanningView';
import FleetManager from './components/FleetManager';
import { PlanningState, Worker, Client, Job, Holiday, Vehicle, FuelRecord, DailyNote, MedicalCourse, Course, StandardTask, VehicleAssignment, ContractType, WorkerStatus, WorkerStatusRecord, ViewType, JobType, NoteType } from './lib/types';
import { formatDateDMY, isHoliday, getWorkerDisplayName, getCurrentWorkerStatus, getNextStatusChange, addOrUpdateStatusRecord, removeStatusRecord, validateAssignment, getWorkerSSFormat } from './lib/utils';
import { WORKER_ROLES } from './lib/constants';

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
    'DISPONIBLE': true, 'VACACIONES': true, 'BAJA_MEDICA': true, 'BAJA_PATERNIDAD': true
  });
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'job' | 'worker' | 'client' | 'task' | 'course', name: string } | null>(null);
  const [confirmDeleteCourse, setConfirmDeleteCourse] = useState<string | null>(null);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [showBackupModal, setShowBackupModal] = useState(false);
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
  const [exportHistory, setExportHistory] = useState(() => {
    const saved = localStorage.getItem('exportHistory');
    return saved ? JSON.parse(saved) : {};
  });
  const [highlightedWorker, setHighlightedWorker] = useState<string | null>(null);
  const [highlightTimeout, setHighlightTimeout] = useState<NodeJS.Timeout | null>(null);
  const APP_VERSION = 'v2.0.0';
  // Stubs de compatibilidad con UI (en v2 el guardado es granular, no hay "auto-backup" separado)
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [lastAutoBackupTime] = useState<Date | null>(null);

  // ── Estados compatibles con v1 (UI sin cambios) ────────────────────────────
  // En v2 no hay "dataRecoveryMode" porque los datos se cargan desde tablas.
  // Mantenemos la variable por compatibilidad con el JSX original pero siempre false.
  const [dataRecoveryMode, setDataRecoveryMode] = useState(false);
  const [advancedRecovery, setAdvancedRecovery] = useState(false);
  const lastSavedTime = isSaving ? null : new Date();

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
      
      // Depuración para ver el nombre del cliente
      console.log('🔍 Nombre del cliente:', client?.name);
      console.log('🔍 Nombre del centro:', center?.name);
      
      // Limpiar el nombre del cliente: quitar guiones bajos, espacios extra y caracteres especiales
      let cleanClientName = (client?.name || 'EMPRESA')
        .replace(/_/g, ' ')           // Reemplazar guiones bajos con espacios
        .replace(/\s+/g, ' ')        // Reemplazar múltiples espacios con uno solo
        .trim();                      // Quitar espacios al inicio y final
      
      console.log('🔍 Nombre limpio:', `"${cleanClientName}"`);
      console.log('🔍 Caracteres del nombre:', Array.from(cleanClientName).map(c => `${c} (${c.charCodeAt(0)})`));
      
      // Obtener número de exportación para el sufijo
      const exportCount = (currentHistory[exportKey]?.exportCount || 0) + 1;
      const suffix = exportCount > 1 ? `-${exportCount}` : '';
      
      const fileName = isFirstExport 
        ? `LISTADO ACCESO "${cleanClientName}" ${formattedDate}${suffix}.xlsx` 
        : `NUEVOS ACCESO "${cleanClientName}" ${formattedDate}${suffix}.xlsx`;
      
      console.log('🔍 Nombre final del archivo:', fileName);
      const wb = XLSX.utils.book_new();
      // Operarios fijos siempre al principio
      const fixedWorkers = [
        { dni: '24371414Q', name: 'JOSE LUIS RUIZ TARREGA' },
        { dni: '44876073Z', name: 'ANGEL SANCHEZ MIGALLON' }
      ];

      // Combinar operarios fijos + resto (evitando duplicados)
      const fixedDnis = new Set(fixedWorkers.map(w => w.dni));
      const otherWorkers = finalWorkers.filter(w => !fixedDnis.has(w.dni));
      const allWorkers = [...fixedWorkers, ...otherWorkers];

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
      showNotification('Error al exportar el listado', 'error');
    }
  }, [planning, showNotification, updateExportHistory, exportHistory]);

  // ── Alertas médicas ────────────────────────────────────────────────────────
  const calculateMedicalAlerts = useCallback((courses: MedicalCourse[], workers: Worker[]): MedicalAlert[] => {
    const today = new Date();
    const alerts: MedicalAlert[] = [];
    courses.forEach(course => {
      if (!course.expiryDate) return;
      const expiryDate = new Date(course.expiryDate);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry > 30) return;
      const alertLevel: 'critical' | 'warning' = daysUntilExpiry < 0 ? 'critical' : 'warning';
      course.assignedWorkerIds.forEach(workerId => {
        const worker = workers.find(w => w.id === workerId);
        if (worker) {
          alerts.push({ id: `${course.id}-${workerId}`, workerId: worker.id, courseId: course.id, courseName: course.type === 'recognition' ? '🏥 Reconocimiento Médico' : course.name || '📚 Curso', workerName: worker.name, type: course.type, provider: course.provider, expiryDate: course.expiryDate!, daysUntilExpiry, alertLevel });
        }
      });
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
    console.log('🔍 updateMedicalCourseHandler llamado con:', course);
    console.log('🔍 course.id:', course.id);
    console.log('🔍 course.assignedWorkerIds:', course.assignedWorkerIds);
    
    if (!course.id) {
      console.error('❌ course.id es undefined - cancelando operación');
      showNotification('Error: ID del registro no válido', 'error');
      return;
    }
    
    const existing = planning.medicalCourses.find((c) => c.id === course.id);
    console.log('🔍 existing encontrado:', existing ? { id: existing.id, provider: existing.provider } : null);
    
    if (!existing) {
      console.error('❌ No se encontró el registro con ID:', course.id);
      showNotification('Error: Registro no encontrado', 'error');
      return;
    }
    
    const updated = { ...existing, ...course, updatedAt: new Date().toISOString() };
    console.log('🔍 updated course:', { id: updated.id, provider: updated.provider });
    
    await persistMedicalCourse(updated);
    showNotification('Registro médico actualizado', 'success');
  }, [persistMedicalCourse, showNotification]);

  const deleteMedicalCourseHandler = useCallback(async (id: string) => {
    console.log('🔍 deleteMedicalCourseHandler llamado con ID:', id);
    
    // Si el ID es undefined, no hacer nada para evitar eliminar todos los registros
    if (!id) {
      console.error('❌ Intentando eliminar con ID undefined - operación cancelada');
      showNotification('Error: ID del registro no válido', 'error');
      return;
    }
    
    console.log('🔍 medicalCourses ANTES de eliminar:', planning.medicalCourses.map(c => ({ id: c.id, provider: c.provider })));
    
    const existing = planning.medicalCourses.find((c) => c.id === id);
    console.log('🔍 existing a eliminar:', existing ? { id: existing.id, provider: existing.provider } : null);
    
    if (!existing) {
      console.error('❌ No se encontró el registro con ID:', id);
      showNotification('Error: Registro no encontrado', 'error');
      return;
    }
    
    // Eliminar del estado local primero
    const remaining = planning.medicalCourses.filter((c) => c.id !== id);
    console.log('🔍 remaining DESPUÉS de filter:', remaining.map(c => ({ id: c.id, provider: c.provider })));
    
    setPlanning(prev => ({ ...prev, medicalCourses: remaining }));
    console.log('🔍 medicalCourses DESPUÉS de setPlanning:', remaining.map(c => ({ id: c.id, workerIds: c.assignedWorkerIds })));
    
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
        console.log('💾 Saving job:', job.id);
        return persistJob(job);
      }));
      console.log('✅ All jobs saved successfully');
    } catch (error) {
      console.error('❌ Error saving jobs:', error);
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
      
      console.log('🚀 Enviando petición a /api/migrate');
      
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
      console.log('✅ Response data:', result);

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
    const firstClient = clientId ? planning.clients.find(c => c.id === clientId) : planning.clients[0];
    const newJob: Job = { id: `j-${Date.now()}`, date: date || planning.currentDate, clientId: firstClient?.id || '', centerId: firstClient?.centers?.[0]?.id || '', type: JobType.DESCARGA, startTime: '09:00', endTime: '13:00', requiredWorkers: 3, assignedWorkerIds: [], ref: '', deliveryNote: '', notes: '', isCancelled: false };
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
    
    console.log('🔍 Iniciando duplicación de tarea:', {
      originalJob: duplicatingJob.id,
      originalDate: duplicatingJob.date,
      newDate: duplicationDate,
      keepWorkers: keepWorkersOnDuplicate,
      keepDeliveryNote: keepDeliveryNoteOnDuplicate
    });
    
    // Extraer todas las propiedades excepto las que vamos a controlar explícitamente
    const { id, date, assignedWorkerIds, ref, deliveryNote, ...jobData } = duplicatingJob;
    
    const newJob: Job = { 
      ...jobData, // Copiar todo excepto id, date, assignedWorkerIds, ref, deliveryNote
      id: `j-${Date.now()}`, 
      date: duplicationDate, 
      assignedWorkerIds: keepWorkersOnDuplicate ? duplicatingJob.assignedWorkerIds : [],
      ref: keepDeliveryNoteOnDuplicate ? (duplicatingJob.ref || '') : '', // Control explícito del ref
      deliveryNote: keepDeliveryNoteOnDuplicate ? (duplicatingJob.deliveryNote || '') : '' // Control explícito del deliveryNote
    };
    
    console.log('🔍 Nueva tarea creada:', newJob);
    
    try {
      await persistJob(newJob);
      console.log('🔍 Tarea duplicada y guardada correctamente');
      
      setDuplicatingJob(null);
      setKeepDeliveryNoteOnDuplicate(false); // Resetear estado
      showNotification("Tarea duplicada", "success");
      
      console.log('🔍 Estados reseteados después de duplicar');
    } catch (error) {
      console.error('❌ Error al duplicar tarea:', error);
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
    
    // Filtrar tareas del operario en el mes
    const workerJobs = planning.jobs.filter(job => 
      job.assignedWorkerIds.includes(workerId) &&
      job.date.startsWith(yearMonth)
    );
    
    // Obtener días trabajados
    const workedDays = new Set<string>();
    workerJobs.forEach(job => {
      workedDays.add(job.date);
    });
    
    // Detectar fines de semana (viernes+lunes trabajados)
    const weekendDays = new Set<string>();
    const workedDates = Array.from(workedDays).map(dateStr => new Date(dateStr + 'T00:00:00')); // Añadir hora para evitar desfase
    
    workedDates.forEach(date => {
      const dayOfWeek = date.getDay(); // 0=domingo, 1=lunes, ..., 5=viernes, 6=sábado
      
      if (dayOfWeek === 5) { // Viernes
        // Buscar si hay lunes trabajado en los próximos 3 días
        const monday = new Date(date);
        monday.setDate(date.getDate() + 3); // viernes -> lunes
        
        if (monday.getMonth() === month - 1 && workedDays.has(formatDateLocal(monday))) {
          // Añadir sábado y domingo (usando las fechas correctas)
          const saturday = new Date(date);
          saturday.setDate(date.getDate() + 1); // sábado
          const sunday = new Date(date);
          sunday.setDate(date.getDate() + 2); // domingo
          
          weekendDays.add(formatDateLocal(saturday));
          weekendDays.add(formatDateLocal(sunday));
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
  const handleOpenNewWorker = () => {
    setEditingWorker({ id: `w-${Date.now()}`, code: '', name: '', apodo: undefined, dni: '', phone: '', role: 'Mozo Almacén', status: WorkerStatus.DISPONIBLE, contractType: ContractType.FIJO_DISCONTINUO, hasVehicle: false, startTime: '09:00', endTime: '17:00', restrictions: [], restrictedClientIds: [], skills: [JobType.MANIPULACION], completedCourses: [] });
  };

  const saveWorker = useCallback(async (worker: Worker | null) => {
    if (!worker || !worker.name || !worker.code) { showNotification("Nombre y Código requeridos", "error"); return; }
    await persistWorker(worker);
    setEditingWorker(null);
    showNotification(`Operario "${worker.name}" guardado correctamente`, "success");
  }, [persistWorker, showNotification]);

  const getCorrectWorkerStatus = (worker: Worker): WorkerStatus => getCurrentWorkerStatus(worker).status;

  const handleUpdateWorkerStatus = useCallback(async (workerId: string, status: WorkerStatus) => {
    const worker = planning.workers.find(w => w.id === workerId);
    if (!worker) return;
    await persistWorker({ ...worker, status });
  }, [planning.workers, persistWorker]);

  const handleAddStatusRecord = useCallback(async () => {
    if (!editingWorker || !editingStatusRecord) return;
    if (!editingStatusRecord.startDate) { showNotification("Debes seleccionar una fecha de inicio", "error"); return; }
    if (!editingStatusRecord.endDate || editingStatusRecord.endDate === '') { showNotification("Debes seleccionar una fecha de fin o marcar como IND.", "error"); return; }
    const updatedWorker = addOrUpdateStatusRecord(editingWorker, editingStatusRecord.status, editingStatusRecord.startDate, editingStatusRecord.endDate);
    const currentStatus = getCurrentWorkerStatus(updatedWorker);
    const finalWorker = { ...updatedWorker, status: currentStatus.status, statusStartDate: currentStatus.startDate, statusEndDate: currentStatus.endDate };
    setEditingWorker(finalWorker);
    await persistWorker(finalWorker);
    setEditingStatusRecord(null);
    setShowAddRecordForm(false);
    showNotification("Registro de estado añadido", "success");
  }, [editingWorker, editingStatusRecord, persistWorker, showNotification]);

  const handleEditStatusRecord = (recordId: string) => {
    if (!editingWorker?.statusRecords) return;
    const record = editingWorker.statusRecords.find(r => r.id === recordId);
    if (record) { setEditingStatusRecord({ id: record.id, status: record.status, startDate: record.startDate, endDate: record.endDate || 'IND.' }); setShowAddRecordForm(true); }
  };

  const handleDeleteStatusRecord = useCallback(async (recordId: string) => {
    if (!editingWorker) return;
    if (confirm("¿Estás seguro de que quieres eliminar este registro?")) {
      const updatedWorker = removeStatusRecord(editingWorker, recordId);
      const currentStatus = getCurrentWorkerStatus(updatedWorker);
      const finalWorker = { ...updatedWorker, status: currentStatus.status, statusStartDate: currentStatus.startDate, statusEndDate: currentStatus.endDate };
      setEditingWorker(finalWorker);
      await persistWorker(finalWorker);
      showNotification("Registro eliminado", "success");
    }
  }, [editingWorker, persistWorker, showNotification]);

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

  const clearAllStandardTasks = useCallback(async () => {
    if (planning.standardTasks.length === 0) { showNotification("No hay plantillas para eliminar", "info"); return; }
    await Promise.all(planning.standardTasks.map(t => persistDeleteStandardTask(t.id)));
    showNotification(`Se eliminaron ${planning.standardTasks.length} plantillas`, "success");
  }, [planning.standardTasks, persistDeleteStandardTask, showNotification]);

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
    console.log('🔍 handleCopyList llamado con:', { type, listLength: list.length, list: list.slice(0, 3) });
    
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
      console.log('✅ Texto copiado al clipboard');
      showNotification(`Lista de ${type} copiada`, 'success');
    }).catch((error) => {
      console.error('❌ Error copiando al clipboard:', error);
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
    console.log('🔍 copyWorkerListToClipboard llamado con:', { clientId, centerId, date });
    const text = generateWorkerListText(clientId, centerId, date);
    console.log('📝 Texto generado:', text);
    console.log('📱 Navigator.clipboard disponible:', !!navigator.clipboard);
    
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
      console.log('✅ Texto copiado al clipboard');
      showNotification('Listado copiado al portapapeles', 'success');
    }).catch((error) => {
      console.error('❌ Error copiando al clipboard:', error);
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
    clients: (data.clients || []).map(c => ({ ...c, regularTasks: (c.regularTasks || []).filter(t => t.id && t.name && t.defaultWorkers && t.category) })),
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
    const statusMapping: {[k: string]: string} = { 'DISPONIBLE': 'Disponible', 'VACACIONES': 'Vacaciones', 'BAJA_MEDICA': 'Baja Médica', 'BAJA_PATERNIDAD': 'Baja Paternidad' };
    if (activeStatusFilters.length > 0) workers = workers.filter(w => activeStatusFilters.some(k => getCorrectWorkerStatus(w) === statusMapping[k]));
    return workers;
  }, [cleanedPlanning.workers, workerTableSearch, showArchivedWorkers, workerAvailabilityFilter, workerContractFilter, workerStatusFilter, cleanedPlanning.jobs, cleanedPlanning.currentDate]);

  const getClientQuickTemplates = (clientId: string) => {
    const client = cleanedPlanning.clients.find(c => c.id === clientId);
    if (!client) return [];
    const regularTemplates = (client.regularTasks || []).filter(t => t && t.id && t.name && t.defaultWorkers && t.category);
    const standardTemplates = cleanedPlanning.standardTasks.filter(t => t && t.id && t.name && t.defaultWorkers && t.type && Array.isArray((t as any).assignedClientIds) && (t as any).assignedClientIds.includes(clientId)).map(t => ({ id: `st-${t.id}`, name: t.name, defaultWorkers: t.defaultWorkers, category: t.type }));
    return [...regularTemplates, ...standardTemplates];
  };

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
  const tryRecoverData = async () => showNotification("En v2 los datos se cargan automáticamente desde las tablas", "info");
  const advancedDataRecovery = async () => showNotification("En v2 los datos se cargan automáticamente desde las tablas", "info");
  const saveToSupabase = async (showSuccess = false) => { if (showSuccess) showNotification("Datos sincronizados", "success"); };

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
      const dayJobs = cleanedPlanning.jobs.filter(job => job.date === dateStr && !job.isCancelled);
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
          {lastAutoBackupTime ? `Auto ${lastAutoBackupTime.toLocaleTimeString()}` : 'Auto activo'}
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
            <button onClick={() => setView('databases')} className={`p-3 rounded-xl transition-all flex justify-center ${view === 'databases' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} title="Bases de Datos"><Database className="w-6 h-6" /></button>
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
                            <button onClick={() => setShowCalendarSelector(true)} className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm text-xs font-black uppercase tracking-widest text-slate-700 hover:text-blue-600 transition-colors"><CalendarDays className="w-4 h-4 text-blue-500" />{formatDateWithDay(planning.currentDate)}</button>
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
                   </div>
                   <div className="flex items-center gap-3">
                      <button onClick={() => setShowNotificationsModal(true)} className="relative p-3 bg-slate-50 rounded-xl hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors">
                         <MessageCircle className="w-5 h-5" />
                         {notifiedCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full border-2 border-white"></span>}
                      </button>
                   </div>
                </header>
                <PlanningBoard planning={planning} datesToShow={datesToShow} onDropWorker={handleAssignWorker} onRemoveWorker={handleRemoveWorker} onAddJob={handleOpenNewJob} onEditJob={setEditingJob} onDuplicateJob={handleOpenDuplicate} onShowWorkerList={handleShowWorkerList} onExportAccessList={exportWorkerAccessList} highlightedWorker={highlightedWorker} onDragStartFromBoard={(wId) => setDraggedWorkerId(wId)} onReorderJob={handleReorderJobs} onReorderClient={handleReorderClients} onEditNote={handleOpenNote} onUpdateJobReinforcementGroups={handleUpdateJobReinforcementGroups} draggedWorkerId={draggedWorkerId} showNotification={showNotification} />
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
                            'BAJA_PATERNIDAD': false
                          });
                        } else {
                          // Si no todos están activos, activar todos
                          setWorkerStatusFilter({
                            'DISPONIBLE': true,
                            'VACACIONES': true,
                            'BAJA_MEDICA': true,
                            'BAJA_PATERNIDAD': true
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
                            'BAJA_PATERNIDAD': false
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
                            'BAJA_PATERNIDAD': false
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
                            'BAJA_PATERNIDAD': false
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
                            'BAJA_MEDICA': false
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
                             console.log('🔍 Editando worker:', worker);
                             console.log('🔍 Estado actual editingWorker:', editingWorker);
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
                  <div className="grid grid-cols-6 gap-2 p-3 bg-slate-50 border-b border-slate-200">
                    <div className="text-xs font-bold text-slate-700 uppercase">Tipo</div>
                    <div className="text-xs font-bold text-slate-700 uppercase">Proveedor</div>
                    <div className="text-xs font-bold text-slate-700 uppercase">Operarios</div>
                    <div className="text-xs font-bold text-slate-700 uppercase">Realización</div>
                    <div className="text-xs font-bold text-slate-700 uppercase">Caducidad</div>
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
                    );
                    
                    return filteredCourses.map(course => {
                      const assignedWorker = course.assignedWorkerIds[0]; // Solo hay un operario por registro
                      const worker = planning.workers.find(w => w.id === assignedWorker);
                      const workerName = worker ? worker.name : '';
                      
                      console.log('🔍 Renderizando course:', { 
                        id: course.id, 
                        provider: course.provider, 
                        hasId: !!course.id,
                        idType: typeof course.id 
                      });
                      
                      return (
                        <div key={course.id || `course-${Math.random()}`} className="grid grid-cols-6 gap-2 p-3 border-b border-slate-100 hover:bg-slate-50 items-center">
                          <div className="text-sm font-medium text-slate-900 truncate">
                            {course.type === 'recognition' ? '🏥 Reconocimiento médico' : (course.name || '📚 Curso')}
                          </div>
                          <div className="text-sm text-slate-600 truncate">
                            {course.provider}
                          </div>
                          <div className="text-sm text-slate-600">
                            {workerName || '-'}
                          </div>
                          <div className="text-sm text-slate-600">
                            {formatDateEuropean(course.issueDate) || '-'}
                          </div>
                          <div className="text-sm text-slate-600">
                            {formatDateEuropean(course.expiryDate) || '-'}
                          </div>
                          <div className="flex gap-1">
                            <button 
                              onClick={() => {
                                console.log('🔍 Botón editar presionado, course.id:', course.id);
                                setPlanning(prev => ({ ...prev, editingMedicalCourse: course }));
                              }}
                              className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={() => {
                                console.log('🔍 Botón eliminar presionado, course.id:', course.id);
                                if (confirm('¿Eliminar este registro médico?')) {
                                  deleteMedicalCourseHandler(course.id);
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
                 {planning.workers.filter(worker => !worker.isArchived).sort((a, b) => {
                    // Extraer números del código (ej: X001 -> 001, 002, etc.)
                    const numA = parseInt(a.code.replace(/\D/g, ''), 10);
                    const numB = parseInt(b.code.replace(/\D/g, ''), 10);
                    return numA - numB;
                  }).map(worker => {
                   const workerMedicalCourses = planning.medicalCourses.filter(course => 
                     course.assignedWorkerIds.includes(worker.id)
                   );
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
               <button onClick={handleOpenNewClientHandler} className="bg-slate-900 text-white px-6 py-4 rounded-[24px] font-black text-[12px] uppercase tracking-widest">+ Nuevo Cliente</button>
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

                 {editingJob.clientId && getClientQuickTemplates(editingJob.clientId)?.length ? (
                    <div className="animate-in fade-in slide-in-from-top-2">
                       <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Plantillas Rápidas</label>
                       </div>
                       <div className="flex flex-wrap gap-2">
                          {getClientQuickTemplates(editingJob.clientId).map(task => (
                             <button
                                key={task.id}
                                onClick={() => setEditingJob({
                                   ...editingJob,
                                   type: task.category,
                                   customName: task.name,
                                   requiredWorkers: task.defaultWorkers
                                })}
                                className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase tracking-wide transition-all shadow-sm flex items-center gap-1.5"
                             >
                                <span>{task.name}</span>
                                <span className="bg-white px-1.5 rounded-md text-[9px] font-black text-amber-500">{task.defaultWorkers} Ops</span>
                             </button>
                          ))}
                       </div>
                    </div>
                 ) : null}

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
                       <StickyNote className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                       <textarea 
                          placeholder="Notas de la tarea..." 
                          className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
                          rows={3}
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
                   planning.fuelRecords.filter(r => r.workerId === editingWorker.id).map(record => (
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
                    setEditingStatusRecord({
                      status: WorkerStatus.VACACIONES,
                      startDate: new Date().toISOString().split('T')[0],
                      endDate: new Date().toISOString().split('T')[0]
                    });
                    setShowAddRecordForm(true);
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
                          <div className="text-center">
                             <div className="text-2xl font-black text-blue-600">{workerDaysModal.calculationResult.totalCount}</div>
                             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</div>
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
                          
                          return `   • *Cliente:* ${client?.name}\n   • *Centro:* ${center?.name || 'Sede Principal'}\n   • *Dirección:* ${address}\n   • *Ver en Mapa:* ${mapUrl}\n\n   • *Hora Inicio:* ${workerStartTime}\n   • *Tarea:* ${firstJob.customName || firstJob.type}`;
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
                    .filter(worker => worker !== undefined)
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
                Clientes que verán esta plantilla rápida
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
                    console.log('🔍 Estado actual editingMedicalCourse:', planning.editingMedicalCourse);
                    const issueDate = e.target.value;
                    const currentExpiryDate = planning.editingMedicalCourse?.expiryDate || '';
                    
                    console.log('🔍 Auto-cálculo fecha caducidad:', {
                      issueDate,
                      currentExpiryDate,
                      hasExpiryDate: !!currentExpiryDate,
                      shouldCalculate: !currentExpiryDate && issueDate
                    });
                    
                    // Auto-calcular fecha de caducidad (1 año después) siempre que haya fecha de realización
                    let expiryDate = currentExpiryDate;
                    if (issueDate) {
                      const issue = new Date(issueDate);
                      issue.setFullYear(issue.getFullYear() + 1);
                      expiryDate = issue.toISOString().split('T')[0];
                      console.log('🔍 Fecha calculada:', expiryDate);
                    }
                    
                    console.log('🔍 Actualizando estado:', { issueDate, expiryDate });
                    
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
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                  Fecha de Caducidad
                  {planning.editingMedicalCourse.issueDate && (
                    <span className="ml-2 text-xs text-blue-600 font-normal">(auto: +1 año)</span>
                  )}
                </label>
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
                console.log('🔍 editingMedicalCourse completo:', planning.editingMedicalCourse);
                console.log('🔍 editingMedicalCourse.id:', planning.editingMedicalCourse?.id);
                console.log('🔍 medicalCourses existentes:', planning.medicalCourses.map(c => c.id));
                
                const isNewRecord = !planning.medicalCourses.some(c => c.id === planning.editingMedicalCourse!.id);
                console.log('🔍 ¿Es nuevo registro?', isNewRecord);
                
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
