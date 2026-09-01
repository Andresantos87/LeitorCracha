import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, setDoc, deleteDoc, query } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const treinamentosSnap = await getDocs(collection(db, 'treinamentos'));
    const docs = treinamentosSnap.docs;
    
    const publicosSnap = await getDocs(collection(db, 'publicos_alvo'));
    const publicosMap: Record<string, any> = {};
    publicosSnap.docs.forEach(d => {
      publicosMap[d.id] = d.data();
    });

    // Smart Routing Logic: Distribute presences from General to Specific Turmas
    // 1. Group by Course name
    const porCurso: Record<string, any[]> = {};
    docs.forEach(d => {
      const data = d.data();
      if (!data.nome) return;
      if (!porCurso[data.nome]) porCurso[data.nome] = [];
      porCurso[data.nome].push({ id: d.id, ...data });
    });

    // 2. Look for General Turmas and distribute
    for (const cursoNome of Object.keys(porCurso)) {
      const turmasDoCurso = porCurso[cursoNome];
      const turmasGerais = turmasDoCurso.filter(t => {
        const nomeTurma = (t.turma || '').toLowerCase();
        return nomeTurma.includes('geral') || nomeTurma.includes('todas as') || nomeTurma.includes('macro');
      });
      const turmasEspecificas = turmasDoCurso.filter(t => !turmasGerais.includes(t) && t.publico_alvo_id);

      for (const turmaGeral of turmasGerais) {
        const presencasGeralSnap = await getDocs(collection(db, 'treinamentos', turmaGeral.id, 'presencas'));
        
        for (const pDoc of presencasGeralSnap.docs) {
          const pData = pDoc.data();
          const idLido = String(pData.identificador_lido || '').replace(/\D/g, '').replace(/^0+/, '');
          
          // Try to find a specific turma that expects this person
          let turmaDestino = null;
          for (const tEsp of turmasEspecificas) {
            const publico = publicosMap[tEsp.publico_alvo_id];
            if (!publico || !publico.matriculas) continue;
            
            // fuzzy match in matriculas array
            const isExpected = publico.matriculas.some((m: string) => {
              const mat = String(m || '').replace(/\D/g, '').replace(/^0+/, '');
              return mat === idLido || idLido.includes(mat) || mat.includes(idLido);
            });
            
            if (isExpected) {
              turmaDestino = tEsp;
              break; // Found the target class!
            }
          }
          
          if (turmaDestino) {
            // Move presence!
            await setDoc(doc(db, 'treinamentos', turmaDestino.id, 'presencas', pDoc.id), pData);
            await deleteDoc(doc(db, 'treinamentos', turmaGeral.id, 'presencas', pDoc.id));
            console.log('Moveu presenca ' + idLido + ' da ' + turmaGeral.turma + ' para ' + turmaDestino.turma);
          }
        }
      }
    }

    // Now update all presencas_count normally
    const results: { id: string; nome: string; count: number }[] = [];
    const batchSize = 5;
    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = docs.slice(i, i + batchSize);
      await Promise.all(batch.map(async (d) => {
        try {
          const presencasSnap = await getDocs(collection(db, 'treinamentos', d.id, 'presencas'));
          const count = presencasSnap.size;
          await updateDoc(doc(db, 'treinamentos', d.id), { presencas_count: count });
          results.push({ id: d.id, nome: d.data().nome || d.id, count });
        } catch (e: any) {}
      }));
    }
    return NextResponse.json({ success: true, message: 'Sincronizado e Roteado com sucesso.', data: results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

