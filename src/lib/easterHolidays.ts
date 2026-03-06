/**
 * Cálculo de festivos móviles basados en la Pascua
 * Importante para el cálculo de días trabajados en fijos discontinuos
 */

import { Holiday } from './types';

/**
 * Algoritmo de Gauss para calcular la fecha de Pascua
 * Funciona para cualquier año en el calendario Gregoriano
 */
export const calculateEasterDate = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  
  return new Date(year, month - 1, day);
};

/**
 * Formatea fecha a YYYY-MM-DD
 */
const formatDate = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/**
 * Calcula los festivos móviles basados en la Pascua para un año específico
 */
export const calculateEasterHolidays = (year: number): Holiday[] => {
  const easter = calculateEasterDate(year);
  
  // Viernes Santo (2 días antes de Pascua)
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  
  // Lunes de Pascua (1 día después de Pascua)
  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);
  
  return [
    {
      date: formatDate(goodFriday),
      name: 'Viernes Santo',
      isLocal: false
    },
    {
      date: formatDate(easterMonday),
      name: 'Lunes de Pascua',
      isLocal: false
    }
  ];
};

/**
 * Obtiene los festivos móviles para el año actual
 */
export const getCurrentYearEasterHolidays = (): Holiday[] => {
  const currentYear = new Date().getFullYear();
  return calculateEasterHolidays(currentYear);
};

/**
 * Obtiene los festivos móviles para un año específico
 */
export const getEasterHolidaysForYear = (year: number): Holiday[] => {
  return calculateEasterHolidays(year);
};
