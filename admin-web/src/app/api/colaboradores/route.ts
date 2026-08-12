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
    const empresa = searchParams.get('empresa');
    const planta = searchParams.get('planta');
    const cargo = searchParams.get('cargo');
    const gestor = searchParams.get('gestor');
    const page = parseInt(searchParams.get('page') || "1");
    const limit = parseInt(searchParams.get('limit') || "50");

    // Lendo o JSON local
    const filePath = path.join(process.cwd(), 'colaboradores.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContents);

    let resultados = [];

    // O JSON é um dicionário onde a chave é o identificador e o valor é o objeto
    for (const key in data) {
      const colab = data[key];
      
      const empClean = cleanString(colab.empresa);
      const plaClean = cleanString(colab.planta);
      const cargoClean = cleanString(colab.cargo);
      const gestorClean = cleanString(colab.gestor || colab.superior_imediato);

      // Filtros
      if (empresa && empClean !== empresa) continue;
      if (planta && plaClean !== planta) continue;
      if (cargo && cargoClean !== cargo) continue;
      if (gestor && gestorClean !== gestor) continue;
      
      if (busca) {
        const nomeMatch = colab.nome?.toLowerCase().includes(busca);
        const matMatch = colab.matricula?.includes(busca);
        if (!nomeMatch && !matMatch) continue;
      }

      // Adicionamos um identificador único para uso no frontend (matrícula preferencialmente)
      // Removemos eventuais zeros à esquerda da matrícula para deduplicar corretamente
      let matriculaLimpa = colab.matricula ? String(colab.matricula).replace(/^0+/, '') : null;
      let uid = matriculaLimpa || colab.cod_cracha || key;
      
      resultados.push({ ...colab, _id: uid });
    }

    // Remover duplicados baseados em _id (pois algumas chaves no JSON podem referenciar a mesma pessoa)
    const uniqueResultados = Array.from(new Map(resultados.map(item => [item._id, item])).values());

    // Paginação
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedResult = uniqueResultados.slice(startIndex, endIndex);

    return NextResponse.json({ 
      success: true, 
      total: uniqueResultados.length,
      data: paginatedResult 
    });

  } catch (error: any) {
    console.error("ERRO ROTA COLABORADORES:", error);
    return NextResponse.json({ success: false, error: "Erro ao buscar colaboradores." }, { status: 500 });
  }
}
