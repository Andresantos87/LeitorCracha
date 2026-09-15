import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export async function GET() {
  const result: any = { publicos: [], presencas: [] };
  
  const pubSnap = await getDocs(collection(db, 'publicos_alvo'));
  pubSnap.forEach(doc => {
    const data = doc.data();
    if (data.matriculas_detalhes) {
      data.matriculas_detalhes.forEach((md: any) => {
        if (md.nome && md.nome.toLowerCase().includes('andrea')) {
          result.publicos.push({ turma: data.nome, docId: doc.id, detalhe: md });
        }
      });
    }
  });

  const treinSnap = await getDocs(collection(db, 'treinamentos'));
  for (const tDoc of treinSnap.docs) {
    const pSnap = await getDocs(collection(db, `treinamentos/${tDoc.id}/presencas`));
    pSnap.forEach(pDoc => {
      const pData = pDoc.data();
      if ((pData.nome && pData.nome.toLowerCase().includes('andrea')) || (pData.identificador_lido && String(pData.identificador_lido).toLowerCase().includes('andrea'))) {
        result.presencas.push({ treinamento: tDoc.data().nome, turma: tDoc.data().turma, pData });
      }
    });
  }
  
  return NextResponse.json(result);
}
