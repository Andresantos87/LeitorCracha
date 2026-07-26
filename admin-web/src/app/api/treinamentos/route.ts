import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, getCountFromServer } from "firebase/firestore";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const q = query(collection(db, "treinamentos"), orderBy("data", "desc"));
    const snapshot = await getDocs(q);
    
    const treinamentos = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Contar as presenças para este treinamento
      const presencasRef = collection(db, "treinamentos", doc.id, "presencas");
      const countSnapshot = await getCountFromServer(presencasRef);
      
      treinamentos.push({
        id: doc.id,
        nome: data.nome,
        turma: data.turma || "",
        data: data.data?.toDate()?.toISOString() || new Date().toISOString(),
        instrutor_email: data.instrutor_email,
        status_encerrado: data.status_encerrado || false,
        _count: {
          registros: countSnapshot.data().count
        }
      });
    }
    
    return NextResponse.json({ success: true, data: treinamentos });
  } catch (error: any) {
    console.error("ERRO GET:", error);
    return NextResponse.json({ success: false, error: "Erro ao carregar treinamentos." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nome, instrutor_email, turma } = body;
    
    if (!nome) return NextResponse.json({ success: false, error: "Nome é obrigatório" }, { status: 400 });

    const docRef = await addDoc(collection(db, "treinamentos"), {
      nome,
      turma: turma || "",
      instrutor_email: instrutor_email || "N/A",
      data: serverTimestamp(),
      status_encerrado: false
    });
    
    const treinamento = {
      id: docRef.id,
      nome,
      turma: turma || "",
      instrutor_email: instrutor_email || "N/A",
      data: new Date().toISOString(),
      status_encerrado: false,
      _count: { registros: 0 }
    };
    
    return NextResponse.json({ success: true, data: treinamento });
  } catch (error: any) {
    console.error("ERRO POST:", error);
    return NextResponse.json({ success: false, error: "Erro ao criar treinamento." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await import("@/lib/auth").then(m => m.getSession());
    if (session && session.role !== 'admin' && session.role !== 'gestor') {
      return NextResponse.json({ success: false, error: "Apenas Administradores ou Gestores têm permissão para excluir treinamentos." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const nome = searchParams.get("nome");
    
    const { doc, deleteDoc, collection, query, where, getDocs } = await import("firebase/firestore");

    if (nome) {
      const q = query(collection(db, "treinamentos"), where("nome", "==", nome));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, "treinamentos", d.id)));
      await Promise.all(deletePromises);
      return NextResponse.json({ success: true, deletedCount: snapshot.size });
    }
    
    if (!id) return NextResponse.json({ success: false, error: "ID ou Nome não fornecido" }, { status: 400 });

    await deleteDoc(doc(db, "treinamentos", id));
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("ERRO DELETE:", error);
    return NextResponse.json({ success: false, error: "Erro ao excluir treinamento." }, { status: 500 });
  }
}
