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
        result.publicos.push({ turma: data.nome, docId: doc.id, detalhe: md, matriculas: data.matriculas });
      });
    } else if (data.matriculas) {
      data.matriculas.forEach((m: any) => {
        result.publicos.push({ turma: data.nome, docId: doc.id, detalhe: { matricula: m }, matriculas: data.matriculas });
      });
    }
  });

  const treinSnap = await getDocs(collection(db, 'treinamentos'));
  for (const tDoc of treinSnap.docs) {
    const pSnap = await getDocs(collection(db, `treinamentos/${tDoc.id}/presencas`));
    pSnap.forEach(pDoc => {
      const pData = pDoc.data();
      result.presencas.push({ treinamento: tDoc.data().nome, turma: tDoc.data().turma, pData, idTreinamento: tDoc.id, pId: pDoc.id });
    });
  }
  
  return NextResponse.json(result);
}
