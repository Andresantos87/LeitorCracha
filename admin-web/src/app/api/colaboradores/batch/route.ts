import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { writeBatch, doc } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const { colaboradores } = await req.json();

    if (!colaboradores || !Array.isArray(colaboradores)) {
      return NextResponse.json({ success: false, error: 'Lista de colaboradores inválida' }, { status: 400 });
    }

    const batch = writeBatch(db);

    colaboradores.forEach((c: any) => {
      // Usa o e-mail como ID do documento para evitar duplicados
      const docRef = doc(db, 'colaboradores', c.identificador);
      batch.set(docRef, {
        identificador: c.identificador,
        nome: c.nome,
        planta: c.planta,
        dataCriacao: new Date().toISOString()
      }, { merge: true }); // merge true garante que se já existir, só atualiza
    });

    await batch.commit();

    return NextResponse.json({ success: true, count: colaboradores.length });
  } catch (error: any) {
    console.error("ERRO BATCH COLABORADORES:", error);
    return NextResponse.json({ success: false, error: 'Erro no batch' }, { status: 500 });
  }
}
