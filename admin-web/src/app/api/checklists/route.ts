import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "firebase/firestore";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const q = query(collection(db, "checklist_templates"), orderBy("criado_em", "desc"));
    const snapshot = await getDocs(q);
    
    const templates = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      criado_em: doc.data().criado_em?.toDate()?.toISOString() || new Date().toISOString()
    }));
    
    return NextResponse.json({ success: true, data: templates });
  } catch (error: any) {
    console.error("ERRO GET Checklists:", error);
    return NextResponse.json({ success: false, error: "Erro ao carregar templates de checklist." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nome, items } = body;
    
    if (!nome) return NextResponse.json({ success: false, error: "Nome é obrigatório" }, { status: 400 });
    if (!items || !Array.isArray(items)) return NextResponse.json({ success: false, error: "Items são obrigatórios e devem ser um array" }, { status: 400 });

    const docData = {
      nome,
      items, // array de { id, texto, categoria, obrigatorio }
      criado_em: serverTimestamp(),
      ativo: true
    };

    const docRef = await addDoc(collection(db, "checklist_templates"), docData);
    
    return NextResponse.json({ success: true, data: { id: docRef.id, ...docData, criado_em: new Date().toISOString() } });
  } catch (error: any) {
    console.error("ERRO POST Checklists:", error);
    return NextResponse.json({ success: false, error: "Erro ao criar template de checklist." }, { status: 500 });
  }
}
