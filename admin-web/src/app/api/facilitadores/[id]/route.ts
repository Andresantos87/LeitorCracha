import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { nome, matricula, ativo } = body;
    
    if (!id) return NextResponse.json({ success: false, error: "ID é obrigatório" }, { status: 400 });

    const docRef = doc(db, "facilitadores", id);
    const updateData: any = {};
    if (nome !== undefined) updateData.nome = nome;
    if (matricula !== undefined) updateData.matricula = matricula;
    if (ativo !== undefined) updateData.ativo = ativo;

    await updateDoc(docRef, updateData);
    
    return NextResponse.json({ success: true, data: { id, ...updateData } });
  } catch (error: any) {
    console.error("ERRO PUT FACILITADORES:", error);
    return NextResponse.json({ success: false, error: "Erro ao atualizar facilitador." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id) return NextResponse.json({ success: false, error: "ID é obrigatório" }, { status: 400 });

    const docRef = doc(db, "facilitadores", id);
    await deleteDoc(docRef);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("ERRO DELETE FACILITADORES:", error);
    return NextResponse.json({ success: false, error: "Erro ao deletar facilitador." }, { status: 500 });
  }
}
