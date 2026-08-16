import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

export const dynamic = 'force-dynamic';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string, sessaoId: string }> }) {
  try {
    const resolvedParams = await params;
    const body = await req.json();
    const { checklist_durante, status } = body;
    
    const sessaoRef = doc(db, "treinamentos", resolvedParams.id, "sessoes", resolvedParams.sessaoId);
    
    const updates: any = {};
    if (checklist_durante !== undefined) updates.checklist_durante = checklist_durante;
    if (status !== undefined) updates.status = status;

    await updateDoc(sessaoRef, updates);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("ERRO PUT SESSAO:", error);
    return NextResponse.json({ success: false, error: "Erro ao atualizar sessão." }, { status: 500 });
  }
}
