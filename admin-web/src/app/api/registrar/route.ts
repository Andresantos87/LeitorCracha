import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id_treinamento, identificador_lido, modo_registro } = body;

    if (!id_treinamento || !identificador_lido) {
      return NextResponse.json(
        { success: false, error: "Parâmetros id_treinamento e identificador_lido são obrigatórios." },
        { status: 400 }
      );
    }

    // Referência para a presença específica deste identificador neste treinamento
    const presencaRef = doc(db, "treinamentos", id_treinamento, "presencas", identificador_lido);
    
    // Verifica se já existe para retornar o erro 409
    const presencaSnap = await getDoc(presencaRef);
    if (presencaSnap.exists()) {
      return NextResponse.json(
        { success: false, error: "Este colaborador já está registrado neste treinamento." },
        { status: 409 }
      );
    }

    // Cria o registro da presença "cego" usando o identificador como ID do documento
    await setDoc(presencaRef, {
      identificador_lido,
      modo_registro: modo_registro || "DESCONHECIDO",
      data_registro: serverTimestamp()
    });

    return NextResponse.json({ success: true, data: { id_treinamento, identificador_lido, modo_registro } });
  } catch (error: any) {
    console.error("Erro ao registrar presença:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
