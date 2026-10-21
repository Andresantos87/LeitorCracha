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

export async function GET(req: Request) {
  try {
    const now = Date.now();
    const url = new URL(req.url);
    const force = url.searchParams.get('force') === 'true';

    // 1. Retorno instantâneo do Cache em Memória (< 5ms)
    if (!force && cachedPresencas && cachedPresencas.length > 0 && (now - lastCacheTime < CACHE_TTL_MS)) {
      return NextResponse.json({ success: true, data: cachedPresencas, cached: true });
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
      // Se Firebase retornou 0 docs por causa de cota ou instabilidade, usa o cache do disco!
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
      // Se Firebase falhar (ex: timeout ou cota esgotada), recupera do cache em disco imediatamente
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

    const { usersDict, byCracha, byMatricula } = loadUsers();
    
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
        dateIso = new Date().toISOString(); // fallback
      }

      let user = usersDict[p.identificador_lido];
      if (!user) {
        const raw = String(p.identificador_lido || '').replace(/\D/g, '');
        const rawClean = String(p.identificador_lido || '').replace(/[.\-/\s]/g, '').replace(/^0+/, '').toLowerCase();
        const rawNoDV = String(p.identificador_lido || '').includes('-') ? String(p.identificador_lido || '').split('-')[0].replace(/[.\-/\s]/g, '').replace(/^0+/, '').toLowerCase() : rawClean;

        const mioloA = raw.length >= 10 ? raw.substring(2, raw.length - 2).replace(/^0+/, '') : '';
        const mioloB = raw.length >= 4 ? raw.substring(2).replace(/^0+/, '') : '';

        // Busca O(1) ultrarrápida
        user = byCracha.get(rawClean) || byCracha.get(raw) || byMatricula.get(rawClean) || byMatricula.get(rawNoDV) || byMatricula.get(mioloA) || byMatricula.get(mioloB) || {};
      }

      return {
        id: doc.id,
        treinamentoId,
        dataRaw: dateIso,
        nome: p.nome || user.nome || 'Desconhecido',
        empresa: p.empresa || p.planta || user.empresa || user.planta || 'Desconhecida',
        cargo: p.cargo || user.cargo || 'Nao Informado',
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
    // Última tentativa: se tiver cache em disco, responde com ele mesmo no catch
    if (fs.existsSync(DISK_CACHE_PATH)) {
      try {
        const diskData = JSON.parse(fs.readFileSync(DISK_CACHE_PATH, 'utf8'));
        return NextResponse.json({ success: true, data: diskData, fallback: true });
      } catch(e) {}
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
