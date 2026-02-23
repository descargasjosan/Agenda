/**
 * useSupabaseData — Capa de datos v2
 *
 * Cambios respecto a v1:
 * - Cada entidad tiene su propia tabla (workers, jobs, clients, etc.)
 * - El guardado es GRANULAR: solo se escribe el registro exacto que cambia
 * - El Realtime escucha tablas independientes → no hay sobrescrituras
 * - Sin logs a Supabase, sin detectStaleData, sin polling innecesario
 * - Reducción de tráfico estimada: >95%
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import {
  PlanningState, Worker, Client, Job, StandardTask,
  Vehicle, VehicleAssignment, FuelRecord, DailyNote,
  MedicalCourse, Holiday, Course, ReinforcementGroup
} from '../lib/types';

// ─── Estado inicial vacío ──────────────────────────────────────────────────
const EMPTY_STATE: PlanningState = {
  currentDate: new Date().toISOString().split('T')[0],
  workers: [],
  clients: [],
  jobs: [],
  customHolidays: [],
  notifications: {},
  courses: [],
  medicalCourses: [],
  medicalAlerts: [],
  selectedMedicalTab: 'dashboard',
  editingMedicalCourse: null,
  standardTasks: [],
  dailyNotes: [],
  fuelRecords: [],
  vehicles: [],
  vehicleAssignments: [],
};

// ─── Helper: extraer array de registros Supabase ───────────────────────────
function extractRows<T>(rows: any[] | null): T[] {
  if (!rows) return [];
  return rows.map((r) => r.data as T);
}

// ─── Helper específico para medical_courses (preserva ID) ───────────────────
function extractMedicalCourses(rows: any[] | null): (MedicalCourse & { id: string })[] {
  if (!rows) return [];
  return rows.map((r) => ({ ...r.data, id: r.id }));
}

// ─── Tipos del hook ────────────────────────────────────────────────────────
interface UseSupabaseDataReturn {
  planning: PlanningState;
  setPlanning: React.Dispatch<React.SetStateAction<PlanningState>>;
  dbStatus: 'loading' | 'connected' | 'error' | 'saving' | 'saved';
  isSaving: boolean;

  // Workers
  saveWorker: (worker: Worker) => Promise<void>;
  deleteWorker: (id: string) => Promise<void>;

  // Clients
  saveClient: (client: Client) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;

  // Jobs
  saveJob: (job: Job) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;

  // Standard tasks
  saveStandardTask: (task: StandardTask) => Promise<void>;
  deleteStandardTask: (id: string) => Promise<void>;

  // Vehicles
  saveVehicle: (vehicle: Vehicle) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;

  // Vehicle assignments
  saveVehicleAssignment: (assignment: VehicleAssignment) => Promise<void>;
  deleteVehicleAssignment: (id: string) => Promise<void>;

  // Fuel records
  saveFuelRecord: (record: FuelRecord) => Promise<void>;
  deleteFuelRecord: (id: string) => Promise<void>;

  // Daily notes
  saveDailyNote: (note: DailyNote) => Promise<void>;
  deleteDailyNote: (id: string) => Promise<void>;

  // Medical courses
  saveMedicalCourse: (course: MedicalCourse) => Promise<void>;
  deleteMedicalCourse: (id: string) => Promise<void>;

  // Courses (general)
  saveCourse: (course: Course) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;

  // Holidays
  saveHoliday: (holiday: Holiday) => Promise<void>;
  deleteHoliday: (date: string) => Promise<void>;

  // App settings (notifications, etc.)
  saveAppSettings: (key: string, value: any) => Promise<void>;

  showNotification: (message: string, type: 'error' | 'success' | 'warning' | 'info') => void;
  notification: { message: string; type: 'error' | 'success' | 'warning' | 'info' } | null;
}

export function useSupabaseData(): UseSupabaseDataReturn {
  const [planning, setPlanning] = useState<PlanningState>(EMPTY_STATE);
  const [dbStatus, setDbStatus] = useState<'loading' | 'connected' | 'error' | 'saving' | 'saved'>('loading');
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'error' | 'success' | 'warning' | 'info' } | null>(null);
  const isLoaded = useRef(false);

  const showNotification = useCallback((message: string, type: 'error' | 'success' | 'warning' | 'info' = 'info') => {
    console.log('🔔 showNotification llamado:', { message, type });
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  // ─── Carga inicial en paralelo ─────────────────────────────────────────
  useEffect(() => {
    const loadAll = async () => {
      try {
        setDbStatus('loading');

        const [
          workersRes, clientsRes, jobsRes, tasksRes,
          vehiclesRes, assignmentsRes, fuelRes, notesRes,
          medicalRes, holidaysRes, coursesRes, settingsRes
        ] = await Promise.all([
          supabase.from('workers').select('data'),
          supabase.from('clients').select('data'),
          supabase.from('jobs').select('data'),
          supabase.from('standard_tasks').select('data'),
          supabase.from('vehicles').select('data'),
          supabase.from('vehicle_assignments').select('data'),
          supabase.from('fuel_records').select('data'),
          supabase.from('daily_notes').select('data'),
          supabase.from('medical_courses').select('data'),
          supabase.from('custom_holidays').select('data'),
          supabase.from('courses').select('data'),
          supabase.from('app_settings').select('key, value'),
        ]);

        // Comprobar errores críticos
        if (workersRes.error || clientsRes.error || jobsRes.error) {
          console.error('Error cargando datos:', workersRes.error || clientsRes.error || jobsRes.error);
          setDbStatus('error');
          return;
        }

        // Extraer notificaciones de settings
        const notifSetting = settingsRes.data?.find((s: any) => s.key === 'notifications');
        const notifications = notifSetting?.value || {};

        setPlanning({
          ...EMPTY_STATE,
          workers:            extractRows<Worker>(workersRes.data),
          clients:            extractRows<Client>(clientsRes.data),
          jobs:               extractRows<Job>(jobsRes.data),
          standardTasks:      extractRows<StandardTask>(tasksRes.data),
          vehicles:           extractRows<Vehicle>(vehiclesRes.data),
          vehicleAssignments: extractRows<VehicleAssignment>(assignmentsRes.data),
          fuelRecords:        extractRows<FuelRecord>(fuelRes.data),
          dailyNotes:         extractRows<DailyNote>(notesRes.data),
          medicalCourses:     extractMedicalCourses(medicalRes.data),
          customHolidays:     extractRows<Holiday>(holidaysRes.data),
          courses:            extractRows<Course>(coursesRes.data),
          notifications,
          currentDate: new Date().toISOString().split('T')[0],
        });

        setDbStatus('connected');
        isLoaded.current = true;
      } catch (e) {
        console.error('Error de conexión con Supabase:', e);
        setDbStatus('error');
        isLoaded.current = true;
      }
    };

    loadAll();
  }, []);

  // ─── Polling automático para sincronización ───────────────────────────────
  useEffect(() => {
    const interval = setInterval(async () => {
      if (dbStatus === 'connected') {
        try {
          const [workersRes, clientsRes, jobsRes] = await Promise.all([
            supabase.from('workers').select('data'),
            supabase.from('clients').select('data'),
            supabase.from('jobs').select('data'),
          ]);

          if (!workersRes.error && !clientsRes.error && !jobsRes.error) {
            setPlanning(prev => ({
              ...prev,
              workers: extractRows<Worker>(workersRes.data),
              clients: extractRows<Client>(clientsRes.data),
              jobs: extractRows<Job>(jobsRes.data),
            }));
          }
        } catch (error) {
          console.log('Error en polling automático:', error);
        }
      }
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [dbStatus]);

  // ─── Realtime: suscripción por tabla ──────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('app-sync-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workers' }, (payload) => {
        setPlanning((prev) => ({
          ...prev,
          workers: applyChange<Worker>(prev.workers, payload),
        }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, (payload) => {
        setPlanning((prev) => ({
          ...prev,
          clients: applyChange<Client>(prev.clients, payload),
        }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, (payload) => {
        setPlanning((prev) => ({
          ...prev,
          jobs: applyChange<Job>(prev.jobs, payload),
        }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'standard_tasks' }, (payload) => {
        setPlanning((prev) => ({
          ...prev,
          standardTasks: applyChange<StandardTask>(prev.standardTasks, payload),
        }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, (payload) => {
        setPlanning((prev) => ({
          ...prev,
          vehicles: applyChange<Vehicle>(prev.vehicles, payload),
        }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicle_assignments' }, (payload) => {
        setPlanning((prev) => ({
          ...prev,
          vehicleAssignments: applyChange<VehicleAssignment>(prev.vehicleAssignments, payload),
        }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fuel_records' }, (payload) => {
        setPlanning((prev) => ({
          ...prev,
          fuelRecords: applyChange<FuelRecord>(prev.fuelRecords, payload),
        }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_notes' }, (payload) => {
        setPlanning((prev) => ({
          ...prev,
          dailyNotes: applyChange<DailyNote>(prev.dailyNotes, payload),
        }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medical_courses' }, (payload) => {
        setPlanning((prev) => ({
          ...prev,
          medicalCourses: applyMedicalChange(prev.medicalCourses, payload),
        }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, (payload) => {
        setPlanning((prev) => ({
          ...prev,
          courses: applyChange<Course>(prev.courses, payload),
        }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_holidays' }, (payload) => {
        setPlanning((prev) => ({
          ...prev,
          customHolidays: applyHolidayChange(prev.customHolidays, payload),
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ─── Helper genérico de upsert ────────────────────────────────────────
  const upsert = useCallback(async (table: string, id: string, data: any, extraFields?: Record<string, any>) => {
    setIsSaving(true);
    const row: any = { id, data, ...extraFields };
    const { error } = await supabase.from(table).upsert(row);
    setIsSaving(false);
    if (error) {
      console.error(`Error guardando en ${table}:`, error);
      showNotification(`Error al guardar: ${error.message}`, 'error');
      throw error;
    }
  }, [showNotification]);

  const remove = useCallback(async (table: string, id: string) => {
    setIsSaving(true);
    console.log(`🗑️ Intentando eliminar de ${table} con ID: ${id}`);
    // Para medical_courses, usar una eliminación más específica para evitar problemas
    const query = supabase.from(table).delete();
    if (table === 'medical_courses') {
      // Usar match exacto para medical_courses
      query.match({ id: id });
    } else {
      // Usar eq para otras tablas
      query.eq('id', id);
    }
    const { error } = await query;
    setIsSaving(false);
    if (error) {
      console.error(`Error eliminando de ${table}:`, error);
      showNotification(`Error al eliminar: ${error.message}`, 'error');
      throw error;
    }
  }, [showNotification]);

  // ─── Workers ──────────────────────────────────────────────────────────
  const saveWorker = useCallback(async (worker: Worker) => {
    setPlanning((prev) => ({
      ...prev,
      workers: prev.workers.some((w) => w.id === worker.id)
        ? prev.workers.map((w) => (w.id === worker.id ? worker : w))
        : [...prev.workers, worker],
    }));
    await upsert('workers', worker.id, worker);
  }, [upsert]);

  const deleteWorker = useCallback(async (id: string) => {
    setPlanning((prev) => ({ ...prev, workers: prev.workers.filter((w) => w.id !== id) }));
    await remove('workers', id);
  }, [remove]);

  // ─── Clients ──────────────────────────────────────────────────────────
  const saveClient = useCallback(async (client: Client) => {
    setPlanning((prev) => ({
      ...prev,
      clients: prev.clients.some((c) => c.id === client.id)
        ? prev.clients.map((c) => (c.id === client.id ? client : c))
        : [...prev.clients, client],
    }));
    await upsert('clients', client.id, client);
  }, [upsert]);

  const deleteClient = useCallback(async (id: string) => {
    setPlanning((prev) => ({ ...prev, clients: prev.clients.filter((c) => c.id !== id) }));
    await remove('clients', id);
  }, [remove]);

  // ─── Jobs ─────────────────────────────────────────────────────────────
  const saveJob = useCallback(async (job: Job) => {
    setPlanning((prev) => ({
      ...prev,
      jobs: prev.jobs.some((j) => j.id === job.id)
        ? prev.jobs.map((j) => (j.id === job.id ? job : j))
        : [...prev.jobs, job],
    }));
    await upsert('jobs', job.id, job, { date: job.date });
  }, [upsert]);

  const deleteJob = useCallback(async (id: string) => {
    setPlanning((prev) => ({ ...prev, jobs: prev.jobs.filter((j) => j.id !== id) }));
    await remove('jobs', id);
  }, [remove]);

  // ─── Standard Tasks ───────────────────────────────────────────────────
  const saveStandardTask = useCallback(async (task: StandardTask) => {
    setPlanning((prev) => ({
      ...prev,
      standardTasks: prev.standardTasks.some((t) => t.id === task.id)
        ? prev.standardTasks.map((t) => (t.id === task.id ? task : t))
        : [...prev.standardTasks, task],
    }));
    await upsert('standard_tasks', task.id, task);
  }, [upsert]);

  const deleteStandardTask = useCallback(async (id: string) => {
    setPlanning((prev) => ({ ...prev, standardTasks: prev.standardTasks.filter((t) => t.id !== id) }));
    await remove('standard_tasks', id);
  }, [remove]);

  // ─── Vehicles ─────────────────────────────────────────────────────────
  const saveVehicle = useCallback(async (vehicle: Vehicle) => {
    setPlanning((prev) => ({
      ...prev,
      vehicles: prev.vehicles.some((v) => v.id === vehicle.id)
        ? prev.vehicles.map((v) => (v.id === vehicle.id ? vehicle : v))
        : [...prev.vehicles, vehicle],
    }));
    await upsert('vehicles', vehicle.id, vehicle);
  }, [upsert]);

  const deleteVehicle = useCallback(async (id: string) => {
    setPlanning((prev) => ({ ...prev, vehicles: prev.vehicles.filter((v) => v.id !== id) }));
    await remove('vehicles', id);
  }, [remove]);

  // ─── Vehicle Assignments ──────────────────────────────────────────────
  const saveVehicleAssignment = useCallback(async (assignment: VehicleAssignment) => {
    setPlanning((prev) => ({
      ...prev,
      vehicleAssignments: prev.vehicleAssignments.some((a) => a.id === assignment.id)
        ? prev.vehicleAssignments.map((a) => (a.id === assignment.id ? assignment : a))
        : [...prev.vehicleAssignments, assignment],
    }));
    await upsert('vehicle_assignments', assignment.id, assignment);
  }, [upsert]);

  const deleteVehicleAssignment = useCallback(async (id: string) => {
    setPlanning((prev) => ({ ...prev, vehicleAssignments: prev.vehicleAssignments.filter((a) => a.id !== id) }));
    await remove('vehicle_assignments', id);
  }, [remove]);

  // ─── Fuel Records ─────────────────────────────────────────────────────
  const saveFuelRecord = useCallback(async (record: FuelRecord) => {
    setPlanning((prev) => ({
      ...prev,
      fuelRecords: prev.fuelRecords.some((r) => r.id === record.id)
        ? prev.fuelRecords.map((r) => (r.id === record.id ? record : r))
        : [...prev.fuelRecords, record],
    }));
    await upsert('fuel_records', record.id, record);
  }, [upsert]);

  const deleteFuelRecord = useCallback(async (id: string) => {
    setPlanning((prev) => ({ ...prev, fuelRecords: prev.fuelRecords.filter((r) => r.id !== id) }));
    await remove('fuel_records', id);
  }, [remove]);

  // ─── Daily Notes ──────────────────────────────────────────────────────
  const saveDailyNote = useCallback(async (note: DailyNote) => {
    setPlanning((prev) => ({
      ...prev,
      dailyNotes: prev.dailyNotes.some((n) => n.id === note.id)
        ? prev.dailyNotes.map((n) => (n.id === note.id ? note : n))
        : [...prev.dailyNotes, note],
    }));
    await upsert('daily_notes', note.id, note);
  }, [upsert]);

  const deleteDailyNote = useCallback(async (id: string) => {
    setPlanning((prev) => ({ ...prev, dailyNotes: prev.dailyNotes.filter((n) => n.id !== id) }));
    await remove('daily_notes', id);
  }, [remove]);

  // ─── Medical Courses ──────────────────────────────────────────────────
  const saveMedicalCourse = useCallback(async (course: MedicalCourse) => {
    setPlanning((prev) => ({
      ...prev,
      medicalCourses: prev.medicalCourses.some((c) => c.id === course.id)
        ? prev.medicalCourses.map((c) => (c.id === course.id ? course : c))
        : [...prev.medicalCourses, course],
    }));
    await upsert('medical_courses', course.id, course);
  }, [upsert]);

  const deleteMedicalCourse = useCallback(async (id: string) => {
    setPlanning((prev) => ({ ...prev, medicalCourses: prev.medicalCourses.filter((c) => c.id !== id) }));
    await remove('medical_courses', id);
  }, [remove]);

  // ─── Courses (general) ────────────────────────────────────────────────
  const saveCourse = useCallback(async (course: Course) => {
    setPlanning((prev) => ({
      ...prev,
      courses: prev.courses.some((c) => c.id === course.id)
        ? prev.courses.map((c) => (c.id === course.id ? course : c))
        : [...prev.courses, course],
    }));
    await upsert('courses', course.id, course);
  }, [upsert]);

  const deleteCourse = useCallback(async (id: string) => {
    setPlanning((prev) => ({ ...prev, courses: prev.courses.filter((c) => c.id !== id) }));
    await remove('courses', id);
  }, [remove]);

  // ─── Custom Holidays ──────────────────────────────────────────────────
  const saveHoliday = useCallback(async (holiday: Holiday) => {
    setPlanning((prev) => ({
      ...prev,
      customHolidays: prev.customHolidays.some((h) => h.date === holiday.date)
        ? prev.customHolidays.map((h) => (h.date === holiday.date ? holiday : h))
        : [...prev.customHolidays, holiday],
    }));
    await upsert('custom_holidays', holiday.date, holiday);
  }, [upsert]);

  const deleteHoliday = useCallback(async (date: string) => {
    setPlanning((prev) => ({ ...prev, customHolidays: prev.customHolidays.filter((h) => h.date !== date) }));
    const { error } = await supabase.from('custom_holidays').delete().eq('id', date);
    if (error) showNotification(`Error al eliminar festivo: ${error.message}`, 'error');
  }, [showNotification]);

  // ─── App Settings (notifications, etc.) ──────────────────────────────
  const saveAppSettings = useCallback(async (key: string, value: any) => {
    const { error } = await supabase.from('app_settings').upsert({ key, value });
    if (error) {
      console.error('Error guardando ajustes:', error);
      showNotification(`Error al guardar ajustes: ${error.message}`, 'error');
    }
  }, [showNotification]);

  return {
    planning,
    setPlanning,
    dbStatus,
    isSaving,
    saveWorker, deleteWorker,
    saveClient, deleteClient,
    saveJob, deleteJob,
    saveStandardTask, deleteStandardTask,
    saveVehicle, deleteVehicle,
    saveVehicleAssignment, deleteVehicleAssignment,
    saveFuelRecord, deleteFuelRecord,
    saveDailyNote, deleteDailyNote,
    saveMedicalCourse, deleteMedicalCourse,
    saveCourse, deleteCourse,
    saveHoliday, deleteHoliday,
    saveAppSettings,
    showNotification,
    notification,
  };
}

// ─── Helper Realtime: aplica INSERT / UPDATE / DELETE al array local ──────
function applyChange<T extends { id: string }>(arr: T[], payload: any): T[] {
  const { eventType, new: newRow, old: oldRow } = payload;
  
  if (eventType === 'DELETE') {
    return arr.filter((item) => item.id !== oldRow.id);
  }
  
  const updated = newRow.data as T;
  
  if (eventType === 'INSERT') {
    // Evitar duplicados si ya lo añadimos optimísticamente
    return arr.some((item) => item.id === updated.id)
      ? arr.map((item) => (item.id === updated.id ? updated : item))
      : [...arr, updated];
  }
  
  // UPDATE
  return arr.map((item) => (item.id === updated.id ? updated : item));
}

// ─── Helper específico para medical_courses (preserva ID en realtime) ───────
function applyMedicalChange(arr: (MedicalCourse & { id: string })[], payload: any): (MedicalCourse & { id: string })[] {
  const { eventType, new: newRow, old: oldRow } = payload;
  
  if (eventType === 'DELETE') {
    return arr.filter((item) => item.id !== oldRow.id);
  }
  
  // Para medical_courses, preservar el ID del registro principal
  const updated = { ...newRow.data, id: newRow.id } as MedicalCourse & { id: string };
  
  if (eventType === 'INSERT') {
    // Evitar duplicados si ya lo añadimos optimísticamente
    return arr.some((item) => item.id === updated.id)
      ? arr.map((item) => (item.id === updated.id ? updated : item))
      : [...arr, updated];
  }
  
  // UPDATE
  return arr.map((item) => (item.id === updated.id ? updated : item));
}

// ─── Helper especializado para Holiday (usa date como id) ─────────────────
function applyHolidayChange(arr: Holiday[], payload: any): Holiday[] {
  const { eventType, new: newRow, old: oldRow } = payload;
  
  if (eventType === 'DELETE') {
    return arr.filter((item) => item.date !== oldRow.id);
  }
  
  const updated = newRow.data as Holiday;
  
  if (eventType === 'INSERT') {
    // Evitar duplicados si ya lo añadimos optimísticamente
    return arr.some((item) => item.date === updated.date)
      ? arr.map((item) => (item.date === updated.date ? updated : item))
      : [...arr, updated];
  }
  
  // UPDATE
  return arr.map((item) => (item.date === updated.date ? updated : item));
}
