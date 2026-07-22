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
    const q = query(presencasRef, orderBy('data_registro', 'desc'));
    const snapshot = await getDocs(q);

    const usersDict = loadUsers() || {};

    const presencas = snapshot.docs.map(doc => {
      const p = doc.data();
      const user = usersDict[p.identificador_lido] || {};
      
      return {
        id: doc.id,
        ...p,
        nome: user.nome || 'Desconhecido',
        planta: user.planta || 'Desconhecida',
        cargo: user.cargo || 'Não Informado',
        data_registro: p.data_registro?.toDate()?.toISOString() || null
      };
    });

    return NextResponse.json({ success: true, data: presencas });
  } catch (error: any) {
    console.error("ERRO GET PRESENCAS:", error);
    return NextResponse.json({ success: false, error: 'Erro ao buscar presenças.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { treinamentoId, identificador, modo_registro = 'MANUAL', assinaturaBase64 = null } = await req.json();

    if (!treinamentoId || !identificador) {
      return NextResponse.json({ success: false, error: 'ID do treinamento e identificador são obrigatórios' }, { status: 400 });
    }

    // Referência para presencas/{identificador}
    const docRef = doc(db, 'treinamentos', treinamentoId, 'presencas', identificador);
    
    // Verifica se já existe
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return NextResponse.json({ success: false, error: 'Colaborador já registrado neste treinamento.' }, { status: 400 });
    }

    // Preparar dados
    const dataToSave: any = {
      identificador_lido: identificador,
      modo_registro: modo_registro,
      data_registro: serverTimestamp()
    };
    
    if (assinaturaBase64) {
      dataToSave.assinaturaBase64 = assinaturaBase64;
    }

    // Salva na subcoleção presencas
    await setDoc(docRef, dataToSave);

    return NextResponse.json({ success: true, message: 'Presença registrada com sucesso.' });
  } catch (error: any) {
    console.error("ERRO PRESENCA MANUAL:", error);
    return NextResponse.json({ success: false, error: 'Erro ao salvar presença manual.' }, { status: 500 });
  }
}
