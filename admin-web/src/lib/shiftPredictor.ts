export type ShiftName = 'A' | 'B' | 'C' | 'D' | 'E';
export type ShiftStatus = '16' | '8' | '0' | 'F';

const MASTER_CYCLE: ShiftStatus[] = ['16', '16', 'F', 'F', 'F', 'F', '0', '0', '8', '8'];

const ANCHOR_DATE = new Date('2026-08-27T00:00:00-03:00'); // Fuso horário do Brasil

// Índices iniciais de cada turno em relação à âncora 27/08/2026
const SHIFT_START_INDEX: Record<ShiftName, number> = {
  'A': 0, // Está no primeiro '16'
  'B': 8, // Está no primeiro '8'
  'C': 6, // Está no primeiro '0'
  'D': 4, // Está no terceiro 'F'
  'E': 2  // Está no primeiro 'F'
};

function getDaysDifference(date1: Date, date2: Date): number {
  // Zera horas para contar dias inteiros independentes de DST ou fuso
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  const diffTime = d1.getTime() - d2.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function getShiftStatusForDate(shift: ShiftName, date: Date): ShiftStatus {
  const diffDays = getDaysDifference(date, ANCHOR_DATE);
  
  // Tratamento para números negativos em módulo (JavaScript % mantêm sinal)
  const startIndex = SHIFT_START_INDEX[shift];
  let cycleIndex = (startIndex + diffDays) % 10;
  if (cycleIndex < 0) {
    cycleIndex += 10;
  }
  
  return MASTER_CYCLE[cycleIndex];
}

export function getRequiredShiftForTime(timeStr: string): ShiftStatus | null {
  if (!timeStr) return null;
  const [h] = timeStr.split(':').map(Number);
  if (h >= 8 && h < 16) return '8';
  if (h >= 16 && h < 24) return '16';
  if (h >= 0 && h < 8) return '0';
  return null;
}

export function getNextAvailableDate(shift: ShiftName, startDate: Date, targetTime?: string): Date {
  let testDate = new Date(startDate.getTime());
  testDate.setDate(testDate.getDate() + 1);
  
  const requiredShift = targetTime ? getRequiredShiftForTime(targetTime) : null;
  
  for (let i = 0; i < 20; i++) {
    const status = getShiftStatusForDate(shift, testDate);
    if (status !== 'F') {
      if (requiredShift) {
        if (status === requiredShift) return new Date(testDate.getTime());
      } else {
        return new Date(testDate.getTime());
      }
    }
    testDate.setDate(testDate.getDate() + 1);
  }
  
  return testDate;
}
export function validateShiftSchedule(turma: string, dateStr: string, timeStr: string): { valid: boolean, message?: string, suggestion?: string } {
  if (!turma || !dateStr) return { valid: true };
  
  const match = turma.match(/Turno\s+([A-E])/i);
  if (!match) return { valid: true };
  
  const shift = match[1].toUpperCase() as ShiftName;
  const date = new Date(dateStr + 'T00:00:00-03:00');
  const status = getShiftStatusForDate(shift, date);
  
  if (!timeStr) {
    if (status === 'F') {
      const nextDate = getNextAvailableDate(shift, date);
      return { 
        valid: false, 
        message: `O Turno ${shift} está de folga no dia ${dateStr}.`,
        suggestion: nextDate.toISOString().split('T')[0]
      };
    }
    return { valid: true };
  }
  
  const required = getRequiredShiftForTime(timeStr);
  if (required && status !== required) {
    const nextDate = getNextAvailableDate(shift, date, timeStr);
    return {
      valid: false,
      message: `O Turno ${shift} não trabalha no horário ${timeStr} no dia ${dateStr}. Status deles neste dia: ${status === 'F' ? 'Folga' : status + 'h'}.`,
      suggestion: nextDate.toISOString().split('T')[0]
    };
  }
  
  return { valid: true };
}
