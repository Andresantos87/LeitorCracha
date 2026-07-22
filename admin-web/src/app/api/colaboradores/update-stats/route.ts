import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const stats = await req.json();

    if (!stats || typeof stats.total !== 'number') {
      return NextResponse.json({ success: false, error: 'Estatísticas inválidas' }, { status: 400 });
    }

    const statsRef = doc(db, 'sistema', 'estatisticas');
    await setDoc(statsRef, stats);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("ERRO ATUALIZAR STATS:", error);
    return NextResponse.json({ success: false, error: 'Erro ao atualizar estatísticas' }, { status: 500 });
  }
}
