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
}

export interface AdvanceInfo {
  amount: number;
  paid: boolean;
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
}
