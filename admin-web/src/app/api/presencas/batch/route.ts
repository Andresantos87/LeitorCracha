import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, writeBatch } from 'firebase/firestore';

export async function PUT(req: Request) {
  try {
    const { treinamentoId, presencasIds, rol, facilitador_id, facilitador_nome } = await req.json();

    if (!treinamentoId || !presencasIds || !Array.isArray(presencasIds)) {
      return NextResponse.json({ success: false, error: 'treinamentoId e presencasIds (array) são obrigatórios' }, { status: 400 });
    }

    if (presencasIds.length === 0) {
      return NextResponse.json({ success: true, message: 'Nenhuma presença selecionada' });
    }

    const batch = writeBatch(db);

    for (const presencaId of presencasIds) {
      const docRef = doc(db, 'treinamentos', treinamentoId, 'presencas', presencaId);
      const updateData: any = {};
      if (rol !== undefined) updateData.rol = rol;
      if (facilitador_id !== undefined) updateData.facilitador_id = facilitador_id;
      if (facilitador_nome !== undefined) updateData.facilitador_nome = facilitador_nome;
      
      if (Object.keys(updateData).length > 0) {
        batch.update(docRef, updateData);
      }
    }

    await batch.commit();

    return NextResponse.json({ success: true, message: 'Atualizados com sucesso.' });
  } catch (error: any) {
    console.error("ERRO BATCH PRESENCAS:", error);
    return NextResponse.json({ success: false, error: 'Erro ao atualizar roles em lote.' }, { status: 500 });
  }
}
