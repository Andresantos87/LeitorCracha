import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, deleteDoc, updateDoc, serverTimestamp, increment, collection, getDocs, query, orderBy } from 'firebase/firestore';

import fs from 'fs';
import path from 'path';

// Carrega os usuários na API (fazemos caching dinâmico igual na busca)
let cachedUsers: Record<string, any> | null = null;
function loadUsers() {
  if (cachedUsers) return cachedUsers;
  try {
    const jsonPath = path.join(process.cwd(), 'colaboradores.json');
    if (fs.existsSync(jsonPath)) {
      cachedUsers = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      return cachedUsers;
    }
  } catch(e) {}
  return {};
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const treinamentoId = searchParams.get('treinamentoId');

    if (!treinamentoId) {
      return NextResponse.json({ success: false, error: 'treinamentoId é obrigatório' }, { status: 400 });
    }

    const presencasRef = collection(db, 'treinamentos', treinamentoId, 'presencas');
    const snapshot = await getDocs(presencasRef);

    const usersDict = loadUsers() || {};

    const presencas = snapshot.docs.map(doc => {
      const p = doc.data();
      let user = usersDict[p.identificador_lido];
      if (!user) {
        const raw = String(p.identificador_lido || '').replace(/\D/g, '');
        const mioloA = raw.length >= 10 ? raw.substring(2, raw.length - 2).replace(/^0+/, '') : '';
        const mioloB = raw.length >= 4 ? raw.substring(2).replace(/^0+/, '') : '';
        const usersArray = Object.values(usersDict);
        // Prioridade 1: Match exato por cod_cracha ou identificador
        user = usersArray.find((u: any) => {
          const cracha = String(u.cod_cracha || '').replace(/\D/g, '').replace(/^0+/, '');
          const uid = String(u.identificador || '').replace(/[.\-/\s]/g, '').replace(/^0+/, '').toLowerCase();
          if (cracha && (cracha === raw || cracha === raw.replace(/^0+/, ''))) return true;
          if (uid && uid === raw) return true;
          return false;
        });

        // Prioridade 2: Fuzzy match por matrícula
        if (!user) {
          user = usersArray.find((u: any) => {
            const mat = String(u.matricula || '').replace(/\D/g, '').replace(/^0+/, '');
            if (mat && mat.length >= 4 && (mat === mioloA || mat === mioloB)) return true;
            return false;
          }) || {};
        }
      }
      
      return {
        id: doc.id,
        ...p,
        nome: p.nome || user.nome || 'Desconhecido',
        planta: p.planta || p.empresa || user.planta || user.empresa || 'Desconhecida',
        empresa: p.empresa || p.planta || user.empresa || user.planta || 'Desconhecida',
        cargo: p.cargo || user.cargo || 'Não Informado',
        data_registro: p.data_registro?.toDate()?.toISOString() || new Date().toISOString()
      };
    });

    presencas.sort((a, b) => {
      const timeA = new Date(a.data_registro).getTime() || 0;
      const timeB = new Date(b.data_registro).getTime() || 0;
      return timeB - timeA;
    });

    return NextResponse.json({ success: true, data: presencas });
  } catch (error: any) {
    console.error("ERRO GET PRESENCAS:", error);
    return NextResponse.json({ success: false, error: 'Erro ao buscar presenças.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { treinamentoId, identificador, modo_registro = 'MANUAL', assinaturaBase64 = null, nome = null, planta = null, empresa = null } = await req.json();

    if (!treinamentoId || !identificador) {
      return NextResponse.json({ success: false, error: 'ID do treinamento e identificador são obrigatórios' }, { status: 400 });
    }

    // Limpar identificador (extrair RUT se for link chileno, remover barras para evitar erro no Firestore)
    let idLimpo = String(identificador).trim();
    if (idLimpo.includes('RUN=') || idLimpo.includes('rut=')) {
      const match = idLimpo.match(/[?&](?:RUN|rut|RUT)=([0-9a-zA-Z\.\-]+)/i);
      if (match && match[1]) idLimpo = match[1];
    }
    idLimpo = idLimpo.replace(/[\/\\#?]/g, '_').trim();
    if (!idLimpo) idLimpo = `VISITANTE_${Date.now()}`;

    // Busca no arquivo de colaboradores (SAT) primeiro para saber nome, matrícula, empresa e cargo oficiais
    const usersDict = loadUsers() || {};
    let user = usersDict[idLimpo] || usersDict[identificador];
    if (!user) {
      const idClean = String(idLimpo).replace(/[.\-/\s]/g, '').replace(/^0+/, '').toLowerCase();
      for (const [key, u] of Object.entries(usersDict)) {
        const kClean = key.replace(/[.\-/\s]/g, '').replace(/^0+/, '').toLowerCase();
        const matClean = u.matricula ? String(u.matricula).replace(/[.\-/\s]/g, '').replace(/^0+/, '').toLowerCase() : '';
        const crachaClean = u.cod_cracha ? String(u.cod_cracha).replace(/[.\-/\s]/g, '').replace(/^0+/, '').toLowerCase() : '';
        
        if (kClean === idClean || (matClean && matClean === idClean) || (crachaClean && crachaClean === idClean)) {
          user = u;
          break;
        }
      }
    }

    // Preparar dados preliminares para validação
    const dataToSave: any = {
      identificador_lido: idLimpo,
      modo_registro: modo_registro,
      data_registro: serverTimestamp()
    };
    if (assinaturaBase64) dataToSave.assinaturaBase64 = assinaturaBase64;
    if (nome) dataToSave.nome = nome;
    if (planta || empresa) {
      dataToSave.planta = planta || empresa;
      dataToSave.empresa = planta || empresa;
    }
    if (user) {
      if (!dataToSave.nome && user.nome) dataToSave.nome = user.nome;
      if (!dataToSave.planta && user.planta) dataToSave.planta = user.planta;
      if (!dataToSave.empresa && (user.empresa || user.planta)) dataToSave.empresa = user.empresa || user.planta;
      if (!dataToSave.cargo && user.cargo) dataToSave.cargo = user.cargo;
    }

    const nomeFinal = dataToSave.nome ? String(dataToSave.nome).trim() : '';

    let targetTreinamentoId = treinamentoId;

    if (treinamentoId.startsWith('PASTA_')) {
      const pastaName = treinamentoId.replace('PASTA_', '');
      
      const treinamentosRef = collection(db, 'treinamentos');
      const turmasSnap = await getDocs(treinamentosRef);
      const turmasDaPasta = turmasSnap.docs.filter(d => d.data().nome === pastaName);
      
      if (turmasDaPasta.length === 0) {
        return NextResponse.json({ success: false, error: 'Pasta não encontrada ou sem turmas.' }, { status: 404 });
      }

      const paRef = collection(db, 'publicos_alvo');
      const paSnap = await getDocs(paRef);
      const paDocs = paSnap.docs;

      let matchedTurmaId = null;
      const mat = user?.matricula ? String(user.matricula).trim().toLowerCase() : null;
      const cracha = user?.cod_cracha ? String(user.cod_cracha).trim().toLowerCase() : null;
      const nomeSearch = nomeFinal ? nomeFinal.toLowerCase() : null;
      const idSearch = idLimpo.toLowerCase();

      for (const tDoc of turmasDaPasta) {
        const tData = tDoc.data();
        if (tData.publico_alvo_id) {
          const pDoc = paDocs.find(p => p.id === tData.publico_alvo_id);
          if (pDoc) {
            const pData = pDoc.data();
            const matriculas = pData.matriculas || [];
            const membros = pData.membros || [];
            
            let isMember = false;
            if (mat && matriculas.some((m: string) => String(m).trim().toLowerCase() === mat)) isMember = true;
            if (cracha && matriculas.some((m: string) => String(m).trim().toLowerCase() === cracha)) isMember = true;
            if (matriculas.some((m: string) => String(m).trim().toLowerCase() === idSearch)) isMember = true;
            
            if (!isMember && nomeSearch) {
              isMember = membros.some((m: any) => m.nome && String(m.nome).toLowerCase() === nomeSearch);
            }

            if (isMember) {
              matchedTurmaId = tDoc.id;
              break;
            }
          }
        }
      }

      targetTreinamentoId = matchedTurmaId || turmasDaPasta[0].id;
    }

    // Verifica se já existe na turma (por ID, por Nome ou por Matrícula do SAT)
    const presencasRef = collection(db, 'treinamentos', targetTreinamentoId, 'presencas');
    const allPresencasSnap = await getDocs(presencasRef);

    for (const d of allPresencasSnap.docs) {
      if (d.id === idLimpo) {
        return NextResponse.json({ success: false, error: 'Colaborador já registrado nesta turma.' }, { status: 400 });
      }
      const data = d.data();
      if (data.identificador_lido && data.identificador_lido === idLimpo) {
        return NextResponse.json({ success: false, error: 'Colaborador já registrado nesta turma.' }, { status: 400 });
      }
      if (nomeFinal && data.nome && nomeFinal.toUpperCase() !== 'DESCONHECIDO' && !nomeFinal.toUpperCase().startsWith('VISITANTE')) {
        if (String(data.nome).trim().toUpperCase() === nomeFinal.toUpperCase()) {
          const modoAnterior = data.modo_registro ? ` (Modo anterior: ${data.modo_registro})` : '';
          return NextResponse.json({ 
            success: false, 
            error: `O colaborador ${data.nome} já está registrado nesta turma${modoAnterior}!` 
          }, { status: 400 });
        }
      }
      if (user && user.matricula) {
        const matSat = String(user.matricula).trim();
        if (d.id === matSat || (data.identificador_lido && String(data.identificador_lido).trim() === matSat) || (data.matricula && String(data.matricula).trim() === matSat)) {
          const modoAnterior = data.modo_registro ? ` (Modo anterior: ${data.modo_registro})` : '';
          return NextResponse.json({ 
            success: false, 
            error: `O colaborador ${data.nome || user.nome} já está registrado nesta turma${modoAnterior}!` 
          }, { status: 400 });
        }
      }
    }

    const docRef = doc(db, 'treinamentos', targetTreinamentoId, 'presencas', idLimpo);
    await setDoc(docRef, dataToSave);

    // Increment presencas_count atomically
    try {
      await updateDoc(doc(db, 'treinamentos', targetTreinamentoId), { presencas_count: increment(1) });
    } catch(e) { console.warn('Nao foi possivel incrementar presencas_count:', e); }

    return NextResponse.json({ 
      success: true, 
      message: 'Presenca registrada com sucesso.', 
      nome: dataToSave.nome || idLimpo, 
      identificador: idLimpo,
      empresa: dataToSave.empresa || dataToSave.planta || (user ? user.empresa || user.planta : 'Nao Informada'),
      cargo: dataToSave.cargo || (user ? user.cargo : 'Nao Informado')
    });
  } catch (error: any) {
    console.error("ERRO PRESENCA MANUAL:", error);
    return NextResponse.json({ success: false, error: error?.message || 'Erro ao salvar presenca manual.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const treinamentoId = searchParams.get('treinamentoId');
    const presencaId = searchParams.get('presencaId');

    if (!treinamentoId || !presencaId) {
      return NextResponse.json({ success: false, error: 'treinamentoId e presencaId sao obrigatorios' }, { status: 400 });
    }

    const docRef = doc(db, 'treinamentos', treinamentoId, 'presencas', presencaId);
    await deleteDoc(docRef);

    // Decrement presencas_count atomically
    try {
      await updateDoc(doc(db, 'treinamentos', treinamentoId), { presencas_count: increment(-1) });
    } catch(e) { console.warn('Nao foi possivel decrementar presencas_count:', e); }

    return NextResponse.json({ success: true, message: 'Presenca removida com sucesso.' });
  } catch (error: any) {
    console.error("ERRO DELETE PRESENCA:", error);
    return NextResponse.json({ success: false, error: 'Erro ao remover presenca.' }, { status: 500 });
  }
}
