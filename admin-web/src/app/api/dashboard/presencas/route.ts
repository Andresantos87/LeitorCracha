import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collectionGroup, getDocs } from "firebase/firestore";
import fs from "fs";
import path from "path";

export const dynamic = 'force-dynamic';

// Cache em memória e disco para altíssima performance e blindagem contra estouro de cota
let cachedPresencas: any[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60000; // 60 segundos de cache em memória
const DISK_CACHE_PATH = path.join(process.cwd(), 'dashboard_presencas_cache.json');

// Mapas indexados O(1) para busca instantânea de colaboradores
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

  let match = byCracha.get(rawClean) || byCracha.get(rawDigits) || byMatricula.get(rawClean) || byMatricula.get(rawNoDV);
  if (match) return match;

  if (id.startsWith('31') && id.length >= 10) {
    const strip31 = id.substring(2).replace(/^0+/, '');
    match = byMatricula.get(strip31) || byCracha.get(strip31);
    if (match) return match;
  }

  if (rawDigits.length === 9) {
    const stripDV = rawDigits.substring(0, 8);
    match = byMatricula.get(stripDV) || byCracha.get(stripDV);
    if (match) return match;
  }

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

  const mioloA = rawDigits.length >= 10 ? rawDigits.substring(2, rawDigits.length - 2).replace(/^0+/, '') : '';
  const mioloB = rawDigits.length >= 4 ? rawDigits.substring(2).replace(/^0+/, '') : '';
  if (mioloA) match = byCracha.get(mioloA) || byMatricula.get(mioloA);
  if (!match && mioloB) match = byCracha.get(mioloB) || byMatricula.get(mioloB);

  return match || null;
}

export async function GET(req: Request) {
  try {
    const now = Date.now();
    const url = new URL(req.url);
    const force = url.searchParams.get('force') === 'true';

    // 1. Retorno instantâneo do Cache em Memória (< 5ms)
    if (!force && cachedPresencas && cachedPresencas.length > 0 && (now - lastCacheTime < CACHE_TTL_MS)) {
      return NextResponse.json({ success: true, data: cachedPresencas, cached: true });
    }

    // 2. Se temos cache completo em disco e não foi forçado, carrega direto (< 10ms)
    if (!force && fs.existsSync(DISK_CACHE_PATH)) {
      try {
        const diskData = JSON.parse(fs.readFileSync(DISK_CACHE_PATH, 'utf8'));
        if (Array.isArray(diskData) && diskData.length > 0) {
          cachedPresencas = diskData;
          lastCacheTime = now;
          return NextResponse.json({ success: true, data: diskData, cached: true });
        }
      } catch(e) {}
    }

    const fetchWithTimeout = (promise: Promise<any>, timeoutMs: number) => {
      return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout Firebase")), timeoutMs))
      ]);
    };

    let presencasSnapshot: any = null;
    try {
      presencasSnapshot = await fetchWithTimeout(getDocs(collectionGroup(db, "presencas")), 2500);
      if (!presencasSnapshot || presencasSnapshot.docs.length === 0) {
        if (fs.existsSync(DISK_CACHE_PATH)) {
          const diskData = JSON.parse(fs.readFileSync(DISK_CACHE_PATH, 'utf8'));
          cachedPresencas = diskData;
          lastCacheTime = now;
          return NextResponse.json({ success: true, data: diskData, fallback: true });
        }
      }
    } catch (dbErr: any) {
      console.warn("Aviso Firebase ao buscar presenças do dashboard:", dbErr.message);
      if (fs.existsSync(DISK_CACHE_PATH)) {
        try {
          const diskData = JSON.parse(fs.readFileSync(DISK_CACHE_PATH, 'utf8'));
          cachedPresencas = diskData;
          lastCacheTime = now;
          return NextResponse.json({ success: true, data: diskData, fallback: true });
        } catch(e) {}
      }
      throw dbErr;
    }

    const data = presencasSnapshot.docs.map((doc: any) => {
      const p = doc.data();
      const treinamentoId = doc.ref.parent.parent?.id;
      
      let dateIso = null;
      if (p.data_registro?.toDate) {
        dateIso = p.data_registro.toDate().toISOString();
      } else if (p.data_registro?.seconds) {
        dateIso = new Date(p.data_registro.seconds * 1000).toISOString();
      } else if (p.timestamp?.toDate) {
        dateIso = p.timestamp.toDate().toISOString();
      } else if (p.timestamp?.seconds) {
        dateIso = new Date(p.timestamp.seconds * 1000).toISOString();
      } else if (p.created_at?.toDate) {
        dateIso = p.created_at.toDate().toISOString();
      } else if (p.created_at?.seconds) {
        dateIso = new Date(p.created_at.seconds * 1000).toISOString();
      } else if (typeof p.data_registro === 'string' && p.data_registro.trim()) {
        dateIso = new Date(p.data_registro).toISOString();
      } else {
        dateIso = new Date().toISOString();
      }

      const user = findUser(p.identificador_lido || doc.id) || {};

      return {
        id: doc.id,
        treinamentoId,
        dataRaw: dateIso,
        nome: p.nome && p.nome !== 'Desconhecido' ? p.nome : (user.nome || 'Desconhecido'),
        empresa: p.empresa && p.empresa !== 'Desconhecida' ? p.empresa : (user.empresa || user.planta || 'Desconhecida'),
        cargo: p.cargo && p.cargo !== 'Não Informado' ? p.cargo : (user.cargo || 'Não Informado'),
        identificador_lido: p.identificador_lido || user.matricula || user.cod_cracha || 'N/A'
      };
    });


    if (data.length > 0) {
      cachedPresencas = data;
      lastCacheTime = now;
      try {
        fs.writeFileSync(DISK_CACHE_PATH, JSON.stringify(data), 'utf8');
      } catch(e) {}
    } else if (fs.existsSync(DISK_CACHE_PATH)) {
      const diskData = JSON.parse(fs.readFileSync(DISK_CACHE_PATH, 'utf8'));
      cachedPresencas = diskData;
      lastCacheTime = now;
      return NextResponse.json({ success: true, data: diskData, fallback: true });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Erro ao buscar presenças do dashboard:", error);
    if (fs.existsSync(DISK_CACHE_PATH)) {
      try {
        const diskData = JSON.parse(fs.readFileSync(DISK_CACHE_PATH, 'utf8'));
        return NextResponse.json({ success: true, data: diskData, fallback: true });
      } catch(e) {}
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
