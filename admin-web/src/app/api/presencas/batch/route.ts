import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, writeBatch } from 'firebase/firestore';

export async function PUT(req: Request) {
  try {
    const { treinamentoId, presencasIds, rol } = await req.json();

    if (!treinamentoId || !presencasIds || !Array.isArray(presencasIds)) {
      return NextResponse.json({ success: false, error: 'treinamentoId e presencasIds (array) são obrigatórios' }, { status: 400 });
    }

    if (presencasIds.length === 0) {
      return NextResponse.json({ success: true, message: 'Nenhuma presença selecionada' });
    }

    const batch = writeBatch(db);

    for (const presencaId of presencasIds) {
      const docRef = doc(db, 'treinamentos', treinamentoId, 'presencas', presencaId);
      batch.update(docRef, { rol: rol });
    }

    await batch.commit();

    return NextResponse.json({ success: true, message: 'Roles atualizados com sucesso.' });
  } catch (error: any) {
    console.error("ERRO BATCH PRESENCAS:", error);
    return NextResponse.json({ success: false, error: 'Erro ao atualizar roles em lote.' }, { status: 500 });
  }
}
