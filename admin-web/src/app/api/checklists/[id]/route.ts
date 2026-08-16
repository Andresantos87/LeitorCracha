import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    if (!id) return NextResponse.json({ success: false, error: "ID não fornecido" }, { status: 400 });

    const body = await req.json();
    const { nome, items } = body;

    const updates: any = {};
    if (nome !== undefined) updates.nome = nome;
    if (items !== undefined) updates.items = items;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: "Nenhum campo para atualizar" }, { status: 400 });
    }

    const docRef = doc(db, "checklist_templates", id);
    await updateDoc(docRef, updates);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("ERRO PUT Checklist:", error);
    return NextResponse.json({ success: false, error: "Erro ao atualizar checklist." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    if (!id) return NextResponse.json({ success: false, error: "ID não fornecido" }, { status: 400 });

    await deleteDoc(doc(db, "checklist_templates", id));
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("ERRO DELETE Checklist:", error);
    return NextResponse.json({ success: false, error: "Erro ao excluir checklist." }, { status: 500 });
  }
}
