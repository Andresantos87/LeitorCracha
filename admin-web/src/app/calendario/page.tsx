"use client";

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Users, Coffee } from 'lucide-react';
import { getShiftStatusForDate, ShiftName, ShiftStatus } from '@/lib/shiftPredictor';

const SHIFTS: ShiftName[] = ['A', 'B', 'C', 'D', 'E'];

export default function CalendarioPage() {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Navegação de meses
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const today = () => setCurrentDate(new Date());

  // Construir o grid do calendário
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  // Gerar dias
  const calendarDays = useMemo(() => {
    const days = [];
    // Espaços vazios no início
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    // Dias do mês
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
      
      const shiftsWorking: Record<string, string> = { '0': '', '8': '', '16': '' };
      const shiftsFolga: string[] = [];
      
      SHIFTS.forEach(shift => {
        const status = getShiftStatusForDate(shift, date);
        if (status === 'F') {
          shiftsFolga.push(shift);
        } else {
          shiftsWorking[status] = shift;
        }
      });

      days.push({
        day: i,
        date,
        shiftsWorking,
        shiftsFolga,
        isToday: new Date().toDateString() === date.toDateString()
      });
    }
    return days;
  }, [currentDate, daysInMonth, firstDayOfMonth]);

  return (
    <div className="p-6 max-w-7xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <CalendarIcon className="h-8 w-8 text-indigo-500" />
            Calendário de Turnos
          </h2>
          <p className="text-slate-400 mt-2">
            Visão geral da escala 6x2 (Turnos A, B, C, D, E) ao longo do mês.
          </p>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl p-1 shadow-lg">
          <button onClick={prevMonth} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={today} className="px-4 py-2 text-sm font-bold text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </button>
          <button onClick={nextMonth} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-xl overflow-hidden">
        {/* Header da semana */}
        <div className="grid grid-cols-7 bg-slate-950 border-b border-slate-800">
          {weekDays.map(day => (
            <div key={day} className="py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Grid de Dias */}
        <div className="grid grid-cols-7 gap-px bg-slate-800">
          {calendarDays.map((dayData, idx) => (
            <div 
              key={idx} 
              className={`min-h-[140px] p-2 transition-colors ${dayData ? 'bg-slate-900 hover:bg-slate-800/80' : 'bg-slate-900/40'} ${dayData?.isToday ? 'ring-2 ring-inset ring-indigo-500 bg-indigo-950/20' : ''}`}
            >
              {dayData && (
                <div className="h-full flex flex-col">
                  <div className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mb-2 ${dayData.isToday ? 'bg-indigo-600 text-white shadow-[0_0_10px_rgba(79,70,229,0.5)]' : 'text-slate-300'}`}>
                    {dayData.day}
                  </div>
                  
                  <div className="flex-1 space-y-1.5">
                    {/* Turno 00:00 */}
                    <div className="flex items-center gap-1.5 text-xs bg-slate-950/50 rounded px-1.5 py-1 border border-slate-800/50">
                      <Clock className="w-3 h-3 text-blue-400" />
                      <span className="text-slate-400">00h:</span>
                      <strong className="text-blue-300">Turno {dayData.shiftsWorking['0']}</strong>
                    </div>
                    {/* Turno 08:00 */}
                    <div className="flex items-center gap-1.5 text-xs bg-slate-950/50 rounded px-1.5 py-1 border border-slate-800/50">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      <span className="text-slate-400">08h:</span>
                      <strong className="text-emerald-300">Turno {dayData.shiftsWorking['8']}</strong>
                    </div>
                    {/* Turno 16:00 */}
                    <div className="flex items-center gap-1.5 text-xs bg-slate-950/50 rounded px-1.5 py-1 border border-slate-800/50">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span className="text-slate-400">16h:</span>
                      <strong className="text-amber-300">Turno {dayData.shiftsWorking['16']}</strong>
                    </div>
                  </div>

                  {/* Folgas */}
                  <div className="mt-2 pt-2 border-t border-slate-800/50 flex flex-wrap gap-1">
                    <span className="text-[10px] text-slate-500 uppercase flex items-center gap-1 w-full mb-0.5">
                      <Coffee className="w-3 h-3" /> Folgas:
                    </span>
                    {dayData.shiftsFolga.map(f => (
                      <span key={f} className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded-md border border-slate-700 font-bold">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Legenda */}
      <div className="mt-6 flex flex-wrap items-center gap-6 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg text-sm text-slate-300">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400" />
          <span>00:00 às 08:00</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span>08:00 às 16:00</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <span>16:00 às 00:00</span>
        </div>
        <div className="flex items-center gap-2 border-l border-slate-700 pl-6">
          <Coffee className="w-4 h-4 text-slate-500" />
          <span>Folga</span>
        </div>
      </div>
    </div>
  );
}
