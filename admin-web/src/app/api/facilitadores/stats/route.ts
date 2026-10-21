import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, collectionGroup, getDocs } from "firebase/firestore";

export const dynamic = 'force-dynamic';

import fs from "fs";
import path from "path";

let cachedRanking: any[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60000;

function calculateRankingFromLocal(): any[] {
  try {
    const statsMap: Record<string, { total_capacitados: number, turmas_concluidas: number }> = {};
    const presencasPath = path.join(process.cwd(), 'all_firestore_presencas.json');
    
    if (fs.existsSync(presencasPath)) {
      const presencas = JSON.parse(fs.readFileSync(presencasPath, 'utf8'));
      const turmasVistasPorFac = new Map<string, Set<string>>();

      for (const p of presencas) {
        const facilitador = p.facilitador_nome || (p.instrutor && p.instrutor !== 'Admin Local' ? p.instrutor : null);
        if (facilitador) {
          if (!statsMap[facilitador]) {
            statsMap[facilitador] = { total_capacitados: 0, turmas_concluidas: 0 };
            turmasVistasPorFac.set(facilitador, new Set());
          }
          statsMap[facilitador].total_capacitados += 1;
          if (p.treinamentoId) {
            turmasVistasPorFac.get(facilitador)?.add(p.treinamentoId);
          }
        }
      }

      turmasVistasPorFac.forEach((turmas, fac) => {
        if (statsMap[fac]) {
          statsMap[fac].turmas_concluidas = turmas.size;
        }
      });
    }

    return Object.keys(statsMap).map(nome => ({
      nome,
      total_capacitados: statsMap[nome].total_capacitados,
      turmas_concluidas: statsMap[nome].turmas_concluidas
    })).sort((a, b) => b.turmas_concluidas - a.turmas_concluidas);
  } catch(e) {
    return [];
  }
}

export async function GET() {
  const now = Date.now();
  if (cachedRanking && (now - lastCacheTime < CACHE_TTL_MS)) {
    return NextResponse.json({ success: true, ranking: cachedRanking });
  }

  try {
    const fetchWithTimeout = (promise: Promise<any>, timeoutMs: number) => {
      return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout Firebase")), timeoutMs))
      ]);
    };

    const statsMap: Record<string, { total_capacitados: number, turmas_concluidas: number }> = {};

    // Tenta Firestore com timeout estrito de 2s para não travar
    const treinamentosSnap: any = await fetchWithTimeout(getDocs(collection(db, "treinamentos")), 2000);
    if (treinamentosSnap && treinamentosSnap.docs) {
      treinamentosSnap.docs.forEach((docSnap: any) => {
        const t = docSnap.data();
        if (t.status_agenda === 'CONCLUIDO' && t.facilitador_nome) {
          if (!statsMap[t.facilitador_nome]) statsMap[t.facilitador_nome] = { total_capacitados: 0, turmas_concluidas: 0 };
          statsMap[t.facilitador_nome].turmas_concluidas += 1;
          statsMap[t.facilitador_nome].total_capacitados += (t._count?.registros || t.presencas_count || 0);
        }
      });
    }

    const ranking = Object.keys(statsMap).map(nome => ({
      nome,
      total_capacitados: statsMap[nome].total_capacitados,
      turmas_concluidas: statsMap[nome].turmas_concluidas
    })).sort((a, b) => b.turmas_concluidas - a.turmas_concluidas);

    if (ranking.length > 0) {
      cachedRanking = ranking;
      lastCacheTime = now;
      return NextResponse.json({ success: true, ranking });
    }
  } catch (error: any) {
    // Silently fallback to fast calculation
  }

  const localRanking = calculateRankingFromLocal();
  cachedRanking = localRanking;
  lastCacheTime = now;
  return NextResponse.json({ success: true, ranking: localRanking });
}

