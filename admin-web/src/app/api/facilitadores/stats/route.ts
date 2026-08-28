import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, collectionGroup, getDocs } from "firebase/firestore";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const statsMap: Record<string, { total_capacitados: number, turmas_concluidas: number }> = {};

    // 1. Contar Presenças
    const presencasSnap = await getDocs(collectionGroup(db, "presencas"));
    presencasSnap.forEach(docSnap => {
      const p = docSnap.data();
      const facilitador = p.facilitador_nome;
      if (facilitador) {
        if (!statsMap[facilitador]) statsMap[facilitador] = { total_capacitados: 0, turmas_concluidas: 0 };
        statsMap[facilitador].total_capacitados += 1;
      }
    });

    // 2. Contar Turmas Concluídas
    const treinamentosSnap = await getDocs(collection(db, "treinamentos"));
    treinamentosSnap.forEach(docSnap => {
      const t = docSnap.data();
      if (t.status_agenda === 'CONCLUIDO' && t.facilitador_nome) {
        if (!statsMap[t.facilitador_nome]) statsMap[t.facilitador_nome] = { total_capacitados: 0, turmas_concluidas: 0 };
        statsMap[t.facilitador_nome].turmas_concluidas += 1;
      }
    });

    // Converte para array ordenado
    const ranking = Object.keys(statsMap).map(nome => ({
      nome,
      total_capacitados: statsMap[nome].total_capacitados,
      turmas_concluidas: statsMap[nome].turmas_concluidas
    })).sort((a, b) => b.turmas_concluidas - a.turmas_concluidas); // Ordena primariamente por turmas

    return NextResponse.json({ success: true, ranking });
  } catch (error: any) {
    console.error("ERRO FACILITADORES STATS:", error);
    return NextResponse.json({ success: false, error: "Erro ao gerar ranking." }, { status: 500 });
  }
}
