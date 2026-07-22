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
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) return NextResponse.json({ success: false, error: "ID não fornecido" }, { status: 400 });

    const { doc, deleteDoc } = await import("firebase/firestore");
    await deleteDoc(doc(db, "treinamentos", id));
    
    // Obs: Em produção real, deveríamos apagar a subcoleção 'presencas' também, 
    // mas o Firestore não apaga subcoleções automaticamente. 
    // Como é um MVP, apagar o documento principal já o remove da lista.
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("ERRO DELETE:", error);
    return NextResponse.json({ success: false, error: "Erro ao excluir treinamento." }, { status: 500 });
  }
}
