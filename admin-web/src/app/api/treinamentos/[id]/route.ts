import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    if (!id) return NextResponse.json({ success: false, error: "ID não fornecido" }, { status: 400 });

    const body = await req.json();
    
    // We expect updates to the checklist object or roles_disponiveis
    const updates: any = {};
    if (body.checklist_dinamico !== undefined) {
      updates.checklist_dinamico = body.checklist_dinamico;
    }
    if (body.roles_disponiveis !== undefined) {
      updates.roles_disponiveis = body.roles_disponiveis;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: "Nenhum campo para atualizar" }, { status: 400 });
    }

    const docRef = doc(db, "treinamentos", id);
    await updateDoc(docRef, updates);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("ERRO PUT Treinamento:", error);
    return NextResponse.json({ success: false, error: "Erro ao atualizar treinamento." }, { status: 500 });
  }
}
