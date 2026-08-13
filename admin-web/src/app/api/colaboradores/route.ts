import { NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function cleanString(val: any) {
  if (!val || typeof val !== 'string') return "";
  return val.trim().toUpperCase().replace(/^[\d\s\-\._\/]+/, '').trim();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const busca = searchParams.get('busca')?.toLowerCase() || "";
    const empresasFilter = searchParams.getAll('empresa');
    const plantasFilter = searchParams.getAll('planta');
    const cargosFilter = searchParams.getAll('cargo');
    const gestoresFilter = searchParams.getAll('gestor');
    const page = parseInt(searchParams.get('page') || "1");
    const limit = parseInt(searchParams.get('limit') || "50");

    // Lendo o JSON local
    const filePath = path.join(process.cwd(), 'colaboradores.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContents);

    const mergedColabs = new Map();

    // 1. DEDUPLICAÇÃO E MESCLAGEM INTELIGENTE
    for (const key in data) {
      const colab = data[key];
      let matriculaLimpa = colab.matricula ? String(colab.matricula).replace(/^0+/, '') : null;
      let uid = matriculaLimpa || colab.cod_cracha || key;

      if (!mergedColabs.has(uid)) {
        mergedColabs.set(uid, { ...colab, _id: uid });
      } else {
        const existing = mergedColabs.get(uid);
        const mergeField = (f: string) => {
          const v1 = existing[f];
          const v2 = colab[f];
          const isInvalid = (v: any) => !v || String(v).toUpperCase() === 'NÃO INFORMADO' || String(v).toUpperCase() === 'NAO INFORMADO' || v === '-';
          if (isInvalid(v1)) return v2;
          if (f === 'planta' || f === 'empresa') {
             if (String(v1).toUpperCase() === 'CMPC CENTRALIZADA' && !isInvalid(v2) && String(v2).toUpperCase() !== 'CMPC CENTRALIZADA') return v2;
          }
          return v1;
        };

        mergedColabs.set(uid, {
          ...existing,
          cargo: mergeField('cargo'),
          planta: mergeField('planta'),
          empresa: mergeField('empresa'),
          gestor: mergeField('gestor'),
          superior_imediato: mergeField('superior_imediato'),
          cod_cracha: existing.cod_cracha || colab.cod_cracha
        });
      }
    }

    let resultados = [];

    // 2. APLICAR FILTROS NA BASE LIMPA E MESCLADA
    for (const colab of mergedColabs.values()) {
      const empClean = cleanString(colab.empresa);
      const plaClean = cleanString(colab.planta);
      const cargoClean = cleanString(colab.cargo);
      const gestorClean = cleanString(colab.gestor || colab.superior_imediato);

      // Filtros
      if (empresasFilter.length > 0 && !empresasFilter.includes(empClean)) continue;
      if (plantasFilter.length > 0 && !plantasFilter.includes(plaClean)) continue;
      if (cargosFilter.length > 0 && !cargosFilter.includes(cargoClean)) continue;
      if (gestoresFilter.length > 0 && !gestoresFilter.includes(gestorClean)) continue;
      
      if (busca) {
        const nomeMatch = colab.nome?.toLowerCase().includes(busca);
        const matMatch = colab.matricula?.includes(busca);
        if (!nomeMatch && !matMatch) continue;
      }

      resultados.push(colab);
    }

    // Paginação
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedResult = resultados.slice(startIndex, endIndex);

    return NextResponse.json({ 
      success: true, 
      total: resultados.length,
      data: paginatedResult 
    });

  } catch (error: any) {
    console.error("ERRO ROTA COLABORADORES:", error);
    return NextResponse.json({ success: false, error: "Erro ao buscar colaboradores." }, { status: 500 });
  }
}
