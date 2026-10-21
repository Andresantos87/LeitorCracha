import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, deleteDoc, updateDoc, serverTimestamp, increment, collection, getDocs, query, orderBy } from 'firebase/firestore';

import fs from 'fs';
import path from 'path';

// Carrega os usuários na API com Mapas indexados O(1) para altíssima performance
let cachedUsers: Record<string, any> | null = null;
let cachedByCracha = new Map<string, any>();
let cachedByMatricula = new Map<string, any>();

function loadUsers() {
  if (cachedUsers) return { usersDict: cachedUsers, byCracha: cachedByCracha, byMatricula: cachedByMatricula };
  try {
    const jsonPath = path.join(process.cwd(), 'colaboradores.json');
    if (fs.existsSync(jsonPath)) {
      cachedUsers = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      cachedByCracha.clear();
      cachedByMatricula.clear();
      for (const [k, u] of Object.entries(cachedUsers as Record<string, any>)) {
        if (u.cod_cracha) {
          const cClean = String(u.cod_cracha).replace(/\D/g, '').replace(/^0+/, '');
          if (cClean) cachedByCracha.set(cClean, u);
        }
        if (u.matricula) {
          const mClean = String(u.matricula).replace(/\D/g, '').replace(/^0+/, '');
          if (mClean) cachedByMatricula.set(mClean, u);
        }
      }
      return { usersDict: cachedUsers, byCracha: cachedByCracha, byMatricula: cachedByMatricula };
    }
  } catch(e) {}
  return { usersDict: {}, byCracha: new Map(), byMatricula: new Map() };
}

function findUser(id: string): any {
  if (!id) return null;
  const { usersDict, byCracha, byMatricula } = loadUsers();
  if (usersDict[id]) return usersDict[id];

  const rawClean = String(id).replace(/[.\-/\s]/g, '').replace(/^0+/, '').toLowerCase();
  const rawDigits = String(id).replace(/\D/g, '');
  const rawNoDV = String(id).includes('-') 
    ? String(id).split('-')[0].replace(/[.\-/\s]/g, '').replace(/^0+/, '').toLowerCase() 
    : rawClean;

  // 1. Mapas instantâneos
  let match = byCracha.get(rawClean) || byCracha.get(rawDigits) || byMatricula.get(rawClean) || byMatricula.get(rawNoDV);
  if (match) return match;

  // 2. Prefixo 31 (crachás RF de Guaíba / Brasil, ex: 310098818869 -> matricula 098818869)
  if (id.startsWith('31') && id.length >= 10) {
    const strip31 = id.substring(2).replace(/^0+/, '');
    match = byMatricula.get(strip31) || byCracha.get(strip31);
    if (match) return match;
  }

  // 3. RUT chileno sem hífen com DV no final (ex: 127699380 -> 12769938)
  if (rawDigits.length === 9) {
    const stripDV = rawDigits.substring(0, 8);
    match = byMatricula.get(stripDV) || byCracha.get(stripDV);
    if (match) return match;
  }

  // 4. String contendo matrícula e nome (ex: "98817141 Ianes Dadalt Mascarelo")
  const leadingNumMatch = String(id).match(/^(\d{6,10})\s+(.+)$/);
  if (leadingNumMatch) {
    const numClean = leadingNumMatch[1].replace(/^0+/, '');
    match = byMatricula.get(numClean) || byCracha.get(numClean);
    if (match) return match;
    return {
      nome: leadingNumMatch[2].trim(),
      matricula: leadingNumMatch[1],
      empresa: 'CMPC',
      cargo: 'Não Informado',
      planta: 'Guaíba'
    };
  }

  // 5. Credencial Rainbow App / QR Dinâmico
  if (id.startsWith('RNBW')) {
    return {
      nome: 'Credencial Digital Rainbow',
      empresa: 'Terceiro Guaíba',
      cargo: 'Prestador de Serviços',
      planta: 'Guaíba'
    };
  }
  if (id.startsWith('http')) {
    return {
      nome: 'Registro via QR Dinâmico',
      empresa: 'Auto-Registro',
      cargo: 'Participante',
      planta: 'Guaíba'
    };
  }

  // 6. Miolos de crachá de 10 ou 4 dígitos
  const mioloA = rawDigits.length >= 10 ? rawDigits.substring(2, rawDigits.length - 2).replace(/^0+/, '') : '';
  const mioloB = rawDigits.length >= 4 ? rawDigits.substring(2).replace(/^0+/, '') : '';
  if (mioloA) match = byCracha.get(mioloA) || byMatricula.get(mioloA);
  if (!match && mioloB) match = byCracha.get(mioloB) || byMatricula.get(mioloB);

  return match || null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const treinamentoId = searchParams.get('treinamentoId');

    if (!treinamentoId) {
      return NextResponse.json({ success: false, error: 'treinamentoId é obrigatório' }, { status: 400 });
    }

    const fetchWithTimeout = (promise: Promise<any>, timeoutMs: number) => {
      return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout Firebase")), timeoutMs))
      ]);
    };

    let presencas: any[] = [];
    let fetchedFromFirestore = false;

    try {
      const presencasRef = collection(db, 'treinamentos', treinamentoId, 'presencas');
      const snapshot: any = await fetchWithTimeout(getDocs(presencasRef), 2500);

      if (snapshot && snapshot.docs && snapshot.docs.length > 0) {
        fetchedFromFirestore = true;
        presencas = snapshot.docs.map((doc: any) => {
          const p = doc.data();
          const user = findUser(p.identificador_lido || doc.id) || {};
          return {
            id: doc.id,
            ...p,
            nome: p.nome || user.nome || 'Desconhecido',
            planta: p.planta || p.empresa || user.planta || user.empresa || 'Desconhecida',
            empresa: p.empresa || p.planta || user.empresa || user.planta || 'Desconhecida',
            cargo: p.cargo || user.cargo || 'Não Informado',
            data_registro: p.data_registro?.toDate?.()?.toISOString() || (typeof p.data_registro === 'string' ? p.data_registro : new Date().toISOString())
          };
        });
      }
    } catch (fsErr: any) {
      console.warn("Aviso ao buscar presenças do Firestore:", fsErr.message);
    }

    // Se o Firestore falhou ou veio vazio, busca no backup local all_firestore_presencas.json
    if (!fetchedFromFirestore || presencas.length === 0) {
      try {
        const backupPath = path.join(process.cwd(), 'all_firestore_presencas.json');
        if (fs.existsSync(backupPath)) {
          const allBackup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
          const filtered = allBackup.filter((p: any) => p.treinamentoId === treinamentoId);
          if (filtered.length > 0) {
            presencas = filtered.map((p: any) => {
              const user = findUser(p.identificador_lido || p.id) || {};
              let dataIso = new Date().toISOString();
              if (p.data_registro) {
                if (typeof p.data_registro === 'string') dataIso = p.data_registro;
                else if (p.data_registro.seconds) dataIso = new Date(p.data_registro.seconds * 1000).toISOString();
                else if (p.data_registro._seconds) dataIso = new Date(p.data_registro._seconds * 1000).toISOString();
              }
              return {
                id: p.id || p.identificador_lido,
                ...p,
                nome: p.nome && p.nome !== 'Desconhecido' ? p.nome : (user.nome || 'Desconhecido'),
                planta: p.planta || p.empresa || user.planta || user.empresa || 'Desconhecida',
                empresa: p.empresa || p.planta || user.empresa || user.planta || 'Desconhecida',
                cargo: p.cargo || user.cargo || 'Não Informado',
                data_registro: dataIso
              };
            });
          }
        }
      } catch (backupErr) {}
    }

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

    // Busca com resolvedor inteligente O(1)
    const user = findUser(idLimpo) || findUser(identificador) || {};

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
    if (user.nome && !dataToSave.nome) dataToSave.nome = user.nome;
    if (user.planta && !dataToSave.planta) dataToSave.planta = user.planta;
    if ((user.empresa || user.planta) && !dataToSave.empresa) dataToSave.empresa = user.empresa || user.planta;
    if (user.cargo && !dataToSave.cargo) dataToSave.cargo = user.cargo;


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
