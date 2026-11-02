export interface WorkerInfo {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  dni: string;
  phone: string;
  contractType: string;
}

export interface DayEntry {
  day: number;
  date: string;
  weekday: string;
  value: string;
  display: string;
  color: string;
  isWeekend: boolean;
}

export interface MonthTotals {
  totalHours: number;
  totalFaltas: number;
  totalBajaMedica: number;
  totalReposo: number;
  totalVacaciones: number;
  totalPermisos?: number;
}

export type VacationRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface VacationRequest {
  id: string;
  workerId: string;
  workerName: string;
  startDate: string;
  endDate: string;
  days: number;
  status: VacationRequestStatus;
  note: string | null;
  adminNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface AdvanceInfo {
  amount: number;
  paid: boolean;
}

export interface FuelRecord {
  id: string;
  date: string;
  liters: number | null;
  cost: number;
}

export interface FuelSummary {
  success: boolean;
  worker: WorkerInfo;
  records: FuelRecord[];
  totals: {
    count: number;
    liters: number;
    cost: number;
  };
}

export interface VacationSummary {
  success: boolean;
  worker: WorkerInfo;
  month: string;
  monthName: string;
  year: number;
  totalDays: number;
  carryOver: number;
  annualTotal: number;
  taken: number;
  remaining: number;
  vacationDays: string[];
}

export interface WorkerSummary {
  success: boolean;
  worker: WorkerInfo;
  month: string;
  monthName: string;
  days: DayEntry[];
  totals: MonthTotals;
  accumulated: number;
  total: number;
  isSettled: boolean;
  advance: AdvanceInfo;
  lastSettledMonth: string | null;
  settledUntil?: number | null;
  pendingDays?: number[];
  pendingHours?: number;
  carryIn?: number;
  carryFromMonth?: string | null;
  nextMonthName?: string;
}
