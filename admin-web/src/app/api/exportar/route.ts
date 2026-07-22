import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, orderBy } from "firebase/firestore";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID não fornecido" }, { status: 400 });
    }

    const docRef = doc(db, "treinamentos", id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json({ error: "Treinamento não encontrado" }, { status: 404 });
    }
    
    const treinamento = docSnap.data();

    // Buscar as presenças na subcoleção
    const presencasRef = collection(db, "treinamentos", id, "presencas");
    const q = query(presencasRef, orderBy("data_registro", "asc"));
    const presencasSnap = await getDocs(q);

    // Gerar CSV
    const cabecalho = "NOME_TREINAMENTO,ID_TREINAMENTO,IDENTIFICADOR_LIDO,MODO_LEITURA,DATA_HORA\n";
    const linhas = presencasSnap.docs.map(p => {
      const pData = p.data();
      const dataFormatada = pData.data_registro?.toDate()?.toISOString() || new Date().toISOString();
      return `"${treinamento.nome}","${id}","${pData.identificador_lido}","${pData.modo_registro}","${dataFormatada}"`;
    }).join("\n");

    const csvStr = cabecalho + linhas;

    const response = new NextResponse(csvStr);
    response.headers.set("Content-Type", "text/csv; charset=utf-8");
    response.headers.set("Content-Disposition", `attachment; filename="export_treinamento_${treinamento.nome.replace(/\s+/g, '_')}.csv"`);
    
    return response;
  } catch (error: any) {
    console.error("Erro Exportar:", error);
    return NextResponse.json({ error: "Erro ao gerar CSV" }, { status: 500 });
  }
}
