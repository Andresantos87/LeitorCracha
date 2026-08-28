import { NextResponse } from 'next/server';
import { ShiftName, getNextAvailableDate } from '@/lib/shiftPredictor';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const shift = searchParams.get('shift') as ShiftName;
    const startDateStr = searchParams.get('startDate');
    const targetTime = searchParams.get('targetTime');
    const facilitador = searchParams.get('facilitador');
    const excludeId = searchParams.get('excludeId');

    if (!shift || !['A', 'B', 'C', 'D', 'E'].includes(shift)) {
      return NextResponse.json({ success: false, error: 'Turno inválido' }, { status: 400 });
    }

    const startDate = startDateStr ? new Date(startDateStr) : new Date();
    
    // Calcula próximo dia
    const nextDate = getNextAvailableDate(shift, startDate, targetTime || undefined);
    const nextDateString = nextDate.toISOString().split('T')[0];

    let hasConflict = false;
    if (facilitador && facilitador !== 'N/A') {
      const q = query(
        collection(db, "treinamentos"), 
        where("data_agendada", "==", nextDateString),
        where("facilitador_nome", "==", facilitador)
      );
      const snap = await getDocs(q);
      
      const conflicts = snap.docs.filter(d => d.id !== excludeId && d.data().status_agenda !== 'ATRASADO');
      
      if (conflicts.length > 0) {
        hasConflict = true;
      }
    }

    return NextResponse.json({ 
      success: true, 
      date: nextDate.toISOString(),
      conflict: hasConflict
    });

  } catch (error: any) {
    console.error("ERRO PREDICT TURNO:", error);
    return NextResponse.json({ success: false, error: "Erro ao prever turno." }, { status: 500 });
  }
}
