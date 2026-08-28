import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

export async function PUT(req: Request) {
  try {
    const { treinamentoId, presencaId, novoNome, novoTreinamentoId } = await req.json();

    if (!treinamentoId || !presencaId) {
      return NextResponse.json({ success: false, error: 'treinamentoId e presencaId são obrigatórios' }, { status: 400 });
    }

    const oldRef = doc(db, 'treinamentos', treinamentoId, 'presencas', presencaId);
    
    // Se não for mover, apenas atualiza o nome
    if (!novoTreinamentoId || novoTreinamentoId === treinamentoId) {
      if (novoNome) {
        await updateDoc(oldRef, { nome: novoNome });
      }
      return NextResponse.json({ success: true, message: 'Atualizado com sucesso' });
    }

    // Se for mover de turma
    const snap = await getDoc(oldRef);
    if (!snap.exists()) {
      return NextResponse.json({ success: false, error: 'Presença original não encontrada' }, { status: 404 });
    }

    const data = snap.data();
    if (novoNome) {
      data.nome = novoNome;
    }

    const newRef = doc(db, 'treinamentos', novoTreinamentoId, 'presencas', presencaId);
    
    // Adiciona na nova
    await setDoc(newRef, data);
    // Remove da antiga
    await deleteDoc(oldRef);

    return NextResponse.json({ success: true, message: 'Movido e atualizado com sucesso' });
  } catch (error: any) {
    console.error("ERRO EDIT PRESENCA:", error);
    return NextResponse.json({ success: false, error: 'Erro ao editar presença.' }, { status: 500 });
  }
}
