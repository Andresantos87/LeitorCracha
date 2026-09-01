import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const resolvedParams = await params;
    const docRef = doc(db, "publicos_alvo", resolvedParams.id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return NextResponse.json({ success: false, error: "Público-Alvo não encontrado." }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      data: { id: docSnap.id, ...docSnap.data() } 
    });
  } catch (error: any) {
    console.error("ERRO GET PUBLICO-ALVO ID:", error);
    return NextResponse.json({ success: false, error: "Erro ao carregar público-alvo." }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const body = await req.json();
    const { nome, descricao, matriculas } = body;
    
    const resolvedParams = await params;
    const docRef = doc(db, "publicos_alvo", resolvedParams.id);
    const updates: any = {};
    if (nome !== undefined) updates.nome = nome;
    if (descricao !== undefined) updates.descricao = descricao;
    if (matriculas !== undefined) updates.matriculas = Array.isArray(matriculas) ? matriculas : [];
    if (body.membros !== undefined) updates.membros = Array.isArray(body.membros) ? body.membros : [];
    if (body.roles_disponiveis !== undefined) updates.roles_disponiveis = Array.isArray(body.roles_disponiveis) ? body.roles_disponiveis : [];
    if (body.pasta !== undefined) updates.pasta = body.pasta;
    
    await updateDoc(docRef, updates);
    
    return NextResponse.json({ success: true, message: "Público-Alvo atualizado com sucesso." });
  } catch (error: any) {
    console.error("ERRO PUT PUBLICO-ALVO ID:", error);
    return NextResponse.json({ success: false, error: "Erro ao atualizar público-alvo." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const session = await import("@/lib/auth").then(m => m.getSession());
    if (session && session.role !== 'admin' && session.role !== 'gestor') {
      return NextResponse.json({ success: false, error: "Apenas Administradores ou Gestores têm permissão para excluir públicos-alvo." }, { status: 403 });
    }

    const resolvedParams = await params;
    const docRef = doc(db, "publicos_alvo", resolvedParams.id);
    await deleteDoc(docRef);
    
    return NextResponse.json({ success: true, message: "Público-Alvo excluído com sucesso." });
  } catch (error: any) {
    console.error("ERRO DELETE PUBLICO-ALVO ID:", error);
    return NextResponse.json({ success: false, error: "Erro ao excluir público-alvo." }, { status: 500 });
  }
}
