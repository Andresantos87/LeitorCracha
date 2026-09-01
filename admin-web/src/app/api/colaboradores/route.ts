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
    const areasFilter = searchParams.getAll('area');
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
      let nomeLimpo = colab.nome ? colab.nome.trim().toUpperCase() : null;
      
      // MUDANÇA MASSIVA: Usar o Nome Exato como chave primária de mesclagem.
      // Isso resolve o problema de pessoas com matrículas diferentes entre Rainbow e Mifibra.
      let uid = nomeLimpo || matriculaLimpa || colab.cod_cracha || key;

      if (!mergedColabs.has(uid)) {
        mergedColabs.set(uid, { ...colab, _id: colab.matricula || colab.cod_cracha || key });
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
          cod_cracha: existing.cod_cracha || colab.cod_cracha,
          isTerceiro: existing.isTerceiro === false || colab.isTerceiro === false ? false : true
        });
      }
    }
      
    let colabsArr = Array.from(mergedColabs.values());
    
    // 2. DEDUPLICAÇÃO FINAL POR _id (Previne erro de "two children with the same key" no React)
    const finalDeduplicated = new Map();
    for (const colab of colabsArr) {
      if (!finalDeduplicated.has(colab._id)) {
          finalDeduplicated.set(colab._id, colab);
      } else {
          // Se já existe, tentar preservar os dados mais ricos
          const existing = finalDeduplicated.get(colab._id);
          if (!existing.email && colab.email) existing.email = colab.email;
          if (!existing.cargo && colab.cargo) existing.cargo = colab.cargo;
      }
    }
    
    colabsArr = Array.from(finalDeduplicated.values());

    let resultados = [];

    // 3. APLICAÇÃO DOS FILTROS NA BASE LIMPA E MESCLADA
    for (const colab of colabsArr) {
      const empClean = cleanString(colab.empresa);
      const plaClean = cleanString(colab.planta);
      const cargoClean = cleanString(colab.cargo);
      const gestorClean = cleanString(colab.gestor || colab.superior_imediato);
      const areaClean = cleanString(colab.area);

      // Filtros
      if (empresasFilter.length > 0 && !empresasFilter.includes(empClean)) continue;
      if (plantasFilter.length > 0 && !plantasFilter.includes(plaClean)) continue;
      if (cargosFilter.length > 0 && !cargosFilter.includes(cargoClean)) continue;
      if (areasFilter.length > 0 && !areasFilter.includes(areaClean)) continue;
      
      if (gestoresFilter.length > 0) {
        if (!gestoresFilter.includes(gestorClean)) continue;
        
        // REGRA DE NEGÓCIO: Se filtrar por gestor E não escolher empresa, 
        // exibe SOMENTE funcionários próprios (CMPC/Guaíba/Softys/etc) por padrão.
        if (empresasFilter.length === 0) {
            const isThirdPartyByCompany = /^\d+/.test(empClean) || empClean.includes('MASTER');
            if (colab.isTerceiro || isThirdPartyByCompany) continue;
        }
      }
      
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
