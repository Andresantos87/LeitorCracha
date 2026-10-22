import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const nomeCursoTarget = body.nomeCurso;

    // 1. Carrega colaboradores com mapas indexados O(1) para alta performance
    let colaboradoresMap: Record<string, any> = {};
    const byMatricula = new Map<string, any>();
    const byCracha = new Map<string, any>();
    const byCpf = new Map<string, any>();
    const byNome = new Map<string, any>();

    try {
      const jsonPath = path.join(process.cwd(), 'colaboradores.json');
      if (fs.existsSync(jsonPath)) {
        const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        colaboradoresMap = raw.colaboradores || raw;
        for (const [k, u] of Object.entries(colaboradoresMap)) {
          if (u.matricula) byMatricula.set(String(u.matricula).replace(/\D/g, '').replace(/^0+/, ''), u);
          if (u.cod_cracha) byCracha.set(String(u.cod_cracha).replace(/\D/g, '').replace(/^0+/, ''), u);
          if (u.cpf) byCpf.set(String(u.cpf).replace(/\D/g, '').replace(/^0+/, ''), u);
          if (u.nome) byNome.set(u.nome.trim().toUpperCase(), u);
        }
      }
    } catch (e) {
      console.error('Erro ao ler colaboradores.json', e);
    }

    // 2. Carrega públicos-alvo
    const publicosSnap = await getDocs(collection(db, 'publicos_alvo'));
    const publicosMap: Record<string, { nome: string; matriculasSet: Set<string> }> = {};
    publicosSnap.docs.forEach(d => {
      const data = d.data();
      publicosMap[d.id] = {
        nome: data.nome || d.id,
        matriculasSet: new Set((data.matriculas || []).map((m: any) => String(m).replace(/\D/g, '').replace(/^0+/, '')))
      };
    });

    // 3. Carrega treinamentos
    const treinamentosSnap = await getDocs(collection(db, 'treinamentos'));
    const allTreinamentos = treinamentosSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));

    // Agrupa pelo nome do curso
    const porCurso: Record<string, any[]> = {};
    allTreinamentos.forEach(t => {
      const nome = t.nome || 'Sem Nome';
      if (nomeCursoTarget && nome !== nomeCursoTarget) return;
      if (!porCurso[nome]) porCurso[nome] = [];
      porCurso[nome].push(t);
    });

    let totalMoved = 0;
    const cacheUpdates: { id: string; targetTreinamentoId: string; targetTurma: string }[] = [];

    // 4. Executa distribuição inteligente por curso
    for (const cursoNome of Object.keys(porCurso)) {
      const turmasDoCurso = porCurso[cursoNome];
      
      // Identifica a turma geral verdadeira (ex: "TODAS AS TURMAS" ou "GERAL")
      // IMPORTANTE: Não confunde com "MANUTENÇÃO - OFICINA GERAL" ou "TERCEIROS - GERAL"
      const turmasGerais = turmasDoCurso.filter(t => {
        const n = (t.turma || '').toLowerCase().trim();
        return n === 'todas as turmas' || n === 'geral' || n === 'macro' || n.startsWith('todas as turmas');
      });

      // Turma padrão para terceiros daquele curso, se existir
      const turmaTerceirosGeral = turmasDoCurso.find(t => {
        const n = (t.turma || '').toLowerCase().trim();
        return n.includes('terceiro') && !turmasGerais.includes(t);
      });

      // Turmas específicas de destino
      const turmasEspecificas = turmasDoCurso.filter(t => !turmasGerais.includes(t) && t.id !== turmaTerceirosGeral?.id);

      for (const turmaGeral of turmasGerais) {
        const presencasGeralSnap = await getDocs(collection(db, 'treinamentos', turmaGeral.id, 'presencas'));

        for (const pDoc of presencasGeralSnap.docs) {
          const pData = pDoc.data();
          const rawId = String(pData.identificador_lido || pDoc.id || '');
          const digits = rawId.replace(/\D/g, '').replace(/^0+/, '');
          const nomeUpper = (pData.nome || '').trim().toUpperCase();

          // Descobre dados do colaborador
          const u = colaboradoresMap[rawId] || 
                    colaboradoresMap[digits] || 
                    byMatricula.get(digits) || 
                    byCracha.get(digits) || 
                    byCpf.get(digits) || 
                    (nomeUpper ? byNome.get(nomeUpper) : null);

          const mat = u ? String(u.matricula || '').replace(/\D/g, '').replace(/^0+/, '') : digits;
          const cracha = u ? String(u.cod_cracha || '').replace(/\D/g, '').replace(/^0+/, '') : '';
          const cpf = u ? String(u.cpf || '').replace(/\D/g, '').replace(/^0+/, '') : '';
          const empresa = (u?.empresa || pData.empresa || pData.planta || '').trim().toUpperCase();
          const area = (u?.area || pData.cargo || '').trim().toUpperCase();
          const isTerceiro = u?.isTerceiro || empresa.startsWith('504') || empresa.includes('LTDA') || empresa.includes('S A') || empresa.includes('EIRE');

          // 1º Critério: Público-Alvo associado à turma
          let destino = turmasEspecificas.find(t => {
            if (!t.publico_alvo_id || !publicosMap[t.publico_alvo_id]) return false;
            const set = publicosMap[t.publico_alvo_id].matriculasSet;
            return (mat && set.has(mat)) || 
                   (cracha && set.has(cracha)) || 
                   (cpf && set.has(cpf)) || 
                   (digits && set.has(digits));
          });

          // 2º Critério: Nome da Turma (Empresa do Terceiro ou Área de Manutenção/Operação)
          if (!destino) {
            destino = turmasEspecificas.find(t => {
              const nomeTurma = (t.turma || '').trim().toUpperCase();
              if (!nomeTurma) return false;
              if (empresa && empresa.length > 3 && (empresa.includes(nomeTurma) || nomeTurma.includes(empresa))) return true;
              const keywords = ['CALDEIRARIA', 'DEFAPA', 'PREDITIVA', 'AUTOMAÇÃO', 'LUBRIFICAÇÃO', 'SECAGEM', 'CAUSTIFICAÇÃO', 'PLANTA QUÍMICA', 'ÁGUAS', 'ENGENHARIA', 'OFICINA'];
              for (const kw of keywords) {
                if (nomeTurma.includes(kw) && (area.includes(kw) || empresa.includes(kw))) return true;
              }
              return false;
            });
          }

          // 3º Critério: Terceiros sem turma de empresa específica vão para a turma de Terceiros
          if (!destino && isTerceiro && turmaTerceirosGeral) {
            destino = turmaTerceirosGeral;
          }

          // Se encontrou um destino específico diferente da turma geral, move!
          if (destino && destino.id !== turmaGeral.id) {
            // Copia para a turma de destino
            await setDoc(doc(db, 'treinamentos', destino.id, 'presencas', pDoc.id), {
              ...pData,
              turma: destino.turma,
              treinamentoId: destino.id
            });
            // Remove da turma geral
            await deleteDoc(doc(db, 'treinamentos', turmaGeral.id, 'presencas', pDoc.id));

            cacheUpdates.push({
              id: pDoc.id,
              targetTreinamentoId: destino.id,
              targetTurma: destino.turma
            });
            totalMoved++;
          }
        }
      }
    }

    // 5. Atualiza a contagem presencas_count apenas das turmas afetadas
    const turmasAfetadas = nomeCursoTarget 
      ? allTreinamentos.filter(t => t.nome === nomeCursoTarget) 
      : allTreinamentos;

    const countResults: { id: string; nome: string; turma: string; count: number }[] = [];
    await Promise.all(turmasAfetadas.map(async (t) => {
      try {
        const snap = await getDocs(collection(db, 'treinamentos', t.id, 'presencas'));
        const count = snap.size;
        await updateDoc(doc(db, 'treinamentos', t.id), { presencas_count: count });
        countResults.push({ id: t.id, nome: t.nome, turma: t.turma, count });
      } catch (e) {}
    }));

    // 6. Sincroniza caches locais (all_firestore_presencas.json e dashboard_presencas_cache.json)
    if (cacheUpdates.length > 0) {
      try {
        const updateMap = new Map(cacheUpdates.map(u => [u.id, u]));
        const updateCacheFile = (fileName: string) => {
          const p = path.join(process.cwd(), fileName);
          if (fs.existsSync(p)) {
            const list = JSON.parse(fs.readFileSync(p, 'utf8'));
            if (Array.isArray(list)) {
              let modified = false;
              for (let i = 0; i < list.length; i++) {
                const item = list[i];
                const match = updateMap.get(item.id || item.identificador_lido);
                if (match) {
                  list[i] = {
                    ...item,
                    treinamentoId: match.targetTreinamentoId,
                    treinamentoTurma: match.targetTurma
                  };
                  modified = true;
                }
              }
              if (modified) fs.writeFileSync(p, JSON.stringify(list, null, 2), 'utf8');
            }
          }
        };
        updateCacheFile('dashboard_presencas_cache.json');
        updateCacheFile('all_firestore_presencas.json');
      } catch (cacheErr) {
        console.warn('Aviso ao sincronizar caches locais após distribuição:', cacheErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${totalMoved} presenças distribuídas com sucesso!`,
      movedCount: totalMoved,
      data: countResults
    });
  } catch (error: any) {
    console.error('SYNC ERROR:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


