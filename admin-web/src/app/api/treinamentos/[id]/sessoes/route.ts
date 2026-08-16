import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "firebase/firestore";

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const sessoesRef = collection(db, "treinamentos", resolvedParams.id, "sessoes");
    const q = query(sessoesRef, orderBy("criado_em", "desc"));
    const snapshot = await getDocs(q);
    
    const sessoes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      criado_em: doc.data().criado_em?.toDate()?.toISOString() || new Date().toISOString()
    }));
    
    return NextResponse.json({ success: true, data: sessoes });
  } catch (error: any) {
    console.error("ERRO GET SESSOES:", error);
    return NextResponse.json({ success: false, error: "Erro ao carregar sessões." }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const body = await req.json();
    const { data_sessao, turno, linha, area_processo, capacitador, checklist_antes } = body;
    
    const sessoesRef = collection(db, "treinamentos", resolvedParams.id, "sessoes");
    
    if (!capacitador) {
        return NextResponse.json({ success: false, error: "Capacitador é obrigatório" }, { status: 400 });
    }

    const docRef = await addDoc(sessoesRef, {
      data_sessao: data_sessao || new Date().toISOString().split('T')[0],
      turno: turno || "",
      linha: linha || "",
      area_processo: area_processo || "",
      capacitador: capacitador,
      checklist_antes: checklist_antes || {},
      checklist_durante: {},
      status: "EM_ANDAMENTO",
      criado_em: serverTimestamp()
    });
    
    return NextResponse.json({ success: true, data: { id: docRef.id } });
  } catch (error: any) {
    console.error("ERRO POST SESSOES:", error);
    return NextResponse.json({ success: false, error: "Erro ao criar sessão." }, { status: 500 });
  }
}
