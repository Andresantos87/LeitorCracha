import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "firebase/firestore";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const q = query(collection(db, "publicos_alvo"), orderBy("criado_em", "desc"));
    const snapshot = await getDocs(q);
    
    const publicos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      criado_em: doc.data().criado_em?.toDate()?.toISOString() || new Date().toISOString()
    }));
    
    return NextResponse.json({ success: true, data: publicos });
  } catch (error: any) {
    console.error("ERRO GET PUBLICOS-ALVO:", error);
    return NextResponse.json({ success: false, error: "Erro ao carregar públicos-alvo." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nome, descricao, matriculas } = body;
    
    if (!nome) return NextResponse.json({ success: false, error: "Nome é obrigatório" }, { status: 400 });

    const docRef = await addDoc(collection(db, "publicos_alvo"), {
      nome,
      descricao: descricao || "",
      matriculas: Array.isArray(matriculas) ? matriculas : [],
      criado_em: serverTimestamp()
    });
    
    const publico = {
      id: docRef.id,
      nome,
      descricao: descricao || "",
      matriculas: Array.isArray(matriculas) ? matriculas : [],
      criado_em: new Date().toISOString()
    };
    
    return NextResponse.json({ success: true, data: publico });
  } catch (error: any) {
    console.error("ERRO POST PUBLICOS-ALVO:", error);
    return NextResponse.json({ success: false, error: "Erro ao criar público-alvo." }, { status: 500 });
  }
}
