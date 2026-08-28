import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "firebase/firestore";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const q = query(collection(db, "facilitadores"), orderBy("nome", "asc"));
    const snapshot = await getDocs(q);
    
    const facilitadores = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return NextResponse.json({ success: true, data: facilitadores });
  } catch (error: any) {
    console.error("ERRO GET FACILITADORES:", error);
    return NextResponse.json({ success: false, error: "Erro ao carregar facilitadores." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nome, matricula, ativo = true } = body;
    
    if (!nome) return NextResponse.json({ success: false, error: "Nome é obrigatório" }, { status: 400 });

    const docData = {
      nome,
      matricula: matricula || "",
      ativo: ativo !== undefined ? ativo : true,
      criadoEm: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, "facilitadores"), docData);
    
    return NextResponse.json({ 
      success: true, 
      data: { id: docRef.id, ...docData, criadoEm: new Date().toISOString() } 
    });
  } catch (error: any) {
    console.error("ERRO POST FACILITADORES:", error);
    return NextResponse.json({ success: false, error: "Erro ao criar facilitador." }, { status: 500 });
  }
}
