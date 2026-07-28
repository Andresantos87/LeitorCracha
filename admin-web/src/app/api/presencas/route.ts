import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, query, orderBy } from 'firebase/firestore';

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
        user = Object.values(usersDict).find((u: any) => {
          const mat = String(u.matricula || '').replace(/\D/g, '').replace(/^0+/, '');
          const uid = String(u.identificador || '').replace(/[.\-/\s]/g, '').replace(/^0+/, '').toLowerCase();
          return (mat && mat.length >= 4 && (mat === mioloA || mat === mioloB || (raw.length >= 10 && mat.length >= 6 && raw.includes(mat)))) ||
                 (uid && uid === raw);
        }) || {};
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
        if (kClean === idClean || (matClean && matClean === idClean)) {
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

    // Verifica se já existe na turma (por ID, por Nome ou por Matrícula do SAT)
    const presencasRef = collection(db, 'treinamentos', treinamentoId, 'presencas');
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

    // Referência para presencas/{idLimpo} e salvamento
    const docRef = doc(db, 'treinamentos', treinamentoId, 'presencas', idLimpo);
    await setDoc(docRef, dataToSave);

    return NextResponse.json({ 
      success: true, 
      message: 'Presença registrada com sucesso.', 
      nome: dataToSave.nome || idLimpo, 
      identificador: idLimpo,
      empresa: dataToSave.empresa || dataToSave.planta || (user ? user.empresa || user.planta : 'Não Informada'),
      cargo: dataToSave.cargo || (user ? user.cargo : 'Não Informado')
    });
  } catch (error: any) {
    console.error("ERRO PRESENCA MANUAL:", error);
    return NextResponse.json({ success: false, error: error?.message || 'Erro ao salvar presença manual.' }, { status: 500 });
  }
}
