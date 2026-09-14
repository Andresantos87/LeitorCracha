import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, setDoc, deleteDoc, query } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const nomeCursoTarget = body.nomeCurso;

    // Load colaboradores to resolve missing matriculas/crachas
    let colaboradoresMap: Record<string, any> = {};
    try {
      const jsonPath = path.join(process.cwd(), 'colaboradores.json');
      if (fs.existsSync(jsonPath)) {
        const fileData = fs.readFileSync(jsonPath, 'utf-8');
        colaboradoresMap = JSON.parse(fileData);
      }
    } catch (e) {
      console.error('Erro ao ler colaboradores.json', e);
    }

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
      const nome = data.nome || 'Sem Nome';
      if (nomeCursoTarget && nome !== nomeCursoTarget) return; // Ignore other courses if a specific one was requested
      if (!porCurso[nome]) porCurso[nome] = [];
      porCurso[nome].push({ id: d.id, ...data });
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
          
          // Pre-clean all possible IDs from the presence
          const rawIdLido = String(pData.identificador_lido || '');
          const idLidoClean = rawIdLido.replace(/[.\-/\s]/g, '').replace(/^0+/, '').toLowerCase();
          const idLidoNoDV = rawIdLido.includes('-') ? rawIdLido.split('-')[0].replace(/[.\-/\s]/g, '').replace(/^0+/, '').toLowerCase() : idLidoClean;
          
          // Fallback missing matricula / cod_cracha by doing a fast lookup in colaboradoresMap using rawIdLido
          const colab = colaboradoresMap[rawIdLido] || Object.values(colaboradoresMap).find(c => c.matricula === rawIdLido || c.cod_cracha === rawIdLido);
          
          const rawMat = String(pData.matricula || colab?.matricula || '');
          const pMatClean = rawMat.replace(/[.\-/\s]/g, '').replace(/^0+/, '').toLowerCase();
          
          const rawCracha = String(pData.cod_cracha || colab?.cod_cracha || '');
          const pCrachaClean = rawCracha.replace(/[.\-/\s]/g, '').replace(/^0+/, '').toLowerCase();
          
          // Try to find ALL specific turmas that expect this person
          let turmasDestino = turmasEspecificas.filter(t => {
            const publico = publicosMap[t.publico_alvo_id];
            if (!publico || !Array.isArray(publico.matriculas)) return false;

            return publico.matriculas.some((m: string) => {
              const rawM = String(m || '');
              const mClean = rawM.replace(/[.\-/\s]/g, '').replace(/^0+/, '').toLowerCase();
              const mNoDV = rawM.includes('-') ? rawM.split('-')[0].replace(/[.\-/\s]/g, '').replace(/^0+/, '').toLowerCase() : mClean;
              
              if (!mClean) return false;

              // Check against identificador_lido
              if (mClean === idLidoClean || mClean === idLidoNoDV || mNoDV === idLidoClean || mNoDV === idLidoNoDV) return true;
              
              // Check against pData.matricula
              if (pMatClean && (mClean === pMatClean || mNoDV === pMatClean)) return true;
              
              // Check against pData.cod_cracha
              if (pCrachaClean && (mClean === pCrachaClean || mNoDV === pCrachaClean)) return true;
              
              // Fallback to substring matching if they are at least somewhat substantial
              if (mClean.length > 3 && idLidoClean.length > 3) {
                return mClean.includes(idLidoClean) || idLidoClean.includes(mClean);
              }
              if (pMatClean && mClean.length > 3 && pMatClean.length > 3) {
                return mClean.includes(pMatClean) || pMatClean.includes(mClean);
              }
              return false;
            });
          });

          if (turmasDestino.length > 0) {
            // Copy presence to ALL matching turmas!
            for (const tDestino of turmasDestino) {
              await setDoc(doc(db, 'treinamentos', tDestino.id, 'presencas', pDoc.id), pData);
              console.log('Copiou presenca ' + rawIdLido + ' da ' + turmaGeral.turma + ' para ' + tDestino.turma);
            }
            // Remove from the general class
            await deleteDoc(doc(db, 'treinamentos', turmaGeral.id, 'presencas', pDoc.id));
            
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
  } catch (error: any) { console.error('SYNC ERROR:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


