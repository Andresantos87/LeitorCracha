import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function GET() {
  try {
    const statsRef = doc(db, 'sistema', 'estatisticas');
    const snapshot = await getDoc(statsRef);
    
    if (!snapshot.exists()) {
      return NextResponse.json({ 
        success: true, 
        data: {
          total: 0,
          porPlanta: {}
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      data: snapshot.data()
    });
  } catch (error: any) {
    console.error("ERRO GET STATS COLABORADORES:", error);
    return NextResponse.json({ success: false, error: 'Erro ao buscar estatísticas.' }, { status: 500 });
  }
}
