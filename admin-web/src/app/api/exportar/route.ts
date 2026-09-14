import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, orderBy } from "firebase/firestore";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const curso = searchParams.get("curso");

    if (!id && !curso) {
      return NextResponse.json({ error: "ID ou Curso não fornecido" }, { status: 400 });
    }

    let treinamentosMap: Record<string, any> = {};
    const cabecalho = "NOME_TREINAMENTO,TURMA,ID_TREINAMENTO,IDENTIFICADOR_LIDO,NOME_COLABORADOR,EMPRESA_PLANTA,MODO_LEITURA,ASSINATURA_REGISTRADA,DATA_HORA,FACILITADOR,PAPEL_ROL\n";
    let linhas = [];

    if (id) {
      const docRef = doc(db, "treinamentos", id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return NextResponse.json({ error: "Treinamento não encontrado" }, { status: 404 });
      treinamentosMap[id] = docSnap.data();
    } else if (curso) {
      const treinSnap = await getDocs(collection(db, "treinamentos"));
      treinSnap.docs.forEach(d => {
        if (d.data().nome === curso) treinamentosMap[d.id] = d.data();
      });
      if (Object.keys(treinamentosMap).length === 0) return NextResponse.json({ error: "Nenhuma turma encontrada para este curso" }, { status: 404 });
    }

    for (const tId of Object.keys(treinamentosMap)) {
      const treinamento = treinamentosMap[tId];
      const presencasRef = collection(db, "treinamentos", tId, "presencas");
      const q = query(presencasRef, orderBy("data_registro", "asc"));
      const presencasSnap = await getDocs(q);

      const tLinhas = presencasSnap.docs.map(p => {
        const pData = p.data();
        const dataFormatada = pData.data_registro?.toDate()?.toISOString() || new Date().toISOString();
        const nomeColab = pData.nome || "Desconhecido";
        const empresaColab = pData.planta || pData.empresa || "Não informado";
        const assinado = pData.assinaturaBase64 || pData.assinatura ? "SIM (Assinado)" : "NÃO";
        const facilitador = pData.facilitador_nome || treinamento.facilitador_nome || "Nenhum";
        const papel = pData.rol || "GERAL";
        const turma = treinamento.turma || "GERAL";
        return `"${treinamento.nome}","${turma}","${tId}","${pData.identificador_lido}","${nomeColab}","${empresaColab}","${pData.modo_registro}","${assinado}","${dataFormatada}","${facilitador}","${papel}"`;
      });
      linhas.push(...tLinhas);
    }

    const csvStr = cabecalho + linhas.join("\n");
    // Prefix BOM to force Excel to read UTF-8 properly!
    const utf8BOM = "\uFEFF";

    const response = new NextResponse(utf8BOM + csvStr);
    const filenameName = curso ? curso : treinamentosMap[Object.keys(treinamentosMap)[0]].nome;
    response.headers.set("Content-Type", "text/csv; charset=utf-8");
    response.headers.set("Content-Disposition", `attachment; filename="export_treinamento_${filenameName.replace(/\s+/g, '_')}.csv"`);
    
    return response;
  } catch (error: any) {
    console.error("Erro Exportar:", error);
    return NextResponse.json({ error: "Erro ao gerar CSV" }, { status: 500 });
  }
}
